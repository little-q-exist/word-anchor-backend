import express, { Request, Response } from 'express';

import { authTokenMiddleware } from '#shared/middleware.js';
import mongoose from 'mongoose';
import { sendError, sendSuccess } from '#response';
import LearningSession, {
  LearningMode,
  SessionQueueSnapshot,
  LearningSession as LearningSessionType,
} from '#modules/learn/models/learningSessions.js';
import { LearnService } from '#modules/learn/services/learn.js';
import { TimeService } from '../services/time.js';

const router = express.Router();

const learningModes: LearningMode[] = ['learn', 'review'];

const isLearningMode = (mode: string): mode is LearningMode => {
  return learningModes.includes(mode as LearningMode);
};

const isValidQueueSnapshot = (snapshot: SessionQueueSnapshot): boolean => {
  return (
    Number.isInteger(snapshot.index) &&
    snapshot.index >= 0 &&
    typeof snapshot.isRepeating === 'boolean' &&
    Array.isArray(snapshot.repeatQueue) &&
    snapshot.repeatQueue.every((item) => Number.isInteger(item) && item >= 0)
  );
};

router.get(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (req: Request<{ userId: string; mode: string }>, res: Response) => {
    const { userId, mode } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    const session = await LearningSession.findOne({ userId, mode }).lean();

    return sendSuccess(res, session);
  }
);

router.post(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (req: Request<{ userId: string; mode: string }>, res: Response) => {
    const { userId, mode } = req.params;
    const { limit = 10 } = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    const existingSession = await LearningSession.findOne({ userId, mode }).lean();

    if (existingSession) {
      return sendError(res, 409, 'learning session already exists');
    }

    const words =
      mode === 'learn'
        ? await LearnService.getWordToLearn(userId, Number(limit))
        : await LearnService.getWordToReview(userId, Number(limit));

    const newSession = await LearningSession.create({
      userId: new mongoose.Types.ObjectId(userId),
      mode,
      words,
      version: TimeService.getCurrentTimeStamp(),
    });

    return sendSuccess(res, newSession);
  }
);

type PatchLearningSessionBody = Pick<LearningSessionType, 'queueSnapshot' | 'version'>;

router.patch(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; mode: string }, unknown, PatchLearningSessionBody>,
    res: Response
  ) => {
    const { userId, mode } = req.params;
    const { queueSnapshot, version } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    if (!queueSnapshot || !isValidQueueSnapshot(queueSnapshot)) {
      return sendError(res, 400, 'invalid queue snapshot');
    }

    const existingSession = await LearningSession.findOne({ userId, mode });

    if (!existingSession) {
      return sendError(res, 404, 'learning session not found');
    }

    if (
      existingSession &&
      !TimeService.parseDate(version).isSame(TimeService.parseDate(existingSession.version))
    ) {
      return sendError(res, 409, 'learning session version conflict', {
        latest: existingSession.toObject(),
      });
    }

    const savedSession = await LearningSession.findOneAndUpdate(
      { userId, mode },
      {
        queueSnapshot,
        version,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    return sendSuccess(res, savedSession);
  }
);

router.delete(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (req: Request<{ userId: string; mode: string }>, res: Response) => {
    const { userId, mode } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    await LearningSession.deleteOne({ userId, mode });

    return sendSuccess(res, null);
  }
);

export default router;

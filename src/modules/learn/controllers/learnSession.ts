import express, { Request, Response } from 'express';

import { authTokenMiddleware } from '#shared/middleware.js';
import mongoose from 'mongoose';
import { sendError, sendSuccess } from '#response';
import LearningSession, {
  LearningMode,
  SessionQueueSnapshot,
  SessionWordState,
} from '#modules/learn/models/learningSessions.js';
import { LearnService } from '#modules/learn/services/learn.js';

const router = express.Router();

interface UpsertLearningSessionBody {
  words: SessionWordState[];
  queueSnapshot: SessionQueueSnapshot;
  version?: number;
  deviceId?: string;
}

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
    snapshot.repeatQueue.every((item) => Number.isInteger(item) && item >= 0) &&
    Number.isFinite(snapshot.updatedAt)
  );
};

const isValidSessionWord = (word: SessionWordState): boolean => {
  return (
    typeof word._id === 'string' &&
    word._id.length > 0 &&
    typeof word.english === 'string' &&
    word.english.length > 0 &&
    ['idle', 'passed', 'failed'].includes(word.status)
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
      queueSnapshot: {
        index: 0,
        isRepeating: false,
        repeatQueue: [],
        updatedAt: Date.now(),
      },
    });

    return sendSuccess(res, newSession);
  }
);

router.put(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; mode: string }, unknown, UpsertLearningSessionBody>,
    res: Response
  ) => {
    const { userId, mode } = req.params;
    const { words, queueSnapshot, version } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    if (!Array.isArray(words) || !words.every(isValidSessionWord)) {
      return sendError(res, 400, 'invalid words payload');
    }

    if (!queueSnapshot || !isValidQueueSnapshot(queueSnapshot)) {
      return sendError(res, 400, 'invalid queue snapshot');
    }

    const existingSession = await LearningSession.findOne({ userId, mode });

    if (
      typeof version === 'number' &&
      Number.isFinite(version) &&
      existingSession &&
      existingSession.version !== version
    ) {
      return sendError(res, 409, 'learning session version conflict', {
        latest: existingSession.toObject(),
      });
    }

    const nextVersion = existingSession ? existingSession.version + 1 : 1;

    const savedSession = await LearningSession.findOneAndUpdate(
      { userId, mode },
      {
        userId: new mongoose.Types.ObjectId(userId),
        mode,
        words,
        queueSnapshot,
        version: nextVersion,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
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

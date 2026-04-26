import express, { NextFunction, Request, Response } from 'express';

import { authTokenMiddleware } from '#shared/middleware.js';
import mongoose from 'mongoose';
import { LearnService } from '#modules/learn/services/learn.js';
import { TimeService } from '#modules/learn/services/time.js';
import UserWord from '../models/userWords.js';
import Word from '#modules/words/models/words.js';
import { sendError, sendSuccess } from '#response';
import LearningSession, {
  LearningMode,
  SessionQueueSnapshot,
  SessionWordState,
} from '#modules/learn/models/learningSessions.js';

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

router.put(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; mode: string }, unknown, UpsertLearningSessionBody>,
    res: Response
  ) => {
    const { userId, mode } = req.params;
    const { words, queueSnapshot, version, deviceId } = req.body;

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
        updatedByDevice: typeof deviceId === 'string' ? deviceId : undefined,
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

router.get(
  '/:id/learning-data',
  authTokenMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    if (req.params.id !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }
    const data = await UserWord.find({ userId: req.params.id }).lean();
    return sendSuccess(res, data);
  }
);

router.get(
  '/:userId/words/:wordId',
  authTokenMiddleware,
  async (req: Request<{ userId: string; wordId: string }>, res: Response) => {
    const { fields } = req.query;
    const wordId = req.params.wordId;
    const userId = req.params.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return sendError(res, 400, 'invalid word id');
    }

    const query = UserWord.findOne({ userId, wordId });

    let fieldsString;
    if (fields) {
      fieldsString = String(fields).split(',').join(' ');
      query.select(fieldsString);
    }

    const wordDoc = await query.exec();
    return sendSuccess(res, wordDoc);
  }
);

router.patch(
  '/:userId/words/:wordId/familiarity',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; wordId: string }, unknown, { familiarity: number }>,
    res: Response
  ) => {
    const familiarity = req.body.familiarity;
    const wordId = req.params.wordId;
    const userId = req.params.userId;

    if (![0, 1, 2, 3, 4, 5].includes(familiarity)) {
      return sendError(res, 400, 'invalid familiarity');
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return sendError(res, 400, 'invalid word id');
    }

    const wordDoc = await Word.findById(wordId).select('english').lean();

    if (!wordDoc) {
      return sendError(res, 404, 'word not found');
    }

    const updatedUserWordDoc = await LearnService.upsertLearningData(
      userId,
      wordId,
      wordDoc,
      familiarity
    );

    return sendSuccess(res, updatedUserWordDoc);
  }
);

router.patch(
  '/:userId/words/:wordId/favorite',
  authTokenMiddleware,
  async (req: Request<{ userId: string; wordId: string }>, res: Response) => {
    const userId = req.params.userId;
    const wordId = req.params.wordId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return sendError(res, 400, 'invalid word id');
    }

    let userWordDoc = await UserWord.findOne({ userId, wordId });

    const wordDoc = await Word.findById(wordId).select('english').lean();

    if (!wordDoc) {
      return sendError(res, 404, 'word not found');
    }

    if (!userWordDoc) {
      userWordDoc = new UserWord({
        userId: new mongoose.Types.ObjectId(userId),
        wordId: new mongoose.Types.ObjectId(wordId),
        english: wordDoc.english,
      });
    }

    userWordDoc.set('favorited', !userWordDoc.favorited);

    const updatedWordDoc = await userWordDoc.save();
    return sendSuccess(res, {
      _id: updatedWordDoc._id,
      wordId: updatedWordDoc.wordId,
      userId: updatedWordDoc.userId,
      favorited: updatedWordDoc.favorited,
    });
  }
);

router.get(
  '/:userId/stats',
  authTokenMiddleware,
  async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    const startOfDay = TimeService.getStartOfToday();
    const endOfDay = TimeService.getEndOfToday();

    try {
      const todayCount = await UserWord.countDocuments({
        userId,
        lastLearned: { $gte: startOfDay, $lte: endOfDay },
      });

      const totalCount = await UserWord.countDocuments({ userId, lastLearned: { $exists: true } });

      return sendSuccess(res, { todayCount, totalCount });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

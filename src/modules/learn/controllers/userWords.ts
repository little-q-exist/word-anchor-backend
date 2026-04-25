import express, { NextFunction, Request, Response } from 'express';

import { authTokenMiddleware } from '#shared/middleware.js';
import mongoose from 'mongoose';
import { LearnService } from '#modules/learn/services/learn.js';
import { TimeService } from '#modules/learn/services/time.js';
import UserWord, { UserLearningData, defaultUserLearningData } from '../models/userWords.js';
import Word from '#modules/words/models/words.js';
import { sendError, sendSuccess } from '#response';

const router = express.Router();
interface UpdateFamiliarityResponse extends UserLearningData {
  shouldRepeat: boolean;
}

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

    let userWordDocument = await UserWord.findOne({ userId, wordId });

    let learnResult;

    if (!userWordDocument) {
      learnResult = LearnService.learn(
        {
          userId: new mongoose.Types.ObjectId(userId),
          wordId: new mongoose.Types.ObjectId(wordId),
          english: wordDoc.english,
          ...defaultUserLearningData,
        },
        familiarity
      );
      userWordDocument = new UserWord(learnResult.data);
    } else {
      const userLearningData = userWordDocument.toObject();
      if (!userLearningData.english && wordDoc.english) {
        userLearningData.english = wordDoc.english;
      }
      learnResult = LearnService.learn(userLearningData, familiarity);
      userWordDocument.set(learnResult.data);
    }

    const updatedUserWordDoc = await userWordDocument.save();

    const responseData: UpdateFamiliarityResponse = {
      ...updatedUserWordDoc.toObject(),
      shouldRepeat: learnResult.shouldRepeat,
    };

    return sendSuccess(res, responseData);
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

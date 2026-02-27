import express, { Request, Response } from 'express';

import { authTokenMiddleware } from '../middleware.js';
import mongoose from 'mongoose';
import { learn } from '../algo/learn.js';
import UserWord, { UserLearningData, defaultUserLearningData } from '../models/userWords.js';
import Word from '../models/words.js';

const router = express.Router();

interface UpdateFamiliarityResponse extends UserLearningData {
  shouldRepeat: boolean;
}

router.get(
  '/:id/learning-data',
  authTokenMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    if (req.params.id !== res.locals._id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const data = await UserWord.find({ userId: req.params.id });
    res.json(data);
  }
);

router.get(
  '/:userId/words/:wordId',
  authTokenMiddleware,
  async (req: Request<{ userId: string; wordId: string }>, res: Response) => {
    const { fields } = req.query;
    const wordId = req.params.wordId;
    const userId = req.params.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId) || userId !== res.locals._id) {
      return res.status(400).json({ error: 'invalid user Id' });
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return res.status(400).json({ error: 'invalid word Id' });
    }

    const query = UserWord.findOne({ userId, wordId });

    let fieldsString;
    if (fields) {
      fieldsString = String(fields).split(',').join(' ');
      query.select(fieldsString);
    }

    const wordDoc = await query.exec();
    res.json(wordDoc);
  }
);

router.patch(
  '/:userId/words/:wordId/familiarity',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; wordId: string }, unknown, { familiarity: number }>,
    res: Response<UpdateFamiliarityResponse | { error: string }>
  ) => {
    const familiarity = req.body.familiarity;
    const wordId = req.params.wordId;
    const userId = req.params.userId;

    if (![0, 1, 2, 3, 4, 5].includes(familiarity)) {
      return res.status(400).json({ error: 'invalid familiarity' });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId) || userId !== res.locals._id) {
      return res.status(400).json({ error: 'invalid user Id' });
    }

    const wordDoc = await Word.findByIdAndUpdate(wordId, {
      $addToSet: { learnedBy: new mongoose.Types.ObjectId(userId) },
    });

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId) || !wordDoc) {
      return res.status(400).json({ error: 'invalid word Id' });
    }

    await wordDoc.save();

    let userWordDocument = await UserWord.findOne({ userId, wordId });

    let learnResult;

    if (!userWordDocument) {
      learnResult = learn(
        {
          userId: new mongoose.Types.ObjectId(userId),
          wordId: new mongoose.Types.ObjectId(wordId),
          ...defaultUserLearningData,
        },
        familiarity
      );
      userWordDocument = new UserWord(learnResult.data);
    } else {
      learnResult = learn(userWordDocument.toObject(), familiarity);
      userWordDocument.set(learnResult.data);
    }

    const updatedUserWordDoc = await userWordDocument.save();

    const responseData: UpdateFamiliarityResponse = {
      ...updatedUserWordDoc.toObject(),
      shouldRepeat: learnResult.shouldRepeat,
    };

    res.json(responseData);
  }
);

router.patch(
  '/:userId/words/:wordId/favorite',
  authTokenMiddleware,
  async (req: Request<{ userId: string; wordId: string }>, res: Response) => {
    const userId = req.params.userId;
    const wordId = req.params.wordId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId) || userId !== res.locals._id) {
      return res.status(400).json({ error: 'invalid user Id' });
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return res.status(400).json({ error: 'invalid word Id' });
    }

    let wordDoc = await UserWord.findOne({ userId, wordId });

    if (!wordDoc) {
      wordDoc = new UserWord({
        ...defaultUserLearningData,
        userId: new mongoose.Types.ObjectId(userId),
        wordId: new mongoose.Types.ObjectId(wordId),
      });
    }

    wordDoc.set('favorited', !wordDoc.favorited);

    const updatedWordDoc = await wordDoc.save();
    res.json({
      _id: updatedWordDoc._id,
      wordId: updatedWordDoc.wordId,
      userId: updatedWordDoc.userId,
      favorited: updatedWordDoc.favorited,
    });
  }
);

export default router;

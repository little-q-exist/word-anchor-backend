import express, { Request, Response } from 'express';

import Word, { type Word as WordType } from '../models/words.js';
import { type UserLearningData } from '../models/users.js';
import { authTokenMiddleware } from '../middleware.js';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await Word.find({});
  res.json(data);
});

router.put(
  '/:id',
  authTokenMiddleware,
  async (req: Request<{ id: string }, unknown, WordType>, res: Response<WordType | null>) => {
    const updatedWord = req.body;
    const word = await Word.findByIdAndUpdate(req.params.id, updatedWord, {
      returnOriginal: false,
    });
    return res.json(word);
  }
);

router.patch(
  '/:id/familiarity',
  authTokenMiddleware,
  async (
    req: Request<{ id: string }, unknown, { familiarity: number }>,
    res: Response<UserLearningData | { error: string }>
  ) => {
    try {
      const user = res.locals.user;
      const familiarity = req.body.familiarity;
      const wordId = req.params.id;

      if (![0, 1, 2, 3].includes(familiarity)) {
        return res.json({ error: 'invalid familiarity' });
      }

      if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
        return res.json({ error: 'invalid word Id' });
      }

      if (!user) {
        return res.json({ error: 'user not authenticated' });
      }

      user.userLearningData = user.userLearningData || [];

      let wordDoc = user.userLearningData.find(
        (data: UserLearningData) => data.wordId?.toString() === wordId
      );

      if (!wordDoc) {
        wordDoc = {
          familiarity,
          favorited: false,
          mastered: false,
          wordId: new mongoose.Types.ObjectId(wordId),
        };
        user.userLearningData.push(wordDoc);
      } else {
        wordDoc.familiarity = familiarity;
      }

      wordDoc.mastered = familiarity === 3;

      const updatedUser = await user.save();
      const newWordDoc = updatedUser.userLearningData.find(
        (data: UserLearningData) => data.wordId.toString() === wordId
      );
      res.json(newWordDoc);
    } catch (error) {
      console.info(error);
      return res.status(500).json({ error: 'internal server error' });
    }
  }
);

export default router;

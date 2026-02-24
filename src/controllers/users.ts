import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import User, { NewUser } from '../models/users.js';
import UserWord, { defaultUserLearningData, UserLearningData } from '../models/userWords.js';

import { authTokenMiddleware } from '../middleware.js';

import { learn } from '../algo/learn.js';

const router = express.Router();

router.get('/', authTokenMiddleware, async (_req: Request, res: Response) => {
  const user = await User.findById(res.locals._id);
  if (user && user.isAdmin) {
    const data = await User.find({}).select('+passwordHash');
    return res.json(data);
  } else {
    return res.status(403).json({ error: 'forbidden' });
  }
});

router.get('/:id', authTokenMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  if (req.params.id !== res.locals._id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const data = await User.findById(req.params.id);
  res.json(data);
});

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

router.post('/register', async (req: Request<unknown, unknown, NewUser>, res: Response) => {
  const { username, password, email = '' } = req.body;
  const saltRound = 13;
  const passwordHash = await bcrypt.hash(password, saltRound);
  const newUser = await new User({ username, passwordHash, email }).save();
  res.json(newUser);
});

interface UpdateFamiliarityResponse extends UserLearningData {
  shouldRepeat: boolean;
}

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

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return res.status(400).json({ error: 'invalid word Id' });
    }

    let wordDoc = await UserWord.findOne({ userId, wordId });

    let learnResult;

    if (!wordDoc) {
      learnResult = learn(
        {
          userId: new mongoose.Types.ObjectId(userId),
          wordId: new mongoose.Types.ObjectId(wordId),
          ...defaultUserLearningData,
        },
        familiarity
      );
      wordDoc = new UserWord(learnResult.data);
    } else {
      learnResult = learn(wordDoc.toObject(), familiarity);
      wordDoc.set(learnResult.data);
    }

    const updatedWordDoc = await wordDoc.save();

    const responseData: UpdateFamiliarityResponse = {
      ...updatedWordDoc.toObject(),
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

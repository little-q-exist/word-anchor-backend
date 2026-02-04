import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import User, {
  defaultUserLearningData,
  learn,
  NewUser,
  UserLearningData,
} from '../models/users.js';

import { authTokenMiddleware } from '../middleware.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await User.find({});
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const data = await User.findById(req.params.id);
  res.json(data);
});

router.post('/register', async (req: Request<unknown, unknown, NewUser>, res: Response) => {
  const { username, password, email = '' } = req.body;
  const saltRound = 13;
  const passwordHash = await bcrypt.hash(password, saltRound);
  const newUser = await new User({ username, passwordHash, email }).save();
  res.json(newUser);
});

router.patch(
  '/:userId/words/:wordId/familiarity',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; wordId: string }, unknown, { familiarity: number }>,
    res: Response<UserLearningData | { error: string }>
  ) => {
    const user = await User.findById(res.locals._id);
    const familiarity = req.body.familiarity;
    const wordId = req.params.wordId;
    const userId = req.params.userId;

    if (!user) {
      return res.status(401).json({ error: 'user not authenticated' });
    }

    if (![0, 1, 2, 3].includes(familiarity)) {
      return res.status(400).json({ error: 'invalid familiarity' });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId) || userId !== res.locals._id) {
      return res.status(400).json({ error: 'invalid user Id' });
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return res.status(400).json({ error: 'invalid word Id' });
    }

    const dataList = user.userLearningData;

    let wordDoc = dataList.find((data) => wordId.toString() === data.wordId.toString());

    if (!wordDoc) {
      dataList.push({
        wordId: new mongoose.Types.ObjectId(wordId),
        ...defaultUserLearningData,
      });
      wordDoc = learn(dataList[dataList.length]!, familiarity);
    } else {
      wordDoc = learn(wordDoc, familiarity);
    }

    const updatedUser = await user.save();
    const newWordDoc = updatedUser.userLearningData.find(
      (data: UserLearningData) => data.wordId.toString() === wordId
    );
    res.json(newWordDoc);
  }
);

export default router;

import express, { Request, Response } from 'express';

import Word, { type Word as WordType, NewWord, WordPopulated } from '../models/words.js';
import UserWord from '../models/userWords.js';
import { authTokenMiddleware } from '../middleware.js';
import mongoose from 'mongoose';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import dayjs from 'dayjs';

const router = express.Router();
dayjs.extend(isSameOrBefore);

interface WordsQuery {
  english?: object;
  'definitions.meaning'?: object;
  tags?: object;
}

router.get('/', async (req, res) => {
  const { english, meaning, tags, limit = 9, page = 1 } = req.query;

  const queryFilter: WordsQuery = {};

  if (english) queryFilter.english = { $regex: english, $options: 'i' };
  if (tags) queryFilter.tags = { $in: (tags as string).split(',') };
  if (meaning) queryFilter['definitions.meaning'] = { $regex: meaning, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);

  const data = await Word.find(queryFilter).skip(skip).limit(Number(limit));
  return res.json(data);
});

router.get('/count', async (_req, res) => {
  return res.json(await Word.countDocuments());
});

router.get('/learn', authTokenMiddleware, async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const userId = res.locals._id;

  const words = await Word.find({ learnedBy: { $nin: [userId] } }).limit(Number(limit));
  res.json(words);
});

router.get('/review', authTokenMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals._id;

  const userData = await UserWord.find({ userId });
  const overDueData = userData.filter((data) => dayjs(data.dueDate).isSameOrBefore(dayjs(), 'day'));
  const wordIds = overDueData.map((data) => data.wordId);
  const wordData = await Word.find({ _id: { $in: wordIds } }).populate('learningData');
  (wordData as unknown as WordPopulated[]).sort((a, b) => {
    if (!dayjs(a.learningData[0]!.dueDate).isSame(dayjs(b.learningData[0]!.dueDate), 'day')) {
      return dayjs(a.learningData[0]!.dueDate).unix() - dayjs(b.learningData[0]!.dueDate).unix();
    }
    return a.learningData[0]!.easeFactor - b.learningData[0]!.easeFactor;
  });
  res.json(wordData);
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

router.post(
  '/',
  authTokenMiddleware,
  async (req: Request<unknown, unknown, NewWord>, res: Response) => {
    const word = { ...req.body, createdBy: new mongoose.Types.ObjectId(res.locals._id) };
    const newWord = await Word.insertOne(word);
    return res.json(newWord);
  }
);

export default router;

import express, { Request, Response } from 'express';

import Word, { type Word as WordType, NewWord } from '../models/words.js';
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

  const words = await Word.find(queryFilter).skip(skip).limit(Number(limit));
  const count = await Word.countDocuments(queryFilter);
  return res.json({ words, count });
});

router.get('/count', async (_req, res) => {
  return res.json(await Word.countDocuments());
});

router.get('/tags', async (_req, res) => {
  const tags = await Word.distinct('tags');
  return res.json(tags.filter(Boolean).sort());
});

router.get('/learn', authTokenMiddleware, async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const userId = res.locals._id;

  const words = await Word.find({ learnedBy: { $nin: [userId] } }).limit(Number(limit));
  res.json(words);
});

router.get('/review', authTokenMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals._id;

  const endOfDay = dayjs().endOf('day').toISOString();

  const overDueData = await UserWord.find({
    userId,
    dueDate: { $lte: endOfDay },
  });

  const wordIds = overDueData.map((data) => data.wordId);

  const wordData = await Word.find({ _id: { $in: wordIds } });

  const wordsMap = new Map(wordData.map((word) => [word._id.toString(), word]));

  const result = overDueData
    .filter((data) => wordsMap.has(data.wordId.toString()))
    .map((data) => {
      const word = wordsMap.get(data.wordId.toString())!;
      return {
        ...word.toObject(),
        learningData: data,
      };
    })
    .sort((a, b) => {
      const dateA = dayjs(a.learningData.dueDate);
      const dateB = dayjs(b.learningData.dueDate);

      if (!dateA.isSame(dateB, 'day')) {
        return dateA.unix() - dateB.unix();
      }
      return a.learningData.easeFactor - b.learningData.easeFactor;
    });

  res.json(result);
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

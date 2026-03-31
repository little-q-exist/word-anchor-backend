import express, { Request, Response } from 'express';

import Word, { type Word as WordType, NewWord, BriefWordListWithMode } from '../models/words.js';
import UserWord from '../models/userWords.js';
import { authTokenMiddleware } from '../middleware.js';
import mongoose from 'mongoose';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import dayjs from 'dayjs';
import { sendError, sendSuccess } from '../response.js';

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

  const words = await Word.find(queryFilter)
    .select('english definitions phonetic')
    .skip(skip)
    .limit(Number(limit));
  const count = await Word.countDocuments(queryFilter);
  return sendSuccess(res, { words, count, pageSize: words.length });
});

router.get('/count', async (_req, res) => {
  return sendSuccess(res, await Word.countDocuments());
});

router.get('/tags', async (_req, res) => {
  const tags = await Word.distinct('tags');
  return sendSuccess(res, tags.filter(Boolean).sort());
});

router.get('/learn', authTokenMiddleware, async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const userId = res.locals._id;

  const learnedWordIds = await UserWord.find({ userId, lastLearned: { $exists: true } }).distinct(
    'wordId'
  );

  const words = await Word.find({ _id: { $nin: learnedWordIds } }, '_id english')
    .limit(Number(limit))
    .lean();

  return sendSuccess<BriefWordListWithMode>(res, {
    mode: 'learn',
    words: words.map((word) => ({ _id: word._id, english: word.english })),
    count: words.length,
  });
});

router.get('/review', authTokenMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals._id;

  const endOfDay = dayjs().endOf('day').toISOString();

  const overDueDataIds = await UserWord.find({
    userId,
    dueDate: { $lte: endOfDay },
  })
    .sort({ dueDate: 'asc', easeFactor: 'asc' })
    .select('wordId english')
    .lean();

  return sendSuccess<BriefWordListWithMode>(res, {
    mode: 'review',
    words: overDueDataIds.map((item) => ({ _id: item.wordId, english: item.english })),
    count: overDueDataIds.length,
  });
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 400, 'invalid word id');
  }

  const word = await Word.findById(id).lean();

  if (!word) {
    return sendError(res, 404, 'word not found');
  }

  return sendSuccess(res, word);
});

router.put(
  '/:id',
  authTokenMiddleware,
  async (req: Request<{ id: string }, unknown, WordType>, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, 'invalid word id');
    }

    const updatedWord = req.body;
    const word = await Word.findByIdAndUpdate(req.params.id, updatedWord, {
      returnOriginal: false,
    });

    if (!word) {
      return sendError(res, 404, 'word not found');
    }

    return sendSuccess(res, word);
  }
);

router.post(
  '/',
  authTokenMiddleware,
  async (req: Request<unknown, unknown, NewWord>, res: Response) => {
    const word = { ...req.body, createdBy: new mongoose.Types.ObjectId(res.locals._id) };
    const newWord = await new Word(word).save();
    return sendSuccess(res, newWord, 201, 'word created');
  }
);

export default router;

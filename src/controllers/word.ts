import express, { Request, Response } from 'express';

import Word, { type Word as WordType, NewWord } from '../models/words.js';
import { authTokenMiddleware } from '../middleware.js';
import mongoose from 'mongoose';

const router = express.Router();

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
  const { limit = 10 } = req.params;
  const userId = res.locals._id;

  const data = await Word.aggregate([
    {
      $lookup: {
        from: 'userwords',
        let: { wordId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$wordId', '$$wordId'] }, { $eq: ['$userId', userId] }],
              },
            },
          },
        ],
        as: 'learningData',
      },
    },
    {
      $unwind: {
        path: '$learningData',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        sortEaseFactor: { $ifNull: ['$learningData.easeFactor', 9999] },
      },
    },
    { $sort: { sortEaseFactor: 1, _id: 1 } },
    { $limit: Number(limit) },
    {
      $project: {
        sortEaseFactor: 0, // Remove the temporary sort field
      },
    },
  ]);
  return res.json(data);
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

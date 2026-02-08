import express, { Request, Response } from 'express';

import Word, { type Word as WordType } from '../models/words.js';
import { authTokenMiddleware } from '../middleware.js';

const router = express.Router();

interface WordsQuery {
  english?: object;
  'definitions.meaning'?: object;
  tags?: object;
}

router.get('/', async (req, res) => {
  const {
    english,
    meaning,
    tags,
    limit = 10,
    page = 1,
  } = req.query;

  const queryFilter: WordsQuery = {};

  if (english) queryFilter.english = { $regex: english, $options: 'i' };
  if (tags) queryFilter.tags = { $in: (tags as string).split(',') };
  if (meaning) queryFilter['definitions.meaning'] = { $regex: meaning, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);

  const data = await Word.find(queryFilter)
    .skip(skip)
    .limit(Number(limit));
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

export default router;

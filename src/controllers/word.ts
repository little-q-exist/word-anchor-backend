import express, { Request, Response } from 'express';

import Word, { type Word as WordType } from '../models/words.js';
import { authTokenMiddleware } from '../middleware.js';

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

export default router;

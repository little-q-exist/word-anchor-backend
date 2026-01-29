import express, { Request, Response } from 'express';

import Word, { type Word as WordType } from '../models/words.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await Word.find({});
  res.json(data);
});

router.put(
  '/:id',
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
  async (
    req: Request<{ id: string }, unknown, { familiarity: number }>,
    res: Response<WordType>
  ) => {
    const { familiarity } = req.body;
    const word = await Word.findById(req.params.id);
    if (word) {
      // TODO: change familiarity
      return res.json(await word?.save());
    } else {
      return res.status(404).end();
    }
  }
);

export default router;

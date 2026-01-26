import express from 'express';

import Word from '../models/words.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await Word.find({});
  res.json(data);
});

router.put('/:id', async (req, res) => {
  const updatedWord = req.body;
  const word = await Word.findByIdAndUpdate(req.params.id, updatedWord, { returnOriginal: false });
  return res.json(word);
});

router.patch('/:id/familiarity', async (req, res) => {
  const { familiarity } = req.body;
  const word = await Word.findById(req.params.id);
  if (word) {
    word.familiarity = familiarity;
  }
  return await word?.save();
});

export default router;

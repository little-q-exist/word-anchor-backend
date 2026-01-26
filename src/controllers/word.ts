import express from 'express';

import { getAll } from '../services/word.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await getAll();
  res.json(data);
});

export default router;

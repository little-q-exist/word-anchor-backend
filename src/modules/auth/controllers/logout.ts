import express from 'express';
import { sendSuccess } from '#response';

const router = express.Router();

router.post('/', (req, res) => {
  res.clearCookie('refreshToken', { path: '/api/refresh' });
  return sendSuccess(res, null, 204, 'cookie cleared');
});

export default router;

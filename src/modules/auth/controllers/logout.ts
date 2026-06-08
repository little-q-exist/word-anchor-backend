import express from 'express';

const router = express.Router();

router.post('/', (req, res) => {
  res.clearCookie('refreshToken', { path: '/api/refresh' });
  return res.status(204).send();
});

export default router;

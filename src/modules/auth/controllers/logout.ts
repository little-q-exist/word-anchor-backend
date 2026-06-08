import express from 'express';

const router = express.Router();

/**
 * @openapi
 * /api/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 用户登出
 *     description: 清除 refreshToken cookie，使当前 refresh token 失效
 *     responses:
 *       204:
 *         description: 登出成功，无响应体
 */
router.post('/', (req, res) => {
  res.clearCookie('refreshToken', { path: '/api/refresh' });
  return res.status(204).send();
});

export default router;

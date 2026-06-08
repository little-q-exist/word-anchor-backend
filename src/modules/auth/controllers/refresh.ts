import express from 'express';
import jwt from 'jsonwebtoken';
import { sendError, sendSuccess } from '#response';
import User from '#modules/users/models/users.js';

const router = express.Router();

/**
 * @openapi
 * /api/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 刷新访问令牌
 *     description: 使用已签名的 refreshToken cookie 验证用户身份并颁发新的 accessToken（有效期 1 天）
 *     responses:
 *       200:
 *         description: 刷新成功，返回新的 accessToken、用户名和用户 ID
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: 未提供 refresh token、token 格式无效、用户不存在或 token 版本不匹配
 *       500:
 *         description: 服务器内部错误（REFRESH_SECRET 或 SECRET 未设置）
 */
router.post('/', async (req, res, next) => {
  const refreshToken = req.signedCookies.refreshToken;

  if (!refreshToken) {
    return sendError(res, 401, 'unauthorized');
  }

  const refreshSecret = process.env.REFRESH_SECRET;
  if (!refreshSecret) {
    console.error('REFRESH_SECRET environment variable is not set');
    return sendError(res, 500, 'internal server error');
  }

  try {
    const decodedRefreshToken = jwt.verify(refreshToken, refreshSecret);
    if (typeof decodedRefreshToken === 'string' || decodedRefreshToken instanceof String) {
      return sendError(res, 401, 'invalid token format');
    }

    const userInDB = await User.findById(decodedRefreshToken._id).lean();
    if (!userInDB) {
      console.warn(`Failed refresh attempt for non-existent user: ${decodedRefreshToken._id}`);
      return sendError(res, 401, 'invalid credentials');
    }

    if (userInDB.tokenVersion !== decodedRefreshToken.tokenVersion) {
      return sendError(res, 401, 'invalid token version');
    }

    const secret = process.env.SECRET;
    if (!secret) {
      console.error('SECRET environment variable is not set');
      return sendError(res, 500, 'internal server error');
    }

    const accessToken = jwt.sign({ username: userInDB.username, _id: userInDB._id }, secret, {
      expiresIn: '1d',
    });

    return sendSuccess(res, { accessToken, username: userInDB.username, _id: userInDB._id });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

export default router;

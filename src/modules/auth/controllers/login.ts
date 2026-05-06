import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import User from '#modules/users/models/users.js';
import { sendError, sendSuccess } from '#response';

const router = express.Router();

/**
 * @openapi
 * /api/login:
 *   post:
 *     tags: [Auth]
 *     summary: 用户登录
 *     description: 使用用户名和密码登录，返回 JWT token（有效期 30 天）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: 登录成功，返回 token、用户名和用户 ID
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
 *         description: 用户名或密码错误
 *       500:
 *         description: 服务器内部错误（SECRET 未设置）
 */
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  const userInDB = await User.findOne({ username: username }).select('+passwordHash');

  if (!userInDB) {
    console.warn(`Failed login attempt for non-existent username: ${username}`);
    return sendError(res, 401, 'invalid credentials');
  }

  const passwordCorrect = await bcrypt.compare(password, userInDB.passwordHash);

  if (!passwordCorrect) {
    console.warn(`Failed login attempt for username: ${username} with invalid password`);
    return sendError(res, 401, 'invalid credentials');
  }

  const secret = process.env.SECRET;
  if (!secret) {
    console.error('SECRET environment variable is not set');
    return sendError(res, 500, 'internal server error');
  }

  const token = jwt.sign({ username, _id: userInDB._id }, secret, { expiresIn: '30d' });

  return sendSuccess(res, { token, username, _id: userInDB._id }, 200, 'login successful');
});

export default router;

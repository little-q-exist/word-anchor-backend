import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import User from '#modules/users/models/users.js';
import type { NewUser } from '#modules/users/types.js';

import { sendError, sendSuccess } from '#response';

const router = express.Router();

/**
 * @openapi
 * /api/users/{username}/existence:
 *   get:
 *     tags: [Auth]
 *     summary: 检查用户名是否存在
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: 待检查的用户名
 *     responses:
 *       200:
 *         description: 返回用户名是否已存在
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         exists:
 *                           type: boolean
 */
router.get('/:username/existence', async (req: Request<{ username: string }>, res: Response) => {
  const exists = await User.exists({ username: req.params.username });
  /*
    TODO: This endpoint leaks whether a username is registered,
    which enables user enumeration.
    If it's required for UX, consider adding rate limiting/throttling,
    normalization (trim/lowercase if applicable),
    and/or returning a less directly enumerable response (or requiring auth) to reduce abuse risk.
  */
  return sendSuccess(res, { exists: !!exists });
});

/**
 * @openapi
 * /api/users/register:
 *   post:
 *     tags: [Auth]
 *     summary: 用户注册
 *     description: 注册新用户，密码使用 bcrypt 加密（13 轮 salt）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewUser'
 *     responses:
 *       201:
 *         description: 注册成功，返回新用户信息
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: 用户名已存在
 */
router.post('/register', async (req: Request<unknown, unknown, NewUser>, res: Response) => {
  const { username, password, email = '' } = req.body;

  const userExist = await User.exists({ username });

  if (userExist) {
    return sendError(res, 400, 'username already exists');
  }

  const saltRound = 13;
  const passwordHash = await bcrypt.hash(password, saltRound);
  const newUser = await new User({ username, passwordHash, email }).save();
  return sendSuccess(res, newUser, 201, 'user registered');
});

export default router;

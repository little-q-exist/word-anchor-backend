import express, { Request, Response } from 'express';

import User from '#modules/users/models/users.js';

import { authTokenMiddleware } from '#shared/middleware.js';
import { sendError, sendSuccess } from '#response';

const router = express.Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [User]
 *     summary: 获取所有用户（管理员）
 *     description: 仅管理员可获取所有用户列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 非管理员禁止访问
 */
router.get('/', authTokenMiddleware, async (_req: Request, res: Response) => {
  const user = await User.findById(res.locals._id);
  if (user && user.isAdmin) {
    const data = await User.find({});
    return sendSuccess(res, data);
  } else {
    return sendError(res, 403, 'forbidden');
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [User]
 *     summary: 获取单个用户
 *     description: 仅允许获取当前登录用户自己的信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户 ID
 *     responses:
 *       200:
 *         description: 用户详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权访问其他用户信息
 *       404:
 *         description: 用户不存在
 */
router.get('/:id', authTokenMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  if (req.params.id !== res.locals._id) {
    return sendError(res, 403, 'forbidden');
  }
  const data = await User.findById(req.params.id);
  if (!data) {
    return sendError(res, 404, 'user not found');
  }
  return sendSuccess(res, data);
});

export default router;

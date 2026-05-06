import express, { NextFunction, Request, Response } from 'express';

import { authTokenMiddleware } from '#shared/middleware.js';
import mongoose from 'mongoose';
import { LearnService } from '#modules/learn/services/learn.js';
import { TimeService } from '#modules/learn/services/time.js';
import UserWord from '../models/userWords.js';
import Word from '#modules/words/models/words.js';
import { sendError, sendSuccess } from '#response';

const router = express.Router();

/**
 * @openapi
 * /api/users/{id}/learning-data:
 *   get:
 *     tags: [Learn]
 *     summary: 获取用户学习数据
 *     description: 获取指定用户的所有单词学习记录
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
 *         description: 用户的学习数据列表
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
 *                         $ref: '#/components/schemas/UserWord'
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权访问其他用户数据
 */
router.get(
  '/:id/learning-data',
  authTokenMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    if (req.params.id !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }
    const data = await UserWord.find({ userId: req.params.id }).lean();
    return sendSuccess(res, data);
  }
);

/**
 * @openapi
 * /api/users/{userId}/words/{wordId}:
 *   get:
 *     tags: [Learn]
 *     summary: 获取用户对单个单词的学习记录
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户 ID
 *       - in: path
 *         name: wordId
 *         required: true
 *         schema:
 *           type: string
 *         description: 单词 ID
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: 需要返回的字段，逗号分隔
 *     responses:
 *       200:
 *         description: 用户-单词学习记录
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserWord'
 *       400:
 *         description: 无效的用户 ID 或单词 ID
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权访问其他用户数据
 */
router.get(
  '/:userId/words/:wordId',
  authTokenMiddleware,
  async (req: Request<{ userId: string; wordId: string }>, res: Response) => {
    const { fields } = req.query;
    const wordId = req.params.wordId;
    const userId = req.params.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return sendError(res, 400, 'invalid word id');
    }

    const query = UserWord.findOne({ userId, wordId });

    let fieldsString;
    if (fields) {
      fieldsString = String(fields).split(',').join(' ');
      query.select(fieldsString);
    }

    const wordDoc = await query.exec();
    return sendSuccess(res, wordDoc);
  }
);

/**
 * @openapi
 * /api/users/{userId}/words/{wordId}/familiarity:
 *   patch:
 *     tags: [Learn]
 *     summary: 更新单词熟练度
 *     description: 更新用户对指定单词的熟练度（0-5），将触发间隔学习算法重新计算复习时间
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户 ID
 *       - in: path
 *         name: wordId
 *         required: true
 *         schema:
 *           type: string
 *         description: 单词 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FamiliarityBody'
 *     responses:
 *       200:
 *         description: 更新后的学习记录
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserWord'
 *       400:
 *         description: 无效的用户 ID、单词 ID 或熟练度值
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权操作其他用户数据
 *       404:
 *         description: 单词不存在
 */
router.patch(
  '/:userId/words/:wordId/familiarity',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; wordId: string }, unknown, { familiarity: number }>,
    res: Response
  ) => {
    const familiarity = req.body.familiarity;
    const wordId = req.params.wordId;
    const userId = req.params.userId;

    if (![0, 1, 2, 3, 4, 5].includes(familiarity)) {
      return sendError(res, 400, 'invalid familiarity');
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return sendError(res, 400, 'invalid word id');
    }

    const wordDoc = await Word.findById(wordId).select('english').lean();

    if (!wordDoc) {
      return sendError(res, 404, 'word not found');
    }

    const updatedUserWordDoc = await LearnService.upsertLearningData(
      userId,
      wordId,
      wordDoc,
      familiarity
    );

    return sendSuccess(res, updatedUserWordDoc);
  }
);

/**
 * @openapi
 * /api/users/{userId}/words/{wordId}/favorite:
 *   patch:
 *     tags: [Learn]
 *     summary: 切换单词收藏状态
 *     description: 切换用户对指定单词的收藏状态。如果用户尚未学习该单词，会自动创建一条学习记录。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户 ID
 *       - in: path
 *         name: wordId
 *         required: true
 *         schema:
 *           type: string
 *         description: 单词 ID
 *     responses:
 *       200:
 *         description: 更新后的收藏状态
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserWordFavoriteResponse'
 *       400:
 *         description: 无效的用户 ID 或单词 ID
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权操作其他用户数据
 *       404:
 *         description: 单词不存在
 */
router.patch(
  '/:userId/words/:wordId/favorite',
  authTokenMiddleware,
  async (req: Request<{ userId: string; wordId: string }>, res: Response) => {
    const userId = req.params.userId;
    const wordId = req.params.wordId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!wordId || !mongoose.Types.ObjectId.isValid(wordId)) {
      return sendError(res, 400, 'invalid word id');
    }

    let userWordDoc = await UserWord.findOne({ userId, wordId });

    const wordDoc = await Word.findById(wordId).select('english').lean();

    if (!wordDoc) {
      return sendError(res, 404, 'word not found');
    }

    if (!userWordDoc) {
      userWordDoc = new UserWord({
        userId: new mongoose.Types.ObjectId(userId),
        wordId: new mongoose.Types.ObjectId(wordId),
        english: wordDoc.english,
      });
    }

    userWordDoc.set('favorited', !userWordDoc.favorited);

    const updatedWordDoc = await userWordDoc.save();
    return sendSuccess(res, {
      _id: updatedWordDoc._id,
      wordId: updatedWordDoc.wordId,
      userId: updatedWordDoc.userId,
      favorited: updatedWordDoc.favorited,
    });
  }
);

/**
 * @openapi
 * /api/users/{userId}/stats:
 *   get:
 *     tags: [Learn]
 *     summary: 获取用户学习统计
 *     description: 获取用户今日学习数量和总学习数量
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户 ID
 *     responses:
 *       200:
 *         description: 学习统计数据
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/StatsResponse'
 *       400:
 *         description: 无效的用户 ID
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权访问其他用户数据
 */
router.get(
  '/:userId/stats',
  authTokenMiddleware,
  async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    const startOfDay = TimeService.getStartOfToday();
    const endOfDay = TimeService.getEndOfToday();

    try {
      const todayCount = await UserWord.countDocuments({
        userId,
        lastLearned: { $gte: startOfDay, $lte: endOfDay },
      });

      const totalCount = await UserWord.countDocuments({ userId, lastLearned: { $exists: true } });

      return sendSuccess(res, { todayCount, totalCount });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

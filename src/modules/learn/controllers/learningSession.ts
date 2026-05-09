import express, { Request, Response } from 'express';

import { authTokenMiddleware } from '#shared/middleware.js';
import mongoose from 'mongoose';
import { sendError, sendSuccess } from '#response';
import LearningSession, {
  LearningMode,
  SessionQueueSnapshot,
  LearningSession as LearningSessionType,
} from '#modules/learn/models/learningSessions.js';
import { LearnService } from '#modules/learn/services/learn.js';
import { TimeService } from '../services/time.js';

const router = express.Router();

const learningModes: LearningMode[] = ['learn', 'review'];

const isLearningMode = (mode: string): mode is LearningMode => {
  return learningModes.includes(mode as LearningMode);
};

const isValidQueueSnapshot = (snapshot: SessionQueueSnapshot): boolean => {
  return (
    Number.isInteger(snapshot.index) &&
    snapshot.index >= 0 &&
    typeof snapshot.isRepeating === 'boolean' &&
    Array.isArray(snapshot.repeatQueue) &&
    snapshot.repeatQueue.every((item) => Number.isInteger(item) && item >= 0)
  );
};

/**
 * @openapi
 * /api/users/{userId}/learning-sessions/{mode}:
 *   get:
 *     tags: [Learn]
 *     summary: 获取学习会话
 *     description: 获取用户在指定模式下的学习会话。mode 为 "learn" 或 "review"。
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
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [learn, review]
 *         description: 学习模式
 *     responses:
 *       200:
 *         description: 学习会话详情（可能为空）
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/LearningSession'
 *       400:
 *         description: 无效的用户 ID 或学习模式
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权访问其他用户数据
 */
router.get(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (req: Request<{ userId: string; mode: string }>, res: Response) => {
    const { userId, mode } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    const session = await LearningSession.findOne({ userId, mode }).lean();

    return sendSuccess(res, session);
  }
);

/**
 * @openapi
 * /api/users/{userId}/learning-sessions/{mode}:
 *   post:
 *     tags: [Learn]
 *     summary: 创建学习会话
 *     description: 为用户创建指定模式的学习会话，包含待学习或复习的单词列表。每个用户每种模式只能有一个活跃会话。
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
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [learn, review]
 *         description: 学习模式
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 单词数量上限
 *     responses:
 *       200:
 *         description: 创建成功，返回新学习会话
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/LearningSession'
 *       400:
 *         description: 无效的用户 ID 或学习模式
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权操作其他用户数据
 *       409:
 *         description: 该模式的学习会话已存在
 */
router.post(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (req: Request<{ userId: string; mode: string }>, res: Response) => {
    const { userId, mode } = req.params;
    const { limit = 10 } = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    const existingSession = await LearningSession.findOne({ userId, mode }).lean();

    if (existingSession) {
      return sendError(res, 409, 'learning session already exists');
    }

    const words =
      mode === 'learn'
        ? await LearnService.getWordToLearn(userId, Number(limit))
        : await LearnService.getWordToReview(userId, Number(limit));

    const newSession = await LearningSession.create({
      userId: new mongoose.Types.ObjectId(userId),
      mode,
      words,
      version: TimeService.getCurrentTimeStamp(),
    });

    return sendSuccess(res, newSession);
  }
);

type PatchLearningSessionBody = Pick<LearningSessionType, 'queueSnapshot'>;

/**
 * @openapi
 * /api/users/{userId}/learning-sessions/{mode}:
 *   patch:
 *     tags: [Learn]
 *     summary: 更新学习会话
 *     description: 更新学习会话的队列快照。使用 version 字段进行乐观锁并发控制以防止冲突。
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
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [learn, review]
 *         description: 学习模式
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatchLearningSessionBody'
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/LearningSession'
 *       400:
 *         description: 无效的用户 ID、学习模式或队列快照
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权操作其他用户数据
 *       404:
 *         description: 学习会话不存在
 *       409:
 *         description: 学习会话/学习队列版本冲突，返回最新的会话数据
 */
router.patch(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (
    req: Request<{ userId: string; mode: string }, unknown, PatchLearningSessionBody>,
    res: Response
  ) => {
    const { userId, mode } = req.params;
    const { queueSnapshot } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    if (!queueSnapshot || !isValidQueueSnapshot(queueSnapshot)) {
      return sendError(res, 400, 'invalid queue snapshot');
    }

    const existingSession = await LearningSession.findOne({ userId, mode });

    if (!existingSession) {
      return sendError(res, 404, 'learning session not found');
    }

    if (
      queueSnapshot &&
      !TimeService.parseDate(queueSnapshot.version).isSame(
        TimeService.parseDate(existingSession.queueSnapshot.version)
      )
    ) {
      return sendError(res, 409, 'queue snapshot version conflict', {
        existingSession,
      });
    }

    const savedSession = await LearningSession.findOneAndUpdate(
      { userId, mode },
      {
        queueSnapshot: { ...queueSnapshot, version: TimeService.getCurrentTimeStamp() },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    return sendSuccess(res, savedSession);
  }
);

/**
 * @openapi
 * /api/users/{userId}/learning-sessions/{mode}:
 *   delete:
 *     tags: [Learn]
 *     summary: 删除学习会话
 *     description: 删除用户指定模式的学习会话
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
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [learn, review]
 *         description: 学习模式
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardResponse'
 *       400:
 *         description: 无效的用户 ID 或学习模式
 *       401:
 *         description: token 无效或缺失
 *       403:
 *         description: 无权操作其他用户数据
 */
router.delete(
  '/:userId/learning-sessions/:mode',
  authTokenMiddleware,
  async (req: Request<{ userId: string; mode: string }>, res: Response) => {
    const { userId, mode } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'invalid user id');
    }

    if (userId !== res.locals._id) {
      return sendError(res, 403, 'forbidden');
    }

    if (!isLearningMode(mode)) {
      return sendError(res, 400, 'invalid learning mode');
    }

    await LearningSession.deleteOne({ userId, mode });

    return sendSuccess(res, null);
  }
);

export default router;

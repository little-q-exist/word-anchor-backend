import express, { Request, Response } from 'express';

import Word from '../models/words.js';
import type { BriefWordListWithMode, NewWord, Word as WordType } from '../types.js';
import UserWord from '#modules/learn/models/userWords.js';
import { authTokenMiddleware } from '#shared/middleware.js';
import mongoose from 'mongoose';
import { sendError, sendSuccess } from '#response';
import { TimeService } from '#modules/learn/services/time.js';

const router = express.Router();

interface WordsQuery {
  english?: object;
  'definitions.meaning'?: object;
  tags?: object;
}

/**
 * @openapi
 * /api/words:
 *   get:
 *     tags: [Word]
 *     summary: 查询单词列表
 *     description: 根据英文、释义、标签等条件分页查询单词
 *     parameters:
 *       - in: query
 *         name: english
 *         schema:
 *           type: string
 *         description: 英文模糊匹配
 *       - in: query
 *         name: meaning
 *         schema:
 *           type: string
 *         description: 释义模糊匹配
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 标签筛选，逗号分隔
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 9
 *         description: 每页数量
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *     responses:
 *       200:
 *         description: 返回单词列表、总数和当前页大小
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
 *                         words:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Word'
 *                         count:
 *                           type: integer
 *                         pageSize:
 *                           type: integer
 */
router.get('/', async (req, res) => {
  const { english, meaning, tags, limit = 9, page = 1 } = req.query;

  const queryFilter: WordsQuery = {};

  if (english) queryFilter.english = { $regex: english, $options: 'i' };
  if (tags) queryFilter.tags = { $in: (tags as string).split(',') };
  if (meaning) queryFilter['definitions.meaning'] = { $regex: meaning, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);

  const words = await Word.find(queryFilter)
    .select('english definitions phonetic')
    .skip(skip)
    .limit(Number(limit));
  const count = await Word.countDocuments(queryFilter);
  return sendSuccess(res, { words, count, pageSize: words.length });
});

/**
 * @openapi
 * /api/words/count:
 *   get:
 *     tags: [Word]
 *     summary: 获取单词总数
 *     responses:
 *       200:
 *         description: 返回单词总数
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: integer
 */
router.get('/count', async (_req, res) => {
  return sendSuccess(res, await Word.countDocuments());
});

/**
 * @openapi
 * /api/words/tags:
 *   get:
 *     tags: [Word]
 *     summary: 获取所有标签
 *     description: 返回去重并排序后的标签列表
 *     responses:
 *       200:
 *         description: 标签列表
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
 *                         type: string
 */
router.get('/tags', async (_req, res) => {
  const tags = await Word.distinct('tags');
  return sendSuccess(res, tags.filter(Boolean).sort());
});

/**
 * @openapi
 * /api/words/learn:
 *   get:
 *     tags: [Learn]
 *     summary: 获取待学习单词
 *     description: 获取当前用户尚未学习的单词列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 返回数量上限
 *     responses:
 *       200:
 *         description: 待学习单词列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BriefWordList'
 *       401:
 *         description: token 无效或缺失
 */
router.get('/learn', authTokenMiddleware, async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const userId = res.locals._id;

  const learnedWordIds = await UserWord.find({ userId, lastLearned: { $exists: true } }).distinct(
    'wordId'
  );

  const words = await Word.find({ _id: { $nin: learnedWordIds } }, '_id english')
    .limit(Number(limit))
    .lean();

  return sendSuccess<BriefWordListWithMode>(res, {
    mode: 'learn',
    words: words.map((word) => ({ _id: word._id, english: word.english, status: 'idle' })),
    count: words.length,
  });
});

/**
 * @openapi
 * /api/words/review:
 *   get:
 *     tags: [Learn]
 *     summary: 获取待复习单词
 *     description: 获取当前用户到期需要复习的单词列表，按到期时间和难度排序
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 待复习单词列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BriefWordList'
 *       401:
 *         description: token 无效或缺失
 */
router.get('/review', authTokenMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals._id;

  const endOfDay = TimeService.getEndOfToday();

  const overDueDataIds = await UserWord.find({
    userId,
    dueDate: { $lte: endOfDay },
  })
    .sort({ dueDate: 'asc', easeFactor: 'asc' })
    .select('wordId english')
    .lean();

  return sendSuccess<BriefWordListWithMode>(res, {
    mode: 'review',
    words: overDueDataIds.map((item) => ({ _id: item.wordId, english: item.english, status: 'idle' })),
    count: overDueDataIds.length,
  });
});

/**
 * @openapi
 * /api/words/{id}:
 *   get:
 *     tags: [Word]
 *     summary: 获取单个单词
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 单词 ID
 *     responses:
 *       200:
 *         description: 单词详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Word'
 *       400:
 *         description: 无效的单词 ID
 *       404:
 *         description: 单词不存在
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 400, 'invalid word id');
  }

  const word = await Word.findById(id).lean();

  if (!word) {
    return sendError(res, 404, 'word not found');
  }

  return sendSuccess(res, word);
});

/**
 * @openapi
 * /api/words/{id}:
 *   put:
 *     tags: [Word]
 *     summary: 更新单词
 *     description: 更新指定单词的全部信息，需要认证
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 单词 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewWord'
 *     responses:
 *       200:
 *         description: 更新后的单词
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Word'
 *       400:
 *         description: 无效的单词 ID
 *       401:
 *         description: token 无效或缺失
 *       404:
 *         description: 单词不存在
 */
router.put(
  '/:id',
  authTokenMiddleware,
  async (req: Request<{ id: string }, unknown, WordType>, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, 'invalid word id');
    }

    const updatedWord = req.body;
    const word = await Word.findByIdAndUpdate(req.params.id, updatedWord, {
      returnOriginal: false,
    });

    if (!word) {
      return sendError(res, 404, 'word not found');
    }

    return sendSuccess(res, word);
  }
);

/**
 * @openapi
 * /api/words:
 *   post:
 *     tags: [Word]
 *     summary: 创建新单词
 *     description: 创建一个新单词，需要认证。创建者 ID 由 token 自动填入。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewWord'
 *     responses:
 *       201:
 *         description: 单词创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Word'
 *       401:
 *         description: token 无效或缺失
 */
router.post(
  '/',
  authTokenMiddleware,
  async (req: Request<unknown, unknown, NewWord>, res: Response) => {
    const word = { ...req.body, createdBy: new mongoose.Types.ObjectId(res.locals._id) };
    const newWord = await new Word(word).save();
    return sendSuccess(res, newWord, 201, 'word created');
  }
);

export default router;

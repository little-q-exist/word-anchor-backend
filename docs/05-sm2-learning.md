# recite-word-server 后端 · SM-2 与学习/复习调度（现状）

相关代码：`src/modules/learn/services/SM-2.ts`、`learn.ts`、`time.ts`；`learn/controllers/{learningSession,userWords}.ts`。

## 1. SuperMemo SM-2（learn/services/SM-2.ts）

`supermemo({ easeFactor, interval, repetition }, quality)`，quality ∈ 0–5，返回：

```ts
{ easeFactor, interval, repetition, shouldRepeat }
```

规则：

- **repetition**：`quality >= 3` → `repetition + 1`；否则重置为 `1`。
- **interval（天数）**：按新 repetition 计——
  - repetition === 1 → 1 天
  - repetition === 2 → 6 天
  - 否则 → `Math.ceil(interval * easeFactor)`
- **easeFactor**：`quality < 3` 时不变；否则 `EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))`，最终夹在 `[1.3, 2.5]`。
- **shouldRepeat**：`quality < 4` 为 true（本会话内需要重学）。

> 语义：quality 0-2 = 忘记（repetition 归 1、EF 不变、需重学）；quality 3 = 勉强（计数+1、EF 微降、需重学）；quality 4-5 = 通过（不重学，间隔按 EF 增长）。注释提示“只在每天首次复习时调用”。

## 2. LearnService（learn/services/learn.ts）

- `defaultUserLearningData = { easeFactor: 2.5, interval: 0, repetition: 0, favorited: false }`
- `upsertLearningData(userId, wordId, wordDoc, quality)`：
  1. 查 UserWord；无则新建（补 userId/wordId/english + 默认参数）；
  2. 已有则保留原记录（英文缺失时回填）；
  3. `learn()` 内部调 supermemo，并把 `lastLearned = 当前时间`、`dueDate = lastLearned + interval 天` 写入；
  4. 保存后返回文档对象 + `shouldRepeat`（familiarity 接口把该值回传给前端）。
- `getWordToLearn(userId, limit=25)`：取所有“无 lastLearned”的 UserWord wordId 集合之外的 Word（即从未学过），随机序（自然序）limit 条，返回 `{_id, english, status:'idle'}[]`。
- `getWordToReview(userId, limit=25)`：UserWord 中 `dueDate <= 今天结束`，按 `dueDate asc, easeFactor asc` 排序取 limit 条。

## 3. TimeService（learn/services/time.ts）

- `getCurrentTimeStamp()`：`dayjs().toISOString()`
- `addDaysToDate(date, days)`
- `getStartOfToday() / getEndOfToday()`
- `parseDate(date)`：`dayjs(date)`

时间全部以 ISO 字符串存储/比较（字典序即时间序），供复习筛选与版本对比使用。

## 4. 学习会话（controllers/learningSession.ts）

- **GET /users/:userId/learning-sessions/:mode**：查 `{ userId, mode }`，无则 `data:null`。
- **POST**（创建）：
  - 校验 userId/mode；已存在会话 → 409 `learning session already exists`（配合 `(userId,mode)` 唯一索引兜底）；
  - `mode==='learn'` 调 `LearnService.getWordToLearn`，`review` 调 `getWordToReview`（query `limit` 默认 10 传入）；
  - 无词 → 成功但 `data: null`（前端据此显示“已学完”）；
  - 有词 → 创建 `{ userId, mode, words, version: 当前时间戳 }`。
- **PATCH**（保存进度，乐观锁）：
  - 校验 userId/mode/queueSnapshot 结构（index 为非负整数、isRepeating 布尔、repeatQueue 为非负整数数组）；
  - 会话不存在 → 404；
  - **版本冲突**：`TimeService.parseDate(queueSnapshot.version).isSame(服务端 queueSnapshot.version)` 为 false → 409 + 返回最新 `existingSession`（供客户端 rebase）；
  - 通过则按 `words` 中每项 `_id` 合并更新会话 words 的 status，并把 `queueSnapshot.version` 替换为服务端新时间戳后整体覆盖保存，返回更新后会话。
- **DELETE**：删会话，成功 `data:null`。

> 队列版本采用“ISO 时间戳字符串”作为乐观锁版本号；前端每次 PATCH 携带自己持有的 version，服务端拒绝过期写入并以 409 返回最新状态。

## 5. 熟悉度与收藏（controllers/userWords.ts）

- **PATCH .../familiarity**：校验 familiarity ∈ {0..5} → 查 Word（404）→ `LearnService.upsertLearningData` → 返回 `{ ...UserWord, shouldRepeat }`。
- **PATCH .../favorite**：切换 `favorited`；若用户从未学过该词则先建 UserWord（默认参数）再置收藏。
- **GET .../stats**：`todayCount = UserWord.countDocuments({ userId, lastLearned: 今天范围内 })`；`totalCount = 有 lastLearned 的记录数`。

## 6. 现状备注 / 风险

- `words/controllers/word.ts` 中的 `GET /words/learn`、`GET /words/review` 与 `LearnService.getWordToLearn/getWordToReview` 逻辑重复（前者无 limit 或默认 10、后者默认 25）；目前前端未调用这两条路由，存在双实现漂移风险，建议统一收敛。
- PATCH 乐观锁只比对 `queueSnapshot.version`；会话顶层 `version` 字段冗余（默认时间戳），两处可能不同步，注意维护一致性。
- 复习筛选基于 `dueDate <= 当天结束`，同一会话重复复习当天不会再次出现（dueDate 已推到未来），符合“一天一次”的产品语义。
- 目前无“强制重置/丢弃会话”之外的清空手段（DELETE 由前端 service 提供但未接线）；多设备同时学习依赖 409 冲突协商，而前端暂未实现 rebase（见前端 docs/04-learning.md、06-notes.md）。

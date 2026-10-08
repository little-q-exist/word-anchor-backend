# recite-word-server 后端 · API 清单（现状）

> 统一前缀 `/api`；统一响应信封 `{ code, data, message }`；鉴权一律 `Authorization: Bearer <accessToken>`。
> Swagger UI：`http://localhost:3000/api-docs`（控制器 JSDoc @openapi 生成）。
> 前端实际调用子集已在“前端调用”列标注。

## 1. 认证（Auth）——挂载：`/api/login`、`/api/users`(register)、`/api/refresh`、`/api/logout`

| 方法/路径 | 鉴权 | 入参 | 成功 | 主要错误 | 前端调用 |
|---|---|---|---|---|---|
| POST /api/login | 无 | `{ username, password, remember? }` | 200 `{ accessToken, username, _id }` | 401 invalid credentials；500 缺 SECRET/REFRESH_SECRET | ✅ |
| POST /api/users/register | 无 | `{ username, password, email? }` | 201 用户对象 | 400 username already exists | ✅ |
| GET /api/users/:username/existence | 无 | path | 200 `{ exists }` | — | ⬜（service 有定义未调用） |
| POST /api/refresh | 无（cookie） | httpOnly signed cookie `refreshToken`（path=/api/refresh） | 200 `{ accessToken, username, _id }` | 401 unauthorized / invalid token format / invalid credentials / invalid token version | ✅（axios 自动） |
| POST /api/logout | 无 | — | 204（清 cookie） | — | ✅ |

## 2. 用户（User）——挂载：`/api/users`

| 方法/路径 | 鉴权 | 说明 | 主要错误 |
|---|---|---|---|
| GET /api/users | Bearer + isAdmin | 全部用户列表（管理员） | 401 / 403 |
| GET /api/users/:id | Bearer + 本人 | 当前用户信息 | 403 / 404 user not found |

## 3. 单词（Word）——挂载：`/api/words`（注意 /count、/tags、/learn、/review、/favorite 定义在 /:id 之前）

| 方法/路径 | 鉴权 | 入参 | 说明 |
|---|---|---|---|
| GET /api/words | 无 | query: `english` / `meaning`（正则不区分大小写）、`tags`（逗号分隔，$in）、`limit`(默认9)、`page`(默认1) | 分页查询，select english/definitions/phonetic，返回 `{ words, count, pageSize }`；前端列表页使用 ✅ |
| GET /api/words/count | 无 | — | 单词总数 |
| GET /api/words/tags | 无 | — | 去重排序后的标签列表 ✅（前端标签筛选） |
| GET /api/words/learn | Bearer | query `limit`（默认10） | 未学习词（无 lastLearned 的 UserWord 之外），返回 `{ mode:'learn', words[], count }` ⬜（前端未调用） |
| GET /api/words/review | Bearer | — | 到期复习词：dueDate ≤ 今天结束，按 dueDate/easeFactor 升序，返回 `{ mode:'review', words[], count }`（**当前无 limit**）⬜（前端未调用） |
| GET /api/words/favorite | Bearer | query `page`(默认1)/`limit`(默认10) | 收藏词列表，聚合 UserWord(favorited) join Word，返回 `{ words, count, pageSize }` ⬜（前端未调用） |
| GET /api/words/:id | 无 | path | 单词详情 ✅（列表/学习页详情） |
| PUT /api/words/:id | Bearer | body 全量 NewWord | 全量更新单词；**未校验 createdBy 归属**（见 06-notes） |
| POST /api/words | Bearer | body NewWord | 创建单词，createdBy 由 token 填充，201 |

## 4. 用户学习数据（Learn/UserWord）——挂载：`/api/users`（learn/controllers/userWords.ts）

| 方法/路径 | 鉴权 | 入参 | 说明 |
|---|---|---|---|
| GET /api/users/:id/learning-data | Bearer + 本人 | path id | 该用户全部 UserWord 记录 ⬜（前端未调用） |
| GET /api/users/:userId/words/:wordId | Bearer + 本人 | path；query `fields`(逗号分隔 select) | 单条学习记录（无则 data=null）✅（收藏态查询用 fields=favorited） |
| PATCH /api/users/:userId/words/:wordId/familiarity | Bearer + 本人 | `{ familiarity: 0-5 }` | 更新熟练度：触发 SM-2，返回 UserWord + `shouldRepeat` ✅（LearnWordButtons） |
| PATCH /api/users/:userId/words/:wordId/favorite | Bearer + 本人 | — | 切换收藏；无 UserWord 时自动创建 ✅（FavouriteSideButton） |
| GET /api/users/:userId/stats | Bearer + 本人 | path | `{ todayCount, totalCount }`（今日以 lastLearned 落在今天计）✅（Profile） |

## 5. 学习会话（Learn/Session）——挂载：`/api/users`（learn/controllers/learningSession.ts）

| 方法/路径 | 鉴权 | 入参 | 说明 |
|---|---|---|---|
| GET /api/users/:userId/learning-sessions/:mode | Bearer + 本人 | mode ∈ learn/review | 取会话；无则 `data: null` ✅ |
| POST /api/users/:userId/learning-sessions/:mode | Bearer + 本人 | query `limit`（默认10） | 创建会话：learn 走“未学过词”、review 走“到期词”（LearnService 内部默认 25 上限）；已存在 → 409；无词 → `data: null` ✅（前端自动创建） |
| PATCH /api/users/:userId/learning-sessions/:mode | Bearer + 本人 | `{ queueSnapshot, words:[{_id,status}] }` | 快照+单词状态保存；version 不匹配 → 409 附最新会话；成功返回更新后会话 ✅（useLearnQueue） |
| DELETE /api/users/:userId/learning-sessions/:mode | Bearer + 本人 | — | 删除会话（`data: null`）⬜（前端 service 有定义未调用） |

## 6. 通用校验约定

- ObjectId 不合法 → 400 `invalid user id` / `invalid word id`；familiarity 非 0-5 → 400 `invalid familiarity`；mode 非法 → 400 `invalid learning mode`；queueSnapshot 结构非法 → 400 `invalid queue snapshot`。
- 非本人访问 → 403 `forbidden`；资源不存在 → 404；并发版本冲突 → 409（仅学习会话）。
- GET /api/users（admin 列表）是唯一的角色权限点；单词写接口（POST/PUT）任何登录用户均可操作。

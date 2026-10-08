# recite-word-server 后端 · 数据模型（现状）

共 4 个集合：`users`、`words`、`userwords`（UserWord）、`learningsessions`（LearningSession）。
各模型代码旁还有单模型文档（`src/modules/<module>/models/*.md`），可作为更细的“数据字典”，本文为汇总。

## 1. User（src/modules/users/models/users.ts，集合 users）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| username | String | required / unique / index | 用户名，登录标识 |
| email | String | 选填 | 邮箱 |
| passwordHash | String | required / `select: false` | bcrypt(13) 哈希；默认查询不返回 |
| isAdmin | Boolean | required / default false | 管理员标记（保留） |
| tokenVersion | Number | required / default 0 | refreshToken 版本号；用于“全局登出/改密后旧 refresh 失效” |

## 2. Word（src/modules/words/models/words.ts，集合 words）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| english | String | required / lowercase / trim / index | 英文原型，小写存储 |
| phonetic | String | required | 音标 |
| definitions | Array<sub> | required + 自定义验证（长度>0） | 内嵌子文档：`{ meaning, partOfSpeech }`；`partOfSpeech` enum：verb/noun/adjective/adverb/preposition |
| exampleSentence | String[] | required | 例句 |
| related | String[] | 默认 [] | 相关词 |
| tags | String[] | 默认 []；元素 enum | CET4 / CET6 / TOEFL / IELTS / GRE / 考研 / 编程 / 日常 |
| createdBy | ObjectId | required / ref User | 创建者 |

- `toJSON`/`toObject` 开启 virtuals；虚拟字段 `learningData`（ref UserWord，localField `_id` ↔ foreignField `wordId`），目前未见 populate 使用点。

## 3. UserWord（src/modules/learn/models/userWords.ts，集合 userwords）

“用户-单词”学习状态表，承载 SM-2 记忆参数：

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| userId | ObjectId | required / ref User | 用户 |
| wordId | ObjectId | required / ref Word | 单词 |
| english | String | required | 冗余存英文（取词/复习列表直接用） |
| easeFactor | Number | default 2.5 | SM-2 EF |
| interval | Number | default 0 | 间隔天数 |
| repetition | Number | default 0 | 连续答对次数 |
| lastLearned | String | 选填（ISO） | 最近学习时间戳；存在即视为“学过” |
| dueDate | String | 选填（ISO） | 下次到期时间 |
| favorited | Boolean | default false | 是否收藏 |

索引：
- `{ userId: 1, wordId: 1 }` **unique**（同一用户同一词只有一条记录）
- `{ userId: 1, favorited: 1, wordId: 1 }`（收藏列表查询）

## 4. LearningSession（src/modules/learn/models/learningSessions.ts，集合 learningsessions）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| userId | ObjectId | required / ref User | 用户 |
| mode | String | enum `learn` / `review` | 模式 |
| words | Array<sub> | required | `{ _id(String=wordId), english, status }`；status enum `idle` / `passed` / `failed`（子文档 `_id:false`，其 `_id` 实为单词 id 字符串） |
| queueSnapshot | Object | 默认 `{}` | `{ index, isRepeating, repeatQueue: number[], version: ISO 字符串 }`；version 默认当前时间戳 |
| version | String | 默认当前时间戳 | 会话级版本（冗余；实际 PATCH 以 queueSnapshot.version 为准） |

索引：`{ userId: 1, mode: 1 }` **unique** —— 每用户每模式至多一个活跃会话（创建时若已存在返回 409）。

## 5. 一致性说明

- `lastLearned` / `dueDate` / `version` 均存 ISO 8601 字符串（由 TimeService 生成），字符串字典序即时间序，故 `dueDate: { $lte: endOfDay }` 可直接比较。
- Word 的 `definitions[].partOfSpeech` 枚举较严（5 种），而前端 db.json mock 数据使用过 `adj.` 等写法；若要走 POST/PUT 写词需保证数据符合该枚举。
- 建议后续修改模型时同步更新 `src/modules/*/models/*.md`（本仓库已有该惯例）。

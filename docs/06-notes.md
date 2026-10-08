# recite-word-server 后端 · 现状备注 / 缺口 / 风险点

## 1. 工程现状

- **无自动化测试**：`npm test` 是占位脚本（`echo "Error: no test specified" && exit 1`）；`.env` 中预留 `testMONGODB_SRVURI` / `testMONGODB_URI` 但目前无任何测试代码引用。
- **存在未提交改动**：仓库当前（2026-09-08）`src/shared/middleware.ts` 有工作区改动——tokenAuthenticator 错误不再 `console.info`，`classErrorHandler` 增加请求 method/path 日志（`console.error` + 分隔线）。属于日志治理的进行中改动，注意与 README/CLAUDE.md 的“no-console 规则”一致（已用 error/info）。
- 模型层附带单模型 Markdown 文档（`src/modules/*/models/*.md`），改动 Schema 时应同步更新（仓库已有该惯例）。

## 2. 接口缺口

| 主题 | 现状 |
|---|---|
| 单词删除 | 无 `DELETE /api/words/:id` |
| 单词修改权限 | `PUT /api/words/:id` 仅要求登录，**不校验 createdBy 归属**；`POST /api/words` 同理，任何登录用户可写任意词/建词 |
| 单词唯一性 | `english` 只有普通 index，**无 unique**；同一单词可被重复创建 |
| 用户管理 | 除“管理员列全部用户”外无用户资料修改/改密/删除/封禁接口；`tokenVersion` 预留但无修改入口（无法主动吊销 refresh） |
| 收藏/学习数据 | `GET /api/words/favorite`、`GET /api/users/:id/learning-data` 已实现但前端未接线；无“取消全部收藏/清空学习记录”类批量接口 |
| 重复实现 | `GET /words/learn`、`GET /words/review` 与 `LearnService.getWordToLearn/getWordToReview` 逻辑重复且参数不一致（limit 默认 10 vs 25、review 端无 limit），建议收敛为单一实现 |

## 3. 安全与运维风险

| 风险 | 说明 |
|---|---|
| 用户枚举 | 注册“用户名已存在”与 `GET /users/:username/existence` 均可枚举用户名（代码内有 TODO 注释）；无限流/验证码 |
| 登录爆破 | 无登录限流/失败锁定；仅 console.warn 记录 |
| refresh 不轮换 | refreshToken 固定 30 天、无撤销表；tokenVersion 具备吊销能力但无触发接口 |
| 密钥校验分散 | `SECRET`/`REFRESH_SECRET` 在请求内“用时校验”（返回 500），与 `COOKIE_SECRET`/`MONGODB_URI` 启动即抛的风格不一致 |
| CORS | 白名单硬编码（localhost:5173 + word-anchor.edgeone.dev），建议环境变量化 |
| Swagger 暴露 | `/api-docs` 未做环境开关，生产若未做网关/鉴权会公开接口描述 |
| 通用安全头 | 未使用 helmet 类中间件（X-Content-Type-Options 等）；依赖反代层补 |
| 日志 | `requestLogger` 仅记非 GET；错误日志在 classErrorHandler 集中打印 method/path/error（改动中），尚无结构化/请求 ID 关联 |

## 4. 数据/一致性备注

- `lastLearned`、`dueDate`、`queueSnapshot.version` 均为 ISO 字符串；跨时区比较依赖 dayjs 的“本地日”切分（`getStartOfToday/getEndOfToday`），部署时区影响“今日”统计与复习到期判断。
- UserWord 的 `english` 冗余存储（学习列表免 join）；新建 UserWord 时由调用方传入（favorite 接口用 wordDoc.english 兜底）。
- LearningSession 顶层 `version` 与 `queueSnapshot.version` 双版本存在，PATCH 只更新 `queueSnapshot.version`，二者易漂移。
- Word.definitions[].partOfSpeech 枚举仅 5 类（verb/noun/adjective/adverb/preposition）；旧 mock/样例数据里的 `adj.` 等写法不满足该枚举，写词接口入库前需规范化。

## 5. 建议的近期事项（按优先级）

1. 为 `PUT/POST /api/words` 增加权限与唯一性控制（或明确产品上只允许种子数据写入）。
2. 收敛 `/words/learn`、`/words/review` 与 LearnService 的重复取词逻辑。
3. 接入自动化测试（至少 SM-2 纯函数、会话乐观锁、familiarity 校验的集成测试），并复用预留的 test DB URI。
4. 决策 refresh 轮换/吊销策略，并暴露 tokenVersion 触发点（改密/登出全部设备）。
5. 提交/收尾当前 middleware.ts 的日志改动（保持与 CLAUDE.md no-console 规范一致）。

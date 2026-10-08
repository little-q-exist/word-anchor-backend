# recite-word-server 后端 · 项目总览（现状整理）

> 整理日期：2026-09-08
> 范围：`D:\Q\frontEnd\ReciteWord\recite-word-server`（WordAnchor 后端服务）
> 配套文档：前端请见 `../recite-word/docs/`

## 1. 项目定位

为 WordAnchor（SM-2 间隔重复单词记忆应用）提供 RESTful API：用户认证（双 token）、单词管理、学习会话（learn/review）、单词学习记录与收藏、学习统计，并自带 Swagger UI 文档。

## 2. 技术栈（依据 package.json）

| 领域 | 选型 |
|---|---|
| 运行时/语言 | Node.js + TypeScript 5.9，编译为 ESM（`module: nodenext`，`type: module`） |
| Web 框架 | Express 5 |
| 数据库 | MongoDB（Mongoose 9），连接 Atlas（`.env` 中 `MONGODB_URI`） |
| 认证 | jsonwebtoken（accessToken 1d + refreshToken 30d cookie）+ bcrypt（13 轮 salt） |
| 辅助 | dayjs（日期/时间）、cookie-parser（signed cookie）、cors、dotenv |
| 文档 | swagger-jsdoc（JSDoc @openapi 注释生成）+ swagger-ui-express |
| 开发 | nodemon + tsx（热重载）；ESLint 9 flat config + Prettier |

## 3. 目录结构（现状）

```
recite-word-server/
├── src/
│   ├── index.ts            # 入口：连接 DB、中间件、挂载路由、404/错误处理
│   ├── constants.ts        # SERVER_URL / API_URL（基于 PORT）
│   ├── swagger.ts          # OpenAPI 定义 + components.schemas + securitySchemes
│   ├── shared/
│   │   ├── middleware.ts   # authTokenMiddleware、404、错误处理器、请求日志
│   │   └── response.ts     # 统一信封 {code,data,message}、ApiError、sendSuccess/sendError
│   └── modules/
│       ├── auth/controllers/   # login / register / refresh / logout
│       ├── users/              # types + models/users.ts + controllers/users.ts
│       ├── words/              # types + models/words.ts + controllers/word.ts
│       └── learn/              # types + models/(userWords|learningSessions).ts
│                               # services/(SM-2|learn|time).ts
│                               # controllers/(userWords|learningSession).ts
├── docs/                   # 本文档目录
├── dist/                   # tsc 构建产物（.js + .d.ts）
└── .env                    # 敏感配置，已 gitignore（见 06-notes.md）
```

## 4. 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | nodemon --exec tsx src/index.ts（开发热重载，端口 3000） |
| `npm run build` | tsc 编译到 `dist/` |
| `npm run start` | node dist/index.js（生产运行） |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | **占位脚本**：`echo "Error: no test specified" && exit 1`，当前无自动化测试 |

## 5. 环境变量（.env，键名）

`MONGODB_URI`、`PORT`（默认 3000）、`SECRET`（accessToken 密钥）、`REFRESH_SECRET`（refreshToken 密钥）、`COOKIE_SECRET`（cookie 签名）、`NODE_ENV`；`.env` 另含 `testMONGODB_SRVURI` / `testMONGODB_URI`（测试库备用，当前无测试引用）。

启动期强校验：`COOKIE_SECRET`、`MONGODB_URI` 缺失直接 throw；`SECRET`/`REFRESH_SECRET` 在使用处校验。

## 6. 路径别名

- `tsconfig.json` `paths` 与 `package.json` `imports` 双份定义：`#src/*` → `./src/*`（dist 对应 `#src/*` → `./dist/*`）、`#modules/*`、`#shared/*`、`#response`。
- 源码中 import 一律写 `.js` 后缀（TS 编译成 ESM 后运行时指向 dist 下的 .js）。
- 约定：相对导入超过两级 `../` 时使用别名。

## 7. 文档索引

| 文件 | 内容 |
|---|---|
| `00-overview.md` | 本文档 |
| `01-architecture.md` | 启动流程、请求流、中间件/错误处理、响应信封、工程约定 |
| `02-data-models.md` | User / Word / UserWord / LearningSession 模型与索引 |
| `03-api.md` | 全部 REST 端点清单与鉴权/状态码 |
| `04-auth-session.md` | 双 token 认证与会话细节 |
| `05-sm2-learning.md` | SM-2 算法、LearnService、时间服务、学习会话乐观锁 |
| `06-notes.md` | 现状备注：缺口、风险、待办 |

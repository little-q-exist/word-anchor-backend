# WordAnchor — 智能单词记忆后端服务

WordAnchor 是一个基于 SM-2 间隔重复算法的单词记忆后端服务，为前端应用提供用户认证、单词管理、学习会话和复习调度等 RESTful API。通过科学的记忆曲线调度，帮助用户高效、持久地掌握单词。

## 功能

- **用户认证** — 基于 JWT 的用户注册与登录，Token 有效期 30 天，支持用户名唯一性校验。
- **单词管理** — 支持单词的增删改查，按标签（CET4 / CET6 / TOEFL / IELTS / GRE / 考研 / 编程 / 日常）分类，支持按词义、英文名模糊搜索与分页。
- **SM-2 间隔重复** — 实现 SuperMemo SM-2 算法，根据用户对单词的熟悉度评分（0-5）动态调整复习间隔与简易因子（E-Factor），并在同一次会话中自动标记需要重复的单词。
- **学习会话** — 每个用户每种模式（学习 / 复习）同时仅允许一个活跃会话，使用乐观锁（Optimistic Locking）防止并发冲突。
- **学习统计** — 提供当日学习单词数、累计学习单词数等统计数据。
- **Swagger 文档** — 基于 swagger-jsdoc 自动生成 OpenAPI 3.0 接口文档，可通过 `/api-docs` 访问 Swagger UI。

## 技术栈

- 使用 **Node.js** 运行时，**TypeScript** 编写，编译为 ESM 模块输出。
- 使用 **Express.js** 构建 HTTP 服务，**CORS** 处理跨域请求。
- 使用 **Mongoose** 连接 **MongoDB** Atlas 云端数据库，定义 User、Word、UserWord、LearningSession 四个数据模型。
- 使用 **bcrypt** 对密码进行哈希加盐处理（13 轮），**jsonwebtoken** 签发与验证 JWT。
- 使用 **dayjs** 进行日期计算与格式化。
- 使用 **swagger-jsdoc** + **swagger-ui-express** 生成并展示 API 文档。
- 使用 **nodemon** + **tsx** 支持开发环境热重载。

## 目录结构

```
recite-word-server/
├── src/
│   ├── index.ts                  # 入口文件：Express 启动、中间件注册、路由挂载
│   ├── constants.ts              # 全局常量
│   ├── swagger.ts                # Swagger / OpenAPI 配置与 Schema 定义
│   └── modules/
│       ├── auth/
│       │   └── controllers/
│       │       ├── login.ts      # POST /api/login 登录接口
│       │       └── register.ts   # 注册与用户名存在性校验接口
│       ├── learn/
│       │   ├── controllers/
│       │   │   ├── learningSession.ts  # 学习会话 CRUD（乐观锁并发控制）
│       │   │   └── userWords.ts        # 单词学习记录、熟悉度、收藏接口
│       │   ├── models/
│       │   │   ├── learningSessions.ts # LearningSession Schema
│       │   │   └── userWords.ts        # UserWord Schema（SM-2 字段）
│       │   ├── services/
│       │   │   ├── SM-2.ts       # SuperMemo SM-2 间隔重复算法
│       │   │   ├── learn.ts      # 学习数据写入、待学/待复习单词查询
│       │   │   └── time.ts       # dayjs 日期工具封装
│       │   └── types.ts          # 模块类型定义
│       ├── users/
│       │   ├── controllers/
│       │   │   └── users.ts      # 用户查询接口
│       │   ├── models/
│       │   │   └── users.ts      # User Schema
│       │   └── types.ts
│       └── words/
│           ├── controllers/
│           │   └── word.ts       # 单词 CRUD、搜索、标签接口
│           ├── models/
│           │   └── words.ts      # Word Schema
│           └── types.ts
├── shared/
│   ├── middleware.ts             # JWT 认证中间件、404/全局错误处理、请求日志
│   └── response.ts               # 统一响应格式（StandardResponse）与 ApiError 类
├── .env                          # 环境变量（MongoDB URI、JWT Secret、端口）
├── db.json                       # 示例单词种子数据
├── package.json
└── tsconfig.json
```

### 核心模块说明

- **[src/shared/response.ts](src/shared/response.ts)** — 定义统一的 API 响应格式 `{ code, data, message }` 和 `ApiError` 类，所有接口通过 `sendSuccess` / `sendError` 返回标准化 JSON。
- **[src/shared/middleware.ts](src/shared/middleware.ts)** — JWT 认证中间件从 `Authorization` 头提取 Bearer Token，校验后注入 `res.locals._id`；全局错误处理器统一处理 ApiError、JWT 错误、Mongoose 校验错误等。
- **[src/modules/learn/services/SM-2.ts](src/modules/learn/services/SM-2.ts)** — SM-2 算法核心：根据质量评分（0-5）计算新的间隔、重复次数和简易因子，并判断是否需要当次重复学习。
- **[src/modules/learn/controllers/learningSession.ts](src/modules/learn/controllers/learningSession.ts)** — 学习会话接口，使用 `queueSnapshot.version` 实现乐观锁，防止并发 PATCH 导致的队列状态覆盖。
- **[src/modules/learn/controllers/userWords.ts](src/modules/learn/controllers/userWords.ts)** — 更新单词熟悉度时触发 SM-2 重算并写入 UserWord 记录。
- **[src/modules/words/controllers/word.ts](src/modules/words/controllers/word.ts)** — 单词搜索支持英文名、释义模糊匹配，标签筛选，分页查询。
- **[src/index.ts](src/index.ts)** — 应用入口，注册中间件、连接 MongoDB、挂载所有路由模块。

## 贡献指南

### 环境要求

- **Node.js** >= 22
- **MongoDB** 实例（本地或 Atlas 云端），需要获取连接 URI
- **npm** >= 11

### 本地开发

```bash
# 1. 克隆仓库
git clone <repo-url>
cd recite-word-server

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 编辑 .env 文件，填写 MongoDB 连接地址和 JWT Secret
# MONGODB_URI=<your-mongodb-uri>
# SECRET=<your-jwt-secret>
# PORT=3000

# 4. 启动开发服务器（热重载）
npm run dev
```

开发服务器默认监听 `http://localhost:3000`，Swagger 文档可通过 `http://localhost:3000/api-docs` 访问。

### 可用脚本

| 命令              | 说明                           |
| ----------------- | ------------------------------ |
| `npm run dev`     | 启动开发服务器（nodemon + tsx） |
| `npm run build`   | TypeScript 编译为 JavaScript   |
| `npm start`       | 运行编译后的生产版本            |
| `npm run format`  | Prettier 格式化代码            |
| `npm run lint`    | ESLint 代码检查                |

## 许可证

本项目遵循 [MIT License](https://opensource.org/licenses/MIT)。
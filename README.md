# Word Anchor Server

## 项目名称与简介

Word Anchor Server 是一个专为背单词网页应用（Word Anchor）提供核心业务逻辑与数据支撑的后端服务。本项目的核心目标是通过提供稳定、高效的接口，支持科学的单词复习算法（如 SM-2），从而帮助用户根据个人记忆曲线高效地记忆单词，最大化学习效率。

**与前端的协同配合：**
结合前端（基于 React + Redux + TypeScript 构建的 SPA 应用），本后端应用充当了整个系统的数据大脑。前端通过 Axios 发起 HTTP 请求，后端则负责处理：
1. **身份认证**：前端收集用户凭证，后端通过 JWT 签发 Token，前后端配合实现无状态的会话维持。
2. **数据同步与持久化**：无论是新学习的单词（Learn阶段）还是复习的单词（Review阶段），前端的进度都会实时同步至后端，后端运算更新用户的学习进度并持久化至数据库。
3. **算法驱动**：核心的 SM-2 记忆算法在后端进行精密计算，决定用户每天需要学习和复习的词汇列表，再封装为 JSON 响应推送给前端进行视图渲染。

**后端 API 设计思路：**
本项目采用高度模块化的 RESTful API 架构风格设计，确保接口的语义明确和轻量化：
- **资源导向**：API 路由严格按照业务域（如 `users` 用户资源, `words` 词库资源, `userWords` 用户学习记录资源, `login` 认证资源）进行拆分。
- **状态无感知设计**：服务端无状态，所有的受保护 API 均通过请求头中的 JWT (Bearer Token) 被自定义 Middleware 鉴权拦截，保障安全性。
- **业务解耦**：采用路由 (Routes) -> 控制器 (Controllers) -> 模型 (Models) 与 算法层 (Algo) 的经典分层设计，将底层数据操作、算法逻辑与 HTTP 传输层隔离，提升代码可读性与可维护性。

## 技术栈详解

本项目采用现代化 Node.js 生态链进行开发：

- **Express**: 快速、灵活且极简的 Web 框架，作为基础 HTTP 服务器，负责路由分发与中间件处理。
- **Mongoose**: 优雅的 MongoDB 对象建模工具，提供了强大的数据校验、查询构建能力，负责与底层 MongoDB 交互。
- **TypeScript**: 强类型语言，为整个后端项目提供静态类型检查，保障业务逻辑严谨性，与前端共享一致的数据接口规范。
- **JWT (JSON Web Token)**: 实现用户鉴权的核心规范，用于生成不可轻易篡改的数字签名，保障接口访问安全。
- **Bcrypt**: 业界标准的密码哈希工具，负责对用户敏感密码信息进行加盐加密存储。
- **Dotenv**: 环境变量管理，使得机密配置（如数据库 URI、JWT Secret）能够安全地从代码中剥离。

## 项目结构说明

以下是本后端服务源代码 `src/` 目录的核心结构，方便快速理解与拓展：

```text
recite-word-server/
├── package.json        # 项目依赖与运行脚本
├── tsconfig.json       # TypeScript 编译配置
└── src/                # 源代码主目录
    ├── index.ts        # 应用主入口文件，负责启动逻辑与全局中间件挂载
    ├── middleware.ts   # 自定义 Express 中间件（如 JWT 鉴权过滤拦截）
    ├── constants.ts    # 系统全局常量配置
    ├── algo/           # 核心算法引擎
    │   ├── SM-2.ts     # 核心记忆规律算法实现
    │   ├── learn.ts    # 结合算法的学习任务分发逻辑
    │   └── SM-2.test.ts# 算法模块的单元测试
    ├── controllers/    # API 控制器，负责请求的解析与 HTTP 响应下发
    │   ├── login.ts    # 登录鉴权逻辑
    │   ├── users.ts    # 用户信息操作
    │   ├── userWords.ts# 用户单词进度同步与读取
    │   └── word.ts     # 词库数据的分发
    └── models/         # Mongoose 数据建模层，定义数据库 Schema
        ├── users.ts    # 用户资料数据集
        ├── userWords.ts# 关联集合：记录具体用户每个单词的学习状态与下次复习时间
        └── words.ts    # 静态核心词库数据集
```

## 快速开始 (Getting Started)

### 前置条件
- 已安装 **Node.js** (推荐不低于 v22 LTS) 及配套包管理工具 **npm**。
- 可连接的 **MongoDB** 数据库服务（本地或云端均可）。

### 环境准备与安装

1. 克隆项目并进入后端目录：
```bash
git clone git@github.com:little-q-exist/word-anchor-backend.git
cd recite-word-server
```

2. 安装后端所需的所有依赖包：
```bash
npm install
```

3. 环境变量配置：
在项目根目录创建 `.env` 文件，补充必要的系统配置信息，例如：
```env
PORT=3000
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.ifobgfn.mongodb.net/reciteWord?appName=Cluster0
SECRET=[your_super_secret_key_here]
```

### 启动开发服务器

执行以下指令，将使用 `nodemon` 和 `tsx` 加载项目，启动带有实时热重载功能的开发服务器：
```bash
npm run dev
```

启动成功后，控制台将输出服务器运行端口及数据库连接状态。此时即可使用前端应用或 API 工具（如 Postman）对本地服务接口进行调试与访问。可以使用 `npm run format` 格式化代码，并在上线前使用 `npm run build` 执行 TS 编译。

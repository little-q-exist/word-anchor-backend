# recite-word-server 后端 · 运行与架构（现状）

## 1. 启动流程（src/index.ts）

1. 读取并强校验 `COOKIE_SECRET`（缺失 throw）；`PORT` 默认 3000；`MONGODB_URI` 缺失 throw。
2. 注册基础中间件：`express.json()` → `cors({ origin: ['https://word-anchor.edgeone.dev', 'http://localhost:5173'], credentials: true })` → `cookieParser(COOKIE_SECRET)`。
3. `mongoose.connect(MONGODB_URI)` 成功后才 `app.listen(PORT)`（失败打日志并 `process.exit(1)`）。
4. 注册 `requestLogger`（非 GET 请求打印 method/path）。
5. `GET /` 返回 `hello world!`。
6. 挂载 `/api-docs`（Swagger UI）。
7. 挂载业务路由（见下）；最后 `unknownEndPoint`（404）与 `classErrorHandler`（错误兜底）。

路由挂载：

| 前缀 | Router | 模块 |
|---|---|---|
| `/api/words` | words/controllers/word.ts | Word |
| `/api/users` | users/controllers/users.ts | User（admin 列表 / 个人详情） |
| `/api/users` | auth/controllers/register.ts | 注册 + 用户名存在性 |
| `/api/login` | auth/controllers/login.ts | 登录 |
| `/api/refresh` | auth/controllers/refresh.ts | 刷新 accessToken |
| `/api/logout` | auth/controllers/logout.ts | 登出（清 cookie，204） |
| `/api/users` | learn/controllers/userWords.ts | 学习记录/熟练度/收藏/统计 |
| `/api/users` | learn/controllers/learningSession.ts | 学习会话 CRUD |

## 2. 请求处理流程

1. 需要鉴权的路由挂 `authTokenMiddleware`（两个中间件数组）：
   - `tokenExtractor`：从 `Authorization: Bearer <token>` 提取 token 到 `res.locals.token`；
   - `tokenAuthenticator`：`jwt.verify(token, SECRET)`，成功把 `_id` 写入 `res.locals._id`；无 token 直接 401。
2. Controller 校验：ObjectId 合法性（`mongoose.Types.ObjectId.isValid`）、参数与路径一致性（`req.params.userId` 必须等于 `res.locals._id`，否则 403）、业务参数（如 mode、queueSnapshot、familiarity 枚举）。
3. 业务逻辑委托 Mongoose model 或 `LearnService`。
4. 错误统一交给 `classErrorHandler` 分类处理。

## 3. 统一响应信封（src/shared/response.ts）

```ts
{ code: number, data: T, message: string }
```

- `sendSuccess(res, data, statusCode = 200, message = 'success')`——`code` 与 HTTP 状态码一致。
- `sendError(res, statusCode, message, data = null)`。
- `ApiError extends Error`：携带 `statusCode`/`data`，业务代码可 `throw` 后由错误处理器统一响应。

## 4. 错误处理（shared/middleware.ts classErrorHandler）

| 错误类型 | HTTP | message |
|---|---|---|
| `ApiError` | 自定义 | 自定义（透传 data） |
| `jwt.JsonWebTokenError` | 401 | token 错误信息 |
| `MongooseError.ValidationError` | 400 | `validation failed`（附 errors） |
| `MongooseError.CastError` | 400 | `invalid id` |
| 其它 | 500 | `internal server error` |

`requestLogger`：只记录非 GET 请求（info 级别）；`no-console` ESLint 允许 warn/error/info。

## 5. 工程约定

- Controller 一律 `express.Router()` 并 default export。
- 用户所有权：路径 `:userId`/`:id` 与 `res.locals._id` 不一致 → 403 `forbidden`。
- 用户输入 ObjectId 入库前全部 `isValid` 校验。
- `passwordHash` 在 schema 设 `select: false`，登录等场景需显式 `.select('+passwordHash')`。
- 类型层面开启 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`isolatedModules`、`noUncheckedSideEffectImports`。
- Swagger：控制器内 JSDoc `@openapi` + `src/swagger.ts` 基础定义（tags：Word/User/Auth/Learn；schemas：Word、NewWord、User、UserWord、LearningSession 等；`bearerAuth` securityScheme）。

## 6. 现状备注（架构层）

- 全局错误处理器会 `console.error` 打印 method/path/error 后统一兜底，但部分 controller 仍自行 `try/catch` 后 `next(error)`（风格不完全统一，如 refresh、stats）。
- CORS 白名单写死两个来源；生产环境建议收敛为环境变量配置。
- `/api-docs` 在任意环境可访问（README 称“dev 可访问”，实际未做环境开关）。

# recite-word-server 后端 · 认证与会话（双 Token 现状）

相关代码：`src/modules/auth/controllers/{login,register,refresh,logout}.ts`、`src/shared/middleware.ts`、`src/modules/users/models/users.ts`。

## 1. 注册（register.ts）

- 入参 `{ username, password, email? }`；先 `User.exists({ username })`，存在返回 400 `username already exists`（不做邮箱唯一校验）。
- `bcrypt.hash(password, 13)` 存 `passwordHash`。
- 返回 201 + 用户对象（`passwordHash` 因 `select:false` 不会序列化）。
- `GET /api/users/:username/existence` 供前端做“用户名是否被占用”预检（代码中有 TODO：该接口存在用户枚举风险，建议限流/归一化/收敛）。

## 2. 登录（login.ts）

1. `User.findOne({ username }).select('+passwordHash')`；用户不存在或密码错误统一返回 401 `invalid credentials`（避免区分用户是否存在），并 `console.warn` 记录失败尝试。
2. 签发双 token：
   - `accessToken = jwt.sign({ username, _id }, SECRET, { expiresIn: '1d' })`
   - `refreshToken = jwt.sign({ username, _id, tokenVersion, remember }, REFRESH_SECRET, { expiresIn: '30d' })`
3. refreshToken 通过 cookie 下发：

```
res.cookie('refreshToken', refreshToken, {
  httpOnly: true, signed: true, sameSite: 'lax',
  path: '/api/refresh',
  secure: NODE_ENV === 'production',
  ...(remember ? { maxAge: 30d } : {})   // 不勾选 remember → session cookie（关浏览器即失效）
});
```

4. 返回 `{ accessToken, username, _id }`。
5. `SECRET`/`REFRESH_SECRET` 缺失时返回 500 并 `console.error`（启动时未强校验这两个，属“用时校验”）。

## 3. 刷新（refresh.ts）

- 读取 `req.signedCookies.refreshToken`；缺失 → 401 `unauthorized`。
- `jwt.verify(refreshToken, REFRESH_SECRET)` → 按 `_id` 查用户（不存在 → 401 `invalid credentials`）→ 比较 `user.tokenVersion === decoded.tokenVersion`（不等 → 401 `invalid token version`）。
- 校验通过后仅重签 **accessToken**（`expiresIn: '1d'`）返回；**refreshToken 本身不轮换、不续期**（30 天固定，直到过期或被 logout/版本失效）。
- 异常 `next(error)` 交给全局错误处理器（JWT 错误 → 401）。

## 4. 登出（logout.ts）

- `res.clearCookie('refreshToken', { path: '/api/refresh' })` 并返回 204。
- 服务端无“黑名单/撤销表”：登出后旧的 refreshToken 在 cookie 已清的前提下基本失效；若被截获且在过期前，仍可刷新（依赖 tokenVersion 机制未来做主动吊销）。

## 5. 鉴权中间件（shared/middleware.ts）

- `authTokenMiddleware = [tokenExtractor, tokenAuthenticator]`：
  - extractor：从 `Authorization: Bearer <token>` 提取到 `res.locals.token`；
  - authenticator：`jwt.verify(token, SECRET)`；成功把 `_id` 注入 `res.locals._id`；无 token 直接 401；异常交错误处理器（JsonWebTokenError → 401）。
- 控制器通过 `res.locals._id` 与 `req.params.userId/:id` 比对实现所有权（403）。

## 6. tokenVersion 机制

- User 模型带 `tokenVersion`（默认 0），刷新时校验一致性——可用于“改密/被顶号后使旧 refresh 全部失效”。
- 现状：**没有任何接口修改 tokenVersion**（无改密接口、无主动吊销接口），属“预留能力”。若登录时未携带该字段的旧 refresh 与用户 tokenVersion 不一致，刷新会 401。

## 7. 现状风险/备注

- refreshToken 不轮换：长生命周期（30 天）+ 固定值，被窃取后有效期较长；建议“刷新即轮换”并把旧 token 加入撤销机制。
- cookie `path=/api/refresh` 收窄到刷新端点，其它请求不携带 cookie（符合最小暴露）。
- `secure: true` 仅在 NODE_ENV=production；本地 http 调试可用。
- 无登录限流/防爆破（目前靠统一 401 提示 + warn 日志）；`/users/:username/existence` 与注册“用户名已存在”均可被用于用户名枚举。
- 前端把 accessToken（1d）放在 localStorage 用户 JSON 中（非 httpOnly），见前端 docs/06-notes.md。
- 登录/刷新对 SECRET 缺失返回 500 的检查发生在请求内，可考虑启动时统一强校验（与 COOKIE_SECRET/MONGODB_URI 风格一致）。

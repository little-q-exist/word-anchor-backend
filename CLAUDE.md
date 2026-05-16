# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WordAnchor — an Express 5 + Mongoose backend for a vocabulary memorization app using the SM-2 spaced repetition algorithm. Written in TypeScript, compiled to ESM (`"type": "module"`, `"module": "nodenext"`).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (nodemon + tsx) on port 3000 |
| `npm run build` | TypeScript compile to `dist/` |
| `npm start` | Run compiled production build (`node dist/index.js`) |
| `npm run format` | Prettier formatting |
| `npm run lint` | ESLint checking |
| `npm test` | Placeholder — no tests defined |

## Architecture

### Module structure and path aliases

Each domain module (`auth`, `learn`, `users`, `words`) lives under `src/modules/<name>/` with subdirectories for `controllers/`, `models/`, `services/`, and a `types.ts`. Shared infrastructure (middleware, response helpers) is in `src/shared/`.

Both `tsconfig.json` `paths` and `package.json` `imports` define these aliases (TypeScript uses `.ts` extensions, runtime uses `.js` — both are written as `.js` in import statements):

```ts
import { sendSuccess, sendError } from '#response';        // src/shared/response
import { authTokenMiddleware } from '#shared/middleware.js';
import Word from '#modules/words/models/words.js';
import { LearnService } from '#modules/learn/services/learn.js';
```

### Request flow

1. `src/index.ts` — connects to MongoDB Atlas, registers middleware (JSON parsing, CORS for `localhost:5173`, request logger), mounts all routers, and attaches the 404/error handlers.
2. JWT auth middleware (`authTokenMiddleware`) — two-step middleware array: `tokenExtractor` pulls `Bearer` token from `Authorization` header into `res.locals.token`, then `tokenAuthenticator` verifies it and injects `res.locals._id`.
3. Controllers validate inputs (ObjectId validity, user ownership via `res.locals._id` match), then delegate to Mongoose models or `LearnService`.
4. Global error handler (`classErrorHandler`) catches `ApiError`, `JsonWebTokenError`, `MongooseError.ValidationError`, and `MongooseError.CastError` — maps each to the appropriate HTTP status.

### Unified response format

```ts
// src/shared/response.ts
{ code: number, data: T, message: string }

sendSuccess(res, data, statusCode?, message?)  // default 200, "success"
sendError(res, statusCode, message, data?)      // data defaults to null
```

`ApiError` extends `Error` with `statusCode` and `data` fields — throw it to bypass Express's default handler.

### Data models (4 collections)

- **User** (`users/models/users.ts`) — username (unique), `passwordHash` (select: false), email, isAdmin. Password hashing: bcrypt, 13 salt rounds.
- **Word** (`words/models/words.ts`) — english (lowercased, indexed), definitions (array of `{ meaning, partOfSpeech }`), phonetic, exampleSentence, tags (enum: CET4/CET6/TOEFL/IELTS/GRE/考研/编程/日常), createdBy. Has a virtual `learningData` ref to UserWord.
- **UserWord** (`learn/models/userWords.ts`) — composite unique index on `(userId, wordId)`. Stores SM-2 state: easeFactor, interval, repetition, dueDate, lastLearned, favorited.
- **LearningSession** (`learn/models/learningSessions.ts`) — composite unique index on `(userId, mode)`. Each user can have at most one active session per mode (learn/review). Contains the word queue (`words[]`) and `queueSnapshot` (current index, repeat queue, version).

### SM-2 algorithm (`learn/services/SM-2.ts`)

`supermemo(currentState, quality)` — quality is 0–5. If quality < 3, repetition resets to 1. If quality < 4, the word is flagged `shouldRepeat: true` (must be re-studied in the same session). EaseFactor clamps to [1.3, 2.5].

Called by `LearnService.upsertLearningData()` which creates or updates the UserWord document.

### Optimistic locking on learning sessions

`PATCH /api/users/:userId/learning-sessions/:mode` compares the `version` timestamp from the client's `queueSnapshot` against the server's stored `queueSnapshot.version` (ISO strings compared via dayjs `isSame`). If they differ, returns 409 with the latest session data so the client can rebase.

### Swagger docs

Generated from JSDoc `@openapi` comments in controller files and `src/swagger.ts`. Available at `/api-docs` in dev.

### API routes summary

| Prefix | File | Auth |
|--------|------|------|
| `/api/words` | `words/controllers/word.ts` | Mixed (GET public, POST/PUT require auth) |
| `/api/users` | `users/controllers/users.ts` | Required (admin for listing all) |
| `/api/users` | `auth/controllers/register.ts` | None |
| `/api/login` | `auth/controllers/login.ts` | None |
| `/api/users` | `learn/controllers/userWords.ts` | Required |
| `/api/users` | `learn/controllers/learningSession.ts` | Required |

### Key conventions

- All controller routers use `express.Router()` and are default-exported.
- User ownership is enforced by comparing `req.params.userId` to `res.locals._id` — 403 if mismatch.
- ObjectId validation: `mongoose.Types.ObjectId.isValid()` before every DB operation with user-supplied IDs.
- Console logging: `no-console` ESLint rule allows only `warn`, `error`, `info` — use `console.info` for server lifecycle, `console.warn` for failed auth attempts, `console.error` for errors.
- `passwordHash` uses `select: false` in schema — must explicitly `select('+passwordHash')` when needed (e.g., login).
- `.env` is gitignored but contains sensitive credentials — never commit changes to it.

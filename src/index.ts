import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';

import wordRouter from '#modules/words/controllers/word.js';
import userRouter from '#modules/users/controllers/users.js';
import loginRouter from '#modules/auth/controllers/login.js';
import registerRouter from '#modules/auth/controllers/register.js';
import userWordRouter from '#modules/learn/controllers/userWords.js';
import learningSessionRouter from '#src/modules/learn/controllers/learningSession.js';
import { unknownEndPoint, classErrorHandler, requestLogger } from '#shared/middleware.js';
import { openapiSpecification } from '#src/swagger.js';

import { API_URL, SERVER_URL } from '#src/constants.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || '';

console.info('connecting to DB');

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.info('successful connected');
    app.listen(PORT, () => {
      console.info(`Server is running at ${SERVER_URL} and API docs are available at ${API_URL}`);
    });
  })
  .catch((error) => {
    console.error('failed to connect', error);
    process.exit(1);
  });

app.use(requestLogger);

/**
 * @openapi
 * /:
 *   get:
 *     tags: [Word]
 *     summary: 根路径
 *     description: Welcome to word-anchor API
 *     responses:
 *       200:
 *         description: Returns a greeting string.
 */
app.get('/', (_req, res) => {
  res.send('hello world!');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

app.use('/api/words', wordRouter);
app.use('/api/users', userRouter);
app.use('/api/users', registerRouter);
app.use('/api/login', loginRouter);
app.use('/api/users', userWordRouter);
app.use('/api/users', learningSessionRouter);

app.use(unknownEndPoint);
app.use(classErrorHandler);

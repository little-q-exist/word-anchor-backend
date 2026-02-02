import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';

import wordRouter from './controllers/word.js';
import userRouter from './controllers/users.js';
import loginRouter from './controllers/login.js';
import { unknownEndPoint, errorHandler, requestLogger } from './middleware.js';

import { SERVER_URL } from './constants.js';

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
  })
  .catch((error) => {
    console.error('failed to connect', error);
  });

app.use(requestLogger);

app.get('/', (_req, res) => {
  res.send('hello world!');
});

app.use('/api/words', wordRouter);
app.use('/api/users', userRouter);
app.use('/api/login', loginRouter);

app.use(unknownEndPoint);
app.use(errorHandler);

app.listen(PORT, () => {
  console.info(`Server is running at ${SERVER_URL}/words`);
  console.info(`Server is running at ${SERVER_URL}/users`);
});

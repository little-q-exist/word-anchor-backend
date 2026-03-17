import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import User from '../models/users.js';
import { sendError, sendSuccess } from '../response.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  const userInDB = await User.findOne({ username: username }).select('+passwordHash');

  if (!userInDB) {
    return sendError(res, 401, 'invalid username');
  }

  const passwordCorrect = await bcrypt.compare(password, userInDB.passwordHash);

  if (!passwordCorrect) {
    return sendError(res, 401, 'invalid password');
  }

  const token = jwt.sign({ username, _id: userInDB._id }, process.env.SECRET || 'SECRET');

  return sendSuccess(res, { token, username, _id: userInDB._id }, 200, 'login successful');
});

export default router;

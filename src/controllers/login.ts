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
    console.warn(`Failed login attempt for non-existent username: ${username}`);
    return sendError(res, 401, 'invalid credentials');
  }

  const passwordCorrect = await bcrypt.compare(password, userInDB.passwordHash);

  if (!passwordCorrect) {
    console.warn(`Failed login attempt for username: ${username} with invalid password`);
    return sendError(res, 401, 'invalid credentials');
  }

  const token = jwt.sign({ username, _id: userInDB._id }, process.env.SECRET || 'SECRET');

  return sendSuccess(res, { token, username, _id: userInDB._id }, 200, 'login successful');
});

export default router;

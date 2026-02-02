import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import User from '../models/users.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  const userInDB = await User.findOne({ username: username });

  if (!userInDB) {
    return res.status(401).json({ error: 'invalid username' });
  }

  const passwordCorrect = await bcrypt.compare(password, userInDB.passwordHash);

  if (!passwordCorrect) {
    return res.status(401).json({ error: 'invalid password' });
  }

  const token = jwt.sign({ username, _id: userInDB._id }, process.env.SECRET || 'SECRET');

  res.json({ token, username, _id: userInDB._id });
});

export default router;

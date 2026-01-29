import express from 'express';

import User from '../models/users.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await User.find({});
  res.json(data);
});

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  // TODO: bycrypt password
  const passwordHash = password;
  const newUser = new User({ username, passwordHash });
  await newUser.save();
  res.json(newUser);
});

import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import User, { type User as UserType, NewUser } from '../models/users.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await User.find({});
  res.json(data);
});

router.post(
  '/register',
  async (req: Request<unknown, unknown, NewUser>, res: Response<UserType>) => {
    const { username, password, email = '' } = req.body;
    const saltRound = 13;
    const passwordHash = bcrypt.hash(password, saltRound);
    const newUser = new User({ username, passwordHash, email });
    await newUser.save();
    res.json(newUser);
  }
);

export default router;

import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import User, { NewUser } from '../models/users.js';

import { authTokenMiddleware } from '../middleware.js';

const router = express.Router();

router.get('/', authTokenMiddleware, async (_req: Request, res: Response) => {
  const user = await User.findById(res.locals._id);
  if (user && user.isAdmin) {
    const data = await User.find({}).select('+passwordHash');
    return res.json(data);
  } else {
    return res.status(403).json({ error: 'forbidden' });
  }
});

router.get('/:id', authTokenMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  if (req.params.id !== res.locals._id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const data = await User.findById(req.params.id);
  res.json(data);
});

router.post('/register', async (req: Request<unknown, unknown, NewUser>, res: Response) => {
  const { username, password, email = '' } = req.body;
  const saltRound = 13;
  const passwordHash = await bcrypt.hash(password, saltRound);
  const newUser = await new User({ username, passwordHash, email }).save();
  res.json(newUser);
});

export default router;

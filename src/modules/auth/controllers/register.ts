import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import User from '#modules/users/models/users.js';
import type { NewUser } from '#modules/users/types.js';

import { sendError, sendSuccess } from '#response';

const router = express.Router();

router.get('/:username/existence', async (req: Request<{ username: string }>, res: Response) => {
  const exists = await User.exists({ username: req.params.username });
  /*
    TODO: This endpoint leaks whether a username is registered,
    which enables user enumeration.
    If it’s required for UX, consider adding rate limiting/throttling,
    normalization (trim/lowercase if applicable),
    and/or returning a less directly enumerable response (or requiring auth) to reduce abuse risk.
  */
  return sendSuccess(res, { exists: !!exists });
});

router.post('/register', async (req: Request<unknown, unknown, NewUser>, res: Response) => {
  const { username, password, email = '' } = req.body;

  const userExist = await User.exists({ username });

  if (userExist) {
    return sendError(res, 400, 'username already exists');
  }

  const saltRound = 13;
  const passwordHash = await bcrypt.hash(password, saltRound);
  const newUser = await new User({ username, passwordHash, email }).save();
  return sendSuccess(res, newUser, 201, 'user registered');
});

export default router;

import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import User, { NewUser } from '../models/users.js';

import { authTokenMiddleware } from '../middleware.js';
import { sendError, sendSuccess } from '../response.js';

const router = express.Router();

router.get('/', authTokenMiddleware, async (_req: Request, res: Response) => {
  const user = await User.findById(res.locals._id);
  if (user && user.isAdmin) {
    const data = await User.find({});
    return sendSuccess(res, data);
  } else {
    return sendError(res, 403, 'forbidden');
  }
});

router.get('/:id', authTokenMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  if (req.params.id !== res.locals._id) {
    return sendError(res, 403, 'forbidden');
  }
  const data = await User.findById(req.params.id);
  if (!data) {
    return sendError(res, 404, 'user not found');
  }
  return sendSuccess(res, data);
});

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

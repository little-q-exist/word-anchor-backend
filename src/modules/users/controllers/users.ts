import express, { Request, Response } from 'express';

import User from '#modules/users/models/users.js';

import { authTokenMiddleware } from '#shared/middleware.js';
import { sendError, sendSuccess } from '#response';

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

export default router;

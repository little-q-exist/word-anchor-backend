import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { Error as MongooseError } from 'mongoose';

import User from './models/users.js';

const tokenExtractor = (req: Request, res: Response, next: NextFunction) => {
  const tokenHeader = 'Bearer ';
  const authorization = req.get('authorization');
  if (authorization && authorization.startsWith(tokenHeader)) {
    res.locals.token = authorization.replace(tokenHeader, '');
  }
  next();
};

const tokenAuthenticator = async (req: Request, res: Response, next: NextFunction) => {
  const token = res.locals.token;
  if (!token) {
    res.status(401).json({ error: 'invalid token' });
  }
  try {
    const decodedToken = JSON.parse(String(jwt.verify(token, process.env.SECRET || 'SECRET')));
    const userInDB = await User.findById(decodedToken._id);
    if (!userInDB) {
      return res.status(401).json({ error: 'invalid user' });
    }
    res.locals.user = userInDB;
    next();
  } catch (error) {
    console.info(error);
    next(error);
  }
};

/**
 * extract token in request.authorization, verify and find the corresponding user.
 * Access the token through res.locals.token.
 * Access the user through res.locals.user.
 */
export const authTokenMiddleware = [tokenExtractor, tokenAuthenticator];

export const unknownEndPoint = (_req: Request, res: Response) => {
  return res.status(404).json({ error: 'unknown endpoint' });
};

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof JsonWebTokenError) {
    return res.status(401).json({ error: { name: error.name, message: error.message } });
  } else if (error instanceof MongooseError.ValidationError) {
    return res.status(401).json({ error: { name: error.name, errors: error.errors } });
  } else {
    res.status(401).json({ error: error });
  }
};

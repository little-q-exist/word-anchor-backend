import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Error as MongooseError } from 'mongoose';

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
    return res.status(401).json({ error: 'invalid token' });
  }
  try {
    const decodedToken = jwt.verify(token, process.env.SECRET || 'SECRET');
    if (typeof decodedToken === 'string' || decodedToken instanceof String) {
      return res.status(401).json({ error: 'invalid token format' });
    }
    res.locals._id = decodedToken._id.toString();
    next();
  } catch (error) {
    console.info(error);
    next(error);
  }
};

/**
 * extract token in request.authorization, verify and find the corresponding user.
 * Access the token through res.locals.token.
 * Access the user id through res.locals._id.
 */
export const authTokenMiddleware = [tokenExtractor, tokenAuthenticator];

export const unknownEndPoint = (_req: Request, res: Response) => {
  return res.status(404).json({ error: 'unknown endpoint' });
};

export const classErrorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(error);
  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ error: { name: error.name, message: error.message } });
  } else if (error instanceof MongooseError.ValidationError) {
    return res.status(400).json({ error: { name: error.name, errors: error.errors } });
  } else {
    console.error(error);
    res.status(500).json({ error: 'internal server error' });
  }
};

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  if (req.method !== 'GET') {
    console.info(req.url);
    console.info(req.method);
    console.info(req.body);
    console.info('====');
  }
  next();
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Error as MongooseError } from 'mongoose';
import { ApiError, sendError } from './response.js';

const JWT_SECRET = process.env.SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT secret is not set. Please define the SECRET environment variable.');
}

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
    return sendError(res, 401, 'invalid token');
  }
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    if (typeof decodedToken === 'string' || decodedToken instanceof String) {
      return sendError(res, 401, 'invalid token format');
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
  return sendError(res, 404, 'unknown endpoint');
};

export const classErrorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(error);
  if (error instanceof ApiError) {
    return sendError(res, error.statusCode, error.message, error.data);
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return sendError(res, 401, error.message, { name: error.name });
  } else if (error instanceof MongooseError.ValidationError) {
    return sendError(res, 400, 'validation failed', { name: error.name, errors: error.errors });
  } else if (error instanceof MongooseError.CastError) {
    return sendError(res, 400, 'invalid id', {
      name: error.name,
      path: error.path,
      value: error.value,
    });
  } else {
    return sendError(res, 500, 'internal server error');
  }
};

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  if (req.method !== 'GET') {
    console.info(req.method);
    console.info(req.path);
    console.info('====');
  }
  next();
};

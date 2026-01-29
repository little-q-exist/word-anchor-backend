import { Request, Response, NextFunction } from 'express';

export const tokenExtractor = (req: Request, _res: Response, next: NextFunction) => {
  const tokenHeader = 'Bearer ';
  const authorization = req.get('authorization');
  let token;
  if (authorization && authorization.startsWith(tokenHeader)) {
    token = authorization.replace(tokenHeader, '');
  }
  req.body = { ...req.body, token };
  next();
};

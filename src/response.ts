import { Response } from 'express';

export interface StandardResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export class ApiError extends Error {
  statusCode: number;
  data: unknown;

  constructor(statusCode: number, message: string, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export const sendSuccess = <T>(
  res: Response<StandardResponse>,
  data: T,
  statusCode = 200,
  message = 'success'
) => {
  return res.status(statusCode).json({
    code: statusCode,
    data,
    message,
  });
};

export const sendError = (
  res: Response<StandardResponse>,
  statusCode: number,
  message: string,
  data: unknown = null
) => {
  return res.status(statusCode).json({
    code: statusCode,
    data,
    message,
  });
};

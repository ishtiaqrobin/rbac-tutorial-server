import { Response } from 'express';

interface IResponseData<T> {
  statusCode: number;
  success: boolean;
  message?: string;
  data?: T;
}

export const sendResponse = <T>(res: Response, data: IResponseData<T>) => {
  return res.status(data.statusCode).json({
    success: data.success,
    statusCode: data.statusCode,
    message: data.message || 'Operation successful',
    data: data.data,
  });
};

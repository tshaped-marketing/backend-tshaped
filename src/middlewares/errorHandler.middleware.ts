import { Request, Response, NextFunction } from 'express';
import ErrorService from '../services/error.service.js';
import {
  AppError,
  DetailedErrorResponse,
  ErrorResponse,
  ErrorMessage,
} from '../types/error.types.js';
import errorProvider from '../utils/errorJSONProvider.js';
import { NODE_ENV } from '../constants/env.constant.js';
import { logErrorLoki } from '../utils/lokiConfig.js';
import { CustomRequest } from '../types/auth.types.js';

const formatErrorResponse = (
  err: Error,
  statusCode: number = 500,
): ErrorResponse | DetailedErrorResponse => {
  const isDevelopment = NODE_ENV === 'development';
  // Always include name/stack/details for debugging (temporary)
  const baseResponse: DetailedErrorResponse = {
    success: false,
    error: {
      status: statusCode,
      message: err.message,
      name: err.name,
      stack: err.stack,
      details: err instanceof AppError ? err?.details : undefined,
    },
  };

  return baseResponse;
};

const handleError = (err: Error, res: Response, req?: CustomRequest): void => {
  let statusCode = 500;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
  } else if (err.name === 'TooManyRequests') {
    statusCode = 429;
  }

  const errorResponse = formatErrorResponse(err, statusCode);

  // Include the route endpoint in the log if req is available
  const endpoint = req ? req.baseUrl + req.path : 'unknown endpoint';
  logErrorLoki(
    `Error: ${err.message} | Status Code: ${statusCode} | Endpoint: ${endpoint}| User Details : [ Name: ${req?.user?.name} --- UserId : ${req?.user?.userId} ] | Stack: ${err.stack}`,
    true,
  );

  res.status(statusCode).json(errorResponse);
};

const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      if (err instanceof Error) {
        handleError(err, res, req);
      } else {
        const error = new Error('An unexpected error occurred');
        handleError(error, res, req);
      }
    }
  };
};

const throwError = async (errorCode: string, lang: string = 'en', details?: unknown) => {
  try {
    const errorConfig = await errorProvider(errorCode, lang);
    if (!errorConfig || !errorConfig.error_message || errorConfig.http_code === undefined || errorConfig.http_code === null) {
      throw new AppError(500, 'Internal Server Error');
    }
    const error = new AppError(
      errorConfig.http_code,
      errorConfig.error_message[lang as keyof ErrorMessage],
      details,
    );

    if (details) {
      (error as AppError & { details: unknown }).details = details;
    }

    throw error;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new AppError(500, 'Internal Server Error');
  }
};

export const handleResponseError = async (
  res: Response,
  errorCode: string,
  lang: string = 'en',
): Promise<Response> => {
  try {
    const errorConfig = await errorProvider(errorCode, lang);
    if (!errorConfig || !errorConfig.error_message || errorConfig.http_code === undefined || errorConfig.http_code === null) {
      const fallbackError = new AppError(500, 'Internal Server Error');
      handleError(fallbackError, res);
      return res;
    }
    const error = new AppError(
      errorConfig.http_code,
      errorConfig.error_message[lang as keyof ErrorMessage],
    );
    handleError(error, res);
    return res;
  } catch (err) {
    const fallbackError = new AppError(500, 'Internal Server Error');
    handleError(fallbackError, res);
    return res;
  }
};

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  handleError(err, res);
};

const notFoundHandler = (req: Request, res: Response): void => {
  const error = new AppError(404, `Route ${req.path} not found`);
  console.log(`Route ${req.path} not found`);
  handleError(error, res);
};

export { errorHandler, catchAsync, notFoundHandler, throwError };

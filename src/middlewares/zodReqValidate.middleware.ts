import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { MiddlewareType } from '../types/router.types';

interface ErrorResponse {
  success: false;
  error: {
    status: number;
    message: string;
    details?: string[];
  };
}

export type ValidatorType = (schema: ZodSchema) => MiddlewareType;
export const zodValidator: ValidatorType =
  (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(e => {
          // Remove the prefix (body, query, params) from the path
          const path = e.path.slice(1).join('.');
          return `${path}: ${e.message}`;
        });

        const responseBody: ErrorResponse = {
          success: false,
          error: {
            status: 400,
            message:
              errorMessages.length > 1 ? 'Multiple validation errors occurred' : errorMessages[0],
            ...(errorMessages.length > 1 && { details: errorMessages }),
          },
        };

        return res.status(400).json(responseBody);
      }
      // Handle other errors
      next(error);
    }
  };

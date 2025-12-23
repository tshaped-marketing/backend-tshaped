import { Request, Response, NextFunction } from 'express';

// Define a type for the route handler function
export type RouteType<TRequest = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export type MiddlewareType = (req: Request, res: Response, next: NextFunction) => void;

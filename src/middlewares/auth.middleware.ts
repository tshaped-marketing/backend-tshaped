import { Response, NextFunction } from 'express';
import { getPermissionsByRole } from '../utils/rbacPermissions.js';
import jwt from 'jsonwebtoken';

import { CustomRequest } from '../types/auth.types.js';
import { catchAsync, throwError } from './errorHandler.middleware.js';
import { JWT_SECRET, NODE_ENV } from '../constants/env.constant.js';
import { COOKIE_CONFIG_PROVIDER } from '../config/cookie.config.js';

const authenticate = catchAsync(async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader) {
      token = authHeader.split(' ')[1];
    } else {
      token = req.cookies?.token;
    }

    if (!token) {
      await throwError('AUTH017');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET as string);
      req.user = decoded as { userId: string; role: string };
      next();
    } catch (jwtError) {
      // Handle JWT-specific errors
      if (jwtError instanceof jwt.TokenExpiredError) {
        await throwError('AUTH018');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        await throwError('AUTH019');
      } else {
        await throwError('AUTH020');
      }
    }
  } catch (err) {
    // Clear the token from cookies if it exists
    if (req.cookies?.token) {
      res.clearCookie('token', COOKIE_CONFIG_PROVIDER(false));
    }
    throw err;
  }
});

const authorize = (requiredOperations: string[] = []) => {
  return catchAsync(async (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      await throwError('AUTH015');
    }

    // Fetch permissions for the user's role
    const rolePermissions = getPermissionsByRole(req.user?.role as any);

    // Check if the role has all required permissions
    const hasPermission = requiredOperations.every(op => rolePermissions.includes(op));

    if (!hasPermission) {
      await throwError('AUTH016');
    }

    next();
  });
};

export { authenticate, authorize };

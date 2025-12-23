import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';

const createErrorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { error_code, error_message, category, http_code, isActive } = req.body;

  // Check if error handler already exists
  const existingHandler = await prismaClient.errorHandler.findUnique({
    where: { error_code },
  });

  if (existingHandler) {
    return await throwError('ERR001');
  }

  const errorHandler = await prismaClient.errorHandler.create({
    data: {
      error_code,
      error_message,
      category,
      http_code,
      isActive,
    },
  });

  res.status(201).json({
    status: 'success',
    data: errorHandler,
  });
};

const updateErrorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const { error_message, category, http_code, isActive } = req.body;

  const errorHandler = await prismaClient.errorHandler.findUnique({
    where: { id },
  });

  if (!errorHandler) {
    return await throwError('ERR002');
  }

  const updatedErrorHandler = await prismaClient.errorHandler.update({
    where: { id },
    data: {
      error_message,
      category,
      http_code,
      isActive,
    },
  });

  res.status(200).json({
    status: 'success',
    data: updatedErrorHandler,
  });
};

const getErrorHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  const errorHandler = await prismaClient.errorHandler.findUnique({
    where: { id },
  });

  if (!errorHandler) {
    return await throwError('ERR002');
  }

  res.status(200).json({
    status: 'success',
    data: errorHandler,
  });
};

const listErrorHandlers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { page = 1, limit = 10, category, isActive } = req.query;

  const where: Prisma.ErrorHandlerWhereInput = {};
  if (isActive !== undefined) where.isActive = isActive as any;

  // If category is specified, return paginated results for that category
  if (category) {
    const skip = (Number(page) - 1) * Number(limit);
    where.category = category as string;

    const [errorHandlers, total] = await Promise.all([
      prismaClient.errorHandler.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prismaClient.errorHandler.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: errorHandlers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
    return;
  }

  // If no category specified, group all errors by category
  const errorHandlers = await prismaClient.errorHandler.findMany({
    where,
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  });

  // Group errors by category
  const groupedErrors = errorHandlers.reduce(
    (acc: any, error: any) => {
      const category = error.category || 'UNCATEGORIZED';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(error);
      return acc;
    },
    {} as Record<string, typeof errorHandlers>,
  );

  res.status(200).json({
    status: 'success',
    data: groupedErrors,
  });
};

const deleteErrorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const errorHandler = await prismaClient.errorHandler.findUnique({
    where: { id },
  });

  if (!errorHandler) {
    return await throwError('ERR002');
  }

  await prismaClient.errorHandler.delete({
    where: { id },
  });

  res.status(204).send();
};

export {
  createErrorHandler,
  updateErrorHandler,
  getErrorHandler,
  listErrorHandlers,
  deleteErrorHandler,
};

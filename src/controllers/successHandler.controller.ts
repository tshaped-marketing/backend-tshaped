import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';

const createSuccessHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { success_code, success_message, category, http_code, isActive } = req.body;

  // Check if success handler already exists
  const existingHandler = await prismaClient.successHandler.findUnique({
    where: { success_code },
  });

  if (existingHandler) {
    return await throwError('SUCCESS002'); // Reusing existing error code for duplicate entry
  }

  const successHandler = await prismaClient.successHandler.create({
    data: {
      success_code,
      success_message,
      category,
      http_code,
      isActive,
    },
  });

  res.status(201).json({
    status: 'success',
    data: successHandler,
  });
};

const updateSuccessHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const { success_message, category, http_code, isActive } = req.body;

  const successHandler = await prismaClient.successHandler.findUnique({
    where: { id },
  });

  if (!successHandler) {
    return await throwError('SUCCESS001'); // Reusing existing error code for not found
  }

  const updatedSuccessHandler = await prismaClient.successHandler.update({
    where: { id },
    data: {
      success_message,
      category,
      http_code,
      isActive,
    },
  });

  res.status(200).json({
    status: 'success',
    data: updatedSuccessHandler,
  });
};

const getSuccessHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const successHandler = await prismaClient.successHandler.findUnique({
    where: { id },
  });

  if (!successHandler) {
    return await throwError('SUCCESS001'); // Reusing existing error code for not found
  }

  res.status(200).json({
    status: 'success',
    data: successHandler,
  });
};

const listSuccessHandlers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { page = 1, limit = 10, category, isActive } = req.query;

  const where: Prisma.SuccessHandlerWhereInput = {};
  if (isActive !== undefined) where.isActive = isActive as any;

  // If category is specified, return paginated results for that category
  if (category) {
    const skip = (Number(page) - 1) * Number(limit);
    where.category = category as string;

    const [successHandlers, total] = await Promise.all([
      prismaClient.successHandler.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prismaClient.successHandler.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: successHandlers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
    return;
  }

  // If no category specified, group all success messages by category
  const successHandlers = await prismaClient.successHandler.findMany({
    where,
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  });

  // Group success messages by category
  const groupedMessages = successHandlers.reduce(
    (acc: any, message: any) => {
      const category = message.category || 'UNCATEGORIZED';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(message);
      return acc;
    },
    {} as Record<string, typeof successHandlers>,
  );

  res.status(200).json({
    status: 'success',
    data: groupedMessages,
  });
};

const deleteSuccessHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const successHandler = await prismaClient.successHandler.findUnique({
    where: { id },
  });

  if (!successHandler) {
    return await throwError('SUCCESS001'); // Reusing existing error code for not found
  }

  await prismaClient.successHandler.delete({
    where: { id },
  });

  res.status(204).send();
};

export {
  createSuccessHandler,
  updateSuccessHandler,
  getSuccessHandler,
  listSuccessHandlers,
  deleteSuccessHandler,
};

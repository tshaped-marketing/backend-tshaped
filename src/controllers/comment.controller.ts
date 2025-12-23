import { Request, Response, NextFunction } from 'express';
import { CustomRequest } from '../types/auth.types.js';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { notificationService } from '../server.js';
import { ADMIN_IDS } from '../constants/env.constant.js';

const createComment = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { text, target = 'COURSE', targetSlug } = req.body;
  const userId = req.user!.userId;

  // First validate if the target exists based on target type and slug
  let targetExists = false;
  let targetTitle = '';

  switch (target) {
    case 'COURSE':
      const course = await prismaClient.course.findUnique({
        where: { slug: targetSlug },
      });
      targetExists = !!course;
      targetTitle = course?.title ?? '';
      break;
    case 'LESSON':
      const lesson = await prismaClient.lesson.findUnique({
        where: { slug: targetSlug },
      });
      targetExists = !!lesson;
      targetTitle = lesson?.title ?? '';
      break;
    case 'TOPIC':
      const topic = await prismaClient.topic.findUnique({
        where: { slug: targetSlug },
      });
      targetExists = !!topic;
      targetTitle = topic?.title ?? '';
      break;
  }

  if (!targetExists) {
    await throwError('TARGET001'); // You'll need to add this error code
  }

  // Create the comment
  const comment = await prismaClient.comment.create({
    data: {
      text,
      authorId: userId,
      target,
      targetSlug,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  // Send notification to admin
  notificationService.createNotification({
    userId: ADMIN_IDS[0],
    type: 'ADMIN',
    message: `New comment on ${target.toLowerCase()} "${targetTitle}" by ${req.user?.name}`,
    metadata: {
      event: 'STUDENT_COMMENT',
      target,
      targetSlug,
      studentId: req.user?.userId,
    },
  });

  res.status(201).json({
    success: true,
    data: comment,
  });
};

const updateComment = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user?.userId;

  const comment = await prismaClient.comment.findUnique({
    where: { id },
  });

  if (!comment) {
    await throwError('COMMENT001');
  }

  if (comment!.authorId !== userId) {
    await throwError('COMMENT002');
  }

  const updatedComment = await prismaClient.comment.update({
    where: { id },
    data: {
      text,
      isEdited: true,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: updatedComment,
  });
};

const deleteComment = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const comment = await prismaClient.comment.findUnique({
    where: { id },
  });

  if (!comment) {
    await throwError('COMMENT001');
  }

  if (comment!.authorId !== userId) {
    await throwError('COMMENT002');
  }

  await prismaClient.comment.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully',
  });
};

const getComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  const comment = await prismaClient.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  if (!comment) {
    await throwError('COMMENT001');
  }

  res.status(200).json({
    success: true,
    data: comment,
  });
};

const listComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { target, targetSlug } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Build where clause based on query parameters
  let where: any = {};

  if (target && targetSlug) {
    where.target = target;
    where.targetSlug = targetSlug;
  }

  const [comments, total] = await Promise.all([
    prismaClient.comment.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prismaClient.comment.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export { createComment, updateComment, deleteComment, getComment, listComments };

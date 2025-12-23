import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { CustomRequest } from '../types/auth.types.js';
import prismaClient from '../prisma/prisma.client.js';

/**
 * Create a new course review
 */
const createCourseReview = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { rating, title, content, isPublic, isAnonymous, courseSlug } = req.body;
  const userId = req.user!.userId;

  // Check if the course exists
  const courseExists = await prismaClient.course.findUnique({
    where: { slug: courseSlug },
  });

  if (!courseExists) {
    return await throwError('REVIEW004');
  }

  // Check if user has already reviewed this course
  const existingReview = await prismaClient.courseReview.findUnique({
    where: {
      studentId_courseSlug: {
        studentId: userId,
        courseSlug,
      },
    },
  });

  if (existingReview) {
    return await throwError('REVIEW002');
  }

  // Create the review
  const newReview = await prismaClient.courseReview.create({
    data: {
      rating,
      title,
      content,
      isPublic: isPublic !== undefined ? isPublic : true,
      isAnonymous: isAnonymous !== undefined ? isAnonymous : false,
      studentId: userId,
      courseSlug,
    },
  });

  res.status(201).json({
    success: true,
    data: newReview,
  });
};

/**
 * Get a course review by ID
 */
const getCourseReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const review = await prismaClient.courseReview.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      course: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!review) {
    return await throwError('REVIEW001');
  }

  // Hide student info if anonymous
  const responseData = review.isAnonymous
    ? {
        ...review,
        student: { id: null, name: 'Anonymous', avatar: null },
      }
    : review;

  res.status(200).json({
    success: true,
    data: responseData,
  });
};

/**
 * Get all reviews for a specific course
 */
const getCourseReviewsByCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { courseSlug } = req.params;
  const { isApproved, limit = 10, offset = 0 } = req.query;

  // Check if the course exists
  const courseExists = await prismaClient.course.findUnique({
    where: { slug: courseSlug },
  });

  if (!courseExists) {
    return await throwError('REVIEW004');
  }

  // Prepare filter
  const filter: any = {
    courseSlug,
    isPublic: true,
  };

  if (isApproved !== undefined) {
    filter.isApproved = isApproved === 'true';
  }

  // Get reviews
  const reviews = await prismaClient.courseReview.findMany({
    where: filter,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip: Number(offset),
  });

  // Get total count for pagination
  const totalCount = await prismaClient.courseReview.count({
    where: filter,
  });

  // Process reviews to handle anonymous ones
  const processedReviews = reviews.map(review => {
    if (review.isAnonymous) {
      return {
        ...review,
        student: { id: null, name: 'Anonymous', avatar: null },
      };
    }
    return review;
  });

  // Calculate average rating
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  res.status(200).json({
    success: true,
    data: {
      reviews: processedReviews,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
      },
      stats: {
        avgRating: Number(avgRating.toFixed(1)),
        totalReviews: totalCount,
      },
    },
  });
};

/**
 * Get all reviews by a specific user
 */
const getCourseReviewsByUser = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { userId } = req.params;
  const { limit = 10, offset = 0 } = req.query;
  const requestUserId = req.user!.userId; // Assuming req.user is set by authentication middleware

  // Prepare filter - regular users can only see their own reviews
  // Admins can see any user's reviews
  const filter: any = { studentId: userId };
  if (requestUserId !== userId && req.user!.role !== 'ADMIN') {
    filter.isPublic = true;
  }

  const reviews = await prismaClient.courseReview.findMany({
    where: filter,
    include: {
      course: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip: Number(offset),
  });

  const totalCount = await prismaClient.courseReview.count({
    where: filter,
  });

  res.status(200).json({
    success: true,
    data: {
      reviews,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
      },
    },
  });
};

/**
 * Update a course review
 */
const updateCourseReview = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const { rating, title, content, isPublic, isAnonymous } = req.body;
  const userId = req.user!.userId; // Assuming req.user is set by authentication middleware

  // Find the review
  const review = await prismaClient.courseReview.findUnique({
    where: { id },
  });

  if (!review) {
    return await throwError('REVIEW001');
  }

  // Check if user is authorized to update this review
  if (review.studentId !== userId && req.user!.role !== 'ADMIN') {
    return await throwError('REVIEW003');
  }

  // Update the review
  const updatedReview = await prismaClient.courseReview.update({
    where: { id },
    data: {
      rating: rating !== undefined ? rating : undefined,
      title: title !== undefined ? title : undefined,
      content: content !== undefined ? content : undefined,
      isPublic: isPublic !== undefined ? isPublic : undefined,
      isAnonymous: isAnonymous !== undefined ? isAnonymous : undefined,
      // Reset approval if content is changed by non-admin
      isApproved:
        req.user!.role !== 'ADMIN' && (rating !== review.rating || content !== review.content)
          ? false
          : undefined,
    },
  });

  res.status(200).json({
    success: true,
    data: updatedReview,
  });
};

/**
 * Delete a course review
 */
const deleteCourseReview = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId; // Assuming req.user is set by authentication middleware

  // Find the review
  const review = await prismaClient.courseReview.findUnique({
    where: { id },
  });

  if (!review) {
    return await throwError('REVIEW001');
  }

  // Check if user is authorized to delete this review
  if (review.studentId !== userId && req.user!.role !== 'ADMIN') {
    return await throwError('REVIEW003');
  }

  // Delete the review
  await prismaClient.courseReview.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Course review deleted successfully',
  });
};

/**
 * Approve or reject a course review (admin only)
 */
const approveCourseReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const { isApproved } = req.body;

  // Find the review
  const review = await prismaClient.courseReview.findUnique({
    where: { id },
  });

  if (!review) {
    return await throwError('REVIEW001');
  }

  // Update approval status
  const updatedReview = await prismaClient.courseReview.update({
    where: { id },
    data: {
      isApproved,
    },
  });

  res.status(200).json({
    success: true,
    data: updatedReview,
  });
};

export {
  createCourseReview,
  getCourseReviewById,
  getCourseReviewsByCourse,
  getCourseReviewsByUser,
  updateCourseReview,
  deleteCourseReview,
  approveCourseReview,
};

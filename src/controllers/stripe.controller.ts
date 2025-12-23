// stripe.controller.ts
import { Request, Response } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { stripe } from '../config/stripe.config.js';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { FRONTEND_URL, STRIPE_WEBHOOK_SECRET } from '../constants/env.constant.js';
import { CustomRequest } from '../types/auth.types.js';
import { CourseStatus, UserStatus } from '@prisma/client';
import { logErrorLoki } from '../utils/lokiConfig.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';

dotenv.config();

const createCheckoutSession = async (req: CustomRequest, res: Response) => {
  const { courseId } = req.body;
  const userId = req.user?.userId!;
  // Validate input
  if (!courseId) {
    return await throwError('PAYMENT001');
  }

  // Fetch course details with instructor
  const course = await prismaClient.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      price: true,
      thumbnail: true,
      status: true,
      instructor: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!course) {
    return await throwError('COURSE001');
  }

  // Check if course is published
  if (course.status !== CourseStatus.PUBLISHED) {
    return await throwError('COURSE007');
  }
  // Prevent instructor from buying their own course
  if (course.instructor.id === userId) {
    return await throwError('PAYMENT005');
  }
//find user
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
 status: true,
    },
  });
  if(!user) {
    return await throwError('AUTH002');
  }
  if(user.status!==UserStatus.ACTIVE){
    return await throwError('COURSE008');
  }

  // Check if user is already enrolled
  const existingEnrollment = await prismaClient.course.findFirst({
    where: {
      id: courseId,
      students: {
        some: {
          id: userId,
        },
      },
    },
  });

  if (existingEnrollment) {
    return await throwError('PAYMENT006');
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'nzd',
          product_data: {
            name: course.title,
            images: course.thumbnail ? [course.thumbnail] : [],
          },
          unit_amount: Math.round(course.price * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${FRONTEND_URL}/student/courses`,
    cancel_url: FRONTEND_URL,
    metadata: {
      courseId,
      userId,
    },
  });

  // Create pending payment record
  await prismaClient.payment.create({
    data: {
      courseId,
      studentId: userId,
      amount: course.price,
      status: 'PENDING',
      transactionId: session.id,
    },
  });

  res.json({ sessionId: session.id, url: session.url });
};

// Webhook handler for successful payments
const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return await throwError('PAYMENT003');
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.metadata?.courseId || !session.metadata?.userId) {
          return await throwError('PAYMENT001');
        }

        await handleSuccessfulPayment(
          session.metadata.courseId,
          session.metadata.userId,
          session.id,
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const session = event.data.object as Stripe.PaymentIntent;
        // Handle failed payment
        await prismaClient.payment.update({
          where: {
            transactionId: session.id,
          } as any,
          data: {
            status: 'FAILED',
          },
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return await throwError('PAYMENT003');
  }
};

// Helper function to handle successful payments
async function handleSuccessfulPayment(courseId: string, userId: string, transactionId: string) {
  try {
    // Increase transaction timeout to 10 seconds
    await prismaClient.$transaction(
      async tx => {
        // Find the payment first
        const payment = await tx.payment.findUnique({
          where: { transactionId } as any,
        });

        if (!payment) {
          return await throwError('PAYMENT004');
        }

        // Get course details first to avoid nested query
        // Get course details with lessons and topics count
        const course = await tx.course.findUnique({
          where: { id: courseId },
          include: {
            lessons: {
              include: {
                topics: {
                  select: { id: true },
                },
              },
            },
          },
        });

        if (!course) {
          return await throwError('COURSE001');
        }

        // Count total topics across all lessons
        const totalTopics = course.lessons.reduce((sum, lesson) => sum + lesson.topics.length, 0);

        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        // Enroll user in course
        await tx.course.update({
          where: { id: courseId },
          data: {
            students: {
              connect: { id: userId },
            },
            enrollmentCount: {
              increment: 1,
            },
          },
        });

        // Create progress record
        await tx.progress.create({
          data: {
            studentId: userId,
            courseId,
            completedLessons: 0,
            totalLessons: course.lessons.length,
            completedLessonIds: [],
            completedTopicIds: [],
            totalTopics,
            completionRate: 0,
          },
        });
      },
      {
        timeout: 10000,
        maxWait: 5000,
      },
    );

    // Invalidate cache
    await redisService.invalidateRegistry(`getEnrolledCourses:${userId}`);
  
    logErrorLoki(`Successfully enrolled user ${userId} in course ${courseId}`, false);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}
export { createCheckoutSession, handleStripeWebhook };

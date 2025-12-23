import { Request, Response, NextFunction } from 'express';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  subYears,
  format,
  parseISO,
} from 'date-fns';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import prismaClient from '../prisma/prisma.client.js';
import lodash from 'lodash';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import redisService from '../config/redis.config.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import { getAdminReports_TTL } from '../constants/redis.cacheTTL.js';

interface DataPoint {
  createdAt: Date;
}

interface DailyDataPoint {
  date: string;
  count: number;
}

interface MonthlyDataPoint {
  month: string;
  count: number;
}

interface YearlyDataPoint {
  year: number;
  count: number;
}

interface GraphData {
  daily: DailyDataPoint[];
  monthly: MonthlyDataPoint[];
  yearly: YearlyDataPoint[];
}

/**
 * Get comprehensive reports including counts, graphs, and recent items
 */
const getReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = `get_reports`;
    const responseSent = await handleCachedResponse(cacheKey, res);
    if (responseSent) {
      return;
    }

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const twelveMonthsAgo = subMonths(today, 12);

    // Execute database operations sequentially instead of all at once
    const counts = await getCounts(today);
    const graphs = await getGraphData(thirtyDaysAgo, twelveMonthsAgo);
    const recents = await getRecentItems();

    const combinedResponse = {
      counts,
      graphs,
      recents,
    };

    res.json(combinedResponse);

    //  cache
    executeBackgroundTasks(
      [
        async () => {
          await redisService.cacheResponse(cacheKey, combinedResponse, getAdminReports_TTL);
        },
      ],
      'getReports',
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific category report data
 */
const getCategoryReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { category, type, startDate, endDate } = req.query;

    if (!category) {
      return await throwError('REP001');
    }

    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    const reportData = await getGraphDataForCategory(
      category as string,
      type as string,
      start,
      end,
    );

    res.json(reportData);
  } catch (error) {
    next(error);
  }
};

// Helper functions
async function getCounts(today: Date) {
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfThisMonth = startOfMonth(today);
  const endOfThisMonth = endOfMonth(today);
  const startOfThisYear = new Date(today.getFullYear(), 0, 1);
  const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
  const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);

  // Execute counts one category at a time instead of all at once

  // Pending counts
  const pendingSubmissions = await prismaClient.assignmentSubmission.count({
    where: { status: 'SUBMITTED' },
  });

  const unEnrolledStudents = await prismaClient.user.count({
    where: {
      role: 'STUDENT',
      NOT: {
        courses: { some: {} },
      },
    },
  });

  // Today's counts
  const todayBlogArticles = await prismaClient.blog.count({
    where: {
      createdAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  const todayAssignmentSubmissions = await prismaClient.assignmentSubmission.count({
    where: {
      createdAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  const todayComments = await prismaClient.comment.count({
    where: {
      createdAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  const todayContactMessages = await prismaClient.contactMessage.count({
    where: {
      createdAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  const todayProgress = await prismaClient.progress.count({
    where: {
      createdAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  const todayStudents = await prismaClient.user.count({
    where: {
      role: 'STUDENT',
      createdAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  // This month's counts
  const thisMonthBlogArticles = await prismaClient.blog.count({
    where: {
      createdAt: {
        gte: startOfThisMonth,
        lte: endOfThisMonth,
      },
    },
  });

  const thisMonthAssignmentSubmissions = await prismaClient.assignmentSubmission.count({
    where: {
      createdAt: {
        gte: startOfThisMonth,
        lte: endOfThisMonth,
      },
    },
  });

  const thisMonthComments = await prismaClient.comment.count({
    where: {
      createdAt: {
        gte: startOfThisMonth,
        lte: endOfThisMonth,
      },
    },
  });

  const thisMonthContactMessages = await prismaClient.contactMessage.count({
    where: {
      createdAt: {
        gte: startOfThisMonth,
        lte: endOfThisMonth,
      },
    },
  });

  const thisMonthProgress = await prismaClient.progress.count({
    where: {
      createdAt: {
        gte: startOfThisMonth,
        lte: endOfThisMonth,
      },
    },
  });

  const thisMonthStudents = await prismaClient.user.count({
    where: {
      role: 'STUDENT',
      createdAt: {
        gte: startOfThisMonth,
        lte: endOfThisMonth,
      },
    },
  });

  // This year's counts
  const thisYearBlogArticles = await prismaClient.blog.count({
    where: {
      createdAt: {
        gte: startOfThisYear,
      },
    },
  });

  const thisYearAssignmentSubmissions = await prismaClient.assignmentSubmission.count({
    where: {
      createdAt: {
        gte: startOfThisYear,
      },
    },
  });

  const thisYearComments = await prismaClient.comment.count({
    where: {
      createdAt: {
        gte: startOfThisYear,
      },
    },
  });

  const thisYearContactMessages = await prismaClient.contactMessage.count({
    where: {
      createdAt: {
        gte: startOfThisYear,
      },
    },
  });

  const thisYearProgress = await prismaClient.progress.count({
    where: {
      createdAt: {
        gte: startOfThisYear,
      },
    },
  });

  const thisYearStudents = await prismaClient.user.count({
    where: {
      role: 'STUDENT',
      createdAt: {
        gte: startOfThisYear,
      },
    },
  });

  // Last year's counts
  const lastYearBlogArticles = await prismaClient.blog.count({
    where: {
      createdAt: {
        gte: startOfLastYear,
        lte: endOfLastYear,
      },
    },
  });

  const lastYearAssignmentSubmissions = await prismaClient.assignmentSubmission.count({
    where: {
      createdAt: {
        gte: startOfLastYear,
        lte: endOfLastYear,
      },
    },
  });

  const lastYearComments = await prismaClient.comment.count({
    where: {
      createdAt: {
        gte: startOfLastYear,
        lte: endOfLastYear,
      },
    },
  });

  const lastYearContactMessages = await prismaClient.contactMessage.count({
    where: {
      createdAt: {
        gte: startOfLastYear,
        lte: endOfLastYear,
      },
    },
  });

  const lastYearProgress = await prismaClient.progress.count({
    where: {
      createdAt: {
        gte: startOfLastYear,
        lte: endOfLastYear,
      },
    },
  });

  const lastYearStudents = await prismaClient.user.count({
    where: {
      role: 'STUDENT',
      createdAt: {
        gte: startOfLastYear,
        lte: endOfLastYear,
      },
    },
  });

  // Total counts
  const totalBlogArticles = await prismaClient.blog.count();
  const totalAssignments = await prismaClient.assignment.count();
  const totalCourses = await prismaClient.course.count();
  const totalLessons = await prismaClient.lesson.count();
  const totalTopics = await prismaClient.topic.count();
  const totalComments = await prismaClient.comment.count();
  const totalAssignmentSubmissions = await prismaClient.assignmentSubmission.count();
  const totalContactMessages = await prismaClient.contactMessage.count();
  const totalPages = await prismaClient.page.count();
  const totalProgress = await prismaClient.progress.count();
  const totalStudents = await prismaClient.user.count({
    where: {
      role: 'STUDENT',
    },
  });

  return {
    pending: {
      assignmentSubmissions: pendingSubmissions,
      unEnrolledStudents: unEnrolledStudents,
    },
    today: {
      blogArticles: todayBlogArticles,
      assignmentSubmissions: todayAssignmentSubmissions,
      comments: todayComments,
      contactMessages: todayContactMessages,
      studentEnrollments: todayProgress,
      studentRegistration: todayStudents,
    },
    thisMonth: {
      blogArticles: thisMonthBlogArticles,
      assignmentSubmissions: thisMonthAssignmentSubmissions,
      comments: thisMonthComments,
      contactMessages: thisMonthContactMessages,
      studentEnrollments: thisMonthProgress,
      studentRegistration: thisMonthStudents,
    },
    thisYear: {
      blogArticles: thisYearBlogArticles,
      assignmentSubmissions: thisYearAssignmentSubmissions,
      comments: thisYearComments,
      contactMessages: thisYearContactMessages,
      studentEnrollments: thisYearProgress,
      studentRegistration: thisYearStudents,
    },
    lastYear: {
      blogArticles: lastYearBlogArticles,
      assignmentSubmissions: lastYearAssignmentSubmissions,
      comments: lastYearComments,
      contactMessages: lastYearContactMessages,
      studentEnrollments: lastYearProgress,
      studentRegistration: lastYearStudents,
    },
    total: {
      blogArticles: totalBlogArticles,
      assignments: totalAssignments,
      courses: totalCourses,
      lessons: totalLessons,
      topics: totalTopics,
      comments: totalComments,
      assignmentSubmissions: totalAssignmentSubmissions,
      contactMessages: totalContactMessages,
      websitePages: totalPages,
      studentEnrollments: totalProgress,
      studentRegistration: totalStudents,
    },
  };
}

async function getGraphData(thirtyDaysAgo: Date, twelveMonthsAgo: Date) {
  // Get data sequentially instead of in parallel
  const assignmentSubmissions = await getGraphDataForCategory(
    'assignmentSubmissions',
    'all',
    thirtyDaysAgo,
    new Date(),
  );
  const comments = await getGraphDataForCategory('comments', 'all', thirtyDaysAgo, new Date());
  const studentEnrollments = await getGraphDataForCategory(
    'studentEnrollments',
    'all',
    thirtyDaysAgo,
    new Date(),
  );

  return {
    assignmentSubmissions,
    comments,
    studentEnrollments,
  };
}

async function getGraphDataForCategory(
  category: string,
  type: string,
  startDate: Date,
  endDate: Date,
): Promise<GraphData> {
  let model;

  switch (category) {
    case 'assignmentSubmissions':
      model = prismaClient.assignmentSubmission as any;
      break;
    case 'comments':
      model = prismaClient.comment as any;
      break;
    case 'studentEnrollments':
      model = prismaClient.progress as any;
      break;
    default:
      throw new Error('Invalid category');
  }

  // Get data for different time periods sequentially
  const dailyData = await model.findMany({
    where: {
      createdAt: {
        gte: subDays(new Date(), 30),
        lte: new Date(),
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const monthlyData = await model.findMany({
    where: {
      createdAt: {
        gte: subMonths(new Date(), 12),
        lte: new Date(),
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const yearlyData = await model.findMany({
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return formatGraphData(dailyData, monthlyData, yearlyData);
}

async function getRecentItems() {
  // Get recent items sequentially
  const recentSubmissions = await prismaClient.assignmentSubmission.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      student: true,
      assignment: true,
    },
  });

  const recentComments = await prismaClient.comment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      author: true,
    },
  });

  const recentRegistrations = await prismaClient.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { role: 'STUDENT' },
  });

  const recentTopicViews = await prismaClient.topic.findMany({
    take: 5,
    orderBy: { lastViewedAt: 'desc' },
    where: {
      lastViewedAt: { not: null },
    },
    include: {
      course: {
        select: {
          title: true,
        },
      },
      lesson: {
        select: {
          title: true,
        },
      },
    },
  });

  const recentEnrollments = await prismaClient.progress.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  return {
    assignmentSubmissions: recentSubmissions,
    comments: recentComments,
    studentsRegistered: recentRegistrations,
    activities: recentTopicViews.map(topic => ({
      id: topic.id,
      type: 'TOPIC_VIEW',
      title: topic.title,
      courseTitle: topic.course.title,
      lessonTitle: topic.lesson.title,
      timestamp: topic.lastViewedAt,
      metadata: {
        topicId: topic.id,
        courseId: topic.courseId,
        lessonId: topic.lessonId,
      },
    })),
    studentEnrollments: recentEnrollments.map(enrollment => ({
      id: enrollment.id,
      studentId: enrollment.student.id,
      studentName: enrollment.student.name,
      studentEmail: enrollment.student.email,
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      courseSlug: enrollment.course.slug,
      completionRate: enrollment.completionRate,
      enrolledAt: enrollment.createdAt,
    })),
  };
}

function formatGraphData(
  dailyData: DataPoint[],
  monthlyData: DataPoint[],
  yearlyData: DataPoint[],
): GraphData {
  // Format daily data (last 30 days)
  const dailyGrouped = lodash.groupBy(dailyData, (item: DataPoint) =>
    format(new Date(item.createdAt), 'MMM dd'),
  );
  const daily: DailyDataPoint[] = Object.entries(dailyGrouped).map(([date, items]) => ({
    date,
    count: items.length,
  }));

  // Format monthly data (last 12 months)
  const monthlyGrouped = lodash.groupBy(monthlyData, (item: DataPoint) =>
    format(new Date(item.createdAt), 'MMM yyyy'),
  );
  const monthly: MonthlyDataPoint[] = Object.entries(monthlyGrouped).map(([month, items]) => ({
    month,
    count: items.length,
  }));

  // Format yearly data
  const yearlyGrouped = lodash.groupBy(yearlyData, (item: DataPoint) =>
    format(new Date(item.createdAt), 'yyyy'),
  );
  const yearly: YearlyDataPoint[] = Object.entries(yearlyGrouped).map(([year, items]) => ({
    year: parseInt(year),
    count: items.length,
  }));

  // Sort arrays by date
  daily.sort((a, b) => {
    const dateA = new Date(`2025 ${a.date}`);
    const dateB = new Date(`2025 ${b.date}`);
    return dateA.getTime() - dateB.getTime();
  });

  monthly.sort((a, b) => {
    const dateA = parseISO(`01 ${a.month}`);
    const dateB = parseISO(`01 ${b.month}`);
    return dateA.getTime() - dateB.getTime();
  });

  yearly.sort((a, b) => a.year - b.year);

  return {
    daily,
    monthly,
    yearly,
  };
}

export { getReports, getCategoryReport };

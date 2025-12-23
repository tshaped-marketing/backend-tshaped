import { z } from 'zod';

// Base schemas for report data structures
const baseCountSchema = z.object({
  assignmentSubmissions: z.number().optional(),
  unEnrolledStudents: z.number().optional(),
  comments: z.number().optional(),
  contactMessages: z.number().optional(),
  studentEnrollments: z.number().optional(),
  studentRegistration: z.number().optional(),
  blogArticles: z.number().optional(),
  newStudents: z.number().optional(),
  courses: z.number().optional(),
  lessons: z.number().optional(),
  topics: z.number().optional(),
  assignments: z.number().optional(),
  websitePages: z.number().optional(),
});

const graphDataPointSchema = z.object({
  date: z.string().optional(),
  month: z.string().optional(),
  year: z.number().optional(),
  count: z.number(),
});

// Schema for querying reports
export const getReportsSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      type: z.enum(['daily', 'monthly', 'yearly']).optional(),
      category: z
        .enum(['assignmentSubmissions', 'comments', 'studentEnrollments', 'all'])
        .optional(),
    })
    .strict(),
  params: z.object({}).strict(),
});

// Schema for graph data response validation
export const graphDataSchema = z.object({
  daily: z.array(graphDataPointSchema),
  monthly: z.array(graphDataPointSchema),
  yearly: z.array(graphDataPointSchema),
});

// Schema for recent items response validation
export const recentItemSchema = z.object({
  assignmentSubmissions: z.array(z.any()),
  comments: z.array(z.any()),
  studentsRegistered: z.array(z.any()),
});

// Complete report response schema
export const reportResponseSchema = z.object({
  counts: z.object({
    pending: baseCountSchema,
    today: baseCountSchema,
    thisMonth: baseCountSchema,
    thisYear: baseCountSchema,
    lastYear: baseCountSchema,
    total: baseCountSchema,
  }),
  graphs: z.object({
    assignmentSubmissions: graphDataSchema,
    comments: graphDataSchema,
    studentEnrollments: graphDataSchema,
  }),
  recents: recentItemSchema,
});

export const getStudentReportSchema = z.object({
  body: z.object({}).strict(),
  query: z
    .object({
      limit: z.string().optional(), // For limiting recent items
    })
    .strict(),
  params: z.object({}).strict(),
});

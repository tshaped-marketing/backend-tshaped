import { z } from 'zod';

export const updateTopicProgressSchema = z.object({
  body: z
    .object({
      courseId: z.string().min(1, { message: 'Course Slug is required' }),
      newCompletedTopicIds: z
     .array(z.string().nullable()),
      isLessonCompleted: z.boolean().optional().default(false),
      standaloneLessonId: z.string().optional()
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const markAsIncompleteSchema = z.object({
  body: z
    .object({
      courseId: z.string(),
      topicIds: z.array(z.string()).optional(),
      lessonIds: z.array(z.string()).optional(),
    })
    .strict()
    .refine(data => data.topicIds !== undefined || data.lessonIds !== undefined, {
      message: 'Either topicIds or lessonIds must be provided',
    }),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export type UpdateTopicProgressBody = z.infer<typeof updateTopicProgressSchema>['body'];

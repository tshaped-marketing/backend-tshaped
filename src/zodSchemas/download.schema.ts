import { z } from 'zod';

export const downloadAssignmentSchema = z.object({
  params: z.object({
    assignmentId: z.string().min(1, 'Assignment ID is required'),
  }),
});

export const downloadSubmissionSchema = z.object({
  params: z.object({
    submissionId: z.string().min(1, 'Submission ID is required'),
  }),
});

export type DownloadAssignmentSchemaType = z.infer<typeof downloadAssignmentSchema>;
export type DownloadSubmissionSchemaType = z.infer<typeof downloadSubmissionSchema>;

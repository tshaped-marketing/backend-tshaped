import { Request, Response, NextFunction } from 'express';
import { CustomRequest } from '../types/auth.types.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import prismaClient from '../prisma/prisma.client.js';
import { s3Service } from '../services/aws-services/s3.service.js';

/**
 * Extract S3 key from either CloudFront URL or private upload URL
 * @param url URL string to process
 * @returns S3 key or null if invalid
 */
async function extractS3Key(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url);

    // Case 1: CloudFront URL
    if (urlObj.hostname.includes('cloudfront.net')) {
      // Get everything before the query parameters and decode
      const key = decodeURIComponent(urlObj.pathname.split('?')[0].substring(1));
      return key.startsWith('uploads/') ? key : null;
    }

    // Case 2: Private upload URL
    if (urlObj.pathname.startsWith('/api/upload/')) {
      const uploadId = urlObj.pathname.split('/')[3];
      if (!uploadId) return null;

      // Query the Upload model to get the S3 key
      const upload = await prismaClient.upload.findUnique({
        where: { id: uploadId },
      });

      return upload?.key || null;
    }

    return null;
  } catch (error) {
    console.error('Error extracting S3 key:', error);
    return null;
  }
}

/**
 * Download all submissions for a specific assignment as a zip file
 */
const downloadAllAssignmentSubmissions = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { assignmentId } = req.params;

    const assignment = await prismaClient.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: true,
        course: true,
      },
    });

    if (!assignment) {
      return await throwError('ASSIGN002');
    }

    if (assignment.course.instructorId !== req.user?.userId) {
      return await throwError('AUTH016');
    }

    // Collect all valid S3 keys
    const allKeys: string[] = [];

    for (const submission of assignment.submissions) {
      if (submission.attachments) {
        const attachments = submission.attachments as { url: string; name: string; type: string }[];

        for (const attachment of attachments) {
          const key = await extractS3Key(attachment.url);
          if (key) {
            allKeys.push(key);
          }
        }
      }
    }

    if (allKeys.length === 0) {
      return await throwError('SUBMIT008');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${assignment.title}-submissions.zip`,
    );

    await s3Service.streamMultipleFilesToZip(allKeys, res as any);
  } catch (error) {
    next(error);
  }
};

/**
 * Download attachments for a specific submission as a zip file
 */
const downloadSubmissionAttachments = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { submissionId } = req.params;

    const submission = await prismaClient.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            course: true,
          },
        },
        student: true,
      },
    });

    if (!submission) {
      return await throwError('SUBMIT003');
    }

    const isAuthorized =
      submission.studentId === req.user?.userId ||
      submission.assignment.course.instructorId === req.user?.userId;

    if (!isAuthorized) {
      return await throwError('AUTH016');
    }

    const attachments =
      (submission.attachments as { url: string; name: string; type: string }[]) || [];
    const keys = await Promise.all(attachments.map(attachment => extractS3Key(attachment.url)));

    const validKeys = keys.filter((key): key is string => key !== null);

    if (validKeys.length === 0) {
      return await throwError('SUBMIT008');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${submission.student.name}-submission.zip`,
    );

    await s3Service.streamMultipleFilesToZip(validKeys, res as any);
  } catch (error) {
    next(error);
  }
};

export { downloadAllAssignmentSubmissions, downloadSubmissionAttachments };

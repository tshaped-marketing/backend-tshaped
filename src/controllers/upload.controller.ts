import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import { s3Service } from '../services/aws-services/s3.service.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { CustomRequest } from '../types/auth.types.js';
import mime from 'mime-types';
import prismaClient from '../prisma/prisma.client.js';
import slugify from 'slugify';
import { API_KEY, S3_BUCKET } from '../constants/env.constant.js';

const getMimeTypeCategory = (
  mimeType: string,
): 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'PDF' | 'OTHER' => {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('application/pdf')) return 'PDF';
  if (mimeType.startsWith('application/')) return 'DOCUMENT';
  return 'OTHER';
};

const getUploadPresignedUrl = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const fileNameWithExtenion = await req.body.fileNameWithExtension;
  const isPublic = req.body.isPublic || false;

  const [filename, extension] = fileNameWithExtenion.split('.');
  const contentType = mime.lookup(extension) || 'application/octet-stream';
  const fileType = getMimeTypeCategory(contentType);

  const { url, key } = await s3Service.getPresignedUrlForUpload(filename, contentType, isPublic);

  const slug = slugify(`${req.user?.name}-${filename}-${nanoid(4)}`, { lower: true });
 
  const downloadUrl = await prismaClient.$transaction(async tx => {
    const newUpload = await tx.upload.create({
      data: {
        filename,
        fileType,
        mimeType: contentType,
        size: 0,
        url: null,
        key,
        slug,
        bucket: S3_BUCKET!,
        userId: req.user?.userId as string,
        isPublic,
      },
    });

    const downloadUrl = isPublic
      ? s3Service.getPresignedUrlForDownload(key, isPublic)
      : `${req.protocol}://${req.get('host')}/api/upload/${newUpload.id}/signed-url`;
    await tx.upload.update({
      where: { id: newUpload.id },
      data: {
        url: downloadUrl,
      },
    });

    return downloadUrl;
  });

  res.status(200).json({
    presignedUrl: url,
    downloadUrl,
  });
};

const getMultiUploadPresignedUrls = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { files } = req.body;
  const isPublic = req.body.isPublic || false;

  const results = await Promise.all(
    files.map(async (fileInfo: { fileNameWithExtension: string }) => {
      const [filename, extension] = fileInfo.fileNameWithExtension.split('.');
      const contentType = mime.lookup(extension) || 'application/octet-stream';
      const fileType = getMimeTypeCategory(contentType);

      const { url, key } = await s3Service.getPresignedUrlForUpload(
        filename,
        contentType,
        isPublic,
      );
      const slug = slugify(`${req.user?.name}-${filename}-${nanoid(4)}`, { lower: true });

      const downloadUrl = await prismaClient.$transaction(async tx => {
        const newUpload = await tx.upload.create({
          data: {
            filename,
            fileType,
            mimeType: contentType,
            size: 0,
            url: null,
            key,
            slug,
            bucket: S3_BUCKET!,
            userId: req.user?.userId as string,
            isPublic,
          },
        });

        const downloadUrl = isPublic
          ? s3Service.getPresignedUrlForDownload(key, isPublic)
          : `${req.protocol}://${req.get('host')}/api/upload/${newUpload.id}/signed-url`;

        await tx.upload.update({
          where: { id: newUpload.id },
          data: {
            url: downloadUrl,
          },
        });

        return downloadUrl;
      });

      return {
        presignedUrl: url,
        downloadUrl,
      };
    }),
  );

  res.status(200).json(results);
};
const processUploadConfirmation = async (
  uploadId: string | undefined,
  uploadKey: string | undefined,
  size: number,
): Promise<void> => {
  try {
    const upload = await prismaClient.upload.findFirst({
      where: uploadId ? { id: uploadId } : { key: `uploads/${uploadKey}` },
    });

    if (!upload) return;

    const exists = await s3Service.checkIfKeyExists(upload.key);
    if (!exists) return;

    await prismaClient.upload.update({
      where: { id: upload.id },
      data: {
        size: parseInt(size.toString()),
        isConfirmed: true,
      },
    });
  } catch (error) {
    console.error('Error:', error);
  }
};
// Modified Lambda handler that returns quickly
const confirmUpload = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { uploadId, uploadKey, size , apiKey} = req.body;

  // Validate API key
  if (apiKey !== API_KEY) {

    return await throwError('AUTH016'); // Add this error code for invalid API key
  }

  // Immediately acknowledge receipt of the request
  res.status(202).json({
    message: 'Upload confirmation received and being processed',
    uploadId: uploadId || `uploads/${uploadKey}`,
  });

  // Process the upload confirmation asynchronously
  processUploadConfirmation(uploadId, uploadKey, size).catch(error =>
    console.error('Background processing failed:', error),
  );
};

const getUploadByIdOrSlug = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { identifier } = req.params;
  const isId = identifier.startsWith('cm');

  const upload = await prismaClient.upload.findFirst({
    where: isId ? { id: identifier } : { slug: identifier },
  });

  if (!upload) return await throwError('UPLOAD002');
  if (!upload.isPublic && upload.userId !== req.user?.userId) {
    return await throwError('UPLOAD003');
  }

  try {
    res.status(200).json({ ...upload });
  } catch (error) {
    return await throwError('UPLOAD005');
  }
};

const getUserUploads = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { sortBy, order = 'desc', fileType, search } = req.query;

  // Build where clause
  const where: any = {
    userId: req.user?.userId,
  };

  // Add fileType filter if provided
  if (fileType) {
    where.fileType = fileType;
  }

  // Add search filter if provided
  if (search) {
    where.filename = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Build orderBy clause
  const orderBy: any = {};
  if (sortBy === 'fileType') {
    orderBy.fileType = order;
  } else {
    // Default to sorting by date
    orderBy.createdAt = order;
  }

  const uploads = await prismaClient.upload.findMany({
    where,
    orderBy,
  });

  try {
    // Generate fresh signed URLs for all uploads
    const uploadsWithUrls = await Promise.all(
      uploads.map(async upload => ({
        ...upload,
        signedUrl: s3Service.getPresignedUrlForDownload(upload.key, false),
      })),
    );

    res.status(200).json({
      data: uploadsWithUrls,
      totalCount: uploadsWithUrls.length,
      filters: {
        sortBy,
        order,
        fileType,
        search,
      },
    });
  } catch (error) {
    return await throwError('UPLOAD005');
  }
};

const deleteUpload = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const upload = await prismaClient.upload.findUnique({
    where: { id },
  });

  if (!upload) {
    return await throwError('UPLOAD002');
  }

  if (upload.userId !== req.user?.userId) {
    return await throwError('UPLOAD003');
  }

  try {
    await s3Service.deleteFile(upload.key);
    await prismaClient.upload.delete({
      where: { id },
    });

    res.status(204).json({ success: true, message: 'Upload deleted successfully' });
  } catch (error) {
    return await throwError('UPLOAD005');
  }
};

const getSignedUrl = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { identifier } = req.params;

  const isId = identifier.startsWith('cm');

  const upload = await prismaClient.upload.findFirst({
    where: isId ? { id: identifier } : { slug: identifier },
  });

  if (!upload) {
    return await throwError('UPLOAD002');
  }
  if (!upload.isConfirmed) {

    return await throwError('UPLOAD007');
  }

  if (!upload.isPublic && upload.userId !== req.user?.userId) {
    return await throwError('UPLOAD003');
  }

  try {
    const signedUrl = s3Service.getPresignedUrlForDownload(upload.key, upload.isPublic);
    res.status(200).json({
      signedUrl,
      fileType: upload.fileType,
      filename: upload.filename,
      mimeType: upload.mimeType,
      size: upload.size,
    });
  } catch (error) {
    return await throwError('UPLOAD005');
  }
};

const downloadMultipleFiles = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { keys } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
 
      return await throwError('UPLOAD008'); // Add this error code for invalid keys
    }

    // Verify access permissions for all files
    for (const key of keys) {
      const upload = await prismaClient.upload.findFirst({
        where: { key },
      });

      if (!upload) {
        return await throwError('UPLOAD002');
      }

      if (!upload.isPublic && upload.userId !== req.user?.userId) {
        return await throwError('UPLOAD003');
      }

      if (!upload.isConfirmed) {
        return await throwError('UPLOAD007');
      }
    }

    // Set response headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=downloads.zip');

    // Stream files to zip and send response
    await s3Service.streamMultipleFilesToZip(keys, res as any);
  } catch (error) {
    next(error);
  }
};

export {
  getUploadPresignedUrl,
  confirmUpload,
  deleteUpload,
  getUploadByIdOrSlug,
  getUserUploads,
  getMultiUploadPresignedUrls,
  getSignedUrl,
  downloadMultipleFiles,
};

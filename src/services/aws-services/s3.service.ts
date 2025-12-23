import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_REGION,
  S3_SECRET_KEY,
} from '../../constants/env.constant.js';
import { cloudfrontService } from './cloudfront.service.js';
import mime from 'mime-types';
import { Readable } from 'stream';
import archiver from 'archiver';
import prismaClient from '../../prisma/prisma.client.js';
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_KEY!,
      },
    });

    // Add middleware to work around AWS SDK versions 3.729.0-3.731.0 bug
    this.s3Client.middlewareStack.addRelativeTo(
      (next: any) => async (args: any) => {
        const result = await next(args);
        if (result.response && result.response.headers) {
          delete result.response.headers['x-amz-checksum-crc64nvme'];
        }
        return result;
      },
      {
        relation: 'after',
        toMiddleware: 'deserializerMiddleware',
      },
    );

    this.bucket = S3_BUCKET;
  }

  private generateKey(originalname: string, isPublic: boolean): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(`${timestamp}-${originalname}`).digest('hex');
    const ext = path.extname(originalname);
    const baseFolder = isPublic ? 'uploads/public' : 'uploads/private';
    return `${baseFolder}/${hash}${ext}`;
  }

  async checkIfKeyExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      return false;
    }
  }

  async getPresignedUrlForUpload(
    filename: string,
    contentType: string,
    isPublic: boolean = false,
  ): Promise<{ url: string; key: string }> {
    const key = this.generateKey(filename, isPublic);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client as any, command as any, {
      expiresIn: 300, // URL expires in 5 min
    });

    return { url, key };
  }

  getPresignedUrlForDownload(key: string, isPublic: boolean): string {
    return cloudfrontService.getSignedUrl(key, isPublic);
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async updateFileAccess(key: string, isPublic: boolean): Promise<string> {
    const filename = path.basename(key);
    const currentFolder = isPublic ? 'uploads/private' : 'uploads/public';
    const targetFolder = isPublic ? 'uploads/public' : 'uploads/private';

    if (key.includes(currentFolder)) {
      const newKey = key.replace(currentFolder, targetFolder);

      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${key}`,
        Key: newKey,
      });

      await this.s3Client.send(copyCommand);
      await this.deleteFile(key);

      return newKey;
    }

    return key;
  }

  async getObjectStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Body as Readable;
  }

  async streamMultipleFilesToZip(keys: string[], res: Response): Promise<void> {
    const archive = archiver('zip', {
      zlib: { level: 5 },
    });

    // Pipe archive data to response
    archive.pipe(res as any);

    // Handle archive warnings
    archive.on('warning', err => {
      if (err.code === 'ENOENT') {
        console.warn('Archive warning:', err);
      } else {
        throw err;
      }
    });

    // Handle archive errors
    archive.on('error', err => {
      throw err;
    });

    // Fetch all upload records for the given keys
    const uploads = await prismaClient.upload.findMany({
      where: {
        key: {
          in: keys,
        },
      },
    });

    // Create a map for quick lookup
    const uploadMap = new Map(uploads.map(upload => [upload.key, upload]));

    // Process each file
    for (const key of keys) {
      try {
        const upload = uploadMap.get(key);
        if (!upload) {
          console.warn(`No upload record found for key: ${key}`);
          continue;
        }

        const fileStream = await this.getObjectStream(key);

        // Get the file extension from the MIME type
        const extension = mime.extension(upload.mimeType);

        // Construct filename: if no extension in original filename, add it from MIME type
        let filename = upload.filename;
        if (extension && !filename.toLowerCase().endsWith(`.${extension}`)) {
          filename = `${filename}.${extension}`;
        }

        // Add file to archive with original filename
        archive.append(fileStream, { name: filename });
      } catch (error) {
        console.error(`Error processing file ${key}:`, error);
        // Continue with other files if one fails
      }
    }

    // Finalize archive
    await archive.finalize();
  }
}

export const s3Service = new S3Service();

import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_REGION,
  S3_SECRET_KEY,
} from '../constants/env.constant.js';
import { cloudfrontService } from '../services/aws-services/cloudfront.service.js';
import { fileURLToPath } from 'url';
// Get the directory name equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// S3 Client initialization
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_KEY,
  },
});

// Type definitions
interface Position {
  x: number;
  y: number;
}

interface CertificateOptions {
  studentNameFont?: string;
  studentNameColor?: string;
  studentNamePosition?: Position;
  courseNameFont?: string;
  courseNameColor?: string;
  courseNamePosition?: Position;
  dateFont?: string;
  dateColor?: string;
  datePosition?: Position;
  includeDate?: boolean;
  alignment?: 'center' | 'left' | 'right';
}

interface GenerateCertificateResult {
  cloudFrontUrl: string; // Changed from s3Url to cloudFrontUrl
  s3Key: string;
}

/**
 * Generates a hashed key for S3 uploads
 * @param originalname - Original filename
 * @param isPublic - Whether the file should be in public or private folder
 * @returns Hashed S3 key path
 */
function generateKey(originalname: string, isPublic: boolean = true): string {
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(`${timestamp}-${originalname}`).digest('hex');
  const ext = path.extname(originalname);
  const baseFolder = isPublic ? 'uploads/public' : 'uploads/private';
  return `${baseFolder}/${hash}${ext}`;
}

/**
 * Generates a course completion certificate based on a template image and uploads to S3
 * @param studentName - Full name of the student
 * @param courseName - Name of the course
 * @param templatePath - Path to the certificate template image (relative to the src directory)
 * @param options - Additional options for certificate generation
 * @returns Promise with CloudFront URL and S3 key of the generated certificate
 */
async function generateCertificate(
  studentName: string,
  courseName: string = "Course Name",
  templatePath: string = '../public/certificate-template.jpg',
  options: CertificateOptions = {},
): Promise<GenerateCertificateResult> {
  try {
    // Resolve the template path relative to the current file
    const resolvedTemplatePath = path.resolve(__dirname, templatePath);
 
    const isCourseNameShort= courseName.length <= 24;
    // Default options
    const defaultOptions: CertificateOptions = {
      studentNameFont: '500 80px Arial',
      studentNameColor: '#000000',
      studentNamePosition: { x: 895, y: 733 }, // Center-ish position

      courseNameFont: 'bold 50px Arial',
      courseNameColor: '#000000',
      courseNamePosition: { x: isCourseNameShort?1150:1150, y: isCourseNameShort?903:970 }, // Position for course name

      dateFont: 'bold 50px Arial',
      dateColor: '#000000',
      datePosition: { x: 1801, y: 1187 },
      includeDate: true,

      alignment: 'center', // center, left, right
    };

    // Merge default options with provided options
    const settings: CertificateOptions = { ...defaultOptions, ...options };

    // Load the template image
    const image = await loadImage(resolvedTemplatePath);

    // Create canvas with the same dimensions as the template
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the template image on the canvas
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Configure text settings
    ctx.textBaseline = 'middle';

    // Helper function to draw aligned text
    const drawText = (
      text: string,
      font: string,
      color: string,
      position: Position,
      alignment: 'center' | 'left' | 'right',
    ): void => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = alignment;
      ctx.fillText(text, position.x, position.y);
    };

    // Draw student name
    drawText(
      studentName,
      settings.studentNameFont!,
      settings.studentNameColor!,
      settings.studentNamePosition!,
      settings.alignment!,
    );

    // Draw course name
    drawText(
      courseName,
      settings.courseNameFont!,
      settings.courseNameColor || settings.studentNameColor!,
      settings.courseNamePosition!,
      settings.alignment!,
    );

    // Add date if required
    if (settings.includeDate) {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      drawText(
        `${currentDate}`,
        settings.dateFont!,
        settings.dateColor!,
        settings.datePosition!,
        settings.alignment!,
      );
    }

    // Generate unique filename
    const sanitizedStudentName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const originalFilename = `certificate_${sanitizedStudentName}.png`;

    // Generate hashed S3 key
    const s3Key = generateKey(originalFilename, true);

    // Get the PNG buffer from canvas
    const buffer = canvas.toBuffer('image/png');

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/png',
      }),
    );

    // Generate CloudFront URL instead of direct S3 URL
    const cloudFrontUrl = cloudfrontService.getSignedUrl(s3Key, true);

    return {
      cloudFrontUrl, // Return CloudFront URL instead of S3 URL
      s3Key,
    };
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}

// Export the function for use in other modules
export { generateCertificate, generateKey, CertificateOptions, GenerateCertificateResult };

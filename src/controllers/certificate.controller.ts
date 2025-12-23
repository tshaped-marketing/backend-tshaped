import { Request, Response, NextFunction } from 'express';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { sendSuccess } from '../middlewares/successHandler.middleware.js';
import { CustomRequest } from '../types/auth.types.js';
import { generateCertificate } from '../utils/generateCertificate.js';
import { formatDateTime } from '../utils/formatDateTime.js';


export const generateCertificateController = async (req: Request, res: Response) => {

    const { studentName, courseName, templatePath, options } = req.body;

    // Generate the certificate
    const result = await generateCertificate(
      studentName,
      courseName,
      templatePath,
      options 
    );

    // Return success response with CloudFront URL
    res.status(200).json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        cloudFrontUrl: result.cloudFrontUrl,
        s3Key: result.s3Key,
        studentName,
        courseName,
        generatedAt: new Date().toISOString()
      }
    });

  
};


/**
 * Create a new certificate
 */
const createCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { studentId, courseId } = req.body;

  // Check if certificate already exists for this student and course
  const existingCertificate = await prismaClient.certification.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
  });

  if (existingCertificate) {
    await throwError('CERT001');
  }

  // Verify student and course exist
  const student = await prismaClient.user.findUnique({ where: { id: studentId } });
  if (!student) {
    await throwError('CERT002');
  }

  const course = await prismaClient.course.findUnique({ where: { id: courseId } });
  if (!course) {
    await throwError('CERT003');
  }

  const certificateUrl = (await generateCertificate(student?.name!,course?.title)).cloudFrontUrl;

  const certificate = await prismaClient.certification.create({
    data: {
      studentId,
      courseId,
      certificateUrl,
    },
  });

  res.status(201).json({
    success: true,
    data: certificate,
  });
};

/**
 * Get a specific certificate by ID
 */
const getCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  const certificate = await prismaClient.certification.findUnique({
    where: { id },
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
        },
      },
    },
  });

  if (!certificate) {
    await throwError('CERT004');
  }

  res.status(200).json({
    success: true,
    data: certificate,
  });
};

const getCertificateByCourseId = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { courseId } = req.params;
  const userId = req.user?.userId;

  const certificate = await prismaClient.certification.findUnique({
    where: {
      studentId_courseId: {
        studentId: userId!,
        courseId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  //format date time 
  const formattedCertificate = {
    ...certificate,
    issuedAt: certificate?.issuedAt ? formatDateTime(certificate.issuedAt) : null,
  };
  if (!certificate) {
    await throwError('CERT004');
  }

  res.status(200).json({
    success: true,
    data: formattedCertificate,
  });
};

/**
 * Get all certificates with optional filtering
 */
const getAllCertificates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { studentId, courseId } = req.query;

  const whereClause: any = {};
  if (studentId) whereClause.studentId = studentId;
  if (courseId) whereClause.courseId = courseId;

  const certificates = await prismaClient.certification.findMany({
    where: whereClause,
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
        },
      },
    },
  });



  res.status(200).json({
    success: true,
    data: certificates,
  });
};

/**
 * Update a certificate
 */
const updateCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const { certificateUrl } = req.body;

  const existingCertificate = await prismaClient.certification.findUnique({
    where: { id },
  });

  if (!existingCertificate) {
    await throwError('CERT004');
  }

  const updatedCertificate = await prismaClient.certification.update({
    where: { id },
    data: {
      certificateUrl,
    },
  });

  res.status(200).json({
    success: true,
    data: updatedCertificate,
  });
};

/**
 * Delete a certificate
 */
const deleteCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const existingCertificate = await prismaClient.certification.findUnique({
    where: { id },
  });

  if (!existingCertificate) {
    await throwError('CERT004');
  }

  await prismaClient.certification.delete({
    where: { id },
  });
  
  await sendSuccess(res, 'CERTIFICATE_DELETE');
};

const getStudentCertificates = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Extract student ID from authenticated user
  const studentId = req.user?.userId;

  const certificates = await prismaClient.certification.findMany({
    where: { studentId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true, // Include course thumbnail if available
          description: true,
        },
      },
    },
    orderBy: {
      issuedAt: 'desc', // Most recent certificates first
    },
  });
const formattedCertificates = certificates.map(certificate => ({
  ...certificate,
  issuedAt: certificate.issuedAt ? formatDateTime(certificate.issuedAt) : null,
}));


  res.status(200).json({
    success: true,
    count: formattedCertificates.length,
    data: formattedCertificates,
  });
};

const getStudentSingleCertificate = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { certificateId } = req.params;
  const studentId = req.user?.userId; // Assuming you have middleware that adds user to request

  const certificate = await prismaClient.certification.findFirst({
    where: {
      id: certificateId,
      studentId,
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          instructor: {
            select: {
              name: true,
            },
          },
        },
      },
      student: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!certificate) {
    await throwError('CERT004'); // Certificate not found or not accessible
  }

  res.status(200).json({
    success: true,
    data: certificate,
  });
};

/**
 * Check if a student is eligible for a certificate in a specific course
 * This can be used to determine if a student has completed the course requirements
 */
const checkCertificateEligibility = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { courseId } = req.params;
  const studentId = req.user!.userId;

  // Check if the student has already received a certificate
  const existingCertificate = await prismaClient.certification.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
  });

  if (existingCertificate) {
    res.status(200).json({
      success: true,
      eligible: true,
      certificateExists: true,
      data: existingCertificate,
    });
    return;
  }

  // Check student's progress in the course
  const progress = await prismaClient.progress.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
  });

  // Assume course is completed if progress shows 100% completion
  const isEligible = progress && progress.completionRate === 100;
  let newCertData = null;
  if (isEligible) {

    //Find course title
    const course = await prismaClient.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });
    //Create a certificate if eligible
    const certificateUrl = (await generateCertificate(req.user?.name!,course?.title)).cloudFrontUrl;
    newCertData = await prismaClient.certification.create({
      data: {
        studentId,
        courseId,
        certificateUrl,
      },
    });
  }

  res.status(200).json({
    success: true,
    eligible: isEligible,
    certificateExists: false,
    progress: progress?.completionRate,
    data: isEligible ? newCertData : null,
  });
};

export {
  createCertificate,
  getCertificate,
  getAllCertificates,
  updateCertificate,
  deleteCertificate,
  getStudentCertificates,
  getStudentSingleCertificate,
  checkCertificateEligibility,
  getCertificateByCourseId,
};
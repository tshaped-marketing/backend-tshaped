import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prismaClient from '../prisma/prisma.client.js';
import { throwError } from '../middlewares/errorHandler.middleware.js';
import { ADMIN_IDS, JWT_SECRET, NODE_ENV } from '../constants/env.constant.js';
import { COOKIE_CONFIG_PROVIDER } from '../config/cookie.config.js';
import { CustomRequest } from '../types/auth.types.js';

import { Role, User } from '@prisma/client';
import sendEmail from '../utils/emails/sendEmail.js';
import { htmlTemplate } from '../utils/emails/email.template.js';
import { formatDateTime } from '../utils/formatDateTime.js';
import { notificationService } from '../server.js';
import { sendSuccess } from '../middlewares/successHandler.middleware.js';
import { handleCachedResponse } from '../utils/handleCacheResponse.js';
import executeBackgroundTasks from '../utils/executeBackgroundTasks.js';
import redisService from '../config/redis.config.js';
import { loginUser_TTL } from '../constants/redis.cacheTTL.js';

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const reqBody = req.body;

  const hashedPassword = await bcrypt.hash(reqBody.password, 10);

  // Check if user existss
  const userExists = await prismaClient.user.findUnique({
    where: { email: reqBody.email },
  });

  if (userExists) {
    await throwError('AUTH001');
    return;
  }

  // Generate OTP
  const otp = generateOTP();

  const user = await prismaClient.user.create({
    data: {
      name: reqBody.name,
      email: reqBody.email,
      password: hashedPassword,
      role: 'STUDENT',
      status: 'PENDING_VERIFICATION',
      avatar: reqBody.avatar,
      bio: reqBody.bio,
      phoneNumber: reqBody.phoneNumber,
      website: reqBody.website,
      socialLinks: reqBody.socialLinks,
      timezone: reqBody.timezone,
      preferences: reqBody.preferences,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
    },
  });

  // Store OTP in temporary storage
  await prismaClient.otpVerification.create({
    data: {
      userId: user.id,
      otp,
       expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day expiry (24 hours)
    },
  });

  sendEmail({
    to: user.email,
    subject: 'Account Verification',
    htmlTemplate: htmlTemplate(otp, 'EMAIL:VERIFICATION', user.email),
});
  return await sendSuccess(res, 'USER_REGISTER', {
    data: user,
  });
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, otp } = req.body;

  const user = await prismaClient.user.findUnique({
    where: { email },
  });

  if (!user) {
    await throwError('AUTH002');
    return;
  }

  const otpVerification = await prismaClient.otpVerification.findFirst({
    where: {
      userId: user.id,
      otp,
      expiresAt: { gt: new Date() },
      used: false,
    },
  });

  if (!otpVerification) {
    await throwError('AUTH003');
    return;
  }

  // Mark OTP as used
  await prismaClient.otpVerification.update({
    where: { id: otpVerification.id },
    data: { used: true },
  });

  // Update user status to ACTIVE
  await prismaClient.user.update({
    where: { id: user.id },
    data: { status: 'ACTIVE' },
  });

  // Notify admin of new user registration
  notificationService.createNotification({
    userId: ADMIN_IDS[0], // You might want to fetch actual admin ID or use a constant
    type: 'ADMIN',
    message: `New student registered: ${user.name} (${user.email})`,
    metadata: {
      event: 'USER_EMAIL_VERIFICATION',
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      verifiedAt: new Date().toISOString(),
    },
  });

    const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      name: user.name,
      authorizedCourses: user.authorizedCourses,
    },
    JWT_SECRET,
    { expiresIn: '1d' },
  );

  res.setHeader('Authorization', `Bearer ${token}`);

  res.cookie('token', token, COOKIE_CONFIG_PROVIDER(true));

  return await sendSuccess(res, 'USER_EMAIL_VERIFIED',{
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
      },
    },
  });
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const reqBody = req.body;
 
  let user: User | null;
  // Try to get data from cache first

    user = await prismaClient.user.findUnique({
      where: { email: reqBody.email },
    });

 
  if (!user || !(await bcrypt.compare(reqBody.password, user.password))) {
    await throwError('AUTH004');
    return;
  }

  if (user.status === 'PENDING_VERIFICATION') {
    await throwError('AUTH005');
    return;
  }

  if (user.status === 'SUSPENDED') {
    await throwError('AUTH006');
    return;
  }

  if (user.status === 'INACTIVE') {
    await throwError('AUTH007');
    return;
  }
  if(user.isoauthuser) {
    await throwError('AUTH024');
    return;
  }

  // Check if 2FA is required
  const require2FA = user.role === 'ADMIN' || (user.role === 'STUDENT' && user.enable2FA);

  if (require2FA) {
    const otp = generateOTP();

    await prismaClient.otpVerification.create({
      data: {
        userId: user.id,
        otp,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        type: '2FA',
      },
    });
    sendEmail({
      to: user.email,
      subject: '2FA Verification',
      htmlTemplate: htmlTemplate(otp, 'EMAIL:2FA'),
    });
    return await sendSuccess(res, 'USER_2FA_SENT', {
      requires2FA: true,
      userId: user.id,
    });
  }

  // If 2FA not required, proceed with normal login
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      name: user.name,
      authorizedCourses: user.authorizedCourses,
    },
    JWT_SECRET,
    { expiresIn: '1d' },
  );

  res.setHeader('Authorization', `Bearer ${token}`);

  res.cookie('token', token, COOKIE_CONFIG_PROVIDER(true));

  await sendSuccess(res, 'USER_LOGIN', {
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
      },
    },
  });

  executeBackgroundTasks(
    [
      async () => {
        await prismaClient.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      },
    ],
    `updateUser`,
  );
};

const resendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { email } = req.body;

  const user = await prismaClient.user.findUnique({
    where: { email },
  });

  if (!user) {
    await throwError('AUTH002');
    return;
  }

  if (user.status !== 'PENDING_VERIFICATION') {
    await throwError('AUTH008');
    return;
  }

  // Check if there's a recent unverified OTP to prevent spam
  const recentOTP = await prismaClient.otpVerification.findFirst({
    where: {
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      expiresAt: { gt: new Date() },
      used: false,
    },
  });

  if (recentOTP) {
    await throwError('AUTH009');
    return;
  }

  // Generate and save new OTP
  const otp = generateOTP();
  await prismaClient.otpVerification.create({
    data: {
      userId: user.id,
      otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      type: 'EMAIL_VERIFICATION',
    },
  });

 sendEmail({
    to: user.email,
    subject: 'Account Verification',
    htmlTemplate: htmlTemplate(otp, 'EMAIL:VERIFICATION', user.email),
});
  return await sendSuccess(res, 'USER_EMAIL_RESENT');
};

const verify2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId, otp } = req.body;

  const otpVerification = await prismaClient.otpVerification.findFirst({
    where: {
      userId,
      otp,
      type: '2FA',
      expiresAt: { gt: new Date() },
      used: false,
    },
  });

  if (!otpVerification) {
    await throwError('AUTH010');
    return;
  }

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    await throwError('AUTH002');
    return;
  }

  // Generate token and proceed with login
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      name: user.name,
      authorizedCourses: user.authorizedCourses,
    },
    JWT_SECRET,
    { expiresIn: '1d' },
  );

  res.setHeader('Authorization', `Bearer ${token}`);
  res.cookie('token', token, COOKIE_CONFIG_PROVIDER(true));

  await sendSuccess(res, 'USER_LOGIN', {
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
      },
    },
  });

  executeBackgroundTasks(
    [
      async () => {
        // Mark OTP as used
        await prismaClient.otpVerification.update({
          where: { id: otpVerification.id },
          data: { used: true },
        });
        await prismaClient.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      },
    ],
    `updateUserIn2FA`,
  );
};

const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.clearCookie('token', COOKIE_CONFIG_PROVIDER(false));
    res.setHeader('Authorization', '');
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (err) {
    await throwError('AUTH011');
  }
};

const deleteUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [req.body.userIds];

  // Validate all userIds exist before proceeding
  const users = await prismaClient.user.findMany({
    where: { id: { in: userIds } },
  });

  if (users.length !== userIds.length) {
    await throwError('AUTH002');
    return;
  }

  // Delete associated records for all users in a transaction
  await prismaClient.$transaction(
    userIds.flatMap((userId: string) => [
      prismaClient.otpVerification.deleteMany({ where: { userId } }), // Add this line
      prismaClient.progress.deleteMany({ where: { studentId: userId } }),
      prismaClient.certification.deleteMany({ where: { studentId: userId } }),
      prismaClient.payment.deleteMany({ where: { studentId: userId } }),
      prismaClient.comment.deleteMany({ where: { authorId: userId } }),
      prismaClient.assignmentSubmission.deleteMany({ where: { studentId: userId } }),
      prismaClient.user.delete({ where: { id: userId } }),
    ]),
  );
  res.status(200).json({
    success: true,
    message:
      userIds.length === 1
        ? 'User and associated data deleted successfully'
        : `${userIds.length} users and their associated data deleted successfully`,
  });

  // Delete the cached response for the updated page
  executeBackgroundTasks(
    [
      async () => {
        for (const userId of userIds) {
          await redisService.deleteCachedResponse(`getUserById:${userId}`);
        }
      },
    ],
    'deleteUsers',
  );
};

const checkActiveAuth = async (req: CustomRequest, res: Response, next: NextFunction) => {
  // Check for both authorization header and cookie
  return res.status(200).json({
    isActive: req.user?.status === 'ACTIVE',
    data: {
      userId: req.user?.userId,
      role: req.user?.role,
      status: req.user?.status,
    },
  });
};

const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email } = req.body;

  const user = await prismaClient.user.findUnique({
    where: { email },
  });

  if (!user) {
    // For security reasons, we still return a success response
    return await sendSuccess(res, 'USER_PASS_RESET');
  }

  // Generate OTP for password reset
  const otp = generateOTP();

  // Store password reset OTP
  await prismaClient.otpVerification.create({
    data: {
      userId: user.id,
      otp,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
    },
  });

  sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    htmlTemplate: htmlTemplate(otp, 'EMAIL:RESET_PASSWORD'),
  });

  return await sendSuccess(res, 'USER_PASS_RESET');
};

const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, otp, newPassword } = req.body;

  const user = await prismaClient.user.findUnique({
    where: { email },
  });

  if (!user) {
    await throwError('AUTH002');
    return;
  }

  // Verify OTP
  const otpVerification = await prismaClient.otpVerification.findFirst({
    where: {
      userId: user.id,
      otp,
      type: 'PASSWORD_RESET',
      expiresAt: { gt: new Date() },
      used: false,
    },
  });

  if (!otpVerification) {
    await throwError('AUTH003');
    return;
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and mark OTP as used in a transaction
  await prismaClient.$transaction([
    prismaClient.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prismaClient.otpVerification.update({
      where: { id: otpVerification.id },
      data: { used: true },
    }),
  ]);

  // Send confirmation email
  sendEmail({
    to: user.email,
    subject: 'Password Changed Successfully',
    htmlTemplate: htmlTemplate(otp, 'EMAIL:PASSWORD_CHANGED'),
  });

  return await sendSuccess(res, 'USER_PASS_RESET_SUCCESS');
};

export const authenticatedPasswordReset = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Assuming the authenticated user's ID is available in req.user
  const userId = req.user?.userId;
  const { currentPassword, newPassword } = req.body;

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    await throwError('AUTH002');
    return;
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    await throwError('AUTH023'); // Invalid current password
    return;
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prismaClient.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // Send confirmation email
  sendEmail({
    to: user.email,
    subject: 'Password Changed Successfully',
    htmlTemplate: htmlTemplate('', 'EMAIL:PASSWORD_CHANGED'),
  });

  return await sendSuccess(res, 'USER_PASS_CHANGE_SUCCESS');
};
const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const users = await prismaClient.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      lastLoginAt: true,
      createdAt: true,
      phoneNumber: true,
      website: true,
      bio: true,
    },
  });

  // Format the dates in the response
  const formattedUsers = users.map(user => ({
    ...user,
    lastLoginAt: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : null,
    createdAt: formatDateTime(user.createdAt),
  }));

  return await sendSuccess(res, 'USER_RETRIEVED', {
    data: formattedUsers,
  });
};
const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.params.id;

  const cacheKey = `getUserById:${userId}`;
  const responseSent = await handleCachedResponse(cacheKey, res);
  if (responseSent) {
    return;
  }
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      bio: true,
      phoneNumber: true,
      website: true,
      socialLinks: true,
      timezone: true,
      preferences: true,
      lastLoginAt: true,
      enable2FA: true,
      createdAt: true,
      courses: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          status: true,
          thumbnail: true,
          duration: true,
          rating: true,
          instructor: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          enrollmentCount: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    await throwError('AUTH002');
    return;
  }

  // Format the dates in both user and nested courses data
  const formattedUser = {
    ...user,
    lastLoginAt: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : null,
    createdAt: formatDateTime(user.createdAt),
    courses: user.courses.map(course => ({
      ...course,
      createdAt: formatDateTime(course.createdAt),
      updatedAt: formatDateTime(course.updatedAt),
    })),
  };

  await sendSuccess(res, 'USER_RETRIEVED', {
    data: formattedUser,
  });

  // Execute caching
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.cacheResponse(
          cacheKey,
          {
            success: true,
            message: 'Users retrieved successfully',
            data: formattedUser,
          },
          86400, // 24 hrs in seconds
        );
      },
    ],
    'getUserById',
  );
};

const searchUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const {
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
    role,
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const searchCondition = {
    AND: [
      ...(role ? [{ role: role as Role }] : []),
      ...(search
        ? [
            {
              OR: [
                { name: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } },
                { phoneNumber: { contains: search as string, mode: 'insensitive' } },
                { bio: { contains: search as string, mode: 'insensitive' } },
              ],
            },
          ]
        : []),
    ],
  } as any;

  const orderBy: any = {
    [sortBy as string]: sortOrder,
  };

  const totalCount = await prismaClient.user.count({
    where: searchCondition,
  });

  const users = await prismaClient.user.findMany({
    where: searchCondition,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      phoneNumber: true,
      bio: true,
      website: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy,
    skip,
    take: Number(limit),
  });

  // Format dates for each user in the results
  const formattedUsers = users.map(user => ({
    ...user,
    lastLoginAt: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : null,
    createdAt: formatDateTime(user.createdAt),
  }));

  const totalPages = Math.ceil(totalCount / Number(limit));

  return await sendSuccess(res, 'USER_RETRIEVED', {
    data: {
      users: formattedUsers,
      pagination: {
        total: totalCount,
        totalPages,
        currentPage: Number(page),
        limit: Number(limit),
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    },
  });
};

const updateUser = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.params.id;
  const userIdFromJWT = req.user?.userId;
  const userRole = req.user?.role;

  if (userId !== userIdFromJWT && userRole !== 'ADMIN') {
    await throwError('AUTH016');
    return;
  }

  const updateData = req.body;

  // Verify user exists
  const existingUser = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    await throwError('AUTH002');
    return;
  }

  // Handle updates based on user role
  let dataToUpdate: any = {};

  if (userRole === 'ADMIN') {
    // Admins can update all fields including protected ones
    dataToUpdate = updateData;
  } else {
    // Regular users have restricted update capabilities
    const { password, email, role, status, lastLoginAt, createdAt, updatedAt, ...allowedUpdates } =
      updateData;
    
    // No longer changing status when email is updated
    dataToUpdate = {
      ...allowedUpdates,
      ...(updateData.email && { email: updateData.email }),
    };
  }

  // If there's a new email, check if it's already taken
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await prismaClient.user.findFirst({
      where: {
        email: updateData.email,
        NOT: { id: userId },
      },
    });

    if (emailExists) {
      await throwError('AUTH001');
      return;
    }
  }

  try {
    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        bio: true,
        phoneNumber: true,
        website: true,
        socialLinks: true,
        timezone: true,
        preferences: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Email verification code removed

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });

    // Delete the cached response for the updated page
    executeBackgroundTasks(
      [
        async () => {
          return await redisService.deleteCachedResponse(`getUserById:${userId}`);
        },
      ],
      'updateUser',
    );
  } catch (error) {
    next(error);
  }
};
const toggle2FA = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user?.userId;
  const { enable2FA } = req.body;

  // Verify user exists
  const existingUser = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    await throwError('AUTH002');
    return;
  }

  await prismaClient.user.update({
    where: { id: userId },
    data: { enable2FA: enable2FA === 'true' },
  });

  res.status(200).json({
    success: true,
    message:
      enable2FA === 'true'
        ? 'Two-Factor Authentication enabled successfully'
        : 'Two-Factor Authentication disabled successfully',
  });

  // Delete Cache
  executeBackgroundTasks(
    [
      async () => {
        return await redisService.deleteCachedResponse(`getUserById:${userId}`);
      },
    ],
    'toggle2FA',
  );
};

const refreshToken = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    // Fetch the latest user data
    const user = (await prismaClient.user.findUnique({
      where: { id: req.user?.userId },
    })) as any;

    // Check user status
    if (user!.status !== 'ACTIVE') {
      await throwError('AUTH007'); // User inactive
      return;
    }

    // Generate a new token with fresh data
    const newToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        status: user.status,
        name: user.name,
        authorizedCourses: user.authorizedCourses,
      },
      JWT_SECRET,
      { expiresIn: '1d' },
    );
    // Set response headers and cookies
    res.setHeader('Authorization', `Bearer ${newToken}`);
    res.cookie('token', newToken, COOKIE_CONFIG_PROVIDER(true));

    return res.redirect('https://tshapedmarketing.com/student/dashboard');
  } catch (error) {
    next(error);
  }
};

const getRecentOtps = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get the last 10 OTPs ordered by creation date (newest first)
    const recentOtps = await prismaClient.otpVerification.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userId: true,
        otp: true,
        type: true,
        expiresAt: true,
        used: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return await sendSuccess(res, 'OTP_RECENT_LIST', {
      data: recentOtps,
      count: recentOtps.length,
    });
  } catch (error) {
    // Pass error to error handling middleware
    return next(error);
  }
};
export {
  register,
  login,
  logout,
  deleteUsers,
  checkActiveAuth,
  verifyEmail,
  verify2FA,
  forgotPassword,
  resetPassword,
  resendVerificationEmail,
  getAllUsers,
  getUserById,
  updateUser,
  searchUsers,
  toggle2FA,
  refreshToken,
  getRecentOtps,
};

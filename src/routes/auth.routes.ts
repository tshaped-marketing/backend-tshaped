import express, { Router } from 'express';
import {
  authenticatedPasswordReset,
  checkActiveAuth,
  deleteUsers,
  forgotPassword,
  getAllUsers,
  getRecentOtps,
  getUserById,
  login,
  logout,
  refreshToken,
  register,
  resendVerificationEmail,
  resetPassword,
  searchUsers,
  toggle2FA,
  updateUser,
  verify2FA,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import {
  authenticatedPasswordResetSchema,
  facebookOAuthSchema,
  forgotPasswordSchema,
  getUserByIdSchema,
  googleOAuthSchema,
  loginSchema,
  microsoftOAuthSchema,
  registerSchema,
  resendVerificationEmailSchema,
  resetPasswordSchema,
  searchUsersSchema,
  verify2FASchema,
  verifyEmailSchema,
} from '../zodSchemas/auth.schema.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { googleLogin } from '../controllers/oauth/google.controller.js';
import { facebookLogin } from '../controllers/oauth/facebook.controller.js';
import { microsoftLogin } from '../controllers/oauth/microsoft.controller.js';
import configurableRateLimit from '../middlewares/rateLimiter.middleware.js';

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Creates a new user account with the provided credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: User's password
 *               name:
 *                 type: string
 *                 description: User's full name
 *               role:
 *                 type: string
 *                 enum: [ADMIN, INSTRUCTOR, STUDENT]
 *                 description: User's role in the system
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 description: "(Optional) URL to user's avatar image"
 *               bio:
 *                 type: string
 *                 description: "(Optional) User's biography or description"
 *               phoneNumber:
 *                 type: string
 *                 description: "(Optional) User's contact number"
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: "(Optional) User's website URL"
 *               socialLinks:
 *                 type: object
 *                 description: "(Optional) User's social media links"
 *                 example: { "twitter": "https://twitter.com/username" }
 *               timezone:
 *                 type: string
 *                 description: "(Optional) User's timezone"
 *               preferences:
 *                 type: object
 *                 description: "(Optional) User's application preferences"
 *                 example: { "emailNotifications": true }
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                     avatar:
 *                       type: string
 *       400:
 *         description: Invalid input or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User already exists"
 *
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     description: Authenticates a user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         status:
 *                           type: string
 *                         avatar:
 *                           type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account suspended or inactive
 *
 * /api/auth/logout:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Logout user
 *     description: Invalidates the user's session and clears auth tokens
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 *
 * /api/auth:
 *   get:
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     summary: Check active authentication
 *     description: Verifies if the current user session is active and returns user details
 *     responses:
 *       '200':
 *         description: Authentication status check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - isActive
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the request was successful
 *                   example: true
 *                 isActive:
 *                   type: boolean
 *                   description: Indicates if the authentication is active
 *                   example: true
 *                 data:
 *                   type: object
 *                   required:
 *                     - userId
 *                     - role
 *                     - status
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: The ID of the authenticated user
 *                     role:
 *                       type: string
 *                       enum: [ADMIN, INSTRUCTOR, STUDENT]
 *                       description: User's role in the system
 *                     status:
 *                       type: string
 *                       description: Current status of the user account
 *       '401':
 *         description: No authentication or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - isActive
 *                 - message
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 isActive:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No authentication credentials found"
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 * /api/auth/verify-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify email with OTP
 *     description: Verifies user's email using the OTP sent during registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               otp:
 *                 type: string
 *                 description: One-time password sent to email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 * /api/auth/resend-verification:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Resend verification email
 *     description: Resends the verification email with a new OTP to the user's email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Verification email resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Verification email resent successfully"
 *       429:
 *         description: Too many verification attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please wait 5 minutes before requesting a new code"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *
 * /api/auth/verify-2fa:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify 2FA code
 *     description: Verifies the 2FA code for admin login or enabled student accounts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - otp
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID from the first login step
 *               otp:
 *                 type: string
 *                 description: 2FA code sent to email
 *     responses:
 *       200:
 *         description: 2FA verified and login successful
 *       400:
 *         description: Invalid or expired 2FA code
 *       404:
 *         description: User not found
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: Initiates password reset process by sending OTP to user's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's registered email address
 *     responses:
 *       200:
 *         description: Password reset initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If an account exists with this email, you will receive a password reset code."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 * /api/auth/users:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get all registered users
 *     description: Retrieves a list of all registered users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       status:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       lastLoginAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password with OTP
 *     description: Resets user's password using the OTP received via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's registered email address
 *               otp:
 *                 type: string
 *                 description: One-time password received via email
 *                 minLength: 6
 *                 maxLength: 6
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password for the account
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successful"
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired reset code"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 */
/**
 * @openapi
 * /api/auth/users/{id}:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get user by ID with enrolled courses
 *     description: Retrieves a user's details including their enrolled courses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     website:
 *                       type: string
 *                     socialLinks:
 *                       type: object
 *                     timezone:
 *                       type: string
 *                     preferences:
 *                       type: object
 *                     lastLoginAt:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     courses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                           thumbnail:
 *                             type: string
 *                           duration:
 *                             type: integer
 *                           rating:
 *                             type: number
 *                           enrollmentCount:
 *                             type: integer
 *                           instructor:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [ADMIN, INSTRUCTOR, STUDENT]
 *         status:
 *           type: string
 *         avatar:
 *           type: string
 *         bio:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         website:
 *           type: string
 *         socialLinks:
 *           type: object
 *         timezone:
 *           type: string
 *         preferences:
 *           type: object
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Pagination:
 *       type: object
 *       properties:
 *         totalItems:
 *           type: integer
 *           description: Total number of items
 *         currentPage:
 *           type: integer
 *           description: Current page number
 *         pageSize:
 *           type: integer
 *           description: Number of items per page
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 * /api/auth/users/search:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Search and sort users
 *     description: Search users by name, email, phone, or bio, filter by role, and sort by various fields
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, phone, or bio
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, INSTRUCTOR, STUDENT]
 *         description: Filter users by role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, role, status, lastLoginAt, createdAt]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @openapi
 * /api/auth/users/{id}:
 *   patch:
 *     tags:
 *       - Authentication
 *     summary: Update user information
 *     description: Updates user profile information. Email updates require re-verification.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (requires verification if changed)
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 description: URL to user's avatar image
 *               bio:
 *                 type: string
 *                 description: User's biography or description
 *               phoneNumber:
 *                 type: string
 *                 description: User's contact number
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: User's website URL
 *               socialLinks:
 *                 type: object
 *                 description: User's social media links
 *                 example: { "twitter": "https://twitter.com/username" }
 *               timezone:
 *                 type: string
 *                 description: User's timezone
 *               preferences:
 *                 type: object
 *                 description: User's application preferences
 *                 example: { "emailNotifications": true }
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     website:
 *                       type: string
 *                     socialLinks:
 *                       type: object
 *                     timezone:
 *                       type: string
 *                     preferences:
 *                       type: object
 *                     lastLoginAt:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input or email already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */

/**
 * @openapi
 * /api/auth/users:
 *   delete:
 *     tags:
 *       - Authentication
 *     summary: Delete multiple users
 *     description: Deletes one or more users and all their associated data (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: Single user ID or array of user IDs to delete
 *     responses:
 *       200:
 *         description: Users deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "2 users and their associated data deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: One or more users not found
 */

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Google OAuth login
 *     description: Authenticates a user using Google OAuth id_token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_token
 *             properties:
 *               id_token:
 *                 type: string
 *                 description: Google ID token obtained from Google OAuth flow
 *     responses:
 *       200:
 *         description: Google login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Google login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         status:
 *                           type: string
 *                         avatar:
 *                           type: string
 *       400:
 *         description: Invalid Google credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid Google credentials"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 *
 * /api/auth/microsoft:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Microsoft OAuth login
 *     description: Authenticates a user using Microsoft OAuth authorization code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code obtained from Microsoft OAuth flow
 *     responses:
 *       200:
 *         description: Microsoft login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Microsoft login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         status:
 *                           type: string
 *                         avatar:
 *                           type: string
 *       400:
 *         description: Invalid Microsoft credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid Microsoft credentials"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 *
 * /api/auth/facebook:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Facebook OAuth login
 *     description: Authenticates a user using Facebook OAuth access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Access token obtained from Facebook OAuth flow
 *     responses:
 *       200:
 *         description: Facebook login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Facebook login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         status:
 *                           type: string
 *                         avatar:
 *                           type: string
 *       400:
 *         description: Invalid Facebook credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid Facebook credentials"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 */

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Change user password
 *     description: Allows an authenticated user to change their password. Requires the current password and a new password.
 *     security:
 *       - bearerAuth: []  # Important: This indicates the route requires authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's current password.
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: The new password the user wants to set.  Must be at least 8 characters.
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       400:
 *         description: Bad request.  Likely caused by an invalid new password (e.g., too short).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid input" #  A more specific error message would be provided by the server.
 *       401:
 *         description: Unauthorized.  Either no authentication token was provided, or the current password was incorrect.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid current password" # Or "Unauthorized" if no token
 *       404:
 *         description: User not found.  The user ID from the token doesn't correspond to a valid user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *          description: Internal Server Error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    example: false
 *                  message:
 *                    type: string
 *                    example: "An error occurred while processing your request"
 */
/**
 * @openapi
 * /api/auth/toggle-2fa:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Toggle Two-Factor Authentication
 *     description: Enables or disables Two-Factor Authentication for the currently authenticated user.
 *     security:
 *       - bearerAuth: []  # This route requires authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enable2FA
 *             properties:
 *               enable2FA:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Whether to enable or disable 2FA for the user
 *     responses:
 *       200:
 *         description: 2FA status changed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Two-Factor Authentication enabled successfully"
 *       400:
 *         description: Bad request. Invalid input provided.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid input"
 *       401:
 *         description: Unauthorized. No authentication token was provided.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *          description: Internal Server Error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    example: false
 *                  message:
 *                    type: string
 *                    example: "An error occurred while processing your request"
 */

/**
 * @openapi
 * /api/auth/refresh-token:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Refresh Authentication Token
 *     description: Refreshes the authentication token for the currently authenticated user, fetching the latest user data and issuing a new token.
 *     security:
 *       - bearerAuth: []  # This route requires an existing valid authentication token
 *     responses:
 *       200:
 *         description: Token refreshed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: "john.doe@example.com"
 *                         role:
 *                           type: string
 *                           example: "USER"
 *                         status:
 *                           type: string
 *                           example: "ACTIVE"
 *                         avatar:
 *                           type: string
 *                           nullable: true
 *                           example: "https://example.com/avatars/user.jpg"
 *       401:
 *         description: Unauthorized. Invalid or expired authentication token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden. User account is inactive.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User inactive"
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 */

/**
 * @openapi
 * /api/auth/recent-otps:
 *   get:
 *     tags:
 *       - Development
 *     summary: Get Recent OTPs
 *     description: Retrieves the 10 most recent OTP records for testing purposes. This endpoint should not be enabled in production.
 *     security:
 *       - bearerAuth: []  # This route requires authentication
 *     responses:
 *       200:
 *         description: Successfully retrieved recent OTPs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP_RECENT_LIST"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "clq7z5b9s000114m77idzb4js"
 *                           userId:
 *                             type: string
 *                             example: "clq7z5b9r000014m77ie2c4x1"
 *                           otp:
 *                             type: string
 *                             example: "123456"
 *                           type:
 *                             type: string
 *                             enum: ["EMAIL", "2FA"]
 *                             example: "EMAIL"
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-04-18T12:45:00Z"
 *                           used:
 *                             type: boolean
 *                             example: false
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-04-18T12:30:00Z"
 *                           user:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               email:
 *                                 type: string
 *                                 example: "john.doe@example.com"
 *                     count:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized. No authentication token was provided or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden. The user does not have admin privileges.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 */
const authRouter = Router()
  // Public routes (no authentication required)
  .post('/register', zodValidator(registerSchema), configurableRateLimit({windowMinutes:15,maxRequests:5}), catchAsync(register as RouteType))
  .post('/verify-email', zodValidator(verifyEmailSchema), catchAsync(verifyEmail as RouteType))
  .post(
    '/resend-verification',
       configurableRateLimit({windowMinutes:15,maxRequests:5}),
    zodValidator(resendVerificationEmailSchema),
    catchAsync(resendVerificationEmail as RouteType),
  )
  .post('/verify-2fa', zodValidator(verify2FASchema), catchAsync(verify2FA as RouteType))
  .post('/login',configurableRateLimit({windowMinutes:15,maxRequests:15}), zodValidator(loginSchema), catchAsync(login as RouteType))
  .get('/logout', logout as RouteType)
  .get('/recent-otps', catchAsync(getRecentOtps as RouteType))
  .get('/', authenticate, catchAsync(checkActiveAuth as any))
  .get(
    '/users',
    catchAsync(authenticate) as MiddlewareType,
    authorize(['admin_only']),
    catchAsync(getAllUsers as RouteType),
  )
  .post(
    '/forgot-password',
    configurableRateLimit({windowMinutes:15,maxRequests:5}),
    zodValidator(forgotPasswordSchema),
    catchAsync(forgotPassword as RouteType),
  )
  .post(
    '/reset-password',
       configurableRateLimit({windowMinutes:15,maxRequests:5}),
    zodValidator(resetPasswordSchema),
    catchAsync(resetPassword as RouteType),
  )
  .get(
    '/users/search',
    catchAsync(authenticate) as MiddlewareType,
    authorize(['admin_only']),
    zodValidator(searchUsersSchema),
    catchAsync(searchUsers as RouteType),
  )
  // Protected routes (require authentication)
  .delete(
    '/users',
    catchAsync(authenticate) as MiddlewareType,
    authorize(['admin_only']),
    catchAsync(deleteUsers as RouteType),
  )
  .get(
    '/users/:id',
    catchAsync(authenticate) as MiddlewareType,
    zodValidator(getUserByIdSchema),
    catchAsync(getUserById as RouteType),
  )
  .get(
    '/refresh-token',
    catchAsync(authenticate) as MiddlewareType,
    catchAsync(refreshToken as RouteType),
  )
  .patch(
    '/users/:id',
    catchAsync(authenticate) as MiddlewareType,
    catchAsync(updateUser as RouteType),
  )
  .put('/toggle-2fa', authenticate, catchAsync(toggle2FA as RouteType));

authRouter.post('/google',   configurableRateLimit({windowMinutes:15,maxRequests:5}), zodValidator(googleOAuthSchema), googleLogin);
authRouter.post('/facebook', zodValidator(facebookOAuthSchema), facebookLogin);
authRouter.post('/microsoft',   configurableRateLimit({windowMinutes:15,maxRequests:5}), zodValidator(microsoftOAuthSchema), microsoftLogin);
authRouter.post(
  '/change-password',
  authenticate,
  zodValidator(authenticatedPasswordResetSchema),
  catchAsync(authenticatedPasswordReset as RouteType),
);

export default authRouter;

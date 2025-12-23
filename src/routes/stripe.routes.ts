import express, { Router } from 'express';
import { createCheckoutSession, handleStripeWebhook } from '../controllers/stripe.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { createCheckoutSessionSchema } from '../zodSchemas/stripe.schema.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import configurableRateLimit from '../middlewares/rateLimiter.middleware.js';

// stripeRouter.use(catchAsync(authenticate) as MiddlewareType)
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     CreateCheckoutSessionRequest:
 *       type: object
 *       required:
 *         - courseId
 *       properties:
 *         courseId:
 *           type: string
 *           description: The ID of the course being purchased
 *           example: "clh12345678901234567890"
 *     CheckoutSessionResponse:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           description: Stripe checkout session ID
 *           example: "cs_test_123456789"
 *         url:
 *           type: string
 *           description: Stripe checkout URL
 *           example: "https://checkout.stripe.com/pay/cs_test_123456789"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message here"
 */

/**
 * Apply authentication middleware to all routes
 */

/**
 * @swagger
 * /api/stripe/create-checkout-session:
 *   post:
 *     summary: Create a new Stripe checkout session for course purchase
 *     tags: [Stripe]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Creates a new Stripe checkout session for course purchase.
 *       Requires authentication and 'read_record' permission.
 *       Validates request body using Zod schema.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCheckoutSessionRequest'
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutSessionResponse'
 *       400:
 *         description: Bad request - invalid input or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - missing required permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const stripeRouter = Router().post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  catchAsync(handleStripeWebhook as RouteType),
);

stripeRouter
  .use(catchAsync(authenticate) as MiddlewareType)
  .post(
    '/create-checkout-session',
     configurableRateLimit({windowMinutes:15,maxRequests:5}),
    zodValidator(createCheckoutSessionSchema),
    catchAsync(createCheckoutSession as RouteType),
  );

export default stripeRouter;

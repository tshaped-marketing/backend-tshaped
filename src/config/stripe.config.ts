import Stripe from 'stripe';
import dotenv from 'dotenv';
import { STRIPE_SECRET_KEY } from '../constants/env.constant.js';

dotenv.config();
if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

//Payment flow
// A. createCheckoutSession: Handles initial payment processing
// When a student wants to buy a course:
// 1. Validates the request (checks if courseId and userId exist)
// 2. Fetches course details from database
// 3. Performs checks:
//    - Prevents instructors from buying their own course
//    - Checks if user is already enrolled
// 4. Creates a Stripe checkout session
// 5. Creates a pending payment record
// 6. Returns checkout URL to frontend

// B. handleStripeWebhook: Handles Stripe's payment notifications
//  When Stripe processes a payment:
// 1. Verifies the webhook signature
// 2. Handles different payment events:
//    - 'checkout.session.completed': Payment successful
//    - 'payment_intent.payment_failed': Payment failed
// 3. For successful payments:
//    - Updates payment status
//    - Enrolls student in course
//    - Creates progress tracking record

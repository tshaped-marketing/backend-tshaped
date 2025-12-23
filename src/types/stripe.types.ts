export interface StripeCheckoutSession {
  courseId: string;
  userId: string;
  price: number;
  currency?: string;
}

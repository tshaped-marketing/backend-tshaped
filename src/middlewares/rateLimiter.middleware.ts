import rateLimit from 'express-rate-limit';

interface RateLimitOptions {
  windowMinutes?: number;
  maxRequests?: number;
  message?: string;
}

// Create a configurable rate limiter middleware generator
const configurableRateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMinutes = 15,
    maxRequests = 100,
    message = 'Too many requests, please try again later.',
  } = options;

  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message,
    },
  });
};

export default configurableRateLimit;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: {
    status: number;
    message: string;
    details?: unknown;
  };
}

// Enhanced error response interface for development
export interface DetailedErrorResponse extends ErrorResponse {
  error: ErrorResponse['error'] & {
    name?: string;
    stack?: string;
    details?: unknown;
  };
}
export interface ErrorMessage {
  en: string;
  np: string;
}

export interface ErrorConfig {
  error_code: string;
  error_message: ErrorMessage;
  category: string;
  http_code: number;
}

export interface ErrorDictionary {
  [key: string]: ErrorConfig;
}

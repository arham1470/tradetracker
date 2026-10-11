/**
 * Utility error with an HTTP status code. Thrown by controllers and handlers
 * becomes a JSON response via the central error middleware.
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found.') {
    super(404, message);
  }
}
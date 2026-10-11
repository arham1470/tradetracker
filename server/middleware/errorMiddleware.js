import { ApiError, NotFoundError } from '../utils/errors.js';

/** 404 handler for unknown routes. */
export function notFoundHandler(req, _res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Centralised error handler — every error funnels through here. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error.';
  let details = null;

  // Mongoose validation errors carry a per-field breakdown.
  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = 'Validation failed. Please review the highlighted fields.';
  }

  // Malformed ObjectId passed in a URL param.
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier format.';
  }

  // Duplicate key (schema is simple, but handled defensively).
  if (err.code === 11000) {
    status = 409;
    message = 'A record with the same unique value already exists.';
  }

  // JSON body parsing failure.
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON payload.';
  }

  const payload = { error: message, status };
  if (details) payload.details = details;
  if (status >= 500) console.error(`✖ ${err.stack || err}`);

  res.status(status).json(payload);
}

export { ApiError, NotFoundError };
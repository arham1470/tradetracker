/**
 * Wrapper for async Express route handlers.
 *
 * Express 4 does NOT catch rejected promises from async handlers — an unhandled
 * rejection would crash the whole process. This wrapper forwards any rejection
 * to `next(err)` so it reaches the centralised error middleware and the client
 * gets a proper JSON error response instead of a dead server.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
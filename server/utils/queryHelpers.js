/**
 * Small shared query helpers reused by controllers.
 */

/** Convert a query-string value into a Date, or return undefined. */
export function parseDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Convert a query-string value into a positive integer with clamps.
 * Returns `fallback` when not parseable.
 */
export function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * CSRF protection for cookie-based auth (no tokens to store, stateless-friendly):
 *  1. Every state-changing request must carry the custom header
 *     `X-Requested-With: CampusCare`. Browsers cannot attach custom headers
 *     cross-origin without a CORS preflight, and our CORS policy only allows
 *     the configured frontend origin(s).
 *  2. If the browser sends an Origin header it must be an allowed origin.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  if (req.get('x-requested-with') !== 'CampusCare') {
    throw ApiError.forbidden('Missing CSRF header');
  }
  const origin = req.get('origin');
  if (origin && !env.allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
    throw ApiError.forbidden('Origin not allowed');
  }
  next();
}

/** Remove Mongo operator injection attempts ($-prefixed or dotted keys) from the body. */
function strip(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      strip(obj[key], depth + 1);
    }
  }
}

export function sanitizeBody(req, _res, next) {
  strip(req.body);
  next();
}

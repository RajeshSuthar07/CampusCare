import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

function run(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw ApiError.badRequest(details[0]?.message ? `Validation failed: ${details[0].message}` : 'Validation failed', details);
  }
  return result.data;
}

/**
 * validate({ body, query, params }) with Zod schemas.
 * Parsed + stripped values are stored in req.valid.{body,query,params}
 * (req.query is read-only in Express 5, so we never write to it).
 */
export function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    req.valid = req.valid || {};
    if (params) req.valid.params = run(params, req.params);
    if (query) req.valid.query = run(query, req.query);
    if (body) req.valid.body = run(body, req.body ?? {});
    next();
  };
}

/** Rejects malformed ObjectIds in route params before they reach Mongoose. */
export function validateObjectId(...names) {
  return (req, _res, next) => {
    for (const name of names) {
      if (!mongoose.isValidObjectId(req.params[name])) {
        throw ApiError.badRequest(`Invalid ${name}`);
      }
    }
    next();
  };
}

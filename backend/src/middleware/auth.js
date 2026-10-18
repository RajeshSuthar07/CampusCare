import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const COOKIE_NAME = 'campuscare_token';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.JWT_EXPIRES_IN_HOURS}h`,
  });
}

export function cookieOptions() {
  const sameSite = env.COOKIE_SAMESITE || (env.isProd ? 'none' : 'lax');
  return {
    httpOnly: true,
    secure: env.isProd || sameSite === 'none',
    sameSite,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signToken(userId), {
    ...cookieOptions(),
    maxAge: env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

/**
 * Verifies the session cookie and loads the CURRENT user from the database,
 * so a disabled account or changed role takes effect on the very next request.
 * The role is never read from the token or the request body.
 */
export async function authenticate(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');
  req.user = user;
  next();
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

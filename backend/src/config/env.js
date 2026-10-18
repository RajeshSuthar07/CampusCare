import 'dotenv/config';
import { z } from 'zod';

const isTest = process.env.NODE_ENV === 'test';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_HOURS: z.coerce.number().positive().default(8),
  // Comma-separated list of allowed browser origins (no trailing slash)
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
  COOKIE_DOMAIN: z.string().optional().or(z.literal('')),
  // Optional override: lax | strict | none. Default: "none" in production, "lax" otherwise.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional().or(z.literal('')),
  CLOUDINARY_CLOUD_NAME: z.string().optional().or(z.literal('')),
  CLOUDINARY_API_KEY: z.string().optional().or(z.literal('')),
  CLOUDINARY_API_SECRET: z.string().optional().or(z.literal('')),
  ADMIN_NAME: z.string().optional().or(z.literal('')),
  ADMIN_EMAIL: z.string().optional().or(z.literal('')),
  ADMIN_PASSWORD: z.string().optional().or(z.literal('')),
});

const source = isTest
  ? {
      MONGODB_URI: 'mongodb://placeholder/test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      FRONTEND_URL: 'http://localhost:5173',
      ...process.env,
    }
  : process.env;

const parsed = schema.safeParse(source);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid or missing environment variables:\n${details}\nSee backend/.env.example`);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest,
  allowedOrigins: raw.FRONTEND_URL.split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  cloudinaryConfigured: Boolean(
    raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET
  ),
};

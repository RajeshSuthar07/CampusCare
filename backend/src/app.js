import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { csrfGuard, sanitizeBody } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/error.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1); // behind Vercel's proxy: correct client IPs for rate limiting
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // no Origin header = same-origin / curl / server-to-server
      if (!origin || env.allowedOrigins.includes(origin.replace(/\/+$/, ''))) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(sanitizeBody);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'CampusCare API is running', data: { db: mongoose.connection.readyState === 1 } });
});

// Lazily (re)use the MongoDB connection on every request: required for serverless cold starts.
app.use('/api', async (_req, _res, next) => {
  await connectDb();
  next();
});
app.use('/api', csrfGuard, routes);

app.use(notFound);
app.use(errorHandler);

export default app;

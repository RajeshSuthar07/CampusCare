import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

// Cache the connection promise on `globalThis` so that warm serverless
// invocations (and hot reloads in dev) reuse one connection.
const cache = (globalThis.__campuscareMongo ??= { promise: null });

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
        bufferCommands: false,
      })
      .then((m) => m.connection)
      .catch((err) => {
        cache.promise = null; // allow retry on next request
        throw err;
      });
  }
  return cache.promise;
}

export async function disconnectDb() {
  cache.promise = null;
  await mongoose.disconnect();
}

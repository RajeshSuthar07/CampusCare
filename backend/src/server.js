// Local / long-running server. On Vercel the app is served by api/index.js instead.
import app from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';

await connectDb();
app.listen(env.PORT, () => {
  console.log(`CampusCare API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

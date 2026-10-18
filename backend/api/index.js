// Vercel serverless entry point: the Express app is a valid (req, res) handler.
// MongoDB connections are cached on globalThis (see src/config/db.js) and reused across warm invocations.
import app from '../src/app.js';

export default app;

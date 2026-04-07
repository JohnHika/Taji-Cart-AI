// Vercel serverless entry point — delegates all requests to the Express app.
// The app already calls connectDB() on import, so the DB connects on cold start
// and the connection is reused across warm invocations.
import app from '../server/app.js';

export default app;

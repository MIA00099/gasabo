import './utils/patchAsyncErrors.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { authRouter } from './routes/auth.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { categoriesRouter } from './routes/categories.routes.js';
import { sellersRouter } from './routes/sellers.routes.js';
import { realEstateRouter } from './routes/realestate.routes.js';
import { approvalsRouter } from './routes/approvals.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { advertisementsRouter } from './routes/advertisements.routes.js';
import { rbacRouter } from './routes/rbac.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Serves files saved by uploadsRouter (POST /api/uploads) - e.g. a saved
// file at server/uploads/169..-abc.jpg becomes reachable at /uploads/169..-abc.jpg.
app.use('/uploads', express.static(path.resolve('server', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/realestate', realEstateRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/advertisements', advertisementsRouter);
app.use('/api/rbac', rbacRouter);
app.use('/api/uploads', uploadsRouter);

// 404 handler for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Central error handler - guarantees JSON error responses instead of leaking stack traces
// or hanging requests when a route handler throws.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled API error]', err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});

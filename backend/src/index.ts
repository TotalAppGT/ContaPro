import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { tenantResolver } from './middleware/tenantResolver';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import tenantsRoutes from './routes/tenants';
import contabilidadRoutes from './routes/contabilidad';
import conciliacionRoutes from './routes/conciliacion';
import satRoutes from './routes/sat';
import subscriptionsRoutes from './routes/subscriptions';
import adminRoutes from './routes/admin';
import { seedMasterTenant } from './services/seedMaster';
import fs from 'fs';
import path from 'path';
import pool from './db/pool';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/register' },
  { method: 'GET', path: '/api/subscriptions/plans' },
  { method: 'POST', path: '/api/subscriptions/webhook' },
];

app.use(tenantResolver);

app.use((req, res, next) => {
  const isPublic = PUBLIC_ROUTES.some(
    r => r.method === req.method && req.path.startsWith(r.path)
  );

  if (isPublic) {
    return next();
  }

  if (req.method === 'GET' && req.path === '/api/health') {
    return next();
  }

  authMiddleware(req, res, next);
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/contabilidad', contabilidadRoutes);
app.use('/api/conciliacion', conciliacionRoutes);
app.use('/api/sat', satRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  const tenantInfo = req.tenant
    ? { tenant_id: req.tenant.id, tenant_name: req.tenant.nombre }
    : null;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ContaPro API',
    version: '1.0.0',
    tenant: tenantInfo,
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function startup() {
  try {
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(sql);
      console.log('Schema aplicado correctamente.');
    }
  } catch (e: any) {
    console.error('Error aplicando schema:', e.message);
  }

  app.listen(PORT, async () => {
    console.log(`ContaPro API corriendo en puerto ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    await seedMasterTenant();
  });
}

startup();

export default app;

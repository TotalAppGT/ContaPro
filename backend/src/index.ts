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
import ventasRoutes from './routes/ventas';
import comprasRoutes from './routes/compras';
import clientesRoutes from './routes/clientes';
import usersRoutes from './routes/users';
import notificacionesRoutes from './routes/notificaciones';
import { seedMasterTenant } from './services/seedMaster';
import fs from 'fs';
import path from 'path';
import pool from './db/pool';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(tenantResolver);

// --- Rutas públicas (sin auth) ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ContaPro API',
    version: '1.0.0',
  });
});

// --- Rutas API (con auth selectivo) ---

const PUBLIC_API = ['/auth/login', '/auth/register', '/auth/firebase', '/auth/firebase-register', '/subscriptions/plans', '/subscriptions/webhook', '/subscriptions/simulate-payment', '/notificaciones/webhook', '/health'];
app.use('/api', (req, res, next) => {
  if (PUBLIC_API.some(p => p === req.path || (req.path.startsWith(p) && p.includes('webhook')))) {
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
app.use('/api/ventas', ventasRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// --- Frontend estático (sin auth) ---

const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    const file = path.join(frontendPath, 'index.html');
    if (fs.existsSync(file)) res.sendFile(file);
    else res.status(200).send('ContaPro - Frontend no compilado. Ejecuta: cd frontend && npm run build');
  }
});

// --- Error handler ---

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error('Error schema:', e.message);
  }

  app.listen(PORT, async () => {
    console.log(`ContaPro corriendo en puerto ${PORT}`);
    await seedMasterTenant();
  });
}

startup();

export default app;

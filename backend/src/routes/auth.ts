import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import { seedChartOfAccounts } from '../services/seedService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

function generateToken(user: {
  id: string;
  tenant_id: string;
  email: string;
  nombre: string;
  rol: string;
}): string {
  return jwt.sign(
    { userId: user.id, tenantId: user.tenant_id, role: user.rol, email: user.email, name: user.nombre },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

router.post('/register', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, nit, email, password, subdomain, plan } = req.body;
    if (!name || !nit || !email || !password || !subdomain) {
      res.status(400).json({ error: 'Todos los campos son requeridos: nombre, nit, email, password, subdominio' });
      return;
    }

    const existingTenant = await client.query('SELECT id FROM tenants WHERE subdomain = $1 OR nit = $2', [subdomain, nit]);
    if (existingTenant.rows.length > 0) {
      res.status(409).json({ error: 'Ya existe una cuenta con ese NIT o subdominio' });
      return;
    }

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Ya existe un usuario con ese correo electrónico' });
      return;
    }

    await client.query('BEGIN');

    const planFinal = plan || 'personal';
    const tenantResult = await client.query(
      `INSERT INTO tenants (nombre, nit, email, subdomain, plan)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, nit, subdomain, plan`,
      [name, nit, email, subdomain, planFinal]
    );
    const tenant = tenantResult.rows[0];

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, nombre, rol)
       VALUES ($1, $2, $3, $4, 'owner')
       RETURNING id, tenant_id, email, nombre, rol`,
      [tenant.id, email, passwordHash, name]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');
    await seedChartOfAccounts(tenant.id);

    const token = generateToken(user);

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      token,
      tenant: { id: tenant.id, nombre: tenant.nombre, nit: tenant.nit, subdomain: tenant.subdomain, plan: tenant.plan },
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error en registro:', error.message);
    res.status(500).json({ error: 'Error al registrar la cuenta. Intente nuevamente.' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Correo y contraseña son requeridos' });
      return;
    }

    const userResult = await pool.query(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.nombre, u.rol, u.activo,
              t.nombre as tenant_nombre, t.nit as tenant_nit, t.subdomain, t.plan, t.estado as tenant_estado
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const user = userResult.rows[0];
    if (!user.activo) {
      res.status(403).json({ error: 'Usuario desactivado. Contacte al administrador.' });
      return;
    }
    if (user.tenant_estado !== 'activo') {
      res.status(403).json({ error: 'La cuenta se encuentra suspendida o cancelada.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = generateToken(user);

    res.json({
      token,
      tenant: { id: user.tenant_id, nombre: user.tenant_nombre, nit: user.tenant_nit, subdomain: user.subdomain, plan: user.plan },
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    });
  } catch (error: any) {
    console.error('Error en login:', error.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.nombre, u.rol,
              t.id as tenant_id, t.nombre as tenant_nombre, t.nit, t.subdomain, t.plan, t.logo_base64
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const row = userResult.rows[0];
    res.json({
      user: { id: row.id, email: row.email, nombre: row.nombre, rol: row.rol },
      tenant: { id: row.tenant_id, nombre: row.tenant_nombre, nit: row.nit, subdomain: row.subdomain, plan: row.plan, logo: row.logo_base64 },
    });
  } catch (error: any) {
    console.error('Error en /auth/me:', error.message);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
});

export default router;

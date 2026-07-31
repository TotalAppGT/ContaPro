import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import bcrypt from 'bcryptjs';
import { enviarEmail, emailInvitacion } from '../services/emailService';

const router = Router();

// Listar usuarios del tenant
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(
      'SELECT id, email, nombre, rol, activo, last_login, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at',
      [tenantId]
    );
    res.json({ usuarios: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Crear nuevo usuario (solo owner)
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { email, nombre, password, rol } = req.body;

    if (req.user!.role !== 'owner') {
      res.status(403).json({ error: 'Solo el administrador puede crear usuarios' });
      return;
    }

    if (!email || !nombre || !password) {
      res.status(400).json({ error: 'Email, nombre y contraseña son requeridos' });
      return;
    }

    // Verificar límite de usuarios según plan
    const tenantResult = await pool.query('SELECT plan FROM tenants WHERE id = $1', [tenantId]);
    const plan = tenantResult.rows[0]?.plan || 'personal';
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [tenantId]);
    const maxUsers = plan === 'empresarial' ? 10 : plan === 'profesional' ? 3 : 1;

    if (Number(userCount.rows[0].count) >= maxUsers) {
      res.status(400).json({ error: `Límite de ${maxUsers} usuarios alcanzado en plan ${plan}` });
      return;
    }

    const existing = await pool.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Ya existe un usuario con ese email en esta cuenta' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, nombre, rol)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, nombre, rol, activo, created_at`,
      [tenantId, email, passwordHash, nombre, rol || 'auxiliar']
    );

    res.status(201).json({ usuario: result.rows[0], message: 'Usuario creado exitosamente' });

    // Enviar email de invitación
    const tenant = await pool.query('SELECT nombre, subdomain FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length > 0) {
      const html = emailInvitacion(nombre, email, password, tenant.rows[0].nombre, tenant.rows[0].subdomain);
      enviarEmail(email, `ContaPro - Te han invitado a ${tenant.rows[0].nombre}`, html);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar usuario (solo owner, no puede eliminarse a sí mismo)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    if (req.user!.role !== 'owner') {
      res.status(403).json({ error: 'Solo el administrador puede eliminar usuarios' });
      return;
    }

    if (id === req.user!.userId) {
      res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
      return;
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING email', [id, tenantId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: `Usuario ${result.rows[0].email} eliminado` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

router.use(authMiddleware);
router.use(requireRole('owner'));

router.get('/admin/dashboard', async (req: Request, res: Response) => {
  try {
    const [totalTenants, activeTenants, mrrResult, newThisMonth, totalUsers] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM tenants'),
      pool.query("SELECT COUNT(*) as count FROM tenants WHERE estado = 'activo'"),
      pool.query(
        `SELECT COALESCE(SUM(s.monto), 0) as mrr
         FROM subscriptions s WHERE s.estado = 'activo'`
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM tenants
         WHERE created_at >= date_trunc('month', NOW())`
      ),
      pool.query('SELECT COUNT(*) as count FROM users'),
    ]);

    const planDistribution = await pool.query(
      `SELECT plan, COUNT(*) as count FROM tenants GROUP BY plan ORDER BY count DESC`
    );

    res.json({
      stats: {
        total_tenants: Number(totalTenants.rows[0].count),
        active_tenants: Number(activeTenants.rows[0].count),
        mrr: Number(mrrResult.rows[0].mrr),
        new_this_month: Number(newThisMonth.rows[0].count),
        total_users: Number(totalUsers.rows[0].count),
      },
      plan_distribution: planDistribution.rows,
    });
  } catch (error: any) {
    console.error('Error en admin dashboard:', error.message);
    res.status(500).json({ error: 'Error al cargar el panel de administración' });
  }
});

router.get('/admin/tenants/:id/switch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tenantResult = await pool.query(
      'SELECT id, nombre, nit, subdomain, plan FROM tenants WHERE id = $1',
      [id]
    );

    if (tenantResult.rows.length === 0) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    const tenant = tenantResult.rows[0];

    const ownerResult = await pool.query(
      `SELECT id, email, nombre, rol FROM users WHERE tenant_id = $1 AND rol = 'owner' LIMIT 1`,
      [id]
    );

    if (ownerResult.rows.length === 0) {
      res.status(404).json({ error: 'No se encontró un administrador para esta empresa' });
      return;
    }

    const user = ownerResult.rows[0];

    const token = jwt.sign(
      { userId: user.id, tenantId: tenant.id, role: user.rol, email: user.email, name: user.nombre },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      message: `Suplantando identidad en ${tenant.nombre}`,
      token,
      tenant: { id: tenant.id, nombre: tenant.nombre },
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    });
  } catch (error: any) {
    console.error('Error en impersonate:', error.message);
    res.status(500).json({ error: 'Error al suplantar identidad' });
  }
});

export default router;

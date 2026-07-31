import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('owner'));

router.get('/', async (req: Request, res: Response) => {
  try {
    if (req.user!.rol !== 'admin') {
      const result = await pool.query(
        `SELECT t.*, s.plan as plan_suscripcion, s.estado as estado_suscripcion, s.periodo_fin
         FROM tenants t
         LEFT JOIN subscriptions s ON t.id = s.tenant_id
         WHERE t.id = $1`,
        [req.user!.tenantId]
      );
      res.json({ tenants: result.rows });
      return;
    }

    const result = await pool.query(
      `SELECT t.*, s.plan as plan_suscripcion, s.estado as estado_suscripcion, s.periodo_fin
       FROM tenants t
       LEFT JOIN subscriptions s ON t.id = s.tenant_id
       ORDER BY t.created_at DESC`
    );
    res.json({ tenants: result.rows });
  } catch (error: any) {
    console.error('Error listando tenants:', error.message);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, s.plan as plan_suscripcion, s.estado as estado_suscripcion,
              s.periodo_inicio, s.periodo_fin, s.monto as monto_suscripcion
       FROM tenants t
       LEFT JOIN subscriptions s ON t.id = s.tenant_id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    const usersResult = await pool.query(
      'SELECT id, email, nombre, rol, activo, created_at FROM users WHERE tenant_id = $1',
      [id]
    );

    res.json({ tenant: result.rows[0], users: usersResult.rows });
  } catch (error: any) {
    console.error('Error obteniendo tenant:', error.message);
    res.status(500).json({ error: 'Error al obtener información' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, colegiado, firma_nombre, logo_base64 } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (nombre !== undefined) { fields.push(`nombre = $${paramCount++}`); values.push(nombre); }
    if (direccion !== undefined) { fields.push(`direccion = $${paramCount++}`); values.push(direccion); }
    if (telefono !== undefined) { fields.push(`telefono = $${paramCount++}`); values.push(telefono); }
    if (colegiado !== undefined) { fields.push(`colegiado = $${paramCount++}`); values.push(colegiado); }
    if (firma_nombre !== undefined) { fields.push(`firma_nombre = $${paramCount++}`); values.push(firma_nombre); }
    if (logo_base64 !== undefined) { fields.push(`logo_base64 = $${paramCount++}`); values.push(logo_base64); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
      return;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    res.json({ tenant: result.rows[0], message: 'Empresa actualizada exitosamente' });
  } catch (error: any) {
    console.error('Error actualizando tenant:', error.message);
    res.status(500).json({ error: 'Error al actualizar la empresa' });
  }
});

router.patch('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activo', 'suspendido', 'cancelado'].includes(estado)) {
      res.status(400).json({ error: 'Estado inválido. Debe ser: activo, suspendido o cancelado' });
      return;
    }

    const result = await pool.query(
      'UPDATE tenants SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    res.json({ tenant: result.rows[0], message: `Empresa ${estado} exitosamente` });
  } catch (error: any) {
    console.error('Error cambiando estado:', error.message);
    res.status(500).json({ error: 'Error al cambiar estado de la empresa' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING id, nombre', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    res.json({ message: `Empresa "${result.rows[0].nombre}" eliminada` });
  } catch (error: any) {
    console.error('Error eliminando tenant:', error.message);
    res.status(500).json({ error: 'Error al eliminar la empresa' });
  }
});

export default router;

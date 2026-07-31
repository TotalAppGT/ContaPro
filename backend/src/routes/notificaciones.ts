import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// Guardar teléfono para notificaciones
router.post('/telefono', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { telefono } = req.body;

    await pool.query(
      'UPDATE tenants SET telefono = $1, updated_at = NOW() WHERE id = $2',
      [telefono, tenantId]
    );
    res.json({ message: 'Teléfono guardado. Recibirás alertas por WhatsApp.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Obtener preferencias
router.get('/preferencias', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(
      'SELECT telefono, plan FROM tenants WHERE id = $1',
      [tenantId]
    );
    const t = result.rows[0];
    res.json({
      telefono: t?.telefono || '',
      plan: t?.plan || 'personal',
      notificaciones_activas: t?.plan === 'empresarial' || t?.plan === 'profesional',
      tipo: t?.plan === 'empresarial' ? 'whatsapp' : t?.plan === 'profesional' ? 'email' : 'none',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

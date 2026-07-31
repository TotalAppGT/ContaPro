import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const PLANS = [
  {
    id: 'personal',
    nombre: 'Personal',
    precio: 79,
    precio_anual: 790,
    moneda: 'GTQ',
    features: ['1 empresa', 'Libros de IVA', 'Facturación básica', 'Reportes SAT'],
    limits: { users: 1, clients: 1 },
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 199,
    precio_anual: 1990,
    moneda: 'GTQ',
    features: ['Contabilidades ILIMITADAS', '3 usuarios', 'Gráfica T', 'Conciliación', 'SAT Masivo', 'SAT-2237', 'Subdominio propio'],
    limits: { users: 3, clients: 999 },
  },
  {
    id: 'empresarial',
    nombre: 'Empresarial',
    precio: 399,
    precio_anual: 3990,
    moneda: 'GTQ',
    features: ['Dominio .com.gt propio', '10 usuarios', 'Logo en reportes', 'API acceso', 'Capacitación Zoom', 'Soporte prioritario'],
    limits: { users: 10, clients: 9999 },
  },
];

router.get('/plans', (req: Request, res: Response) => {
  res.json({ planes: PLANS });
});

router.post('/create-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { plan } = req.body;

    const planInfo = PLANS.find(p => p.id === plan);
    if (!planInfo) {
      res.status(400).json({ error: 'Plan no válido' });
      return;
    }

    const pendingResult = await pool.query(
      'SELECT id FROM subscriptions WHERE tenant_id = $1 AND estado = $2',
      [tenantId, 'pendiente']
    );

    if (pendingResult.rows.length > 0) {
      res.json({ message: 'Ya existe un pago pendiente', subscription: pendingResult.rows[0] });
      return;
    }

    const result = await pool.query(
      `INSERT INTO subscriptions (tenant_id, plan, estado, monto, periodo_inicio, periodo_fin)
       VALUES ($1, $2, 'pendiente', $3, NOW(), NOW() + INTERVAL '30 days')
       RETURNING *`,
      [tenantId, plan, planInfo.precio]
    );

    res.status(201).json({ message: 'Suscripción creada. Proceda al pago.', subscription: result.rows[0] });
  } catch (error: any) {
    console.error('Error creando checkout:', error.message);
    res.status(500).json({ error: 'Error al crear la suscripción' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { subscription_id, status } = req.body;

    if (!subscription_id || !status) {
      res.status(400).json({ error: 'Datos de webhook incompletos' });
      return;
    }

    if (status === 'completed' || status === 'paid') {
      const result = await pool.query(
        `UPDATE subscriptions
         SET estado = 'activo', periodo_inicio = NOW(), periodo_fin = NOW() + INTERVAL '30 days'
         WHERE id = $1 RETURNING *`,
        [subscription_id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Suscripción no encontrada' });
        return;
      }

      await pool.query(
        'UPDATE tenants SET estado = $1, plan = $2, updated_at = NOW() WHERE id = $3',
        ['activo', result.rows[0].plan, result.rows[0].tenant_id]
      );

      res.json({ message: 'Pago confirmado, suscripción activada', subscription: result.rows[0] });
    } else if (status === 'failed' || status === 'cancelled') {
      await pool.query(
        'UPDATE subscriptions SET estado = $1 WHERE id = $2',
        ['cancelado', subscription_id]
      );
      res.json({ message: 'Pago cancelado o fallido' });
    } else {
      res.json({ message: 'Estado de webhook recibido', status });
    }
  } catch (error: any) {
    console.error('Error en webhook:', error.message);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      res.json({ subscription: null, message: 'No hay suscripción activa', planes: PLANS });
      return;
    }

    res.json({ subscription: result.rows[0] });
  } catch (error: any) {
    console.error('Error obteniendo suscripción:', error.message);
    res.status(500).json({ error: 'Error al obtener la suscripción' });
  }
});

export default router;

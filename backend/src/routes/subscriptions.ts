import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

const RECURRENTE_KEY = process.env.RECURRENTE_API_KEY || '';
const RECURRENTE_SECRET = process.env.RECURRENTE_SIGNING_SECRET || '';

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!RECURRENTE_SECRET) return true;
  try {
    const hmac = crypto.createHmac('sha256', RECURRENTE_SECRET);
    const digest = hmac.update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature || ''));
  } catch { return false; }
}

const PLANS = [
  {
    id: 'personal',
    nombre: 'Personal',
    precio: 79,
    precio_anual: 790,
    moneda: 'GTQ',
    recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-personal',
    features: ['1 empresa', 'Libros de IVA', 'Facturación básica', 'Reportes SAT'],
    limits: { users: 1, clients: 1 },
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 199,
    precio_anual: 1990,
    moneda: 'GTQ',
    recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-profesional',
    features: ['Contabilidades ILIMITADAS', '3 usuarios', 'Gráfica T', 'Conciliación', 'SAT Masivo', 'SAT-2237', 'Subdominio propio'],
    limits: { users: 3, clients: 999 },
  },
  {
    id: 'empresarial',
    nombre: 'Empresarial',
    precio: 399,
    precio_anual: 3990,
    moneda: 'GTQ',
    recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-empresarial',
    features: ['Dominio .com.gt propio', '10 usuarios', 'Logo en reportes', 'API acceso', 'WhatsApp alertas', 'Capacitación Zoom', 'Soporte prioritario'],
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
    if (!planInfo) { res.status(400).json({ error: 'Plan no válido' }); return; }

    const result = await pool.query(
      `INSERT INTO subscriptions (tenant_id, plan, estado, monto, periodo_inicio, periodo_fin)
       VALUES ($1, $2, 'pendiente', $3, NOW(), NOW() + INTERVAL '30 days')
       RETURNING *`,
      [tenantId, plan, planInfo.precio]
    );

    res.json({
      message: 'Redirigiendo a Recurrente para completar el pago.',
      checkout_url: planInfo.recurrente_url,
      subscription_id: result.rows[0].id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear suscripción' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['recurrente-signature'] as string || '';
    const rawBody = JSON.stringify(req.body);

    if (RECURRENTE_SECRET && !verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Recurrente] Firma inválida en webhook');
      res.status(403).json({ error: 'Firma inválida' });
      return;
    }

    const { subscription_id, status, metadata } = req.body;
    const subId = subscription_id || metadata?.subscription_id;
    if (!subId) { res.status(400).json({ error: 'subscription_id requerido' }); return; }

    if (status === 'completed' || status === 'paid' || status === 'active') {
      const result = await pool.query(
        `UPDATE subscriptions SET estado = 'activo', periodo_inicio = NOW(), periodo_fin = NOW() + INTERVAL '30 days'
         WHERE id = $1 RETURNING *`,
        [subId]
      );
      if (result.rows.length > 0) {
        await pool.query(
          'UPDATE tenants SET estado = $1, plan = $2, updated_at = NOW() WHERE id = $3',
          ['activo', result.rows[0].plan, result.rows[0].tenant_id]
        );
        console.log(`[Recurrente] Suscripcion ${subId} activada`);
      }
    } else if (status === 'failed' || status === 'cancelled') {
      await pool.query("UPDATE subscriptions SET estado = 'cancelado' WHERE id = $1", [subId]);
    }

    res.json({ received: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// Simulación de pago para desarrollo (sin Recurrente)
router.get('/simulate-payment', async (req: Request, res: Response) => {
  try {
    const { sub_id } = req.query;
    if (!sub_id) {
      res.status(400).json({ error: 'sub_id requerido' });
      return;
    }

    const result = await pool.query(
      `UPDATE subscriptions SET estado = 'activo', periodo_inicio = NOW(), periodo_fin = NOW() + INTERVAL '30 days'
       WHERE id = $1 RETURNING *`,
      [sub_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Suscripción no encontrada' });
      return;
    }

    await pool.query(
      'UPDATE tenants SET estado = $1, plan = $2, updated_at = NOW() WHERE id = $3',
      ['activo', result.rows[0].plan, result.rows[0].tenant_id]
    );

    res.json({ message: 'Pago simulado exitosamente', subscription: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Error simulando pago' });
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

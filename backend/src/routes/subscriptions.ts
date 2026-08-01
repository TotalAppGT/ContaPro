import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

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
  { id: 'personal', nombre: 'Personal', precio: 79, precio_anual: 790, moneda: 'GTQ', recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-personal', features: ['1 empresa', 'Libros de IVA', 'Facturacion basica', 'Reportes SAT'], limits: { users: 1, clients: 1 } },
  { id: 'profesional', nombre: 'Profesional', precio: 199, precio_anual: 1990, moneda: 'GTQ', recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-profesional', features: ['Contabilidades ILIMITADAS', '3 usuarios', 'Grafica T', 'Conciliacion', 'SAT Masivo', 'SAT-2237', 'Subdominio propio'], limits: { users: 3, clients: 999 } },
  { id: 'empresarial', nombre: 'Empresarial', precio: 399, precio_anual: 3990, moneda: 'GTQ', recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-empresarial', features: ['Dominio .com.gt propio', '10 usuarios', 'Logo en reportes', 'API acceso', 'WhatsApp alertas', 'Soporte prioritario'], limits: { users: 10, clients: 9999 } },
];

router.get('/plans', (req: Request, res: Response) => { res.json({ planes: PLANS }); });

router.post('/create-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { plan } = req.body;
    const planInfo = PLANS.find(p => p.id === plan);
    if (!planInfo) { res.status(400).json({ error: 'Plan no valido' }); return; }

    const result = await pool.query(
      `INSERT INTO subscriptions (tenant_id, plan, estado, monto, periodo_inicio, periodo_fin)
       VALUES ($1, $2, 'pendiente', $3, NOW(), NOW() + INTERVAL '30 days') RETURNING *`,
      [tenantId, plan, planInfo.precio]
    );

    res.json({ message: 'Redirigiendo a Recurrente.', checkout_url: planInfo.recurrente_url, subscription_id: result.rows[0].id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['recurrente-signature'] as string || '';
    if (RECURRENTE_SECRET && !verifyWebhookSignature(JSON.stringify(req.body), signature)) {
      res.status(403).json({ error: 'Firma invalida' }); return;
    }
    const { subscription_id, status, metadata } = req.body;
    const subId = subscription_id || metadata?.subscription_id;
    if (!subId) { res.status(400).json({ error: 'subscription_id requerido' }); return; }

    if (status === 'completed' || status === 'paid' || status === 'active') {
      const result = await pool.query("UPDATE subscriptions SET estado = 'activo', periodo_inicio = NOW(), periodo_fin = NOW() + INTERVAL '30 days' WHERE id = $1 RETURNING *", [subId]);
      if (result.rows.length > 0) {
        await pool.query("UPDATE tenants SET estado = 'activo', plan = $1, updated_at = NOW() WHERE id = $2", [result.rows[0].plan, result.rows[0].tenant_id]);
      }
    } else if (status === 'failed' || status === 'cancelled') {
      await pool.query("UPDATE subscriptions SET estado = 'cancelado' WHERE id = $1", [subId]);
    }
    res.json({ received: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/confirmar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query("UPDATE subscriptions SET estado = 'activo', periodo_inicio = NOW(), periodo_fin = NOW() + INTERVAL '30 days' WHERE tenant_id = $1 AND estado = 'pendiente' RETURNING *", [tenantId]);
    if (result.rows.length > 0) {
      await pool.query("UPDATE tenants SET estado = 'activo', plan = $1, updated_at = NOW() WHERE id = $2", [result.rows[0].plan, tenantId]);
      res.json({ message: 'Pago confirmado. Suscripcion activada.' });
    } else { res.json({ message: 'Su cuenta ya esta activa.' }); }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/simulate-payment', async (req: Request, res: Response) => {
  try {
    const { sub_id } = req.query;
    if (!sub_id) { res.status(400).json({ error: 'sub_id requerido' }); return; }
    const result = await pool.query("UPDATE subscriptions SET estado = 'activo', periodo_inicio = NOW(), periodo_fin = NOW() + INTERVAL '30 days' WHERE id = $1 RETURNING *", [sub_id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Suscripcion no encontrada' }); return; }
    await pool.query("UPDATE tenants SET estado = 'activo', plan = $1, updated_at = NOW() WHERE id = $2", [result.rows[0].plan, result.rows[0].tenant_id]);
    res.json({ message: 'Pago simulado exitosamente.', subscription: result.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query('SELECT * FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1', [tenantId]);
    if (result.rows.length === 0) { res.json({ subscription: null, message: 'No hay suscripcion activa', planes: PLANS }); return; }
    res.json({ subscription: result.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;

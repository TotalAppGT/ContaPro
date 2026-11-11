import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import { createRecurrenteCheckout, verifySvix } from '../services/recurrente';

const router = Router();

const APP_URL = process.env.APP_URL || 'https://contapro.totalappgt.com';

const PLANS = [
  { id: 'personal', nombre: 'Personal', precio: 79, precio_anual: 790, moneda: 'GTQ', recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-personal', features: ['1 empresa', 'Libros de IVA', 'Facturacion basica', 'Reportes SAT'], limits: { users: 1, clients: 1 } },
  { id: 'profesional', nombre: 'Profesional', precio: 199, precio_anual: 1990, moneda: 'GTQ', recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-profesional', features: ['Contabilidades ILIMITADAS', '3 usuarios', 'Grafica T', 'Conciliacion', 'SAT Masivo', 'SAT-2237', 'Subdominio propio'], limits: { users: 3, clients: 999 } },
  { id: 'empresarial', nombre: 'Empresarial', precio: 399, precio_anual: 3990, moneda: 'GTQ', recurrente_url: 'https://app.recurrente.com/s/total-app-gt/contapro-empresarial', features: ['Dominio .com.gt propio', '10 usuarios', 'Logo en reportes', 'API acceso', 'WhatsApp alertas', 'Soporte prioritario'], limits: { users: 10, clients: 9999 } },
];

router.get('/plans', (req: Request, res: Response) => { res.json({ planes: PLANS }); });

router.post('/create-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const email = req.user!.email;
    const { plan } = req.body;
    const planInfo = PLANS.find(p => p.id === plan);
    if (!planInfo) { res.status(400).json({ error: 'Plan no valido' }); return; }

    const result = await pool.query(
      `INSERT INTO subscriptions (tenant_id, plan, estado, monto, periodo_inicio, periodo_fin)
       VALUES ($1, $2, 'pendiente', $3, NOW(), NOW() + INTERVAL '30 days') RETURNING *`,
      [tenantId, plan, planInfo.precio]
    );
    const subId = result.rows[0].id;

    const checkout_url = await createRecurrenteCheckout({
      tenant_id: tenantId,
      subscription_id: subId,
      plan_name: planInfo.nombre,
      amount: planInfo.precio,
      email,
      success_url: `${APP_URL}/app?checkout=success`,
      cancel_url: `${APP_URL}/app?checkout=canceled`,
    });

    res.json({ message: 'Redirigiendo a Recurrente.', checkout_url, subscription_id: subId });
  } catch (e: any) { console.error('create-checkout:', e.message); res.status(500).json({ error: e.message }); }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const secret = process.env.RECURRENTE_SIGNING_SECRET || '';
    const raw = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : JSON.stringify(req.body);
    if (secret && !verifySvix(raw, req.headers as Record<string, any>, secret)) {
      res.status(403).json({ error: 'Firma invalida' }); return;
    }

    const event = (req.body || {}) as any;
    const eventType = String(event.event_type || event.type || '');
    const data = event.data || {};
    const meta = data.metadata || data.checkout?.metadata || event.metadata || {};
    const subId = meta.subscription_id || data.subscription_id || event.subscription_id;
    const tenantId = meta.tenant_id;
    const plan = meta.plan;
    const estado = String(data.status || data.checkout?.status || '').toLowerCase();

    const inactivo = /fail|cancel|refund|unpaid|past_due/.test(eventType.toLowerCase()) ||
      ['failed', 'cancelled', 'canceled', 'unpaid', 'past_due'].includes(estado);
    const activo = /succeed|complete|paid|active|created|updated|renew/i.test(eventType) ||
      ['paid', 'succeeded', 'completed', 'active'].includes(estado);

    if (activo && !inactivo) {
      if (subId) {
        await pool.query("UPDATE subscriptions SET estado='activo', periodo_inicio=NOW(), periodo_fin=NOW()+INTERVAL '30 days' WHERE id=$1", [subId]);
      }
      if (tenantId) {
        await pool.query("UPDATE tenants SET estado='activo', plan=COALESCE($1, plan), updated_at=NOW() WHERE id=$2", [plan || null, tenantId]);
      }
    } else if (inactivo) {
      const cancelado = /cancel|refund/.test(eventType.toLowerCase());
      if (subId) await pool.query("UPDATE subscriptions SET estado='cancelado' WHERE id=$1", [subId]);
      if (tenantId) await pool.query("UPDATE tenants SET estado=$1, updated_at=NOW() WHERE id=$2", [cancelado ? 'cancelado' : 'suspendido', tenantId]);
    }
    res.json({ received: true });
  } catch (e: any) { console.error('webhook:', e.message); res.status(500).json({ error: e.message }); }
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

router.get('/simulate-payment', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Solo el administrador de la plataforma puede simular pagos' });
      return;
    }
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

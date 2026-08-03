import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { enviarWhatsApp } from '../services/whatsappService';

const router = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'totalappgt_proxy_2026';

// Verificación webhook (GET) — Meta/proxy verifica conexión
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WHATSAPP] Webhook verificado correctamente');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Eventos reenviados por el proxy universal (POST)
// El proxy ya enruta por número de teléfono → solo llegan clientes de ContaPro
router.post('/webhook', async (req: Request, res: Response) => {
  res.sendStatus(200); // Responder rápido a Meta/proxy

  try {
    const entries = req.body?.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};

        // Mensajes entrantes de clientes ContaPro
        const messages = value.messages || [];
        for (const msg of messages) {
          const waId = (msg.from || '').replace(/\D/g, '');
          if (!waId) continue;

          // Buscar el tenant por teléfono registrado
          const tenant = await pool.query(
            'SELECT id, nombre FROM tenants WHERE telefono = $1 AND estado != $2',
            [waId, 'cancelado']
          );

          if (tenant.rowCount === 0) {
            console.log(`[WHATSAPP] wa_id ${waId} no es cliente ContaPro`);
            continue;
          }

          const t = tenant.rows[0];
          const body = msg.text?.body || (msg.button?.text) || (msg.interactive?.button_reply?.title) || '';

          await pool.query(
            `INSERT INTO whatsapp_messages (tenant_id, wa_id, direction, body, wamid, meta_timestamp)
             VALUES ($1,$2,'inbound',$3,$4,$5)`,
            [t.id, waId, body, msg.id || null, msg.timestamp || null]
          );

          console.log(`[WHATSAPP] Cliente ${waId} (${t.nombre}) — mensaje recibido`);

          // Auto-respuesta profesional ContaPro (solo 1 vez cada 6h por cliente)
          const reciente = await pool.query(
            `SELECT id FROM whatsapp_messages
             WHERE wa_id = $1 AND direction = 'inbound' AND created_at > NOW() - INTERVAL '6 hours'
             LIMIT 1`,
            [waId]
          );
          if (reciente.rowCount != null && reciente.rowCount <= 1) {
            const respuesta = `Hola, gracias por escribir a *ContaPro*.\n\nSomos el sistema contable para Guatemala. Tu contador te atenderá pronto.\n\nContaPro Guatemala`;
            await enviarWhatsApp(waId, respuesta);
            console.log(`[WHATSAPP] Auto-respuesta enviada a ${waId}`);
          }
        }

        // Status de mensajes (entregado, leído, etc.)
        const statuses = value.statuses || [];
        for (const st of statuses) {
          await pool.query(
            `UPDATE whatsapp_messages SET status = $1 WHERE wamid = $2`,
            [st.status || 'unknown', st.id || '']
          );
        }
      }
    }
  } catch (e: any) {
    console.error('[WHATSAPP] Error webhook:', e.message);
  }
});

export default router;

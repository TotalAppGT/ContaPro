import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { enviarWhatsApp, enviarPlantillaAlerta, enviarWhatsAppDocumento } from '../services/whatsappService';

const router = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'licitrackgt2026';

// Webhook de Meta: verificación (GET)
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WHATSAPP] Webhook verificado');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook de Meta: mensajes entrantes (POST)
router.post('/webhook', (req: Request, res: Response) => {
  console.log('[WHATSAPP] Mensaje recibido:', JSON.stringify(req.body));
  res.sendStatus(200);
});

// Guardar preferencias de alerta
router.post('/alerta', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dia, hora } = req.body;
    await pool.query(
      'UPDATE tenants SET alerta_dia = $1, alerta_hora = $2, updated_at = NOW() WHERE id = $3',
      [dia || '1', hora || '08:00', tenantId]
    );
    res.json({ message: 'Alerta programada correctamente' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post('/telefono', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { telefono } = req.body;
    if (!telefono) { res.status(400).json({ error: 'Teléfono requerido' }); return; }

    const result = await pool.query(
      'UPDATE tenants SET telefono = $1, updated_at = NOW() WHERE id = $2 RETURNING telefono',
      [String(telefono).replace(/\D/g, ''), tenantId]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Tenant no encontrado' });
      return;
    }
    
    res.json({ message: 'Teléfono guardado: ' + result.rows[0].telefono });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Enviar mensaje de prueba usando la plantilla aprobada
router.post('/test', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const nombreUsuario = req.user!.name || '';
    const result = await pool.query('SELECT telefono FROM tenants WHERE id = $1', [tenantId]);
    const t = result.rows[0];

    if (!t?.telefono) {
      res.status(400).json({ error: 'No hay teléfono registrado. Guárdelo primero.' });
      return;
    }

    const enviado = await enviarPlantillaAlerta(t.telefono, nombreUsuario);

    if (enviado.ok) {
      res.json({ message: `Mensaje de prueba enviado a ${t.telefono} usando la plantilla aprobada` });
    } else {
      res.status(500).json({
        error: 'Error al enviar. Detalle: ' + (enviado.error || 'Desconocido'),
        debug: {
          phoneId: process.env.WHATSAPP_PHONE_ID ? 'Configurado' : 'NO CONFIGURADO',
          token: process.env.WHATSAPP_TOKEN ? 'Configurado' : 'NO CONFIGURADO',
          template: 'alerta_totalappgt (es_MX)',
          telefono: t.telefono,
        }
      });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Enviar documento PDF de prueba (adjunto)
router.post('/test-documento', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query('SELECT telefono FROM tenants WHERE id = $1', [tenantId]);
    const t = result.rows[0];

    if (!t?.telefono) {
      res.status(400).json({ error: 'No hay teléfono registrado. Guárdelo primero.' });
      return;
    }

    const { url, filename } = req.body || {};
    if (!url) {
      res.status(400).json({ error: 'URL del PDF requerida (campo url)' });
      return;
    }

    const enviado = await enviarWhatsAppDocumento(t.telefono, url, filename || 'documento.pdf', 'ContaPro - Documento fiscal');

    if (enviado.ok) {
      res.json({ message: `Documento enviado a ${t.telefono}` });
    } else {
      res.status(500).json({ error: 'Error al enviar documento. Detalle: ' + (enviado.error || 'Desconocido') });
    }
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

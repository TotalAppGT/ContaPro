import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { enviarWhatsApp, enviarPlantillaAlerta, enviarWhatsAppDocumento } from '../services/whatsappService';

const router = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'licitrackgt2026';

// Webhook de Meta: verificación (GET) — legacy, el proxy universal maneja esto ahora
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WHATSAPP] Webhook verificado (legacy)');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
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

// {{2}} se inserta en: "...pendiente en la plataforma de {{2}}."
// Formato estandar ContaPro para todos los tipos de mensaje
function textoAlerta(tipo: string, nombre: string, datos: Record<string, any> = {}): string {
  switch (tipo) {
    case 'vinculacion':
      return `ContaPro. Su numero de WhatsApp ha sido vinculado exitosamente. Recibira alertas fiscales, vencimientos y recordatorios SAT por este medio.`;
    case 'iva':
      return `ContaPro. Declaracion de IVA ${datos.periodo || 'pendiente'}: Q${(datos.monto || 0).toFixed(2)}. Presente SAT-2237 antes del vencimiento para evitar multas.`;
    case 'vencimiento':
      return `ContaPro. Su plan ${datos.plan || 'actual'} vence en ${datos.dias || 'pocos'} dias. Renueve para mantener acceso a todos los modulos del sistema contable.`;
    case 'sat':
      return `ContaPro. Tiene obligaciones tributarias pendientes ante la SAT. Revise y presente sus declaraciones desde el panel fiscal.`;
    case 'bienvenida':
      return `ContaPro \u2014 Sistema Contable para Guatemala. Su cuenta esta activa. Acceda a su panel para empezar a gestionar su contabilidad.`;
    default:
      return `ContaPro \u2014 Sistema Contable para Guatemala. Tiene una notificacion pendiente en su panel.`;
  }
}

// Enviar mensaje de prueba con la plantilla aprobada y texto personalizado ContaPro
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

    const mensaje = textoAlerta('vinculacion', nombreUsuario);
    const enviado = await enviarPlantillaAlerta(t.telefono, nombreUsuario, mensaje);

    if (enviado.ok) {
      res.json({ message: `Mensaje de prueba enviado a ${t.telefono} usando la plantilla aprobada` });
    } else {
      res.status(500).json({
        error: 'Error al enviar. Detalle: ' + (enviado.error || 'Desconocido'),
        debug: {
          phoneId: process.env.WHATSAPP_PHONE_ID ? 'Configurado' : 'NO CONFIGURADO',
          token: process.env.WHATSAPP_TOKEN ? 'Configurado' : 'NO CONFIGURADO',
          template: 'notificacion_sistema_ia (es_MX)',
          telefono: t.telefono,
        }
      });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Enviar alerta personalizada de ContaPro (IVA, SAT, vencimiento)
router.post('/enviar', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const nombreUsuario = req.user!.name || '';
    const { tipo, periodo, monto, plan, dias } = req.body || {};
    const result = await pool.query('SELECT telefono FROM tenants WHERE id = $1', [tenantId]);
    const t = result.rows[0];

    if (!t?.telefono) {
      res.status(400).json({ error: 'No hay teléfono registrado. Guárdelo primero.' });
      return;
    }

    const mensaje = textoAlerta(tipo || 'general', nombreUsuario, { periodo, monto: parseFloat(monto) || 0, plan, dias });
    const enviado = await enviarPlantillaAlerta(t.telefono, nombreUsuario, mensaje);

    if (enviado.ok) {
      res.json({ message: `Alerta "${tipo}" enviada a ${t.telefono}`, texto: mensaje });
    } else {
      res.status(500).json({ error: 'Error al enviar: ' + (enviado.error || 'Desconocido') });
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

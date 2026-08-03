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
  const titulo = '*ContaPro*';
  const firma = '\n\u2014 *ContaPro* \u2022 Sistema Contable Guatemala';

  const fmt = (v: any, d = 2) => {
    const n = parseFloat(v) || 0;
    return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
  };

  switch (tipo) {
    case 'vinculacion':
      return `${titulo} \u2014 Vinculacion Exitosa\u000a\u000aSu numero de WhatsApp ha sido vinculado correctamente.\u000aA partir de ahora recibira alertas fiscales, vencimientos y recordatorios SAT.${firma}`;
    case 'iva':
      return `${titulo} \u2014 Alerta Fiscal\u000a\u000a\u2022 Periodo: ${datos.periodo || 'pendiente'}\u000a\u2022 IVA a declarar: ${fmt(datos.monto)}\u000a\u2022 Accion: Presente SAT-2237 antes del vencimiento.${firma}`;
    case 'vencimiento':
      return `${titulo} \u2014 Renovacion\u000a\u000a\u2022 Plan: ${datos.plan || 'actual'}\u000a\u2022 Vence en: ${datos.dias || 'pocos'} dias\u000a\u2022 Accion: Renueve para mantener acceso.${firma}`;
    case 'sat':
      return `${titulo} \u2014 Obligaciones SAT\u000a\u000a\u2022 Estado: Declaraciones pendientes\u000a\u2022 Accion: Revise y presente desde su panel fiscal.${firma}`;
    case 'bienvenida':
      return `${titulo} \u2014 Bienvenido\u000a\u000aSu cuenta esta activa y lista para usar.\u000aAcceda a su panel contable para gestionar su negocio.${firma}`;
    default:
      return `${titulo} \u2014 Notificacion\u000a\u000aTiene informacion pendiente en su panel.${firma}`;
  }
}

// Enviar mensaje de prueba con la plantilla aprobada y texto personalizado ContaPro
router.post('/test', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query('SELECT telefono FROM tenants WHERE id = $1', [tenantId]);
    const t = result.rows[0];

    if (!t?.telefono) {
      res.status(400).json({ error: 'No hay teléfono registrado. Guárdelo primero.' });
      return;
    }

    const info = await pool.query(
      'SELECT nombre, nombre_whatsapp FROM tenants WHERE id = $1',
      [tenantId]
    );
    const tInfo = info.rows[0] || {};
    // {{1}} = "ContaPro" para branding. Nombre del cliente va en {{2}}
    const nombrePlantilla = '\u{1F44B}';
    const nombreCliente = req.body?.nombre || tInfo.nombre_whatsapp || tInfo.nombre || req.user!.name || '';

    const mensaje = textoAlerta('vinculacion', nombreCliente);
    const enviado = await enviarPlantillaAlerta(t.telefono, nombrePlantilla, mensaje);

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
    const nombreCliente = req.body?.nombre || req.user!.name || '';
    const { tipo, periodo, monto, plan, dias } = req.body || {};
    const result = await pool.query('SELECT telefono FROM tenants WHERE id = $1', [tenantId]);
    const t = result.rows[0];

    if (!t?.telefono) {
      res.status(400).json({ error: 'No hay teléfono registrado. Guárdelo primero.' });
      return;
    }

    // Obtener nombre dinámico: 1) del payload, 2) nombre_whatsapp del tenant, 3) nombre del tenant
    const info = await pool.query(
      'SELECT nombre, nombre_whatsapp FROM tenants WHERE id = $1',
      [tenantId]
    );
    const tInfo = info.rows[0] || {};
    const nombrePlantilla = '\u{1F44B}';
    const nombreClienteFinal = req.body?.nombre || tInfo.nombre_whatsapp || tInfo.nombre || nombreCliente;

    const mensaje = textoAlerta(tipo || 'general', nombreClienteFinal, { periodo, monto: parseFloat(monto) || 0, plan, dias });
    const enviado = await enviarPlantillaAlerta(t.telefono, nombrePlantilla, mensaje);

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

// Guardar nombre personalizado para WhatsApp
router.post('/nombre', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { nombre_whatsapp } = req.body || {};
    await pool.query(
      'UPDATE tenants SET nombre_whatsapp = $1, updated_at = NOW() WHERE id = $2',
      [nombre_whatsapp || null, tenantId]
    );
    res.json({ message: 'Nombre WhatsApp actualizado' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Obtener preferencias
router.get('/preferencias', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(
      'SELECT telefono, plan, nombre_whatsapp, nombre FROM tenants WHERE id = $1',
      [tenantId]
    );
    const t = result.rows[0];
    res.json({
      telefono: t?.telefono || '',
      plan: t?.plan || 'personal',
      nombre_whatsapp: t?.nombre_whatsapp || t?.nombre || '',
      notificaciones_activas: t?.plan === 'empresarial' || t?.plan === 'profesional',
      tipo: t?.plan === 'empresarial' ? 'whatsapp' : t?.plan === 'profesional' ? 'email' : 'none',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

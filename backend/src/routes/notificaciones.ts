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

// Mensajes para la plantilla totalappgt_aviso ({{sistema}} va en la plantilla)
function textoAlerta(tipo: string, nombre: string, datos: Record<string, any> = {}): string {
  const fmtQ = (v: any) => {
    const n = parseFloat(v) || 0;
    return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  switch (tipo) {
    case 'vinculacion':
      return `Hola ${nombre}, su numero de WhatsApp fue vinculado exitosamente. Recibira alertas fiscales, vencimientos y recordatorios. Para desvincular, use la opcion en su panel.`;
    case 'iva':
      return `Hola ${nombre}, alerta fiscal. Periodo: ${datos.periodo || 'pendiente'}  |  Impuesto: IVA  |  Monto a declarar: ${fmtQ(datos.monto)}  |  Formulario: SAT-2237  |  Presente antes del vencimiento para evitar multas.  |  contapro.totalappgt.online`;
    case 'vencimiento':
      return `Hola ${nombre}, su plan ${datos.plan || 'ContaPro'} vence en ${datos.dias || 'pocos'} dias. Renueve para mantener acceso a todos los modulos.  |  contapro.totalappgt.online`;
    case 'sat':
      return `Hola ${nombre}, tiene obligaciones SAT pendientes. Revise y presente sus impuestos desde el panel fiscal.  |  contapro.totalappgt.online`;
    case 'bienvenida':
      return `Hola ${nombre}, su cuenta contable esta activa. Modulos: Contabilidad, Ventas, Compras, SAT, Reportes. Acceda a contapro.totalappgt.online`;
    default:
      return `Hola ${nombre}, tiene informacion pendiente en su panel contable. Acceda para revisar.`;
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
    const nombreCliente = req.body?.nombre || tInfo.nombre_whatsapp || tInfo.nombre || req.user!.name || '';

    const mensaje = textoAlerta('vinculacion', nombreCliente);
    const enviado = await enviarPlantillaAlerta(t.telefono, 'ContaPro', mensaje);

    if (enviado.ok) {
      res.json({ message: `Mensaje de prueba enviado a ${t.telefono} usando la plantilla totalappgt_aviso` });
    } else {
      res.status(500).json({
        error: 'Error al enviar. Detalle: ' + (enviado.error || 'Desconocido'),
        debug: {
          phoneId: process.env.WHATSAPP_PHONE_ID ? 'Configurado' : 'NO CONFIGURADO',
          token: process.env.WHATSAPP_TOKEN ? 'Configurado' : 'NO CONFIGURADO',
          template: 'totalappgt_aviso (es)',
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
    const nombreClienteFinal = req.body?.nombre || tInfo.nombre_whatsapp || tInfo.nombre || nombreCliente;

    const mensaje = textoAlerta(tipo || 'general', nombreClienteFinal, { periodo, monto: parseFloat(monto) || 0, plan, dias });
    const enviado = await enviarPlantillaAlerta(t.telefono, 'ContaPro', mensaje);

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

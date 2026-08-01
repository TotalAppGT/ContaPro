import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { enviarWhatsApp } from '../services/whatsappService';

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

// Enviar mensaje de prueba
router.post('/test', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query('SELECT telefono, nombre FROM tenants WHERE id = $1', [tenantId]);
    const t = result.rows[0];

    if (!t?.telefono) {
      res.status(400).json({ error: 'No hay teléfono registrado. Guárdelo primero.' });
      return;
    }

    const enviado = await enviarWhatsApp(
      t.telefono,
      `✅ *ContaPro - Mensaje de prueba*\n\nHola ${t.nombre || ''}, tus notificaciones de WhatsApp están configuradas correctamente.\n\nRecibirás alertas de:\n📊 IVA por pagar\n⚠️ Vencimientos de suscripción\n📋 Recordatorios contables\n\n— ContaPro Guatemala`
    );

    if (enviado.ok) {
      res.json({ message: `Mensaje de prueba enviado a ${t.telefono}` });
    } else {
      res.status(500).json({ 
        error: 'Error al enviar. Detalle: ' + (enviado.error || 'Desconocido'),
        debug: {
          phoneId: process.env.WHATSAPP_PHONE_ID ? 'Configurado' : 'NO CONFIGURADO',
          token: process.env.WHATSAPP_TOKEN ? 'Configurado' : 'NO CONFIGURADO',
          telefono: t.telefono,
        }
      });
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

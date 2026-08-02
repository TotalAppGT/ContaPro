const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';

// Plantilla aprobada en Meta (es_MX, 1 variable: nombre del usuario)
const TEMPLATE_NOMBRE = 'alerta_totalappgt';
const TEMPLATE_LANG = 'es_MX';

async function postWhatsApp(payload: any): Promise<{ ok: boolean; error?: string; raw?: any }> {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
    console.log('[WHATSAPP] Simulado →', JSON.stringify(payload));
    return { ok: true };
  }
  try {
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[WHATSAPP] Error:', JSON.stringify(data));
      return { ok: false, error: JSON.stringify(data), raw: data };
    }
    console.log('[WHATSAPP] Enviado ok:', JSON.stringify(data));
    return { ok: true, raw: data };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function numeroLimpio(telefono: string): string {
  return String(telefono || '').replace(/[^0-9]/g, '');
}

// Envía la plantilla aprobada: funciona aunque el usuario nunca haya escrito primero.
// La variable {{1}} es el nombre del usuario.
export async function enviarPlantillaAlerta(telefono: string, nombreUsuario: string): Promise<{ ok: boolean; error?: string }> {
  return postWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: numeroLimpio(telefono),
    type: 'template',
    template: {
      name: TEMPLATE_NOMBRE,
      language: { code: TEMPLATE_LANG },
      components: [{
        type: 'body',
        parameters: [{ type: 'text', text: nombreUsuario || '' }],
      }],
    },
  });
}

// Mensaje de texto libre: solo funciona si el usuario escribió primero (ventana de 24h)
export async function enviarWhatsApp(telefono: string, mensaje: string): Promise<{ ok: boolean; error?: string }> {
  return postWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: numeroLimpio(telefono),
    type: 'text',
    text: { preview_url: false, body: mensaje },
  });
}

// Documento PDF: se envía como adjunto. Requiere ventana de 24h abierta (usuario escribió antes)
// o una plantilla con header tipo document. link debe ser una URL pública HTTPS.
export async function enviarWhatsAppDocumento(telefono: string, linkPdf: string, nombreArchivo: string, caption?: string): Promise<{ ok: boolean; error?: string }> {
  return postWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: numeroLimpio(telefono),
    type: 'document',
    document: {
      link: linkPdf,
      filename: nombreArchivo || 'documento.pdf',
      caption: caption || '',
    },
  });
}

export async function enviarAlertaIVA(telefono: string, nombreUsuario: string, periodo: string, monto: number): Promise<{ ok: boolean; error?: string }> {
  return enviarPlantillaAlerta(telefono, nombreUsuario);
}

export async function enviarAlertaVencimiento(telefono: string, nombreUsuario: string, plan: string, dias: number): Promise<{ ok: boolean; error?: string }> {
  return enviarPlantillaAlerta(telefono, nombreUsuario);
}

const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';

// Plantilla aprobada en Meta — 2 variables: {{sistema}} y {{mensaje}}
const TEMPLATE_NOMBRE = 'totalappgt_aviso';
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

function truncar(texto: string, max: number = 750): string {
  const t = String(texto || '').replace(/\t/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 3) + '...';
}

// Versión que respeta saltos de línea para mensajes estructurados
function truncarMultilinea(texto: string, max: number = 1024): string {
  const t = String(texto || '').replace(/\t/g, '    ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 3) + '...';
}

// Envía la plantilla totalappgt_aviso con 2 variables: {{sistema}} y {{mensaje}}
// Funciona sin que el destinatario haya escrito primero (plantilla aprobada en producción)
export async function enviarPlantillaAlerta(telefono: string, sistema: string, mensaje: string): Promise<{ ok: boolean; error?: string }> {
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
        parameters: [
          { type: 'text', text: truncar(sistema || 'ContaPro', 60) },
          { type: 'text', text: truncar(mensaje || '', 1024) },
        ],
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
    text: { preview_url: false, body: truncar(mensaje, 1600) },
  });
}

// Documento PDF: se envía como adjunto. Requiere ventana de 24h abierta
export async function enviarWhatsAppDocumento(telefono: string, linkPdf: string, nombreArchivo: string, caption?: string): Promise<{ ok: boolean; error?: string }> {
  return postWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: numeroLimpio(telefono),
    type: 'document',
    document: {
      link: linkPdf,
      filename: nombreArchivo || 'documento.pdf',
      caption: truncar(caption || '', 500),
    },
  });
}

export async function enviarAlertaIVA(telefono: string, nombreUsuario: string, periodo: string, monto: number): Promise<{ ok: boolean; error?: string }> {
  return enviarPlantillaAlerta(telefono, 'ContaPro',
    `Hola ${nombreUsuario}, su IVA de ${periodo} (Q${monto.toFixed(2)}) vence pronto. Presente SAT-2237.`);
}

export async function enviarAlertaVencimiento(telefono: string, nombreUsuario: string, plan: string, dias: number): Promise<{ ok: boolean; error?: string }> {
  return enviarPlantillaAlerta(telefono, 'ContaPro',
    `Hola ${nombreUsuario}, su plan ${plan} vence en ${dias} dias. Renueve en su panel: contapro.totalappgt.online`);
}

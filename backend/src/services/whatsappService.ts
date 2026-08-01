const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';

export async function enviarWhatsApp(telefono: string, mensaje: string): Promise<{ ok: boolean; error?: string }> {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
    console.log('[WHATSAPP] Simulado →', telefono, '|', mensaje);
    return { ok: true };
  }
  try {
    const numero = telefono.replace(/[^0-9]/g, '');
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: numero,
        type: 'text',
        text: { preview_url: false, body: mensaje },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[WHATSAPP] Error:', JSON.stringify(data));
      return { ok: false, error: JSON.stringify(data) };
    }
    console.log('[WHATSAPP] Enviado a:', telefono);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function enviarAlertaIVA(telefono: string, periodo: string, monto: number): Promise<void> {
  const msg = `*ContaPro - Alerta Fiscal*\n\nIVA del periodo ${periodo}: *Q${monto.toFixed(2)}*\n\nPresente su declaracion SAT-2237 a tiempo.\n\n*ContaPro Guatemala*`;
  await enviarWhatsApp(telefono, msg);
}

export async function enviarAlertaVencimiento(telefono: string, plan: string, dias: number): Promise<void> {
  const msg = `*ContaPro - Suscripcion*\n\nSu plan ${plan} vence en ${dias} dias.\n\nRenueve para mantener el acceso a todos los modulos.\n\n*ContaPro Guatemala*`;
  await enviarWhatsApp(telefono, msg);
}

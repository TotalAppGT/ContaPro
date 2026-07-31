const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';

export async function enviarWhatsApp(telefono: string, mensaje: string): Promise<boolean> {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
    console.log('[WHATSAPP] Simulado →', telefono, '|', mensaje);
    return true;
  }
  try {
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono.replace(/\D/g, ''),
        type: 'text',
        text: { body: mensaje },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('[WHATSAPP] Error:', JSON.stringify(err));
      return false;
    }
    console.log('[WHATSAPP] Enviado a:', telefono);
    return true;
  } catch (e: any) {
    console.error('[WHATSAPP] Error:', e.message);
    return false;
  }
}

export async function enviarAlertaIVA(telefono: string, periodo: string, monto: number): Promise<void> {
  const msg = `📊 *ContaPro - Alerta Fiscal*\n\nIVA del período *${periodo}*: *Q${monto.toFixed(2)}*\n\nPresenta tu declaración SAT-2237 a tiempo.\n\n— ContaPro Guatemala`;
  await enviarWhatsApp(telefono, msg);
}

export async function enviarAlertaVencimiento(telefono: string, plan: string, dias: number): Promise<void> {
  const msg = `⚠️ *ContaPro - Suscripción*\n\nTu plan *${plan}* vence en *${dias} días*.\n\nRenueva para mantener el acceso.\n\n— ContaPro Guatemala`;
  await enviarWhatsApp(telefono, msg);
}

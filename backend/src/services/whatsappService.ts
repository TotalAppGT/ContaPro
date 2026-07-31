const WHATSAPP_API = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN || '';

export async function enviarWhatsApp(telefono: string, mensaje: string): Promise<boolean> {
  if (!WHATSAPP_API || !WHATSAPP_TOKEN) {
    console.log('[WHATSAPP] Simulado - Para:', telefono, 'Mensaje:', mensaje);
    return true;
  }
  try {
    await fetch(WHATSAPP_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'text',
        text: { body: mensaje },
      }),
    });
    console.log('[WHATSAPP] Enviado a:', telefono);
    return true;
  } catch (e: any) {
    console.error('[WHATSAPP] Error:', e.message);
    return false;
  }
}

export async function enviarAlertaIVA(tenantId: string, telefono: string, periodo: string, monto: number, fechaLimite: string): Promise<void> {
  const msg = `📊 *ContaPro - Alerta Fiscal*\n\nTu IVA del período *${periodo}* es de *Q${monto.toFixed(2)}*.\n\n📅 Fecha límite de declaración: *${fechaLimite}*\n\nEvita multas. Presenta tu declaración SAT-2237 a tiempo.\n\n— ContaPro GT`;
  await enviarWhatsApp(telefono, msg);
}

export async function enviarAlertaVencimiento(tenantId: string, telefono: string, plan: string, diasRestantes: number): Promise<void> {
  const msg = `⚠️ *ContaPro - Aviso de Suscripción*\n\nTu plan *${plan}* vence en *${diasRestantes} días*.\n\nRenueva para mantener el acceso a todos tus módulos.\n\n— ContaPro GT`;
  await enviarWhatsApp(telefono, msg);
}

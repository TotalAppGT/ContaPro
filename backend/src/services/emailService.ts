const RESEND_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'ContaPro <no-reply@totalappgt.online>';

export async function enviarEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) {
    console.log('[EMAIL] Simulado - Para:', to, 'Asunto:', subject);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('[EMAIL] Error Resend:', JSON.stringify(err));
      return false;
    }
    console.log('[EMAIL] Enviado a:', to);
    return true;
  } catch (e: any) {
    console.error('[EMAIL] Error:', e.message);
    return false;
  }
}

export function emailBienvenida(nombre: string, email: string, password: string, subdomain: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#0A2472;padding:20px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#F0B90B;margin:0;font-size:24px">ContaPro</h1>
        <p style="color:#fff;margin:4px 0 0;font-size:14px">Contabilidad Profesional para Guatemala</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="color:#111;margin:0 0 16px">¡Bienvenido a ContaPro, ${nombre}!</h2>
        <p style="color:#444;line-height:1.6">Tu cuenta está lista. Ingresa con estas credenciales:</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>Email:</strong> ${email}</p>
          <p style="margin:4px 0"><strong>Contraseña:</strong> ${password}</p>
          <p style="margin:4px 0"><strong>Acceso:</strong> https://${subdomain}.totalappgt.online</p>
        </div>
        <p style="color:#888;font-size:13px">Por seguridad, cambia tu contraseña al iniciar sesión.</p>
        <a href="https://${subdomain}.totalappgt.online/login" style="display:inline-block;background:#0A2472;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Ingresar a ContaPro</a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
        <p style="color:#aaa;font-size:12px;text-align:center">ContaPro © ${new Date().getFullYear()} — Guatemala, C.A.</p>
      </div>
    </div>`;
}

export function emailInvitacion(nombre: string, email: string, password: string, tenantName: string, subdomain: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#0A2472;padding:20px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#F0B90B;margin:0;font-size:24px">ContaPro</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="color:#111;margin:0 0 16px">${tenantName} te invitó a ContaPro</h2>
        <p style="color:#444;line-height:1.6">Hola ${nombre}, has sido invitado como usuario del despacho <strong>${tenantName}</strong>.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>Email:</strong> ${email}</p>
          <p style="margin:4px 0"><strong>Contraseña:</strong> ${password}</p>
        </div>
        <a href="https://${subdomain}.totalappgt.online/login" style="display:inline-block;background:#0A2472;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Ingresar a ContaPro</a>
      </div>
    </div>`;
}

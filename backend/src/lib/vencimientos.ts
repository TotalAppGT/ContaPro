import pool from "../db/pool";
import { sendEmail } from "../services/email";

const APP_URL = process.env.APP_URL || "https://contapro.totalappgt.com";

const EMAIL_SQL = `(SELECT u.email FROM users u WHERE u.tenant_id = t.id AND u.rol IN ('owner','admin') ORDER BY u.created_at LIMIT 1) AS email`;

export async function procesarVencimientos(): Promise<{ avisos: number; suspendidos: number }> {
  let avisos = 0;
  let suspendidos = 0;

  try {
    const porVencer = await pool.query(
      `SELECT s.id, s.tenant_id, s.plan, s.periodo_fin, t.nombre, ${EMAIL_SQL}
       FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id
       WHERE s.estado = 'activo' AND s.periodo_fin > NOW()
         AND s.periodo_fin <= NOW() + INTERVAL '3 days'
         AND s.aviso_vencimiento IS NULL`
    );
    for (const r of porVencer.rows) {
      const fecha = new Date(r.periodo_fin).toLocaleDateString("es-GT");
      if (r.email) {
        const ok = await sendEmail(
          r.email,
          "Tu plan de ContaPro vence pronto",
          `<p>Hola,</p><p>Tu plan <strong>${r.plan}</strong> de <strong>${r.nombre}</strong> vence el <strong>${fecha}</strong>.</p><p>Renueva en <a href="${APP_URL}/app/suscripcion">${APP_URL}/app/suscripcion</a> para no perder el acceso.</p><p>ContaPro</p>`
        );
        if (ok) avisos++;
      }
      await pool.query("UPDATE subscriptions SET aviso_vencimiento = NOW() WHERE id = $1", [r.id]);
    }

    const vencidas = await pool.query(
      `SELECT s.id, s.tenant_id, s.plan, s.periodo_fin, t.nombre, ${EMAIL_SQL}
       FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id
       WHERE s.estado = 'activo' AND s.periodo_fin < NOW() - INTERVAL '3 days'
         AND s.aviso_vencido IS NULL`
    );
    for (const r of vencidas.rows) {
      await pool.query("UPDATE subscriptions SET estado = 'vencido', aviso_vencido = NOW() WHERE id = $1", [r.id]);
      await pool.query("UPDATE tenants SET estado = 'suspendido', updated_at = NOW() WHERE id = $1", [r.tenant_id]);
      suspendidos++;
      if (r.email) {
        const fecha = new Date(r.periodo_fin).toLocaleDateString("es-GT");
        await sendEmail(
          r.email,
          "Tu plan de ContaPro vencio",
          `<p>Hola,</p><p>Tu plan <strong>${r.plan}</strong> de <strong>${r.nombre}</strong> vencio el <strong>${fecha}</strong> y tu cuenta quedo suspendida.</p><p>Reactiva en <a href="${APP_URL}/app/suscripcion">${APP_URL}/app/suscripcion</a>.</p><p>ContaPro</p>`
        );
      }
    }
  } catch (e: any) {
    console.error("[Vencimientos]", e.message);
  }

  return { avisos, suspendidos };
}

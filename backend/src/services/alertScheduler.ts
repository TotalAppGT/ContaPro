import pool from '../db/pool';
import { enviarPlantillaAlerta } from './whatsappService';

// Texto de alerta fiscal automática ({{sistema}} ya va en la plantilla)
function buildAlertMessage(nombre: string, periodo: string, ivaVentas: number, ivaCompras: number): string {
  const fmt = (v: number) => `Q${v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const neto = ivaVentas - ivaCompras;
  return `Hola ${nombre}, alerta fiscal. Periodo: ${periodo}  |  IVA Ventas: ${fmt(ivaVentas)}  |  IVA Compras: ${fmt(ivaCompras)}  |  IVA Neto a pagar: ${fmt(neto)}  |  Presente SAT-2237 antes del vencimiento.  |  contapro.totalappgt.online`;
}

function currentPeriod(): string {
  const m = new Date();
  const names = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${names[m.getMonth()]} ${m.getFullYear()}`;
}

async function getTenantIVA(tenantId: string): Promise<{ ivaVentas: number; ivaCompras: number }> {
  const m = new Date();
  const start = new Date(m.getFullYear(), m.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(m.getFullYear(), m.getMonth() + 1, 0).toISOString().split('T')[0];

  const [ventas, compras] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(iva), 0) as total FROM sales_book WHERE tenant_id = $1 AND fecha >= $2 AND fecha <= $3', [tenantId, start, end]),
    pool.query('SELECT COALESCE(SUM(iva), 0) as total FROM purchases_book WHERE tenant_id = $1 AND fecha >= $2 AND fecha <= $3', [tenantId, start, end]),
  ]);

  return {
    ivaVentas: parseFloat(ventas.rows[0]?.total) || 0,
    ivaCompras: parseFloat(compras.rows[0]?.total) || 0,
  };
}

export async function processAlertas() {
  console.log('[ALERTAS] Verificando alertas programadas...');
  const ahora = new Date();
  const diaHoy = String(ahora.getDate());
  const horaHoy = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const hoy = ahora.toISOString().split('T')[0];

  try {
    const tenants = await pool.query(
      `SELECT id, nombre, telefono, plan, alerta_dia, alerta_hora, ultima_alerta
       FROM tenants
       WHERE telefono IS NOT NULL
         AND alerta_dia IS NOT NULL
         AND alerta_hora IS NOT NULL
         AND plan = 'empresarial'
         AND estado IN ('activo', 'trial')`
    );

    for (const t of tenants.rows) {
      // Verificar día: alerta_dia puede ser "1", "15", o "L,M,V" (días de semana)
      const diasProgramados = t.alerta_dia.split(',').map((d: string) => d.trim());
      const hoyL = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][ahora.getDay()];

      const diaMatch = diasProgramados.some(
        (d: string) => d === diaHoy || d.toLowerCase() === hoyL || d === '*'
      );

      if (!diaMatch) continue;

      // Verificar hora (ventana de 5 minutos: alerta_hora ± 2 min)
      const [ah, am] = t.alerta_hora.split(':').map(Number);
      const alertaMin = ah * 60 + (am || 0);
      const [hh, mm] = horaHoy.split(':').map(Number);
      const ahoraMin = hh * 60 + mm;

      if (Math.abs(ahoraMin - alertaMin) > 5) continue;

      // No duplicar: ya se envió hoy
      if (t.ultima_alerta === hoy) continue;

      // Calcular IVA del mes actual
      const { ivaVentas, ivaCompras } = await getTenantIVA(t.id);

      const mensaje = buildAlertMessage(t.nombre, currentPeriod(), ivaVentas, ivaCompras);
      const result = await enviarPlantillaAlerta(t.telefono, 'ContaPro', mensaje);

      if (result.ok) {
        await pool.query('UPDATE tenants SET ultima_alerta = $1 WHERE id = $2', [hoy, t.id]);
        console.log(`[ALERTAS] Enviada a ${t.nombre} (${t.telefono}) — IVA: Q${(ivaVentas - ivaCompras).toFixed(2)}`);
      } else {
        console.error(`[ALERTAS] Error enviando a ${t.nombre}:`, result.error?.slice(0, 200));
      }
    }
  } catch (e: any) {
    console.error('[ALERTAS] Error procesando:', e.message);
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startAlertScheduler() {
  console.log('[ALERTAS] Programador iniciado — revisa cada 5 minutos');
  processAlertas(); // Primera ejecución inmediata
  intervalId = setInterval(processAlertas, 5 * 60 * 1000);
}

export function stopAlertScheduler() {
  if (intervalId) clearInterval(intervalId);
}

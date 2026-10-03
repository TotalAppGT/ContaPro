import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Nivel por plan: personal=1, profesional=2, empresarial/despacho=3
const PLAN_NIVEL: Record<string, number> = { personal: 1, basico: 1, profesional: 2, empresarial: 3, despacho: 3, prueba: 3, trial: 3 };

export async function permitePlan(req: Request, min: number): Promise<boolean> {
  const r = await pool.query('SELECT plan FROM tenants WHERE id = $1', [req.user!.tenantId]);
  const p = String(r.rows[0]?.plan || 'personal').toLowerCase();
  return (PLAN_NIVEL[p] || 1) >= min;
}

// Helper para registrar movimientos en la bitacora
export async function logActividad(tenantId: string, userId: string | null, accion: string, descripcion: string) {
  try {
    await pool.query('INSERT INTO activity_log (tenant_id, user_id, accion, descripcion) VALUES ($1,$2,$3,$4)', [tenantId, userId, accion, descripcion]);
  } catch { /* silencioso */ }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!(await permitePlan(req, 3))) { res.status(403).json({ error: 'La bitacora requiere plan Empresarial o Despacho' }); return; }
    const { desde, hasta } = req.query;
    let q = `SELECT a.id, a.created_at, a.accion, a.descripcion, u.email AS usuario
             FROM activity_log a LEFT JOIN users u ON a.user_id = u.id WHERE a.tenant_id = $1`;
    const params: any[] = [req.user!.tenantId];
    if (desde) { q += ` AND a.created_at >= $${params.length + 1}`; params.push(desde); }
    if (hasta) { q += ` AND a.created_at <= $${params.length + 1}`; params.push(hasta); }
    q += ` ORDER BY a.created_at DESC LIMIT 500`;
    const rows = (await pool.query(q, params)).rows;
    res.json({ eventos: rows });
  } catch (e: any) { console.error('auditoria:', e.message); res.status(500).json({ error: 'Error al obtener la bitacora' }); }
});

router.get('/xlsx', async (req: Request, res: Response) => {
  try {
    if (!(await permitePlan(req, 3))) { res.status(403).json({ error: 'Plan insuficiente' }); return; }
    const ExcelJS = (await import('exceljs')).default;
    const rows = (await pool.query(
      `SELECT a.created_at, a.accion, a.descripcion, u.email AS usuario
       FROM activity_log a LEFT JOIN users u ON a.user_id = u.id
       WHERE a.tenant_id = $1 ORDER BY a.created_at DESC LIMIT 2000`,
      [req.user!.tenantId]
    )).rows;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bitacora');
    ws.columns = [{ width: 22 }, { width: 26 }, { width: 60 }, { width: 28 }];
    ws.getRow(1).values = ['Fecha', 'Accion', 'Descripcion', 'Usuario'];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r: any, i: number) => {
      ws.getRow(i + 2).values = [new Date(r.created_at).toLocaleString('es-GT'), r.accion, r.descripcion, r.usuario || ''];
    });
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bitacora-auditoria.xlsx"');
    res.send(Buffer.from(buf));
  } catch (e: any) { console.error('auditoria xlsx:', e.message); res.status(500).json({ error: 'Error.' }); }
});

export default router;

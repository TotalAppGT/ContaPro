import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface CuentaBal { codigo: string; nombre: string; tipo: string; debe: number; haber: number; saldo: number; }

async function calcularEstados(tenantId: string, anio: number, mes?: number, clientNit?: string) {
  const cat = await pool.query(
    `SELECT codigo, nombre, tipo FROM chart_of_accounts WHERE tenant_id = $1 AND acepta_asientos = true ORDER BY codigo`,
    [tenantId]
  );

  let q = `SELECT jel.codigo_cuenta, jel.debe, jel.haber
           FROM journal_entry_lines jel
           JOIN journal_entries je ON jel.journal_entry_id = je.id
           WHERE je.tenant_id = $1 AND EXTRACT(YEAR FROM je.fecha) = $2`;
  const params: any[] = [tenantId, anio];
  if (mes) { q += ` AND EXTRACT(MONTH FROM je.fecha) = $${params.length + 1}`; params.push(mes); }
  if (clientNit) { q += ` AND je.client_nit = $${params.length + 1}`; params.push(clientNit); }

  const lines = (await pool.query(q, params)).rows;

  const bal: Record<string, CuentaBal> = {};
  for (const c of cat.rows) bal[c.codigo] = { codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, debe: 0, haber: 0, saldo: 0 };
  for (const l of lines) {
    const b = bal[l.codigo_cuenta];
    if (b) { b.debe += Number(l.debe) || 0; b.haber += Number(l.haber) || 0; }
  }
  for (const k of Object.keys(bal)) {
    const b = bal[k];
    b.saldo = (b.tipo === 'ACTIVO' || b.tipo === 'GASTO' || b.tipo === 'COSTO') ? b.debe - b.haber : b.haber - b.debe;
  }

  const sum = (tipos: string[]) => Object.values(bal).filter((b) => tipos.includes(b.tipo)).reduce((s, b) => s + b.saldo, 0);
  const ingresos = sum(['INGRESO']);
  const costos = sum(['COSTO']);
  const gastos = sum(['GASTO']);
  const utilidad = ingresos - costos - gastos;
  const activo = sum(['ACTIVO']);
  const pasivo = sum(['PASIVO']);
  const capital = sum(['CAPITAL']);

  const byTipo = (tipos: string[]) =>
    Object.values(bal).filter((b) => tipos.includes(b.tipo) && Math.abs(b.saldo) > 0.005).sort((a, b) => a.codigo.localeCompare(b.codigo));

  return {
    cuentas: Object.values(bal).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    resultado: { ingresos, costos, gastos, utilidad, detalleIngresos: byTipo(['INGRESO']), detalleCostos: byTipo(['COSTO']), detalleGastos: byTipo(['GASTO']) },
    balance: { activo, pasivo, capital, utilidad, pasivoCapital: pasivo + capital + utilidad, detalleActivo: byTipo(['ACTIVO']), detallePasivo: byTipo(['PASIVO']), detalleCapital: byTipo(['CAPITAL']) },
  };
}

async function nombreEmpresa(tenantId: string) {
  const r = await pool.query(`SELECT nombre, nit FROM tenants WHERE id = $1`, [tenantId]);
  return { nombre: r.rows[0]?.nombre || 'Empresa', nit: r.rows[0]?.nit || '' };
}

const money = (n: number) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

router.get('/estados', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const anio = Number(req.query.anio) || new Date().getFullYear();
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const client_nit = req.query.client_nit as string | undefined;
    const data = await calcularEstados(tenantId, anio, mes, client_nit);
    const empresa = await nombreEmpresa(tenantId);
    res.json({ empresa, periodo: { anio, mes: mes || null }, ...data });
  } catch (e: any) {
    console.error('estados financieros:', e.message);
    res.status(500).json({ error: 'Error al generar estados financieros' });
  }
});

router.get('/estados/xlsx', async (req: Request, res: Response) => {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const tenantId = req.user!.tenantId;
    const anio = Number(req.query.anio) || new Date().getFullYear();
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const data = await calcularEstados(tenantId, anio, mes);
    const empresa = await nombreEmpresa(tenantId);
    const periodo = mes ? `${mes}/${anio}` : `Enero-Diciembre ${anio}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ContaPro';

    const head = (ws: any, titulo: string) => {
      ws.mergeCells('A1:C1');
      ws.getCell('A1').value = `${empresa.nombre}${empresa.nit ? ' · NIT ' + empresa.nit : ''}`;
      ws.getCell('A1').font = { bold: true, size: 13 };
      ws.mergeCells('A2:C2');
      ws.getCell('A2').value = titulo + ' — ' + periodo;
      ws.getCell('A2').font = { bold: true, size: 11, color: { argb: 'FF0F766E' } };
      ws.getRow(4).values = ['Código', 'Cuenta', 'Saldo'];
      ws.getRow(4).font = { bold: true };
      ws.columns = [{ width: 14 }, { width: 46 }, { width: 18 }];
    };

    // Estado de Resultados
    const wsR = wb.addWorksheet('Estado de Resultados');
    head(wsR, 'ESTADO DE RESULTADOS');
    let r = 5;
    const put = (ws: any, code: string, nombre: string, val: number, bold = false) => {
      ws.getRow(r).values = [code || '', nombre, Number(val.toFixed(2))];
      ws.getRow(r).font = { bold };
      ws.getCell(`C${r}`).numFmt = '#,##0.00';
      r++;
    };
    put(wsR, '', 'INGRESOS', data.resultado.ingresos, true);
    data.resultado.detalleIngresos.forEach((c) => put(wsR, c.codigo, c.nombre, c.saldo));
    put(wsR, '', 'COSTOS', data.resultado.costos, true);
    data.resultado.detalleCostos.forEach((c) => put(wsR, c.codigo, c.nombre, c.saldo));
    put(wsR, '', 'GASTOS', data.resultado.gastos, true);
    data.resultado.detalleGastos.forEach((c) => put(wsR, c.codigo, c.nombre, c.saldo));
    put(wsR, '', 'UTILIDAD DEL PERIODO', data.resultado.utilidad, true);

    // Balance General
    const wsB = wb.addWorksheet('Balance General');
    head(wsB, 'BALANCE GENERAL');
    r = 5;
    put(wsB, '', 'ACTIVO', data.balance.activo, true);
    data.balance.detalleActivo.forEach((c) => put(wsB, c.codigo, c.nombre, c.saldo));
    put(wsB, '', 'PASIVO', data.balance.pasivo, true);
    data.balance.detallePasivo.forEach((c) => put(wsB, c.codigo, c.nombre, c.saldo));
    put(wsB, '', 'CAPITAL', data.balance.capital, true);
    data.balance.detalleCapital.forEach((c) => put(wsB, c.codigo, c.nombre, c.saldo));
    put(wsB, '', 'Utilidad del periodo', data.balance.utilidad);
    put(wsB, '', 'TOTAL PASIVO + CAPITAL', data.balance.pasivoCapital, true);

    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="estados-financieros-${anio}${mes ? '-' + mes : ''}.xlsx"`);
    res.send(Buffer.from(buf));
  } catch (e: any) {
    console.error('estados xlsx:', e.message);
    res.status(500).json({ error: 'Error al generar XLSX' });
  }
});

router.get('/estados/pdf', async (req: Request, res: Response) => {
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const tenantId = req.user!.tenantId;
    const anio = Number(req.query.anio) || new Date().getFullYear();
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const data = await calcularEstados(tenantId, anio, mes);
    const empresa = await nombreEmpresa(tenantId);
    const periodo = mes ? `${mes}/${anio}` : `Enero-Diciembre ${anio}`;

    const doc = new PDFDocument({ size: 'LETTER', margin: 48 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="estados-financieros-${anio}${mes ? '-' + mes : ''}.pdf"`);
    doc.pipe(res);

    const teal = '#0f766e';
    doc.font('Helvetica-Bold').fontSize(15).fillColor(teal).text(empresa.nombre, { align: 'center' });
    if (empresa.nit) doc.font('Helvetica').fontSize(9).fillColor('#555').text('NIT ' + empresa.nit, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text(`Estados Financieros — ${periodo}`, { align: 'center' });
    doc.moveDown(1);

    const line = (label: string, valor: number, bold = false, indent = 0) => {
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#111');
      doc.text(label, 48 + indent, y);
      doc.text(money(valor), 400, y, { width: 120, align: 'right' });
      doc.moveDown(0.2);
    };
    const seccion = (t: string) => { doc.moveDown(0.4); doc.font('Helvetica-Bold').fontSize(11).fillColor(teal).text(t); doc.moveDown(0.2); };

    seccion('ESTADO DE RESULTADOS');
    line('Ingresos', data.resultado.ingresos, true);
    data.resultado.detalleIngresos.forEach((c) => line(`${c.codigo}  ${c.nombre}`, c.saldo, false, 12));
    line('Costos', data.resultado.costos, true);
    data.resultado.detalleCostos.forEach((c) => line(`${c.codigo}  ${c.nombre}`, c.saldo, false, 12));
    line('Gastos', data.resultado.gastos, true);
    data.resultado.detalleGastos.forEach((c) => line(`${c.codigo}  ${c.nombre}`, c.saldo, false, 12));
    line('UTILIDAD DEL PERIODO', data.resultado.utilidad, true);

    doc.moveDown(0.6);
    seccion('BALANCE GENERAL');
    line('Activo', data.balance.activo, true);
    data.balance.detalleActivo.forEach((c) => line(`${c.codigo}  ${c.nombre}`, c.saldo, false, 12));
    line('Pasivo', data.balance.pasivo, true);
    data.balance.detallePasivo.forEach((c) => line(`${c.codigo}  ${c.nombre}`, c.saldo, false, 12));
    line('Capital', data.balance.capital, true);
    data.balance.detalleCapital.forEach((c) => line(`${c.codigo}  ${c.nombre}`, c.saldo, false, 12));
    line('Utilidad del periodo', data.balance.utilidad);
    line('TOTAL PASIVO + CAPITAL', data.balance.pasivoCapital, true);

    doc.moveDown(1.2);
    doc.font('Helvetica').fontSize(8).fillColor('#888').text(`Generado por ContaPro · ${new Date().toLocaleString('es-GT')}`, { align: 'center' });
    doc.end();
  } catch (e: any) {
    console.error('estados pdf:', e.message);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

// ===================== Antiguedad de saldos CxC / CxP =====================
function bucketDe(dias: number) {
  if (dias <= 0) return 'corriente';
  if (dias <= 30) return 'd1_30';
  if (dias <= 60) return 'd31_60';
  if (dias <= 90) return 'd61_90';
  return 'd90_plus';
}

async function calcularAntiguedad(tenantId: string, tipo: string) {
  const esCxc = tipo !== 'cxp';
  const tabla = esCxc ? 'sales_book' : 'purchases_book';
  const nitCol = esCxc ? 'nit_cliente' : 'nit_proveedor';
  const nomCol = esCxc ? 'nombre_cliente' : 'nombre_proveedor';
  const rows = (await pool.query(
    `SELECT ${nitCol} AS nit, ${nomCol} AS nombre, total, COALESCE(monto_pagado,0) AS pagado, fecha, fecha_vencimiento
     FROM ${tabla} WHERE tenant_id = $1`,
    [tenantId]
  )).rows;

  const hoy = new Date();
  const porCliente: Record<string, any> = {};
  const totales = { corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };

  for (const r of rows) {
    const saldo = Number(r.total || 0) - Number(r.pagado || 0);
    if (saldo <= 0.005) continue;
    const venc = r.fecha_vencimiento ? new Date(r.fecha_vencimiento) : null;
    const dias = venc ? Math.floor((hoy.getTime() - venc.getTime()) / 86400000) : 0;
    const b = bucketDe(dias);
    const key = r.nit || r.nombre || '—';
    if (!porCliente[key]) porCliente[key] = { nit: r.nit, nombre: r.nombre, corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
    porCliente[key][b] += saldo;
    porCliente[key].total += saldo;
    totales[b] += saldo;
    totales.total += saldo;
  }
  return { clientes: Object.values(porCliente).sort((a: any, b: any) => b.total - a.total), totales };
}

const noCero = (n: number) => Math.abs(n) > 0.005;

router.get('/antiguedad', async (req: Request, res: Response) => {
  try {
    const tipo = String(req.query.tipo || 'cxc').toLowerCase();
    const data = await calcularAntiguedad(req.user!.tenantId, tipo);
    const empresa = await nombreEmpresa(req.user!.tenantId);
    res.json({ empresa, tipo: tipo === 'cxp' ? 'CxP' : 'CxC', ...data });
  } catch (e: any) { console.error('antiguedad:', e.message); res.status(500).json({ error: 'Error.' }); }
});

router.get('/antiguedad/xlsx', async (req: Request, res: Response) => {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const tipo = String(req.query.tipo || 'cxc').toLowerCase();
    const data = await calcularAntiguedad(req.user!.tenantId, tipo);
    const empresa = await nombreEmpresa(req.user!.tenantId);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(tipo === 'cxp' ? 'CxP' : 'CxC');
    ws.mergeCells('A1:G1');
    ws.getCell('A1').value = `${empresa.nombre} — Antigüedad de saldos ${tipo === 'cxp' ? '(CxP)' : '(CxC)'}`;
    ws.getCell('A1').font = { bold: true, size: 13 };
    ws.columns = [{ width: 16 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
    ws.getRow(3).values = ['NIT', 'Nombre', 'Corriente', '1-30', '31-60', '61-90', '+90', 'Total'];
    ws.getRow(3).font = { bold: true };
    let r = 4;
    for (const c of data.clientes as any[]) {
      ws.getRow(r).values = [c.nit || '', c.nombre || '', c.corriente, c.d1_30, c.d31_60, c.d61_90, c.d90_plus, c.total];
      for (let col = 3; col <= 8; col++) ws.getCell(r, col).numFmt = '#,##0.00';
      r++;
    }
    ws.getRow(r).values = ['', 'TOTAL', data.totales.corriente, data.totales.d1_30, data.totales.d31_60, data.totales.d61_90, data.totales.d90_plus, data.totales.total];
    ws.getRow(r).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="antiguedad-${tipo}.xlsx"`);
    res.send(Buffer.from(buf));
  } catch (e: any) { console.error('antiguedad xlsx:', e.message); res.status(500).json({ error: 'Error.' }); }
});

router.get('/antiguedad/pdf', async (req: Request, res: Response) => {
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const tipo = String(req.query.tipo || 'cxc').toLowerCase();
    const data = await calcularAntiguedad(req.user!.tenantId, tipo);
    const empresa = await nombreEmpresa(req.user!.tenantId);
    const doc = new PDFDocument({ size: 'LETTER', margin: 40, layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="antiguedad-${tipo}.pdf"`);
    doc.pipe(res);
    const teal = '#0f766e';
    doc.font('Helvetica-Bold').fontSize(14).fillColor(teal).text(`${empresa.nombre} — Antigüedad de saldos ${tipo === 'cxp' ? '(CxP)' : '(CxC)'}`, { align: 'center' });
    doc.moveDown(0.8);
    const cols = [30, 250, 320, 390, 460, 530, 600, 670];
    const head = ['NIT', 'Nombre', 'Corriente', '1-30', '31-60', '61-90', '+90', 'Total'];
    const rowAt = (vals: string[], y: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor('#111');
      vals.forEach((v, i) => doc.text(v, cols[i], y, { width: i === 1 ? 230 : 68, align: i >= 2 ? 'right' : 'left' }));
    };
    rowAt(head, doc.y, true);
    doc.moveDown(0.4);
    for (const c of data.clientes as any[]) {
      const y = doc.y;
      rowAt([c.nit || '', c.nombre || '', money(c.corriente), money(c.d1_30), money(c.d31_60), money(c.d61_90), money(c.d90_plus), money(c.total)], y);
      doc.moveDown(0.35);
    }
    doc.moveDown(0.3);
    rowAt(['', 'TOTAL', money(data.totales.corriente), money(data.totales.d1_30), money(data.totales.d31_60), money(data.totales.d61_90), money(data.totales.d90_plus), money(data.totales.total)], doc.y, true);
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(7).fillColor('#888').text(`Generado por ContaPro · ${new Date().toLocaleString('es-GT')}`, 40, doc.y, { width: doc.page.width - 80, align: 'center' });
    doc.end();
  } catch (e: any) { console.error('antiguedad pdf:', e.message); res.status(500).json({ error: 'Error.' }); }
});

export default router;

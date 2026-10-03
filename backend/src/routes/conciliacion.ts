import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import { permitePlan } from './auditoria';

const router = Router();
router.use(authMiddleware);

router.get('/cuentas', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit } = req.query;

    let query = 'SELECT * FROM bank_accounts WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (client_nit) {
      query += ` AND client_nit = $${paramCount++}`;
      params.push(client_nit);
    }

    query += ' ORDER BY banco';

    const result = await pool.query(query, params);
    res.json({ cuentas: result.rows });
  } catch (error: any) {
    console.error('Error listando cuentas:', error.message);
    res.status(500).json({ error: 'Error al listar las cuentas bancarias' });
  }
});

router.post('/cuentas', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, banco, numero_cuenta, tipo_cuenta, moneda, saldo_inicial } = req.body;

    if (!banco || !numero_cuenta) {
      res.status(400).json({ error: 'Banco y número de cuenta son requeridos' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO bank_accounts (tenant_id, client_nit, banco, numero_cuenta, tipo_cuenta, moneda, saldo_inicial, saldo_actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING *`,
      [tenantId, client_nit || null, banco, numero_cuenta, tipo_cuenta || 'Monetaria', moneda || 'GTQ', saldo_inicial || 0]
    );

    res.status(201).json({ message: 'Cuenta bancaria agregada', cuenta: result.rows[0] });
  } catch (error: any) {
    console.error('Error agregando cuenta:', error.message);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ya existe una cuenta con ese número para este cliente' });
      return;
    }
    res.status(500).json({ error: 'Error al agregar la cuenta bancaria' });
  }
});

router.get('/transacciones', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { cuenta, fechaInicio, fechaFin, conciliado, client_nit } = req.query;

    let query = 'SELECT * FROM bank_transactions WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (cuenta) {
      query += ` AND numero_cuenta = $${paramCount++}`;
      params.push(cuenta);
    }
    if (fechaInicio) {
      query += ` AND fecha >= $${paramCount++}`;
      params.push(fechaInicio);
    }
    if (fechaFin) {
      query += ` AND fecha <= $${paramCount++}`;
      params.push(fechaFin);
    }
    if (conciliado !== undefined && conciliado !== '') {
      query += ` AND conciliado = $${paramCount++}`;
      params.push(conciliado === 'true');
    }
    if (client_nit) {
      query += ` AND client_nit = $${paramCount++}`;
      params.push(client_nit);
    }

    query += ' ORDER BY fecha DESC, created_at DESC';

    const result = await pool.query(query, params);
    res.json({ transacciones: result.rows });
  } catch (error: any) {
    console.error('Error listando transacciones:', error.message);
    res.status(500).json({ error: 'Error al listar las transacciones' });
  }
});

router.post('/transacciones', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, numero_cuenta, fecha, no_documento, tipo, concepto, credito, debito } = req.body;

    if (!numero_cuenta || !fecha || !tipo) {
      res.status(400).json({ error: 'Cuenta, fecha y tipo son requeridos' });
      return;
    }

    await client.query('BEGIN');

    const lastTx = await client.query(
      `SELECT saldo FROM bank_transactions
       WHERE numero_cuenta = $1 AND tenant_id = $2 AND client_nit = $3
       ORDER BY fecha DESC, created_at DESC LIMIT 1`,
      [numero_cuenta, tenantId, client_nit || null]
    );

    let saldoAnterior = 0;
    if (lastTx.rows.length > 0) {
      saldoAnterior = Number(lastTx.rows[0].saldo);
    } else {
      const accountResult = await client.query(
        'SELECT saldo_inicial FROM bank_accounts WHERE numero_cuenta = $1 AND tenant_id = $2 AND client_nit = $3',
        [numero_cuenta, tenantId, client_nit || null]
      );
      if (accountResult.rows.length > 0) {
        saldoAnterior = Number(accountResult.rows[0].saldo_inicial);
      }
    }

    const creditoNum = Number(credito) || 0;
    const debitoNum = Number(debito) || 0;
    const nuevoSaldo = saldoAnterior + creditoNum - debitoNum;

    const result = await client.query(
      `INSERT INTO bank_transactions (tenant_id, client_nit, numero_cuenta, fecha, no_documento, tipo, concepto, credito, debito, saldo, conciliado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
       RETURNING *`,
      [tenantId, client_nit || null, numero_cuenta, fecha, no_documento || null, tipo, concepto || null, creditoNum, debitoNum, nuevoSaldo]
    );

    await client.query('COMMIT');

    res.status(201).json({ message: 'Transacción registrada', transaccion: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error registrando transacción:', error.message);
    res.status(500).json({ error: 'Error al registrar la transacción' });
  } finally {
    client.release();
  }
});

router.patch('/transacciones/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const current = await pool.query(
      'SELECT conciliado FROM bank_transactions WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (current.rows.length === 0) {
      res.status(404).json({ error: 'Transacción no encontrada' });
      return;
    }

    const nuevoEstado = !current.rows[0].conciliado;

    const result = await pool.query(
      `UPDATE bank_transactions SET conciliado = $1, conciliado_at = CASE WHEN $1 THEN NOW() ELSE NULL END WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [nuevoEstado, id, tenantId]
    );

    res.json({
      message: nuevoEstado ? 'Transacción conciliada' : 'Conciliación revertida',
      transaccion: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error alternando conciliación:', error.message);
    res.status(500).json({ error: 'Error al cambiar estado de conciliación' });
  }
});

router.get('/cuadre', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { cuenta, fechaInicio, fechaFin, client_nit } = req.query;

    if (!cuenta) {
      res.status(400).json({ error: 'Parámetro cuenta (número de cuenta) es requerido' });
      return;
    }

    const accountResult = await pool.query(
      'SELECT * FROM bank_accounts WHERE numero_cuenta = $1 AND tenant_id = $2 AND ($3::text IS NULL OR client_nit = $3)',
      [cuenta, tenantId, client_nit || null]
    );

    if (accountResult.rows.length === 0) {
      res.status(404).json({ error: 'Cuenta bancaria no encontrada' });
      return;
    }

    const account = accountResult.rows[0];

    let txQuery = `
      SELECT COALESCE(SUM(credito), 0) as total_creditos,
             COALESCE(SUM(debito), 0) as total_debitos,
             COUNT(*) as total_transacciones,
             COUNT(CASE WHEN conciliado = true THEN 1 END) as conciliadas,
             COUNT(CASE WHEN conciliado = false THEN 1 END) as pendientes
      FROM bank_transactions
      WHERE numero_cuenta = $1 AND tenant_id = $2
    `;
    const txParams: any[] = [cuenta, tenantId];
    let paramCount = 3;

    if (client_nit) {
      txQuery += ` AND client_nit = $${paramCount++}`;
      txParams.push(client_nit);
    }
    if (fechaInicio) {
      txQuery += ` AND fecha >= $${paramCount++}`;
      txParams.push(fechaInicio);
    }
    if (fechaFin) {
      txQuery += ` AND fecha <= $${paramCount++}`;
      txParams.push(fechaFin);
    }

    const txResult = await pool.query(txQuery, txParams);
    const totals = txResult.rows[0];

    const saldoInicial = Number(account.saldo_inicial);
    const totalCreditos = Number(totals.total_creditos);
    const totalDebitos = Number(totals.total_debitos);
    const saldoCalculado = saldoInicial + totalCreditos - totalDebitos;

    const lastTx = await pool.query(
      `SELECT saldo FROM bank_transactions
       WHERE numero_cuenta = $1 AND tenant_id = $2
       ORDER BY fecha DESC, created_at DESC LIMIT 1`,
      [cuenta, tenantId]
    );

    const saldoLibro = lastTx.rows.length > 0 ? Number(lastTx.rows[0].saldo) : saldoInicial;
    const diferencia = saldoCalculado - saldoLibro;

    res.json({
      cuenta: {
        id: account.id,
        banco: account.banco,
        numero_cuenta: account.numero_cuenta,
        tipo_cuenta: account.tipo_cuenta,
        moneda: account.moneda,
      },
      saldos: {
        saldo_inicial: Number(saldoInicial.toFixed(2)),
        creditos: Number(totalCreditos.toFixed(2)),
        debitos: Number(totalDebitos.toFixed(2)),
        saldo_calculado: Number(saldoCalculado.toFixed(2)),
        saldo_libro: Number(saldoLibro.toFixed(2)),
        diferencia: Number(diferencia.toFixed(2)),
      },
      conciliacion: {
        total_transacciones: Number(totals.total_transacciones),
        conciliadas: Number(totals.conciliadas),
        pendientes: Number(totals.pendientes),
        estado: Math.abs(diferencia) < 0.01 ? 'CUADRADO' : 'NO CUADRADO',
      },
    });
  } catch (error: any) {
    console.error('Error calculando cuadre:', error.message);
    res.status(500).json({ error: 'Error al calcular la conciliación bancaria' });
  }
});

// Punto 3: Importar estado de cuenta bancario (CSV / OFX) + auto-match contra asientos
router.post('/importar', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    if (!(await permitePlan(req, 2))) { res.status(403).json({ error: 'El import bancario requiere plan Profesional o superior' }); return; }
    const tenantId = req.user!.tenantId;
    const { numero_cuenta, client_nit, contenido } = req.body;
    if (!numero_cuenta || !contenido) { res.status(400).json({ error: 'Cuenta bancaria y contenido del archivo son requeridos' }); return; }

    const texto = String(contenido);
    const movimientos: { fecha: string; no_documento?: string; concepto?: string; credito: number; debito: number }[] = [];

    if (/<STMTTRN|<OFX/i.test(texto)) {
      const trns = texto.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
      for (const t of trns) {
        const monto = Number(((t.match(/<TRNAMT>([-\d.,]+)/i) || [])[1] || '0').replace(',', '.')) || 0;
        const dt = (t.match(/<DTPOSTED>(\d{8})/i) || [])[1] || '';
        const fecha = dt ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : new Date().toISOString().slice(0, 10);
        const memo = ((t.match(/<MEMO>([^<\r\n]+)/i) || [])[1] || '').trim();
        const fitid = ((t.match(/<FITID>([^<\r\n]+)/i) || [])[1] || '').trim();
        movimientos.push({ fecha, no_documento: fitid, concepto: memo, credito: monto > 0 ? monto : 0, debito: monto < 0 ? -monto : 0 });
      }
    } else {
      const lines = texto.split(/\r?\n/).filter((l) => l.trim());
      let idx: Record<string, number> = { fecha: 0, no_documento: 1, concepto: 2, debito: 3, credito: 4 };
      let start = 0;
      const header = lines[0] ? lines[0].toLowerCase() : '';
      if (header.includes('fecha')) {
        const cols = lines[0].split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, '').toLowerCase());
        const find = (k: string) => cols.findIndex((c) => c.includes(k));
        idx = { fecha: find('fecha'), no_documento: find('doc'), concepto: find('concept'), debito: find('debito') >= 0 ? find('debito') : find('débito') >= 0 ? find('débito') : find('cargo'), credito: find('credito') >= 0 ? find('credito') : find('crédito') >= 0 ? find('crédito') : find('abono') };
        start = 1;
      }
      for (let i = start; i < lines.length; i++) {
        const c = lines[i].split(/[;,\t]/).map((x) => x.trim().replace(/^"|"$/g, ''));
        if (c.length < 3) continue;
        const num = (v?: string) => Number(String(v || '0').replace(/[^\d.-]/g, '')) || 0;
        const f = (idx.fecha >= 0 ? c[idx.fecha] : '') || new Date().toISOString().slice(0, 10);
        movimientos.push({
          fecha: f.includes('/') ? f.split('/').reverse().join('-') : f,
          no_documento: idx.no_documento >= 0 ? c[idx.no_documento] : undefined,
          concepto: idx.concepto >= 0 ? c[idx.concepto] : undefined,
          debito: num(idx.debito >= 0 ? c[idx.debito] : undefined),
          credito: num(idx.credito >= 0 ? c[idx.credito] : undefined),
        });
      }
    }

    if (movimientos.length === 0) { res.status(400).json({ error: 'No se detectaron movimientos en el archivo' }); return; }

    await client.query('BEGIN');
    const lastTx = await client.query(
      `SELECT saldo FROM bank_transactions WHERE numero_cuenta = $1 AND tenant_id = $2 ORDER BY fecha DESC, created_at DESC LIMIT 1`,
      [numero_cuenta, tenantId]
    );
    let saldo = lastTx.rows.length ? Number(lastTx.rows[0].saldo) : 0;
    if (!lastTx.rows.length) {
      const acc = await client.query('SELECT saldo_inicial FROM bank_accounts WHERE numero_cuenta = $1 AND tenant_id = $2', [numero_cuenta, tenantId]);
      if (acc.rows.length) saldo = Number(acc.rows[0].saldo_inicial);
    }

    let insertados = 0;
    const ids: string[] = [];
    for (const m of movimientos) {
      saldo = saldo + m.credito - m.debito;
      const r = await client.query(
        `INSERT INTO bank_transactions (tenant_id, client_nit, numero_cuenta, fecha, no_documento, tipo, concepto, credito, debito, saldo, conciliado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false) RETURNING id`,
        [tenantId, client_nit || '', numero_cuenta, m.fecha, m.no_documento || null, m.debito > 0 ? 'DEBITO' : 'CREDITO', m.concepto || null, m.credito, m.debito, saldo]
      );
      ids.push(r.rows[0].id);
      insertados++;
    }
    await client.query('COMMIT');

    // Auto-match: buscar asientos por monto (±0.01)
    const montos = movimientos.map((m) => m.credito || m.debito).filter((n) => n > 0);
    let conciliados = 0;
    if (montos.length) {
      const asientos = await client.query(
        `SELECT je.id, COALESCE(SUM(jel.debe),0) AS debe, COALESCE(SUM(jel.haber),0) AS haber
         FROM journal_entries je JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
         WHERE je.tenant_id = $1
         GROUP BY je.id`,
        [tenantId]
      );
      for (const a of asientos.rows) {
        const d = Number(a.debe), h = Number(a.haber);
        if (montos.some((m) => Math.abs(m - d) < 0.01 || Math.abs(m - h) < 0.01)) conciliados++;
      }
    }

    res.json({ ok: true, insertados, asientos_con_monto_coincidente: conciliados });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error importando estado de cuenta:', error.message);
    res.status(500).json({ error: 'Error al importar el estado de cuenta' });
  } finally {
    client.release();
  }
});

export default router;

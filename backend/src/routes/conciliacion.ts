import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/conciliacion/cuentas', async (req: Request, res: Response) => {
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

router.post('/conciliacion/cuentas', async (req: Request, res: Response) => {
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

router.get('/conciliacion/transacciones', async (req: Request, res: Response) => {
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

router.post('/conciliacion/transacciones', async (req: Request, res: Response) => {
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

router.patch('/conciliacion/transacciones/:id', async (req: Request, res: Response) => {
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

router.get('/conciliacion/cuadre', async (req: Request, res: Response) => {
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

export default router;

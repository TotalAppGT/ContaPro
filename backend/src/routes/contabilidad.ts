import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface LineaAsiento {
  codigo: string;
  concepto: string;
  debe: number;
  haber: number;
}

interface AsientoInput {
  client_nit: string;
  fecha: string;
  lineas: LineaAsiento[];
  tipoPoliza?: string;
  conceptoGeneral?: string;
}

router.get('/contabilidad/catalogo', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(
      `SELECT id, codigo, nombre, tipo, nivel, acepta_asientos
       FROM chart_of_accounts
       WHERE tenant_id = $1
       ORDER BY codigo`,
      [tenantId]
    );
    res.json({ cuentas: result.rows });
  } catch (error: any) {
    console.error('Error obteniendo catálogo:', error.message);
    res.status(500).json({ error: 'Error al obtener el catálogo de cuentas' });
  }
});

router.post('/contabilidad/asientos', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { client_nit, fecha, lineas, tipoPoliza, conceptoGeneral }: AsientoInput = req.body;

    if (!fecha || !lineas || !Array.isArray(lineas) || lineas.length === 0) {
      res.status(400).json({ error: 'Fecha y líneas de asiento son requeridas' });
      return;
    }

    const totalDebe = lineas.reduce((sum: number, l: LineaAsiento) => sum + (Number(l.debe) || 0), 0);
    const totalHaber = lineas.reduce((sum: number, l: LineaAsiento) => sum + (Number(l.haber) || 0), 0);

    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      res.status(400).json({
        error: 'Partida no cuadrada',
        detalle: `Debe: Q${totalDebe.toFixed(2)}, Haber: Q${totalHaber.toFixed(2)}`,
        diferencia: (totalDebe - totalHaber).toFixed(2),
      });
      return;
    }

    const catalogResult = await pool.query(
      'SELECT codigo FROM chart_of_accounts WHERE tenant_id = $1',
      [tenantId]
    );
    const validCodes = new Set(catalogResult.rows.map((r: any) => r.codigo));

    for (const linea of lineas) {
      if (!validCodes.has(linea.codigo)) {
        res.status(400).json({ error: `Código de cuenta no existe en el catálogo: ${linea.codigo}` });
        return;
      }
    }

    await client.query('BEGIN');

    const maxNumResult = await client.query(
      'SELECT COALESCE(MAX(numero), 0) as max_num FROM journal_entries WHERE tenant_id = $1',
      [tenantId]
    );
    const nextNum = maxNumResult.rows[0].max_num + 1;

    const entryResult = await client.query(
      `INSERT INTO journal_entries (tenant_id, client_nit, fecha, tipo_poliza, concepto_general, numero, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, numero`,
      [tenantId, client_nit || null, fecha, tipoPoliza || null, conceptoGeneral || null, nextNum, userId]
    );
    const entryId = entryResult.rows[0].id;
    const entryNum = entryResult.rows[0].numero;

    for (const linea of lineas) {
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, codigo_cuenta, concepto, debe, haber)
         VALUES ($1, $2, $3, $4, $5)`,
        [entryId, linea.codigo, linea.concepto || '', Number(linea.debe) || 0, Number(linea.haber) || 0]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Asiento contable guardado exitosamente',
      asiento: {
        id: entryId,
        numero: entryNum,
        fecha,
        total_debe: totalDebe,
        total_haber: totalHaber,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error guardando asiento:', error.message);
    res.status(500).json({ error: 'Error al guardar el asiento contable' });
  } finally {
    client.release();
  }
});

router.get('/contabilidad/asientos', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, mes, anio } = req.query;

    let query = `
      SELECT je.id, je.numero, je.fecha, je.tipo_poliza, je.concepto_general, je.client_nit,
             je.created_at
      FROM journal_entries je
      WHERE je.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (client_nit) {
      query += ` AND je.client_nit = $${paramCount++}`;
      params.push(client_nit);
    }

    if (mes && anio) {
      query += ` AND EXTRACT(MONTH FROM je.fecha) = $${paramCount++} AND EXTRACT(YEAR FROM je.fecha) = $${paramCount++}`;
      params.push(Number(mes), Number(anio));
    } else if (anio) {
      query += ` AND EXTRACT(YEAR FROM je.fecha) = $${paramCount++}`;
      params.push(Number(anio));
    }

    query += ` ORDER BY je.fecha DESC, je.numero DESC LIMIT 200`;

    const result = await pool.query(query, params);

    const asientos = [];
    for (const entry of result.rows) {
      const linesResult = await pool.query(
        `SELECT codigo_cuenta, concepto, debe, haber
         FROM journal_entry_lines
         WHERE journal_entry_id = $1
         ORDER BY debe DESC`,
        [entry.id]
      );
      asientos.push({
        ...entry,
        lineas: linesResult.rows,
      });
    }

    res.json({ asientos });
  } catch (error: any) {
    console.error('Error listando asientos:', error.message);
    res.status(500).json({ error: 'Error al listar los asientos contables' });
  }
});

router.get('/contabilidad/reporte-financiero', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, mes, anio } = req.query;

    if (!mes || !anio) {
      res.status(400).json({ error: 'Parámetros mes y anio son requeridos' });
      return;
    }

    const m = Number(mes);
    const a = Number(anio);

    const catalogResult = await pool.query(
      `SELECT codigo, nombre, tipo, nivel
       FROM chart_of_accounts
       WHERE tenant_id = $1 AND acepta_asientos = true
       ORDER BY codigo`,
      [tenantId]
    );
    const cuentas = catalogResult.rows;

    let linesQuery = `
      SELECT jel.codigo_cuenta, jel.debe, jel.haber, je.fecha
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE je.tenant_id = $1
        AND EXTRACT(MONTH FROM je.fecha) = $2
        AND EXTRACT(YEAR FROM je.fecha) = $3
    `;
    const linesParams: any[] = [tenantId, m, a];
    let paramCount = 4;

    if (client_nit) {
      linesQuery += ` AND je.client_nit = $${paramCount++}`;
      linesParams.push(client_nit);
    }

    const linesResult = await pool.query(linesQuery, linesParams);
    const lineas = linesResult.rows;

    const balances: Record<string, { codigo: string; nombre: string; tipo: string; debe: number; haber: number; saldo: number }> = {};

    for (const cuenta of cuentas) {
      balances[cuenta.codigo] = {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        debe: 0,
        haber: 0,
        saldo: 0,
      };
    }

    for (const linea of lineas) {
      const code = linea.codigo_cuenta;
      if (balances[code]) {
        balances[code].debe += Number(linea.debe) || 0;
        balances[code].haber += Number(linea.haber) || 0;
      }
    }

    for (const key of Object.keys(balances)) {
      const b = balances[key];
      const tipo = b.tipo;
      if (tipo === 'ACTIVO' || tipo === 'GASTO' || tipo === 'COSTO') {
        b.saldo = b.debe - b.haber;
      } else {
        b.saldo = b.haber - b.debe;
      }
    }

    const ingresosTotal = Object.values(balances)
      .filter(b => b.tipo === 'INGRESO')
      .reduce((sum, b) => sum + b.saldo, 0);

    const gastosTotal = Object.values(balances)
      .filter(b => b.tipo === 'GASTO' || b.tipo === 'COSTO')
      .reduce((sum, b) => sum + b.saldo, 0);

    const utilidad = ingresosTotal - gastosTotal;

    const activosTotal = Object.values(balances)
      .filter(b => b.tipo === 'ACTIVO')
      .reduce((sum, b) => sum + b.saldo, 0);

    const pasivosTotal = Object.values(balances)
      .filter(b => b.tipo === 'PASIVO')
      .reduce((sum, b) => sum + b.saldo, 0);

    const capitalTotal = Object.values(balances)
      .filter(b => b.tipo === 'CAPITAL')
      .reduce((sum, b) => sum + b.saldo, 0);

    const pasivoCapitalTotal = pasivosTotal + capitalTotal + utilidad;

    const reporte = Object.values(balances).sort((a, b) => a.codigo.localeCompare(b.codigo));

    res.json({
      reporte,
      resumen: {
        ingresos_total: Number(ingresosTotal.toFixed(2)),
        gastos_total: Number(gastosTotal.toFixed(2)),
        utilidad: Number(utilidad.toFixed(2)),
        activos_total: Number(activosTotal.toFixed(2)),
        pasivos_total: Number(pasivosTotal.toFixed(2)),
        capital_total: Number(capitalTotal.toFixed(2)),
        pasivo_capital_total: Number(pasivoCapitalTotal.toFixed(2)),
      },
      periodo: { mes: m, anio: a },
    });
  } catch (error: any) {
    console.error('Error generando reporte financiero:', error.message);
    res.status(500).json({ error: 'Error al generar el reporte financiero' });
  }
});

router.post('/contabilidad/cotejar', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, mes, anio } = req.body;

    if (!mes || !anio) {
      res.status(400).json({ error: 'Parámetros mes y anio son requeridos' });
      return;
    }

    const m = Number(mes);
    const a = Number(anio);

    const catalogResult = await pool.query(
      'SELECT codigo, nombre FROM chart_of_accounts WHERE tenant_id = $1',
      [tenantId]
    );
    const validCodes = new Set(catalogResult.rows.map((r: any) => r.codigo));

    let entriesQuery = `
      SELECT je.id, je.numero, je.fecha, je.concepto_general, je.client_nit
      FROM journal_entries je
      WHERE je.tenant_id = $1
        AND EXTRACT(MONTH FROM je.fecha) = $2
        AND EXTRACT(YEAR FROM je.fecha) = $3
    `;
    const entriesParams: any[] = [tenantId, m, a];
    let paramCount = 4;

    if (client_nit) {
      entriesQuery += ` AND je.client_nit = $${paramCount++}`;
      entriesParams.push(client_nit);
    }

    const entriesResult = await pool.query(entriesQuery, entriesParams);
    const entries = entriesResult.rows;

    const noCuadradas: any[] = [];
    const codigosInvalidos: any[] = [];
    let totalCotejadas = 0;

    for (const entry of entries) {
      totalCotejadas++;

      const linesResult = await pool.query(
        `SELECT codigo_cuenta, debe, haber FROM journal_entry_lines WHERE journal_entry_id = $1`,
        [entry.id]
      );
      const lineas = linesResult.rows;

      const totalDebe = lineas.reduce((sum: number, l: any) => sum + Number(l.debe), 0);
      const totalHaber = lineas.reduce((sum: number, l: any) => sum + Number(l.haber), 0);

      if (Math.abs(totalDebe - totalHaber) > 0.01) {
        noCuadradas.push({
          asiento_id: entry.id,
          numero: entry.numero,
          fecha: entry.fecha,
          concepto: entry.concepto_general,
          total_debe: Number(totalDebe.toFixed(2)),
          total_haber: Number(totalHaber.toFixed(2)),
          diferencia: Number((totalDebe - totalHaber).toFixed(2)),
        });
      }

      for (const linea of lineas) {
        if (!validCodes.has(linea.codigo_cuenta)) {
          codigosInvalidos.push({
            asiento_id: entry.id,
            numero: entry.numero,
            codigo: linea.codigo_cuenta,
          });
        }
      }
    }

    res.json({
      cotejo: {
        total_cotejadas: totalCotejadas,
        no_cuadradas: noCuadradas,
        codigos_invalidos: codigosInvalidos,
        estado: noCuadradas.length === 0 && codigosInvalidos.length === 0 ? 'APROBADO' : 'CON ERRORES',
      },
      periodo: { mes: m, anio: a },
    });
  } catch (error: any) {
    console.error('Error cotejando partidas:', error.message);
    res.status(500).json({ error: 'Error al cotejar las partidas contables' });
  }
});

router.get('/contabilidad/comparativa-mensual', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, anio } = req.query;

    if (!anio) {
      res.status(400).json({ error: 'Parámetro anio es requerido' });
      return;
    }

    const a = Number(anio);

    let entriesQuery = `
      SELECT je.id, EXTRACT(MONTH FROM je.fecha) as mes
      FROM journal_entries je
      WHERE je.tenant_id = $1
        AND EXTRACT(YEAR FROM je.fecha) = $2
    `;
    const entriesParams: any[] = [tenantId, a];
    let paramCount = 3;

    if (client_nit) {
      entriesQuery += ` AND je.client_nit = $${paramCount++}`;
      entriesParams.push(client_nit);
    }

    const entriesResult = await pool.query(entriesQuery, entriesParams);

    const entryIds = entriesResult.rows.map((r: any) => r.id);
    if (entryIds.length === 0) {
      res.json({
        comparativa: [],
        anio: a,
        message: 'No hay datos para el año seleccionado',
      });
      return;
    }

    const linesResult = await pool.query(
      `SELECT jel.codigo_cuenta, jel.debe, jel.haber, EXTRACT(MONTH FROM je.fecha) as mes
       FROM journal_entry_lines jel
       JOIN journal_entries je ON jel.journal_entry_id = je.id
       WHERE je.tenant_id = $1
         AND EXTRACT(YEAR FROM je.fecha) = $2
       ORDER BY mes`,
      [tenantId, a]
    );

    const monthlyBalances: Record<number, Record<string, { debe: number; haber: number }>> = {};

    for (const line of linesResult.rows) {
      const mes = Number(line.mes);
      if (!monthlyBalances[mes]) {
        monthlyBalances[mes] = {};
      }
      const code = line.codigo_cuenta;
      if (!monthlyBalances[mes][code]) {
        monthlyBalances[mes][code] = { debe: 0, haber: 0 };
      }
      monthlyBalances[mes][code].debe += Number(line.debe) || 0;
      monthlyBalances[mes][code].haber += Number(line.haber) || 0;
    }

    const accountTypes = await pool.query(
      'SELECT codigo, tipo FROM chart_of_accounts WHERE tenant_id = $1',
      [tenantId]
    );
    const codeToType: Record<string, string> = {};
    accountTypes.rows.forEach((r: any) => { codeToType[r.codigo] = r.tipo; });

    const comparativa = [];
    for (let m = 1; m <= 12; m++) {
      const monthData = monthlyBalances[m] || {};
      let ingresos = 0;
      let gastos = 0;

      for (const code of Object.keys(monthData)) {
        const tipo = codeToType[code] || 'ACTIVO';
        const debe = monthData[code].debe;
        const haber = monthData[code].haber;

        if (tipo === 'INGRESO') {
          ingresos += haber - debe;
        } else if (tipo === 'GASTO' || tipo === 'COSTO') {
          gastos += debe - haber;
        }
      }

      comparativa.push({
        mes: m,
        ingresos: Number(ingresos.toFixed(2)),
        gastos: Number(gastos.toFixed(2)),
        utilidad: Number((ingresos - gastos).toFixed(2)),
      });
    }

    res.json({ comparativa, anio: a });
  } catch (error: any) {
    console.error('Error generando comparativa mensual:', error.message);
    res.status(500).json({ error: 'Error al generar la comparativa mensual' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface SATDocument {
  fecha: string;
  numero_documento: string;
  serie?: string;
  nit_cliente?: string;
  nit_proveedor?: string;
  nombre_cliente?: string;
  nombre_proveedor?: string;
  tipo_documento: string;
  total: number;
  regimen?: string;
}

function calcularBase(total: number, regimen: string): { base: number; iva: number } {
  if (regimen === 'GENERAL') {
    const base = total / 1.12;
    return {
      base: Math.round(base * 100) / 100,
      iva: Math.round((total - base) * 100) / 100,
    };
  }
  return {
    base: total,
    iva: 0,
  };
}

type Agrupacion = 'FACTURA' | 'DIARIO' | 'SEMANAL' | 'MENSUAL';

function agruparDocumentos(documentos: SATDocument[], agrupacion: Agrupacion): SATDocument[][] {
  if (agrupacion === 'FACTURA') {
    return documentos.map(d => [d]);
  }

  const grupos: Map<string, SATDocument[]> = new Map();

  for (const doc of documentos) {
    const fecha = new Date(doc.fecha);
    let key: string;

    switch (agrupacion) {
      case 'DIARIO':
        key = doc.fecha;
        break;
      case 'SEMANAL': {
        const day = fecha.getUTCDate();
        const startOfWeek = new Date(fecha);
        startOfWeek.setUTCDate(day - fecha.getUTCDay());
        key = startOfWeek.toISOString().split('T')[0];
        break;
      }
      case 'MENSUAL': {
        key = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
        break;
      }
      default:
        key = doc.fecha;
    }

    if (!grupos.has(key)) {
      grupos.set(key, []);
    }
    grupos.get(key)!.push(doc);
  }

  return Array.from(grupos.values());
}

router.post('/sat/carga-masiva', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const {
      documentos,
      tipo,
      agrupacion,
      regimen,
      client_nit,
    }: {
      documentos: SATDocument[];
      tipo: 'VENTAS' | 'COMPRAS';
      agrupacion: Agrupacion;
      regimen: string;
      client_nit?: string;
    } = req.body;

    if (!documentos || !Array.isArray(documentos) || documentos.length === 0) {
      res.status(400).json({ error: 'Se requiere un arreglo de documentos' });
      return;
    }

    if (!tipo || !['VENTAS', 'COMPRAS'].includes(tipo)) {
      res.status(400).json({ error: 'Tipo debe ser VENTAS o COMPRAS' });
      return;
    }

    const agrupacionValida = agrupacion || 'FACTURA';
    const regimenValido = regimen || 'GENERAL';

    const grupos = agruparDocumentos(documentos, agrupacionValida);

    await client.query('BEGIN');

    const resultados: any[] = [];
    const asientosCreados: any[] = [];

    for (const grupo of grupos) {
      let totalGrupo = 0;
      let baseGrupo = 0;
      let ivaGrupo = 0;

      for (const doc of grupo) {
        const { base, iva } = calcularBase(doc.total, regimenValido);
        totalGrupo += doc.total;
        baseGrupo += base;
        ivaGrupo += iva;
      }

      const primeraFecha = grupo[0].fecha;

      if (tipo === 'VENTAS') {
        const firstDoc = grupo[0];
        const result = await client.query(
          `INSERT INTO sales_book (tenant_id, client_nit, fecha, numero_documento, serie,
            nit_cliente, nombre_cliente, tipo_documento, regimen, total, base_imponible, iva, exento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            tenantId,
            client_nit || null,
            primeraFecha,
            firstDoc.numero_documento || agrupacionValida,
            firstDoc.serie || null,
            firstDoc.nit_cliente || 'C/F',
            firstDoc.nombre_cliente || 'Consumidor Final',
            firstDoc.tipo_documento || 'FACTURA',
            regimenValido,
            Math.round(totalGrupo * 100) / 100,
            Math.round(baseGrupo * 100) / 100,
            Math.round(ivaGrupo * 100) / 100,
            0,
          ]
        );
        resultados.push(result.rows[0]);
      } else {
        const firstDoc = grupo[0];
        const result = await client.query(
          `INSERT INTO purchases_book (tenant_id, client_nit, fecha, numero_documento, serie,
            nit_proveedor, nombre_proveedor, tipo_documento, regimen, total, base_imponible, iva, exento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            tenantId,
            client_nit || null,
            primeraFecha,
            firstDoc.numero_documento || agrupacionValida,
            firstDoc.serie || null,
            firstDoc.nit_proveedor || 'C/F',
            firstDoc.nombre_proveedor || 'Proveedor',
            firstDoc.tipo_documento || 'FACTURA',
            regimenValido,
            Math.round(totalGrupo * 100) / 100,
            Math.round(baseGrupo * 100) / 100,
            Math.round(ivaGrupo * 100) / 100,
            0,
          ]
        );
        resultados.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.json({
      message: `Carga masiva procesada: ${resultados.length} registros en el libro de ${tipo.toLowerCase()}`,
      agrupacion: agrupacionValida,
      registros: resultados.length,
      total_documentos: documentos.length,
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error en carga masiva SAT:', error.message);
    res.status(500).json({ error: 'Error al procesar la carga masiva SAT' });
  } finally {
    client.release();
  }
});

router.get('/sat/sat2237', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, mes, anio } = req.query;

    if (!mes || !anio) {
      res.status(400).json({ error: 'Parámetros mes y anio son requeridos' });
      return;
    }

    const m = Number(mes);
    const a = Number(anio);

    let salesQuery = `
      SELECT COALESCE(SUM(total), 0) as total_ventas,
             COALESCE(SUM(base_imponible), 0) as base_ventas,
             COALESCE(SUM(iva), 0) as iva_ventas,
             COALESCE(SUM(exento), 0) as exento_ventas,
             COUNT(*) as num_facturas_ventas
      FROM sales_book
      WHERE tenant_id = $1
        AND EXTRACT(MONTH FROM fecha) = $2
        AND EXTRACT(YEAR FROM fecha) = $3
    `;
    const salesParams: any[] = [tenantId, m, a];
    let salesParamCount = 4;

    if (client_nit) {
      salesQuery += ` AND client_nit = $${salesParamCount++}`;
      salesParams.push(client_nit);
    }

    let purchasesQuery = `
      SELECT COALESCE(SUM(total), 0) as total_compras,
             COALESCE(SUM(base_imponible), 0) as base_compras,
             COALESCE(SUM(iva), 0) as iva_compras,
             COALESCE(SUM(exento), 0) as exento_compras,
             COUNT(*) as num_facturas_compras
      FROM purchases_book
      WHERE tenant_id = $1
        AND EXTRACT(MONTH FROM fecha) = $2
        AND EXTRACT(YEAR FROM fecha) = $3
    `;
    const purchasesParams: any[] = [tenantId, m, a];
    let purchasesParamCount = 4;

    if (client_nit) {
      purchasesQuery += ` AND client_nit = $${purchasesParamCount++}`;
      purchasesParams.push(client_nit);
    }

    const [ventasResult, comprasResult] = await Promise.all([
      pool.query(salesQuery, salesParams),
      pool.query(purchasesQuery, purchasesParams),
    ]);

    const ventas = ventasResult.rows[0];
    const compras = comprasResult.rows[0];

    const debitoFiscal = Number(ventas.iva_ventas);
    const creditoFiscal = Number(compras.iva_compras);
    const impuesto = debitoFiscal - creditoFiscal;

    let resultado: string;
    let monto: number;
    if (impuesto > 0) {
      resultado = 'IMPUESTO A PAGAR';
      monto = impuesto;
    } else if (impuesto < 0) {
      resultado = 'CREDITO A FAVOR';
      monto = Math.abs(impuesto);
    } else {
      resultado = 'SIN IMPUESTO';
      monto = 0;
    }

    res.json({
      periodo: { mes: m, anio: a },
      ventas: {
        total: Number(ventas.total_ventas).toFixed(2),
        base_imponible: Number(ventas.base_ventas).toFixed(2),
        iva: Number(ventas.iva_ventas).toFixed(2),
        exento: Number(ventas.exento_ventas).toFixed(2),
        facturas: Number(ventas.num_facturas_ventas),
      },
      compras: {
        total: Number(compras.total_compras).toFixed(2),
        base_imponible: Number(compras.base_compras).toFixed(2),
        iva: Number(compras.iva_compras).toFixed(2),
        exento: Number(compras.exento_compras).toFixed(2),
        facturas: Number(compras.num_facturas_compras),
      },
      calculo: {
        debito_fiscal: Number(debitoFiscal.toFixed(2)),
        credito_fiscal: Number(creditoFiscal.toFixed(2)),
        resultado,
        monto: Number(monto.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('Error calculando SAT-2237:', error.message);
    res.status(500).json({ error: 'Error al calcular formulario SAT-2237' });
  }
});

router.get('/sat/resumen-cruce', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, mes, anio } = req.query;

    if (!mes || !anio) {
      res.status(400).json({ error: 'Parámetros mes y anio son requeridos' });
      return;
    }

    const m = Number(mes);
    const a = Number(anio);

    const salesResult = await pool.query(
      `SELECT COALESCE(SUM(iva), 0) as iva_libro_ventas
       FROM sales_book
       WHERE tenant_id = $1
         AND EXTRACT(MONTH FROM fecha) = $2
         AND EXTRACT(YEAR FROM fecha) = $3
         ${client_nit ? "AND client_nit = $4" : ""}`,
      client_nit ? [tenantId, m, a, client_nit] : [tenantId, m, a]
    );

    const purchasesResult = await pool.query(
      `SELECT COALESCE(SUM(iva), 0) as iva_libro_compras
       FROM purchases_book
       WHERE tenant_id = $1
         AND EXTRACT(MONTH FROM fecha) = $2
         AND EXTRACT(YEAR FROM fecha) = $3
         ${client_nit ? "AND client_nit = $4" : ""}`,
      client_nit ? [tenantId, m, a, client_nit] : [tenantId, m, a]
    );

    const mayorResult = await pool.query(
      `SELECT jel.codigo_cuenta, SUM(jel.debe) as total_debe, SUM(jel.haber) as total_haber
       FROM journal_entry_lines jel
       JOIN journal_entries je ON jel.journal_entry_id = je.id
       WHERE je.tenant_id = $1
         AND EXTRACT(MONTH FROM je.fecha) = $2
         AND EXTRACT(YEAR FROM je.fecha) = $3
         AND (jel.codigo_cuenta LIKE '212%' OR jel.codigo_cuenta LIKE '112%')
       GROUP BY jel.codigo_cuenta`,
      [tenantId, m, a]
    );

    const ivaLibroVentas = Number(salesResult.rows[0].iva_libro_ventas);
    const ivaLibroCompras = Number(purchasesResult.rows[0].iva_libro_compras);

    let ivaMayorVentas = 0;
    let ivaMayorCompras = 0;

    for (const row of mayorResult.rows) {
      const code = row.codigo_cuenta;
      if (code.startsWith('212')) {
        ivaMayorVentas += Number(row.total_haber) - Number(row.total_debe);
      } else if (code.startsWith('112')) {
        ivaMayorCompras += Number(row.total_debe) - Number(row.total_haber);
      }
    }

    const variacionVentas = Number((ivaLibroVentas - ivaMayorVentas).toFixed(2));
    const variacionCompras = Number((ivaLibroCompras - ivaMayorCompras).toFixed(2));

    res.json({
      periodo: { mes: m, anio: a },
      cruce_ventas: {
        iva_libro: Number(ivaLibroVentas.toFixed(2)),
        iva_mayor: Number(ivaMayorVentas.toFixed(2)),
        variacion: variacionVentas,
      },
      cruce_compras: {
        iva_libro: Number(ivaLibroCompras.toFixed(2)),
        iva_mayor: Number(ivaMayorCompras.toFixed(2)),
        variacion: variacionCompras,
      },
    });
  } catch (error: any) {
    console.error('Error calculando resumen cruce IVA:', error.message);
    res.status(500).json({ error: 'Error al calcular el resumen de cruce de IVA' });
  }
});

router.get('/sat/dashboard-fiscal', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, mes, anio } = req.query;

    if (!mes || !anio) {
      res.status(400).json({ error: 'Parámetros mes y anio son requeridos' });
      return;
    }

    const m = Number(mes);
    const a = Number(anio);

    const baseParams = client_nit ? [tenantId, m, a, client_nit] : [tenantId, m, a];
    const extraFilter = client_nit ? ' AND client_nit = $4' : '';

    const [salesResult, purchasesResult, mayorResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total), 0) as total, COALESCE(SUM(iva), 0) as iva,
                COUNT(*) as facturas
         FROM sales_book WHERE tenant_id = $1
         AND EXTRACT(MONTH FROM fecha) = $2 AND EXTRACT(YEAR FROM fecha) = $3${extraFilter}`,
        baseParams
      ),
      pool.query(
        `SELECT COALESCE(SUM(total), 0) as total, COALESCE(SUM(iva), 0) as iva,
                COUNT(*) as facturas
         FROM purchases_book WHERE tenant_id = $1
         AND EXTRACT(MONTH FROM fecha) = $2 AND EXTRACT(YEAR FROM fecha) = $3${extraFilter}`,
        baseParams
      ),
      pool.query(
        `SELECT jel.codigo_cuenta, SUM(jel.debe) as debe, SUM(jel.haber) as haber
         FROM journal_entry_lines jel
         JOIN journal_entries je ON jel.journal_entry_id = je.id
         WHERE je.tenant_id = $1
           AND EXTRACT(MONTH FROM je.fecha) = $2 AND EXTRACT(YEAR FROM je.fecha) = $3
           AND (jel.codigo_cuenta LIKE '41%' OR jel.codigo_cuenta LIKE '51%'
                OR jel.codigo_cuenta LIKE '212%')
         GROUP BY jel.codigo_cuenta`,
        [tenantId, m, a]
      ),
    ]);

    const ventas = salesResult.rows[0];
    const compras = purchasesResult.rows[0];

    let ingresosContables = 0;
    let gastosContables = 0;
    let ivaContable = 0;

    for (const row of mayorResult.rows) {
      const code = row.codigo_cuenta;
      if (code.startsWith('41')) {
        ingresosContables += Number(row.haber) - Number(row.debe);
      } else if (code.startsWith('51')) {
        gastosContables += Number(row.debe) - Number(row.haber);
      } else if (code.startsWith('212')) {
        ivaContable += Number(row.haber) - Number(row.debe);
      }
    }

    const debitoFiscal = Number(ventas.iva);
    const creditoFiscal = Number(compras.iva);
    const impuestoNeto = debitoFiscal - creditoFiscal;

    res.json({
      periodo: { mes: m, anio: a },
      resumen: {
        total_ventas: Number(ventas.total).toFixed(2),
        facturas_emitidas: Number(ventas.facturas),
        total_compras: Number(compras.total).toFixed(2),
        facturas_recibidas: Number(compras.facturas),
      },
      iva: {
        debito_fiscal: Number(debitoFiscal.toFixed(2)),
        credito_fiscal: Number(creditoFiscal.toFixed(2)),
        impuesto_neto: Number(impuestoNeto.toFixed(2)),
        estado: impuestoNeto > 0 ? 'A PAGAR' : impuestoNeto < 0 ? 'A FAVOR' : 'SIN MOVIMIENTO',
      },
      contable: {
        ingresos: Number(ingresosContables.toFixed(2)),
        gastos: Number(gastosContables.toFixed(2)),
        utilidad_contable: Number((ingresosContables - gastosContables).toFixed(2)),
        iva_contable: Number(ivaContable.toFixed(2)),
      },
      alertas: debitoFiscal > 0 && impuestoNeto > 0
        ? ['IMPUESTO A PAGAR: Debe presentar declaración SAT-2237']
        : [],
    });
  } catch (error: any) {
    console.error('Error generando dashboard fiscal:', error.message);
    res.status(500).json({ error: 'Error al generar el dashboard fiscal' });
  }
});

export default router;

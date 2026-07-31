import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { mes, anio, client_nit } = req.query;

    let query = 'SELECT * FROM sales_book WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let p = 2;

    if (mes) { query += ` AND EXTRACT(MONTH FROM fecha) = $${p++}`; params.push(Number(mes)); }
    if (anio) { query += ` AND EXTRACT(YEAR FROM fecha) = $${p++}`; params.push(Number(anio)); }
    if (client_nit) { query += ` AND client_nit = $${p++}`; params.push(client_nit); }

    query += ' ORDER BY fecha DESC LIMIT 200';

    const result = await pool.query(query, params);
    res.json({ ventas: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, fecha, numero_documento, serie, nit_cliente, nombre_cliente, tipo_documento, regimen, total, base_imponible, iva, exento } = req.body;

    const result = await pool.query(
      `INSERT INTO sales_book (tenant_id, client_nit, fecha, numero_documento, serie, nit_cliente, nombre_cliente, tipo_documento, regimen, total, base_imponible, iva, exento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [tenantId, client_nit, fecha, numero_documento, serie || 'FEL', nit_cliente || 'C/F', nombre_cliente || 'Consumidor Final', tipo_documento || 'FACTURA', regimen || 'GENERAL', total || 0, base_imponible || 0, iva || 0, exento || 0]
    );

    res.status(201).json({ venta: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

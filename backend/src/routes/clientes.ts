import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await pool.query(
      'SELECT * FROM tax_regime_config WHERE tenant_id = $1 ORDER BY client_nit',
      [tenantId]
    );
    res.json({ clientes: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { client_nit, regimen, nombre_empresa, nit_empresa, direccion } = req.body;

    if (!client_nit) {
      res.status(400).json({ error: 'NIT del cliente es requerido' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO tax_regime_config (tenant_id, client_nit, regimen, nombre_empresa, nit_empresa, direccion)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, client_nit) DO UPDATE SET regimen=$3, nombre_empresa=$4, nit_empresa=$5, direccion=$6
       RETURNING *`,
      [tenantId, client_nit, regimen || 'GENERAL', nombre_empresa || '', nit_empresa || client_nit, direccion || '']
    );

    res.status(201).json({ cliente: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:nit', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { nit } = req.params;
    await pool.query('DELETE FROM tax_regime_config WHERE tenant_id = $1 AND client_nit = $2', [tenantId, nit]);
    res.json({ message: 'Cliente eliminado' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

const SYSTEM_SUBDOMAINS = ['app', 'admin', 'contapro', 'www', 'api', 'localhost'];

export async function tenantResolver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const host = req.headers.host || '';
    const parts = host.split('.');
    const baseDomain = process.env.BASE_DOMAIN || 'totalappgt.online';

    let subdomain: string | null = null;

    if (host.includes(baseDomain) && parts.length >= 3) {
      subdomain = parts[0].toLowerCase();
    }

    if (subdomain && !SYSTEM_SUBDOMAINS.includes(subdomain)) {
      const result = await pool.query(
        'SELECT id, nombre, nit, subdomain, plan FROM tenants WHERE subdomain = $1',
        [subdomain]
      );

      if (result.rows.length > 0) {
        req.tenant = result.rows[0];
      }
    }

    next();
  } catch (error: any) {
    console.error('Error en tenant resolver:', error.message);
    next();
  }
}

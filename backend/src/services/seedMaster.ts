import pool from '../db/pool';
import bcrypt from 'bcryptjs';

export async function seedMasterTenant(): Promise<void> {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT id FROM tenants WHERE subdomain = 'admin'");
    if (existing.rows.length > 0) {
      console.log('Master tenant ya existe, omitiendo seed.');
      return;
    }

    await client.query('BEGIN');

    const tenantResult = await client.query(
      `INSERT INTO tenants (nombre, nit, email, subdomain, plan, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['ContaPro Admin', '0000000-0', 'totalappgt@gmail.com', 'admin', 'empresarial', 'activo']
    );
    const tenantId = tenantResult.rows[0].id;

    const passwordHash = await bcrypt.hash('admintotal', 12);

    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, nombre, rol)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, 'totalappgt@gmail.com', passwordHash, 'Administrador', 'owner']
    );

    await client.query('SELECT copiar_catalogo_tenant($1)', [tenantId]);

    await client.query(
      `INSERT INTO subscriptions (tenant_id, plan, estado, monto, periodo_inicio, periodo_fin)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '100 years')`,
      [tenantId, 'empresarial', 'activo', 0]
    );

    await client.query('COMMIT');
    console.log('Master tenant creado: totalappgt@gmail.com / admintotal');
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error en seed master:', error.message);
  } finally {
    client.release();
  }
}

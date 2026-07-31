import pool from '../db/pool';

export async function seedChartOfAccounts(tenantId: string): Promise<void> {
  try {
    await pool.query('SELECT copiar_catalogo_tenant($1)', [tenantId]);
    console.log(`Catálogo de cuentas copiado para tenant ${tenantId}`);
  } catch (error: any) {
    console.error('Error copiando catálogo:', error.message);
  }
}

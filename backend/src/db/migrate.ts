import fs from 'fs';
import path from 'path';
import pool from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Ejecutando migración...');
    await client.query(sql);
    console.log('Migración completada exitosamente.');
  } catch (error: any) {
    console.error('Error ejecutando migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));

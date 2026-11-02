import pg from 'pg';

const connectionString = 'postgresql://daom_web_postgres_user:FKtfpfUzHLbYxX9XxBzSTLsimxEtQjKQ@dpg-dbijce5g1s2s73ddqts0-a.ohio-postgres.render.com:5432/daom_learning';

async function main() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = [
    'roles', 'users', 'profiles', 'modalities', 'instructors', 'trainings',
    'training_instructors', 'training_editions', 'prices', 'enrollments',
    'payment_records', 'material_assets', 'material_entitlements', 'attendance_records',
    'certificates', 'integration_events', 'sync_runs', 'audit_logs', 'faqs',
    'site_configs', 'editorial_controls'
  ];

  console.log('--- RECUENTO DE FILAS EN POSTGRESQL DAOM_LEARNING ---');
  for (const t of tables) {
    const res = await client.query(`SELECT count(*) as cnt FROM ${t}`);
    console.log(`Tabla: ${t.padEnd(25)} | Filas: ${res.rows[0].cnt}`);
  }

  await client.end();
}

main().catch(console.error);

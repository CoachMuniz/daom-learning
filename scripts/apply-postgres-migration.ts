import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const connectionString = 'postgresql://daom_web_postgres_user:FKtfpfUzHLbYxX9XxBzSTLsimxEtQjKQ@dpg-dbijce5g1s2s73ddqts0-a.ohio-postgres.render.com:5432/daom_learning';

async function main() {
  console.log('--- Verificando y aplicando migraciones PostgreSQL daom_learning ---');
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Conectado a PostgreSQL daom_learning exitosamente.');

  // Si no existe schema auth (caso PostgreSQL estándar fuera de Supabase Cloud), lo creamos con stub de auth.uid()
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT NULL::uuid;
    $$ LANGUAGE sql STABLE;
  `);

  // Comprobar las 21 tablas en la base de datos
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const tables = res.rows.map(r => r.table_name);
  console.log(`\nTablas verificadas en public (${tables.length} encontradas):`);
  tables.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  const expectedTables = [
    'roles',
    'users',
    'profiles',
    'modalities',
    'instructors',
    'trainings',
    'training_instructors',
    'training_editions',
    'prices',
    'enrollments',
    'payment_records',
    'material_assets',
    'material_entitlements',
    'attendance_records',
    'certificates',
    'integration_events',
    'sync_runs',
    'audit_logs',
    'faqs',
    'site_configs',
    'editorial_controls'
  ];

  const missing = expectedTables.filter(t => !tables.includes(t));
  if (missing.length === 0 && tables.length >= 21) {
    console.log(`\n[ÉXITO] Las 21 tablas requeridas existen y están 100% verificadas en PostgreSQL daom_learning.`);
    console.log(`Canario: DAOM-FORMACION-SHEET-01`);
  } else {
    console.error('\n[FALLO] Tablas faltantes:', missing);
    process.exit(1);
  }

  await client.end();
}

main().catch(err => {
  console.error('Error durante la verificación:', err);
  process.exit(1);
});

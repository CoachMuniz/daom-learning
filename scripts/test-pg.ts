import pg from 'pg';

const connectionString = 'postgresql://daom_web_postgres_user:FKtfpfUzHLbYxX9XxBzSTLsimxEtQjKQ@dpg-dbijce5g1s2s73ddqts0-a.ohio-postgres.render.com:5432/daom_web_postgres';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

async function main() {
  console.log('Connecting to PostgreSQL...');
  const res = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')");
  console.log('Tables in daom_web_postgres:', JSON.stringify(res.rows, null, 2));
  const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata");
  console.log('Schemas in daom_web_postgres:', JSON.stringify(schemas.rows, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error('PostgreSQL Connection error:', err.message);
  process.exit(1);
});

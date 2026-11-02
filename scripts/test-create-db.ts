import pg from 'pg';

const connectionString = 'postgresql://daom_web_postgres_user:FKtfpfUzHLbYxX9XxBzSTLsimxEtQjKQ@dpg-dbijce5g1s2s73ddqts0-a.ohio-postgres.render.com:5432/daom_web_postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to Render PostgreSQL!');

  // Check existing databases
  const dbs = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
  console.log('Databases on server:', dbs.rows.map(r => r.datname));

  // Try creating database daom_learning if it does not exist
  const hasLearningDb = dbs.rows.some(r => r.datname === 'daom_learning');
  if (!hasLearningDb) {
    try {
      await client.query('CREATE DATABASE daom_learning;');
      console.log('Successfully created database daom_learning!');
    } catch (err: any) {
      console.log('Could not create database daom_learning (might lack CREATEDB privilege):', err.message);
    }
  } else {
    console.log('Database daom_learning already exists!');
  }

  // Also test schema creation
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS daom_learning;');
    console.log('Successfully created or verified schema daom_learning!');
  } catch (err: any) {
    console.log('Could not create schema daom_learning:', err.message);
  }

  await client.end();
}

main().catch(console.error);

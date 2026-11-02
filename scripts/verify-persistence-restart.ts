import { execSync } from 'node:child_process';
import pg from 'pg';

const BASE_URL = 'https://daom-learning.onrender.com';
const SERVICE_ID = 'srv-dbkhiv142hec73cl0d40';
const PG_CONN = 'postgresql://daom_web_postgres_user:FKtfpfUzHLbYxX9XxBzSTLsimxEtQjKQ@dpg-dbijce5g1s2s73ddqts0-a.ohio-postgres.render.com:5432/daom_learning';

async function queryCounts() {
  const client = new pg.Client({ connectionString: PG_CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const resUsers = await client.query('SELECT count(*) as cnt FROM users;');
  const resSyncs = await client.query('SELECT count(*) as cnt FROM sync_runs;');
  const resTrainings = await client.query('SELECT count(*) as cnt FROM trainings;');
  const recentUser = await client.query("SELECT email, full_name, created_at FROM users WHERE role = 'PARTICIPANT' ORDER BY created_at DESC LIMIT 1;");
  await client.end();
  return {
    users: parseInt(resUsers.rows[0].cnt, 10),
    syncs: parseInt(resSyncs.rows[0].cnt, 10),
    trainings: parseInt(resTrainings.rows[0].cnt, 10),
    recentUser: recentUser.rows[0] || null,
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('==============================================================================');
  console.log('PRUEBA DE PERSISTENCIA Y REINICIO DE SERVICIO — DAOM LEARNING');
  console.log('Canario: DAOM-FORMACION-SHEET-01');
  console.log('==============================================================================\n');

  // 1. Datos antes del reinicio
  console.log('1. Consultando datos y usuarios antes del reinicio...');
  const before = await queryCounts();
  console.log(`  Usuarios registrados: ${before.users}`);
  console.log(`  Capacitaciones sincronizadas: ${before.trainings}`);
  console.log(`  Historial de sincronizaciones: ${before.syncs}`);
  if (before.recentUser) {
    console.log(`  Último estudiante registrado: ${before.recentUser.email} (${before.recentUser.full_name})`);
  }

  // 2. Reiniciar el servicio en Render
  console.log('\n2. Ejecutando reinicio del servicio web en Render...');
  const restartCmd = `C:\\Users\\matia\\.render\\bin\\render.exe restart ${SERVICE_ID} --confirm`;
  const restartOutput = execSync(restartCmd, { encoding: 'utf-8' });
  console.log('  Comando de reinicio ejecutado:', restartOutput.trim());

  // 3. Esperar que el servicio reinicie y responda HTTP 200
  console.log('\n3. Esperando que el servicio reinicie y responda en vivo...');
  let isUp = false;
  for (let i = 1; i <= 30; i++) {
    await sleep(2000);
    try {
      const res = await fetch(`${BASE_URL}/`, { method: 'GET' });
      if (res.status === 200) {
        console.log(`  Servicio activo y respondiendo HTTP 200 tras ${i * 2} segundos.`);
        isUp = true;
        break;
      }
    } catch {
      // transient network wait
    }
  }

  if (!isUp) {
    throw new Error('El servicio no respondió después del reinicio.');
  }

  // 4. Verificar persistencia de datos en PostgreSQL después del reinicio
  console.log('\n4. Verificando persistencia de datos en PostgreSQL tras el reinicio...');
  const after = await queryCounts();
  console.log(`  Usuarios tras reinicio: ${after.users} (Antes: ${before.users})`);
  console.log(`  Capacitaciones tras reinicio: ${after.trainings} (Antes: ${before.trainings})`);
  console.log(`  Historial sincronizaciones tras reinicio: ${after.syncs} (Antes: ${before.syncs})`);

  if (after.users !== before.users || after.trainings !== before.trainings || after.syncs !== before.syncs) {
    throw new Error('Fallo de persistencia: los conteos de datos difieren tras el reinicio.');
  }

  // 5. Verificar que el usuario registrado puede autenticarse post-reinicio
  if (before.recentUser) {
    console.log(`\n5. Verificando login post-reinicio con usuario persistido (${before.recentUser.email})...`);
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: before.recentUser.email,
        password: 'AtletaDaom2026!Secure'
      })
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    if (loginRes.status === 200 && loginJson.success) {
      console.log(`  [HTTP 200] Login post-reinicio exitoso: Sesión iniciada como ${loginJson.user.email}`);
    } else {
      throw new Error(`Fallo en login post-reinicio: ${JSON.stringify(loginJson)}`);
    }
  }

  // 6. Verificar persistencia del Administrador
  console.log('\n6. Verificando login post-reinicio con Administrador persistido...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@daom-weightlifting.com',
      password: 'DaomLearning2026!Secure'
    })
  });
  const adminLoginJson = await adminLoginRes.json().catch(() => ({}));
  if (adminLoginRes.status === 200 && adminLoginJson.success) {
    console.log(`  [HTTP 200] Login admin post-reinicio exitoso: ${adminLoginJson.user.email} (Rol: ${adminLoginJson.user.role})`);
  } else {
    throw new Error(`Fallo en login admin post-reinicio: ${JSON.stringify(adminLoginJson)}`);
  }

  console.log('\n==============================================================================');
  console.log('[ÉXITO] PERSISTENCIA POST-REINICIO COMPROBADA SATISFACTORIAMENTE (100%).');
  console.log('Canario: DAOM-FORMACION-SHEET-01');
  console.log('==============================================================================');
}

main().catch(err => {
  console.error('Error durante la verificación de persistencia:', err);
  process.exit(1);
});

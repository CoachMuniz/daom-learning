/**
 * Verificación Real HTTP de Despliegue en Render
 * Canario: DAOM-FORMACION-SHEET-01
 * URL Destino: https://daom-learning.onrender.com
 */

const BASE_URL = "https://daom-learning.onrender.com";

interface CheckResult {
  step: string;
  url: string;
  status: number;
  ok: boolean;
  notes: string;
}

const results: CheckResult[] = [];

async function checkGet(path: string, description: string, expectedStatus = 200, headers: Record<string, string> = {}): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { headers });
  const ok = res.status === expectedStatus;
  results.push({
    step: description,
    url,
    status: res.status,
    ok,
    notes: ok ? "OK" : `Esperado ${expectedStatus}, recibido ${res.status}`
  });
  return res;
}

async function main() {
  console.log(`==============================================================================`);
  console.log(`VERIFICACIÓN HTTP REAL EN VIVO — DAOM LEARNING`);
  console.log(`Canario: DAOM-FORMACION-SHEET-01`);
  console.log(`URL Base: ${BASE_URL}`);
  console.log(`==============================================================================\n`);

  // 1. Verificación de Rutas Públicas
  console.log(`1. Verificando Páginas Públicas...`);
  const publicRoutes = [
    { path: "/", desc: "Inicio (Home)" },
    { path: "/catalogo", desc: "Catálogo de Capacitaciones" },
    { path: "/docentes", desc: "Perfiles Docentes" },
    { path: "/faq", desc: "Preguntas Frecuentes" },
    { path: "/institucional", desc: "Institucional / Club DAOM" },
    { path: "/contacto", desc: "Página de Contacto" },
    { path: "/legal/terminos", desc: "Términos y Condiciones" },
    { path: "/legal/privacidad", desc: "Política de Privacidad" },
    { path: "/legal/politica-comercial", desc: "Política Comercial" },
    { path: "/legal/cambios-modalidad", desc: "Información Cambios de Modalidad" },
    { path: "/api/v1/bot/openapi", desc: "Especificación OpenAPI 3.1 del Bot" },
    { path: "/robots.txt", desc: "Directivas robots.txt" },
    { path: "/sitemap.xml", desc: "Sitemap XML" },
  ];

  for (const r of publicRoutes) {
    const res = await checkGet(r.path, r.desc);
    console.log(`  [HTTP ${res.status}] ${r.desc} -> ${r.path}`);
  }

  // 2. Autenticación Administrador
  console.log(`\n2. Verificando Autenticación de Administrador...`);
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@daom-weightlifting.com",
      password: "DaomLearning2026!Secure",
    }),
  });

  const adminLoginJson = await adminLoginRes.json().catch(() => ({}));
  const adminCookieHeader = adminLoginRes.headers.get("set-cookie") || "";
  const adminOk = adminLoginRes.status === 200 && adminLoginJson.success;
  results.push({
    step: "Login Administrador",
    url: `${BASE_URL}/api/auth/login`,
    status: adminLoginRes.status,
    ok: adminOk,
    notes: adminOk ? `Usuario: ${adminLoginJson.user?.email}, Rol: ${adminLoginJson.user?.role}` : `Fallo: ${JSON.stringify(adminLoginJson)}`
  });
  console.log(`  [HTTP ${adminLoginRes.status}] Login Admin: ${adminOk ? 'ÉXITO' : 'FALLO'} (${adminLoginJson.user?.email || 'N/A'})`);

  // Extraer token de cookie para peticiones autenticadas
  let cookieVal = "";
  if (adminCookieHeader) {
    const match = adminCookieHeader.match(/daom_session=([^;]+)/);
    if (match) cookieVal = `daom_session=${match[1]}`;
  }

  // 3. Verificando Acceso al Panel de Administración con Sesión
  console.log(`\n3. Verificando Acceso a Administración (/admin)...`);
  const adminPageRes = await checkGet("/admin", "Panel de Administración", 200, {
    Cookie: cookieVal
  });
  const adminHtml = await adminPageRes.text();
  const containsAdminContent = adminHtml.includes("Panel de Administración") || adminHtml.includes("DAOM Learning");
  console.log(`  [HTTP ${adminPageRes.status}] Panel Admin con sesión: ${containsAdminContent ? 'ÉXITO' : 'FALLO'}`);

  // 4. Verificación de Sincronización en Vivo con Google Sheets
  console.log(`\n4. Verificando Sincronización en Vivo de Google Sheets vía API...`);
  const syncRes = await fetch(`${BASE_URL}/api/sync/sheets`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer daom_sync_trigger_secret_token_2026",
      "Content-Type": "application/json"
    }
  });
  const syncJson = await syncRes.json().catch(() => ({}));
  const report = syncJson.report || syncJson;
  const syncOk = syncRes.status === 200 && (syncJson.success || report.status === "success");
  results.push({
    step: "Sincronización en vivo Google Sheets (POST /api/sync/sheets)",
    url: `${BASE_URL}/api/sync/sheets`,
    status: syncRes.status,
    ok: syncOk,
    notes: syncOk ? `Leídos: ${report.recordsRead}, Sincronizados: ${report.recordsSynced}, Duración: ${report.durationMs}ms` : `Fallo: ${JSON.stringify(syncJson)}`
  });
  console.log(`  [HTTP ${syncRes.status}] Sync Sheets: ${syncOk ? 'ÉXITO' : 'FALLO'} (Leídos: ${report.recordsRead}, Sincronizados: ${report.recordsSynced})`);

  // 5. Registro y Flujo de Estudiante Nuevo
  console.log(`\n5. Verificando Registro de Estudiante Nuevo...`);
  const testStudentEmail = `atleta_${Date.now()}@daom-weightlifting.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testStudentEmail,
      password: "AtletaDaom2026!Secure",
      fullName: "Atleta Verificación Live",
      country: "AR"
    })
  });
  const registerJson = await registerRes.json().catch(() => ({}));
  const registerOk = registerRes.status === 201 && registerJson.success;
  results.push({
    step: "Registro de Nuevo Estudiante",
    url: `${BASE_URL}/api/auth/register`,
    status: registerRes.status,
    ok: registerOk,
    notes: registerOk ? `Estudiante registrado: ${registerJson.user?.email}` : `Fallo: ${JSON.stringify(registerJson)}`
  });
  console.log(`  [HTTP ${registerRes.status}] Registro Alumno: ${registerOk ? 'ÉXITO' : 'FALLO'} (${testStudentEmail})`);

  // 6. Resumen de Verificaciones
  console.log(`\n==============================================================================`);
  console.log(`RESUMEN DE PRUEBAS HTTP REALES:`);
  let allPassed = true;
  for (const r of results) {
    const symbol = r.ok ? "✓" : "✗";
    console.log(`  ${symbol} [HTTP ${r.status}] ${r.step}: ${r.notes}`);
    if (!r.ok) allPassed = false;
  }
  console.log(`==============================================================================`);
  if (allPassed) {
    console.log(`RESULTADO GLOBAL: TODAS LAS PRUEBAS HTTP EN VIVO PASARON SATISFACTORIAMENTE (100%).`);
  } else {
    console.error(`RESULTADO GLOBAL: HUBO PRUEBAS FALLIDAS.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error en pruebas en vivo:", err);
  process.exit(1);
});

import { getDatabase } from "../src/lib/db/client";
import { createUser, findUserByEmail } from "../src/lib/db/repository";
import { hashPassword } from "../src/lib/auth/passwords";
import { syncGoogleSheetsCatalog } from "../src/lib/sheets/sync";

async function seed() {
  console.log("Iniciando sembrado inicial de DAOM Learning...");
  const db = getDatabase();

  // 1. Sincronizar catálogo real desde Google Sheets
  console.log("Sincronizando catálogo en vivo desde Google Sheets...");
  try {
    const report = await syncGoogleSheetsCatalog({ triggeredBy: "seed_script" });
    console.log(`Sincronización finalizada. Estado: ${report.status}. Registros leídos: ${report.recordsRead}, sincronizados: ${report.recordsSynced}`);
  } catch (err: any) {
    console.warn("Aviso: no se pudo sincronizar Google Sheets en el seed:", err.message);
  }

  // 2. Crear usuario Administrador si no existe
  const adminEmail = process.env.ADMIN_EMAIL || "admin@daom-weightlifting.com";
  const existingAdmin = await findUserByEmail(adminEmail);
  if (!existingAdmin) {
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || "DaomLearning2026!Secure";
    const hash = await hashPassword(adminPass);
    await createUser({
      email: adminEmail,
      passwordHash: hash,
      fullName: "Administrador DAOM Learning",
      role: "ADMIN",
      country: "AR",
    });
    console.log(`Usuario Administrador sembrado: ${adminEmail}`);
  } else {
    console.log(`Usuario Administrador ya existe: ${adminEmail}`);
  }

  // 3. Crear usuario Alumno de prueba si no existe
  const testStudentEmail = "alumno@daom-weightlifting.com";
  const existingStudent = await findUserByEmail(testStudentEmail);
  if (!existingStudent) {
    const studentPass = "AlumnoDaom2026!Secure";
    const hash = await hashPassword(studentPass);
    await createUser({
      email: testStudentEmail,
      passwordHash: hash,
      fullName: "Atleta Alumno Prueba",
      role: "PARTICIPANT",
      country: "AR",
    });
    console.log(`Usuario Alumno de prueba sembrado: ${testStudentEmail}`);
  }

  console.log("Sembrado finalizado exitosamente. Canario: DAOM-FORMACION-SHEET-01");
  await db.close();
}

seed().catch((err) => {
  console.error("Error en el proceso de seed:", err);
  process.exit(1);
});

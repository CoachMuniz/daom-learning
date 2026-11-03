import { getDatabase } from "../src/lib/db/client";

async function clean() {
  const db = getDatabase();
  const canonicalIds = [
    "SEM-SQUATS",
    "SEM-SNATCH",
    "SEM-CLEAN",
    "SEM-JERK",
    "SEM-PLANIFICACION",
    "SEM-BIOMECANICA",
    "CLI-4EN1",
    "WOR-INSTITUCIONAL",
    "TUT-KINOVEA",
    "TUT-ARBITRAJE"
  ];
  const placeholders = canonicalIds.map(() => "?").join(",");

  await db.run(`PRAGMA foreign_keys = OFF`);
  await db.run(`DELETE FROM material_entitlements WHERE enrollment_id IN (SELECT id FROM enrollments WHERE capacitacion_id NOT IN (${placeholders}))`, canonicalIds);
  await db.run(`DELETE FROM material_assets WHERE capacitacion_id NOT IN (${placeholders})`, canonicalIds);
  await db.run(`DELETE FROM payment_records WHERE enrollment_id IN (SELECT id FROM enrollments WHERE capacitacion_id NOT IN (${placeholders}))`, canonicalIds);
  await db.run(`DELETE FROM enrollments WHERE capacitacion_id NOT IN (${placeholders})`, canonicalIds);
  await db.run(`DELETE FROM prices WHERE oferta_id NOT IN (SELECT oferta_id FROM training_editions WHERE capacitacion_id IN (${placeholders}))`);
  await db.run(`DELETE FROM training_instructors WHERE capacitacion_id NOT IN (${placeholders})`, canonicalIds);
  await db.run(`DELETE FROM training_editions WHERE capacitacion_id NOT IN (${placeholders})`, canonicalIds);
  await db.run(`DELETE FROM faqs WHERE capacitacion_id IS NOT NULL AND capacitacion_id NOT IN (${placeholders})`, canonicalIds);
  await db.run(`DELETE FROM trainings WHERE capacitacion_id NOT IN (${placeholders})`, canonicalIds);
  await db.run(`PRAGMA foreign_keys = ON`);

  console.log("Cleaned all non-canonical test fixture rows and cascaded children from SQLite.");
}

clean().catch(console.error);

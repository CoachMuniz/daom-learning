import fs from "node:fs";
import path from "node:path";
import { getDatabase } from "../src/lib/db/client";

async function run() {
  console.log("Ejecutando migraciones de base de datos...");
  const db = getDatabase();
  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  await db.exec(sql);
  console.log("Migraciones aplicadas con éxito. Canario: DAOM-FORMACION-SHEET-01");
  await db.close();
}

run().catch((err) => {
  console.error("Error al aplicar migraciones:", err);
  process.exit(1);
});

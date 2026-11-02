import { syncGoogleSheetsCatalog } from "../src/lib/sheets/sync";

async function main() {
  console.log("Iniciando sincronización manual con Google Sheets...");
  try {
    const report = await syncGoogleSheetsCatalog({ triggeredBy: "cli_manual" });
    console.log("Resultado de la sincronización:", JSON.stringify(report, null, 2));
  } catch (err) {
    console.error("Fallo crítico en la sincronización:", err);
    process.exit(1);
  }
}

main();

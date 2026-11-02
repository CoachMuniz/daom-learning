/**
 * DAOM Learning — Parser Robusto de CSV para Google Sheets
 * Canario: DAOM-FORMACION-SHEET-01
 *
 * Cumple con RFC 4180 para campos entrecomillados, comas internas,
 * saltos de línea dentro de campos y comillas escapadas ("").
 */

export function parseCsv(csvText: string): Record<string, string>[] {
  const cleanText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!cleanText) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Comilla escapada ""
          currentField += '"';
          i++; // Saltear la segunda comilla
        } else {
          // Fin de comillas
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
  const records: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Ignorar filas totalmente vacías
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      const rawVal = row[c] ?? "";
      record[header] = rawVal.replace(/^"|"$/g, "").trim();
    }
    records.push(record);
  }

  return records;
}

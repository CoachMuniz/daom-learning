/**
 * DAOM Learning — Script Administrativo Local de Recuperación de Administrador
 * Canario: DAOM-LEARNING-ADMIN-RECOVERY-01
 *
 * Emite de forma segura un enlace temporal de recuperación de contraseña para el Administrador,
 * sin alterar contraseñas directamente en la base de datos, sin eliminar datos ni exponer secretos.
 *
 * Uso:
 *   npx tsx scripts/issue-admin-recovery.ts [email_o_userId]
 */

import { issuePasswordRecoveryToken } from "../src/lib/auth/passwords";
import { getDatabase } from "../src/lib/db/client";

async function main() {
  const target = process.argv[2] || "daom.weightlifting@gmail.com";
  console.log(`[DAOM Learning] Generando token de recuperación administrativa para: ${target}...`);

  const db = getDatabase();
  const user = await db.get<any>(
    `SELECT id, email, full_name, role FROM users WHERE (id = ? OR LOWER(email) = LOWER(?)) AND role = 'ADMIN' LIMIT 1`,
    [target, target]
  );

  if (!user) {
    console.error(`[Error] No se encontró un administrador activo con ID o email: '${target}'`);
    process.exit(1);
  }

  const issued = await issuePasswordRecoveryToken({
    userId: user.id,
    ttlMinutes: 30,
    createdBy: "LOCAL_ADMIN_CLI",
  });

  const baseUrl = process.env.APP_URL || "https://learning.daom-weightlifting.com";
  const recoveryUrl = `${baseUrl}/recuperar-password?token=${issued.token}&email=${encodeURIComponent(user.email)}`;

  console.log("==================================================================");
  console.log("   DAOM LEARNING — ENLACE SEGURO DE RECUPERACIÓN ADMINISTRATIVA   ");
  console.log("==================================================================");
  console.log(`Administrador: ${user.full_name} (${user.email})`);
  console.log(`ID Usuario:    ${user.id}`);
  console.log(`Token ID:      ${issued.tokenId}`);
  console.log(`Válido hasta:  ${issued.expiresAt} (30 minutos)`);
  console.log("\nEnlace de restablecimiento seguro:");
  console.log(recoveryUrl);
  console.log("==================================================================");
  console.log("Instrucciones: Ingrese al enlace anterior en su navegador para definir su nueva contraseña.");
}

main().catch((err) => {
  console.error("[Fatal Error]", err);
  process.exit(1);
});

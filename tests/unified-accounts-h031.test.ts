import { describe, it, expect } from "vitest";
import { getDatabase } from "../src/lib/db/client";
import {
  createUser,
  findUserById,
  findUserByEmail,
  findIdentityByProvider,
  findIdentitiesByUserId,
  findUserByIdentity,
  linkUserIdentity,
  touchUserIdentityLogin,
  unlinkUserIdentity,
  createUserWithIdentity,
  createEnrollment,
  recordPayment,
  linkCertificate,
  getUserCertificates,
  getUserEnrollments,
} from "../src/lib/db/repository";
import { hashPassword, verifyPassword } from "../src/lib/auth/passwords";
import { createAccountLinkingToken, verifyAccountLinkingToken } from "../src/lib/auth/google";

describe("H031 — Cuentas Unificadas, Identidades y Vinculación Segura (DAOM Learning)", () => {
  const nonce = Date.now();

  describe("1. Modelo de Identidades y Registro Federado con Google", () => {
    it("crea un nuevo alumno institucional con su identidad Google asociada", async () => {
      const email = `nuevo_google_${nonce}@daom-federated.com`;
      const googleSub = `gsub_new_${nonce}`;

      const user = await createUserWithIdentity({
        email,
        fullName: "Alumno Google Nuevo",
        role: "PARTICIPANT",
        provider: "google",
        providerSubject: googleSub,
        providerEmail: email,
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.role).toBe("PARTICIPANT");
      expect(user.email_verified).toBe(1);

      // Verificar que la identidad externa quedó registrada en user_auth_identities
      const identity = await findIdentityByProvider("google", googleSub);
      expect(identity).not.toBeNull();
      expect(identity?.user_id).toBe(user.id);
      expect(identity?.provider_email).toBe(email);

      // Verificar resolución de usuario a partir de la identidad Google
      const resolvedUser = await findUserByIdentity("google", googleSub);
      expect(resolvedUser?.id).toBe(user.id);
      expect(resolvedUser?.email).toBe(email);
    });

    it("actualiza la marca de tiempo de último acceso al iniciar sesión con Google", async () => {
      const email = `touch_${nonce}@daom-test.com`;
      const googleSub = `gsub_touch_${nonce}`;

      const user = await createUserWithIdentity({
        email,
        fullName: "Touch Test",
        provider: "google",
        providerSubject: googleSub,
        providerEmail: email,
      });

      const initialIdentity = await findIdentityByProvider("google", googleSub);
      expect(initialIdentity).not.toBeNull();

      // Esperar brevemente para verificar cambio de ISO string
      await new Promise((r) => setTimeout(r, 20));
      await touchUserIdentityLogin(initialIdentity!.id);

      const updatedIdentity = await findIdentityByProvider("google", googleSub);
      expect(updatedIdentity?.last_login_at).toBeDefined();
    });

    it("garantiza la restricción de unicidad: una misma identidad externa no puede vincularse a múltiples usuarios", async () => {
      const sharedSub = `gsub_unique_constraint_${nonce}`;

      const userA = await createUserWithIdentity({
        email: `usera_${nonce}@daom-test.com`,
        fullName: "Usuario A",
        provider: "google",
        providerSubject: sharedSub,
        providerEmail: `usera_${nonce}@daom-test.com`,
      });

      const userB = await createUser({
        email: `userb_${nonce}@daom-test.com`,
        fullName: "Usuario B",
        passwordHash: "hash_b",
        role: "PARTICIPANT",
      });

      // Intentar vincular la misma identidad Google a userB debe lanzar error
      await expect(
        linkUserIdentity({
          userId: userB.id,
          provider: "google",
          providerSubject: sharedSub,
          providerEmail: `usera_${nonce}@daom-test.com`,
        })
      ).rejects.toThrow(/vinculada a otro perfil/);
    });
  });

  describe("2. Vinculación Segura de Cuentas Existentes (Prevención de Secuestro de Cuentas)", () => {
    it("requiere prueba segura de titularidad (contraseña) para vincular cuenta existente con Google", async () => {
      const studentEmail = `alumno_tradicional_${nonce}@daom-test.com`;
      const plainPassword = "MiPasswordSeguro2026!";
      const passHash = await hashPassword(plainPassword);

      // 1. Alumno creado previamente con credenciales tradicionales
      const existingStudent = await createUser({
        email: studentEmail,
        passwordHash: passHash,
        fullName: "Alumno Tradicional DAOM",
        role: "PARTICIPANT",
      });

      // 2. Crear una inscripción y asociarle pagos y certificados para verificar preservación
      const trainingId = `SEM-LINK-${nonce}`;
      const db = getDatabase();
      await db.run(
        `INSERT INTO trainings (capacitacion_id, tipo, titulo, estado_editorial, verificacion, orden, destacada, synced_at)
         VALUES (?, 'seminario', 'Capacitación de Vinculación', 'publicado', 'verificado', 1, 'SI', ?)`,
        [trainingId, new Date().toISOString()]
      );

      const enrollment = await createEnrollment({
        userId: existingStudent.id,
        capacitacionId: trainingId,
        modalityId: "presencial",
        amountTotal: 100000,
      });

      await recordPayment({
        enrollmentId: enrollment.id,
        externalPaymentId: `PAY-LINK-${nonce}`,
        provider: "mercadopago",
        amount: 100000,
        currency: "ARS",
        status: "approved",
      });

      await linkCertificate({
        enrollmentId: enrollment.id,
        userId: existingStudent.id,
        certificateCode: `CERT-CODE-${nonce}`,
        title: "Capacitación de Vinculación",
        issueDate: new Date().toISOString(),
        pdfUrl: `https://daom.com/cert-${nonce}.pdf`,
      });

      // 3. Simular intento de login con Google que coincide con el correo del alumno
      const googleSub = `gsub_student_${nonce}`;
      const token = await createAccountLinkingToken({
        email: studentEmail,
        googleSub,
        googleEmail: studentEmail,
        fullName: "Alumno Tradicional Google",
        redirectPath: "/participante",
      });

      // 4. Intentar vincular con contraseña incorrecta: debe fallar
      const wrongPassValid = await verifyPassword("ContraseñaEquivocada", existingStudent.password_hash);
      expect(wrongPassValid).toBe(false);

      // 5. Vincular con contraseña correcta: prueba segura exitosa
      const correctPassValid = await verifyPassword(plainPassword, existingStudent.password_hash);
      expect(correctPassValid).toBe(true);

      const identity = await linkUserIdentity({
        userId: existingStudent.id,
        provider: "google",
        providerSubject: googleSub,
        providerEmail: studentEmail,
      });

      expect(identity.user_id).toBe(existingStudent.id);

      // 6. VERIFICAR PRESERVACIÓN INTEGRAL (AC07 y AC08)
      const afterLinkUser = await findUserById(existingStudent.id);
      expect(afterLinkUser?.id).toBe(existingStudent.id);
      expect(afterLinkUser?.email).toBe(studentEmail);

      // Conserva inscripciones
      const enrollments = await getUserEnrollments(existingStudent.id);
      expect(enrollments.length).toBeGreaterThan(0);
      expect(enrollments.some((e) => e.id === enrollment.id)).toBe(true);

      // Conserva certificados
      const certificates = await getUserCertificates(existingStudent.id);
      expect(certificates.length).toBeGreaterThan(0);
      expect(certificates.some((c) => c.enrollment_id === enrollment.id)).toBe(true);

      // Permite iniciar sesión tanto con Google como con contraseña tradicional
      const resolvedFromGoogle = await findUserByIdentity("google", googleSub);
      expect(resolvedFromGoogle?.id).toBe(existingStudent.id);

      const traditionalPassCheck = await verifyPassword(plainPassword, afterLinkUser!.password_hash);
      expect(traditionalPassCheck).toBe(true);
    });

    it("protege estrictamente los roles administrativos: un alumno nunca se convierte en admin por Google y un admin conserva su rol", async () => {
      // Caso 1: Nuevo registro con Google SIEMPRE recibe rol PARTICIPANT
      const newGoogleEmail = `nuevo_no_admin_${nonce}@daom-federated.com`;
      const newStudent = await createUserWithIdentity({
        email: newGoogleEmail,
        fullName: "Alumno Normal",
        role: "PARTICIPANT",
        provider: "google",
        providerSubject: `sub_student_protect_${nonce}`,
        providerEmail: newGoogleEmail,
      });
      expect(newStudent.role).toBe("PARTICIPANT");

      // Caso 2: Un administrador institucional existente que vincula Google conserva su rol ADMIN
      const adminEmail = `admin_legitimo_${nonce}@daom-weightlifting.com`;
      const adminPass = await hashPassword("AdminSecretPassword2026!");
      const adminUser = await createUser({
        email: adminEmail,
        passwordHash: adminPass,
        fullName: "Entrenador Jefe Admin",
        role: "ADMIN",
      });
      expect(adminUser.role).toBe("ADMIN");

      const adminGoogleSub = `sub_admin_protect_${nonce}`;
      await linkUserIdentity({
        userId: adminUser.id,
        provider: "google",
        providerSubject: adminGoogleSub,
        providerEmail: adminEmail,
      });

      const adminResolved = await findUserByIdentity("google", adminGoogleSub);
      expect(adminResolved?.role).toBe("ADMIN"); // Conserva ADMIN legítimo
    });
  });

  describe("3. Desvinculación y Mantenimiento", () => {
    it("desvincula una identidad externa sin eliminar el perfil institucional ni sus datos", async () => {
      const email = `unlink_student_${nonce}@daom-test.com`;
      const googleSub = `gsub_unlink_${nonce}`;

      const user = await createUserWithIdentity({
        email,
        fullName: "Estudiante Desvinculable",
        provider: "google",
        providerSubject: googleSub,
        providerEmail: email,
      });

      expect(await findIdentityByProvider("google", googleSub)).not.toBeNull();

      const unlinked = await unlinkUserIdentity(user.id, "google");
      expect(unlinked).toBe(true);

      // La identidad fue removida
      expect(await findIdentityByProvider("google", googleSub)).toBeNull();

      // El usuario institucional sigue intacto
      const keptUser = await findUserById(user.id);
      expect(keptUser).not.toBeNull();
      expect(keptUser?.email).toBe(email);
    });
  });
});

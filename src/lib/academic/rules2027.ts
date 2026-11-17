/**
 * DAOM Learning — Reglas Académicas y Estructuras Curriculares 2027+
 * Identificador: DAOM-LEARNING-2.0-ACADEMIC-ENGINE
 * 
 * Regla de negocio institucional:
 * A partir del ciclo 2027, las capacitaciones pueden estructurarse en:
 * - Módulo Teórico Online en Vivo (Google Meet): 5 horas cátedra (45 min c/u)
 * - Módulo Práctico Presencial (Tarima DAOM): 5 horas cátedra (45 min c/u)
 * - Carga Horaria Total Certificada: 10 horas cátedra.
 * 
 * Principio pedagógico DAOM:
 * La inasistencia a la teoría online en vivo NO bloquea la participación en la práctica
 * presencial, ni impide certificar los módulos efectivamente asistidos/aprobados.
 * 
 * IMPORTANTE:
 * Esta configuración está desacoplada y NO se aplica de forma retroactiva a las
 * ediciones de 2026 (las cuales preservan su estructura curricular original).
 */

export interface AcademicPlan2027Config {
  trainingId: string;
  year: number;
  theoryHours: number;      // 5 horas cátedra
  practiceHours: number;    // 5 horas cátedra
  totalHours: number;       // 10 horas cátedra
  theoryModality: "streaming";
  practiceModality: "presencial";
  allowIndependentAttendance: boolean; // true
}

export const DEFAULT_ACADEMIC_PLAN_2027: Omit<AcademicPlan2027Config, "trainingId"> = {
  year: 2027,
  theoryHours: 5,
  practiceHours: 5,
  totalHours: 10,
  theoryModality: "streaming",
  practiceModality: "presencial",
  allowIndependentAttendance: true,
};

/**
 * Determina si una capacitación o edición corresponde al régimen académico 2027+.
 */
export function isAcademicPlan2027(fechaInicioOrYear: string | number): boolean {
  if (typeof fechaInicioOrYear === "number") {
    return fechaInicioOrYear >= 2027;
  }
  const yearMatch = fechaInicioOrYear.match(/^(\d{4})/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10) >= 2027;
  }
  return false;
}

/**
 * Calcula las horas a certificar según los módulos acreditados en el régimen 2027.
 */
export function calculateCertifiedHours2027(modulesAttended: {
  theoryAttended: boolean;
  practiceAttended: boolean;
}): { certifiedHours: number; canCertify: boolean; breakdown: string } {
  let certifiedHours = 0;
  const parts: string[] = [];

  if (modulesAttended.theoryAttended) {
    certifiedHours += DEFAULT_ACADEMIC_PLAN_2027.theoryHours;
    parts.push("Teoría Online (5 hs cátedra)");
  }
  if (modulesAttended.practiceAttended) {
    certifiedHours += DEFAULT_ACADEMIC_PLAN_2027.practiceHours;
    parts.push("Práctica Presencial (5 hs cátedra)");
  }

  return {
    certifiedHours,
    canCertify: certifiedHours > 0,
    breakdown: parts.length > 0 ? parts.join(" + ") : "Sin módulos acreditados",
  };
}

// src/utils/gradeDetection.ts
//
// Puerto de `_gradeToSpanish` y `_loadStudentGrade` en
// lib/screens/questions/ai_generate_screen.dart -- se usa para adaptar el
// prompt de generación por imagen al nivel real de los estudiantes
// asignados a la materia.

import { gradeHasNumericLevel, type Student, type StudentGrade } from '@/types/student';

const GRADE_AGE_RANGE: Record<StudentGrade, string> = {
  preescolar: 'preescolar (3-6 años)',
  primaria: 'primaria (6-12 años)',
  secundaria: 'secundaria (12-15 años)',
  preparatoria: 'preparatoria (15-18 años)',
  universidad: 'universidad (18+ años)',
};

/** Equivalente a `_gradeToSpanish` */
export function gradeToSpanish(grade: StudentGrade, gradeLevel: number | null): string {
  const levelSuffix =
    gradeHasNumericLevel(grade) && gradeLevel != null ? `, ${gradeLevel}° grado` : '';
  return `${GRADE_AGE_RANGE[grade]}${levelSuffix}`;
}

/**
 * Cuenta combinaciones de (grado, nivel) -- no solo el grado -- y toma la
 * más frecuente, para poder ser específicos con la IA (ej: "primaria, 3er
 * grado" en vez de solo "primaria"). En caso de empate, gana la primera
 * combinación encontrada -- igual que el `.reduce` de Dart.
 */
export function detectMostCommonGradeLevel(students: Student[]): string {
  if (students.length === 0) return gradeToSpanish('primaria', null);

  const counts = new Map<string, number>();
  const sample = new Map<string, Student>();

  for (const s of students) {
    const key = `${s.grade}-${s.gradeLevel ?? 0}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!sample.has(key)) sample.set(key, s);
  }

  const [mostCommonKey] = [...counts.entries()].reduce((a, b) => (a[1] >= b[1] ? a : b));
  const mostCommonStudent = sample.get(mostCommonKey)!;
  return gradeToSpanish(mostCommonStudent.grade, mostCommonStudent.gradeLevel ?? null);
}

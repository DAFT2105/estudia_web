import { describe, it, expect } from 'vitest';
import { detectMostCommonGradeLevel, gradeToSpanish } from './gradeDetection';
import type { Student } from '@/types/student';

function buildStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 's1',
    nombres: 'Ana',
    apellidos: 'Pérez',
    username: 'aperez',
    email: null,
    parentId: 'p1',
    createdAt: new Date().toISOString(),
    updatedAt: null,
    isActive: true,
    assignedSubjects: [],
    grade: 'primaria',
    gradeLevel: 3,
    birthDate: null,
    notes: null,
    avatar: 'student1',
    ...overrides,
  };
}

describe('gradeToSpanish', () => {
  it('incluye el nivel numérico para primaria', () => {
    expect(gradeToSpanish('primaria', 3)).toBe('primaria (6-12 años), 3° grado');
  });

  it('no incluye nivel para preescolar (no tiene niveles numéricos)', () => {
    expect(gradeToSpanish('preescolar', null)).toBe('preescolar (3-6 años)');
  });
});

describe('detectMostCommonGradeLevel', () => {
  it('devuelve primaria por defecto si no hay estudiantes', () => {
    expect(detectMostCommonGradeLevel([])).toBe('primaria (6-12 años)');
  });

  it('detecta la combinación grado+nivel más frecuente', () => {
    const students = [
      buildStudent({ id: 's1', grade: 'primaria', gradeLevel: 3 }),
      buildStudent({ id: 's2', grade: 'primaria', gradeLevel: 3 }),
      buildStudent({ id: 's3', grade: 'secundaria', gradeLevel: 1 }),
    ];
    expect(detectMostCommonGradeLevel(students)).toBe('primaria (6-12 años), 3° grado');
  });
});

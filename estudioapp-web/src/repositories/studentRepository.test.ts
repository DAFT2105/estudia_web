import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/firebase', () => ({
  auth: {},
  db: {},
  firebaseApp: { options: {} },
}));

const { createStudentMock } = vi.hoisted(() => ({
  createStudentMock: vi.fn(async (params: Record<string, unknown>) => ({
    student: {
      id: 's1',
      username: 'jperez',
      parentId: params.parentId,
      nombres: params.nombres,
      apellidos: params.apellidos,
      email: params.email ?? null,
      grade: params.grade ?? 'primaria',
      gradeLevel: params.gradeLevel ?? null,
      birthDate: params.birthDate ?? null,
      notes: params.notes ?? null,
      avatar: params.avatar ?? 'student1',
      createdAt: new Date().toISOString(),
      updatedAt: null,
      isActive: true,
      assignedSubjects: [],
    },
    temporaryPassword: 'Ab3dEfGh',
  })),
}));

vi.mock('@/services/studentService', () => ({
  createStudent: createStudentMock,
  isEmailInUse: vi.fn(async () => false),
}));

import { studentRepository } from './studentRepository';
import type { CreateStudentParams } from '@/services/studentService';

function baseParams(overrides: Partial<CreateStudentParams> = {}): CreateStudentParams {
  return {
    nombres: 'Juan',
    apellidos: 'Pérez',
    parentId: 'parent1',
    grade: 'primaria',
    ...overrides,
  };
}

describe('studentRepository.createStudent — validaciones', () => {
  it('rechaza nombres vacíos', async () => {
    await expect(
      studentRepository.createStudent(baseParams({ nombres: '  ' })),
    ).rejects.toThrow(/nombres.*son requeridos/i);
  });

  it('rechaza apellidos vacíos', async () => {
    await expect(
      studentRepository.createStudent(baseParams({ apellidos: '' })),
    ).rejects.toThrow(/apellidos.*son requeridos/i);
  });

  it('rechaza email con formato inválido', async () => {
    await expect(
      studentRepository.createStudent(baseParams({ email: 'no-es-un-email' })),
    ).rejects.toThrow(/formato de email inválido/i);
  });

  it('acepta sin email (es opcional)', async () => {
    const result = await studentRepository.createStudent(baseParams());
    expect(result.student.email).toBeNull();
  });

  it('rechaza fecha de nacimiento futura', async () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    await expect(
      studentRepository.createStudent(baseParams({ birthDate: futureDate })),
    ).rejects.toThrow(/no puede ser futura/);
  });

  it('rechaza nivel de grado fuera de rango para primaria (máx. 6)', async () => {
    await expect(
      studentRepository.createStudent(baseParams({ grade: 'primaria', gradeLevel: 7 })),
    ).rejects.toThrow(/entre 1 y 6/);
  });

  it('rechaza nivel de grado fuera de rango para secundaria (máx. 5)', async () => {
    await expect(
      studentRepository.createStudent(baseParams({ grade: 'secundaria', gradeLevel: 6 })),
    ).rejects.toThrow(/entre 1 y 5/);
  });

  it('rechaza nivel numérico para un grado que no tiene niveles (preescolar)', async () => {
    await expect(
      studentRepository.createStudent(baseParams({ grade: 'preescolar', gradeLevel: 1 })),
    ).rejects.toThrow(/no tiene niveles numéricos/);
  });

  it('acepta nivel de grado válido dentro de rango', async () => {
    const result = await studentRepository.createStudent(
      baseParams({ grade: 'secundaria', gradeLevel: 3 }),
    );
    expect(result.student.gradeLevel).toBe(3);
  });

  it('acepta preescolar sin nivel numérico', async () => {
    const result = await studentRepository.createStudent(
      baseParams({ grade: 'preescolar' }),
    );
    expect(result.student.grade).toBe('preescolar');
  });
});

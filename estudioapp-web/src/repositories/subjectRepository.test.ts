import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/firebase', () => ({
  auth: {},
  db: {},
  firebaseApp: { options: {} },
}));

const { existingSubjects, createSubjectMock } = vi.hoisted(() => ({
  existingSubjects: [
    {
      id: 'existing1',
      name: 'Matemática',
      description: 'Materia existente',
      createdBy: 'parent1',
      createdAt: new Date().toISOString(),
      updatedAt: null,
      isActive: true,
      assignedStudents: [],
      color: 'blue',
      icon: 'book',
      estimatedDuration: null,
      timeUnit: null,
      difficulty: null,
      area: 'matematica',
    },
  ],
  createSubjectMock: vi.fn(async (params: Record<string, unknown>) => ({
    id: 'new1',
    createdAt: new Date().toISOString(),
    updatedAt: null,
    isActive: true,
    assignedStudents: [],
    color: 'blue',
    icon: 'book',
    estimatedDuration: null,
    timeUnit: null,
    difficulty: null,
    ...params,
  })),
}));

vi.mock('@/services/subjectService', () => ({
  getSubjectsByUser: vi.fn(async () => existingSubjects),
  createSubject: createSubjectMock,
}));

import { subjectRepository } from './subjectRepository';
import type { CreateSubjectServiceParams } from '@/services/subjectService';

function baseParams(
  overrides: Partial<CreateSubjectServiceParams> = {},
): CreateSubjectServiceParams {
  return {
    name: 'Comunicación',
    description: 'Materia de lenguaje y comunicación',
    createdBy: 'parent1',
    area: 'comunicacion',
    ...overrides,
  };
}

describe('subjectRepository.createSubject — validaciones', () => {
  it('rechaza nombre vacío', async () => {
    await expect(
      subjectRepository.createSubject(baseParams({ name: '   ' })),
    ).rejects.toThrow(/nombre.*es requerido/i);
  });

  it('rechaza descripción vacía', async () => {
    await expect(
      subjectRepository.createSubject(baseParams({ description: '' })),
    ).rejects.toThrow(/descripción es requerida/i);
  });

  it('rechaza nombre mayor a 50 caracteres', async () => {
    await expect(
      subjectRepository.createSubject(baseParams({ name: 'x'.repeat(51) })),
    ).rejects.toThrow(/no puede exceder 50/);
  });

  it('rechaza descripción mayor a 200 caracteres', async () => {
    await expect(
      subjectRepository.createSubject(baseParams({ description: 'x'.repeat(201) })),
    ).rejects.toThrow(/no puede exceder 200/);
  });

  it('rechaza nombre duplicado (case-insensitive) entre las materias del mismo padre', async () => {
    await expect(
      subjectRepository.createSubject(baseParams({ name: 'matemática' })),
    ).rejects.toThrow(/ya existe una materia con ese nombre/i);
  });

  it('acepta un nombre nuevo y lo pasa al servicio', async () => {
    const subject = await subjectRepository.createSubject(baseParams());
    expect(subject.id).toBe('new1');
    expect(createSubjectMock).toHaveBeenCalled();
  });
});

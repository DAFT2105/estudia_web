import { describe, it, expect, vi } from 'vitest';

// questionRepository valida ANTES de tocar Firestore -- se mockea el
// servicio para poder probar las validaciones sin un proyecto real, y para
// confirmar que las entradas válidas sí llegan al servicio.
vi.mock('@/services/firebase', () => ({
  auth: {},
  db: {},
  firebaseApp: { options: {} },
}));

const { createQuestionMock } = vi.hoisted(() => ({
  createQuestionMock: vi.fn(async (params: Record<string, unknown>) => ({
    id: 'q1',
    createdAt: new Date().toISOString(),
    updatedAt: null,
    isActive: true,
    imageUrl: null,
    difficulty: 'medium',
    explanation: null,
    topic: null,
    ...params,
  })),
}));

vi.mock('@/services/questionService', () => ({
  createQuestion: createQuestionMock,
}));

import { questionRepository } from './questionRepository';
import type { CreateQuestionServiceParams } from '@/services/questionService';

function baseParams(
  overrides: Partial<CreateQuestionServiceParams> = {},
): CreateQuestionServiceParams {
  return {
    subjectId: 'subj1',
    createdBy: 'parent1',
    text: 'Esta es una pregunta de prueba válida',
    type: 'multipleChoice',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B',
    purpose: 'practice',
    ...overrides,
  };
}

describe('questionRepository.createQuestion — validaciones', () => {
  it('rechaza texto menor a 10 caracteres', async () => {
    await expect(
      questionRepository.createQuestion(baseParams({ text: 'Corta' })),
    ).rejects.toThrow(/al menos 10 caracteres/);
  });

  it('rechaza texto vacío', async () => {
    await expect(
      questionRepository.createQuestion(baseParams({ text: '   ' })),
    ).rejects.toThrow(/requerido/);
  });

  it('rechaza multipleChoice con menos de 2 opciones', async () => {
    await expect(
      questionRepository.createQuestion(
        baseParams({ options: ['Solo una'], correctAnswer: 'Solo una' }),
      ),
    ).rejects.toThrow(/al menos 2 opciones/);
  });

  it('rechaza multipleChoice con más de 6 opciones', async () => {
    const options = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    await expect(
      questionRepository.createQuestion(baseParams({ options, correctAnswer: 'A' })),
    ).rejects.toThrow(/no puede haber más de 6/i);
  });

  it('rechaza multipleChoice cuando la respuesta no está entre las opciones', async () => {
    await expect(
      questionRepository.createQuestion(
        baseParams({ correctAnswer: 'No está en la lista' }),
      ),
    ).rejects.toThrow(/debe estar en las opciones/);
  });

  it('rechaza trueFalse con respuesta que no es Verdadero/Falso', async () => {
    await expect(
      questionRepository.createQuestion(
        baseParams({
          type: 'trueFalse',
          options: ['Verdadero', 'Falso'],
          correctAnswer: 'Tal vez',
        }),
      ),
    ).rejects.toThrow(/Verdadero o Falso/);
  });

  it('acepta trueFalse con respuesta válida', async () => {
    const question = await questionRepository.createQuestion(
      baseParams({
        type: 'trueFalse',
        options: ['Verdadero', 'Falso'],
        correctAnswer: 'Verdadero',
      }),
    );
    expect(question.correctAnswer).toBe('Verdadero');
  });

  it('rechaza shortAnswer con respuesta mayor a 100 caracteres', async () => {
    const longAnswer = 'x'.repeat(101);
    await expect(
      questionRepository.createQuestion(
        baseParams({ type: 'shortAnswer', options: [], correctAnswer: longAnswer }),
      ),
    ).rejects.toThrow(/no puede exceder 100/);
  });

  it('acepta una pregunta multipleChoice válida y la pasa al servicio', async () => {
    const question = await questionRepository.createQuestion(baseParams());
    expect(question.id).toBe('q1');
    expect(createQuestionMock).toHaveBeenCalled();
  });
});

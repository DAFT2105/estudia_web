import { describe, it, expect } from 'vitest';
import {
  getPercentage,
  getPercentageRounded,
  getRating,
  getIncorrectAnswers,
  type PracticeResult,
} from './practiceResult';

function buildResult(overrides: Partial<PracticeResult> = {}): PracticeResult {
  return {
    id: 'r1',
    studentId: 's1',
    subjectId: 'subj1',
    subjectName: 'Matemática',
    totalQuestions: 10,
    correctAnswers: 8,
    completedAt: new Date().toISOString(),
    difficultyFilter: 'all',
    durationSeconds: 120,
    sessionType: 'practice',
    ...overrides,
  };
}

describe('practiceResult', () => {
  it('calcula el porcentaje correctamente', () => {
    const result = buildResult({ totalQuestions: 10, correctAnswers: 8 });
    expect(getPercentage(result)).toBe(80);
    expect(getPercentageRounded(result)).toBe(80);
  });

  it('devuelve 0% cuando no hay preguntas (evita división por cero)', () => {
    const result = buildResult({ totalQuestions: 0, correctAnswers: 0 });
    expect(getPercentage(result)).toBe(0);
  });

  it('calcula las respuestas incorrectas', () => {
    const result = buildResult({ totalQuestions: 10, correctAnswers: 8 });
    expect(getIncorrectAnswers(result)).toBe(2);
  });

  it.each([
    [95, 'excellent'],
    [75, 'good'],
    [55, 'regular'],
    [10, 'needsWork'],
  ] as const)('clasifica %i%% como %s', (percentage, expected) => {
    const result = buildResult({ totalQuestions: 100, correctAnswers: percentage });
    expect(getRating(result)).toBe(expected);
  });
});

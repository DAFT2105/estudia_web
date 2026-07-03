import { describe, it, expect } from 'vitest';
import { getFormattedTotalTime, type SubjectStats } from './subject';

function buildStats(totalEstimatedMinutes: number): SubjectStats {
  return {
    totalSubjects: 1,
    activeSubjects: 1,
    assignedStudents: 0,
    subjectsByDifficulty: {},
    totalEstimatedMinutes,
  };
}

describe('getFormattedTotalTime', () => {
  it('devuelve "0min" cuando no hay tiempo acumulado', () => {
    expect(getFormattedTotalTime(buildStats(0))).toBe('0min');
  });

  it('muestra solo minutos cuando es menor a una hora', () => {
    expect(getFormattedTotalTime(buildStats(45))).toBe('45min');
  });

  it('muestra solo horas cuando es un múltiplo exacto de 60', () => {
    expect(getFormattedTotalTime(buildStats(180))).toBe('3h');
  });

  it('combina horas y minutos', () => {
    expect(getFormattedTotalTime(buildStats(150))).toBe('2h 30min');
  });
});

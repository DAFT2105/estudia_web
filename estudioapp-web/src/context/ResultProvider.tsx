// src/context/ResultProvider.tsx
//
// Puerto literal de lib/providers/result_provider.dart

import { useCallback, useState, type ReactNode } from 'react';
import { resultRepository } from '@/repositories/resultRepository';
import {
  ResultException,
  type PracticeResult,
  type PracticeStats,
} from '@/types/practiceResult';
import { ResultContext, type ResultStatus } from './ResultContext';

export function ResultProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [status, setStatus] = useState<ResultStatus>('empty');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<PracticeStats | null>(null);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const loadResults = useCallback(async (studentId: string) => {
    try {
      setStatus('loading');
      const loadedResults = await resultRepository.getResultsByStudent(studentId);
      const loadedStats = await resultRepository.getStudentStats(studentId);
      setResults(loadedResults);
      setStats(loadedStats);
      setStatus(loadedResults.length === 0 ? 'empty' : 'loaded');
      setErrorMessage(null);
    } catch (e) {
      setStatus('error');
      setErrorMessage(
        e instanceof ResultException ? e.message : `Error inesperado: ${e}`,
      );
    }
  }, []);

  const saveResult = useCallback(
    async (result: PracticeResult, parentId?: string | null) => {
      try {
        await resultRepository.saveResult(result, parentId);
        await loadResults(result.studentId);
      } catch (e) {
        setErrorMessage(
          e instanceof ResultException ? e.message : `Error al guardar: ${e}`,
        );
      }
    },
    [loadResults],
  );

  const deleteResult = useCallback(
    async (resultId: string, studentId: string) => {
      try {
        await resultRepository.deleteResult(resultId);
        await loadResults(studentId);
      } catch (e) {
        if (e instanceof ResultException) setErrorMessage(e.message);
      }
    },
    [loadResults],
  );

  const getResultsBySubject = useCallback(
    (subjectId: string) => results.filter((r) => r.subjectId === subjectId),
    [results],
  );

  const averageBySubject = (() => {
    const bySubject = new Map<string, number[]>();
    for (const r of results) {
      const percentage =
        r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : 0;
      const list = bySubject.get(r.subjectId) ?? [];
      list.push(percentage);
      bySubject.set(r.subjectId, list);
    }
    const result: Record<string, number> = {};
    for (const [subjectId, values] of bySubject) {
      result[subjectId] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    return result;
  })();

  return (
    <ResultContext.Provider
      value={{
        results,
        status,
        errorMessage,
        stats,
        isLoading: status === 'loading',
        hasResults: results.length > 0,
        loadResults,
        saveResult,
        deleteResult,
        getResultsBySubject,
        averageBySubject,
        clearError,
      }}
    >
      {children}
    </ResultContext.Provider>
  );
}

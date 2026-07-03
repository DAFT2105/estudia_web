// src/context/ResultContext.ts
//
// Definición del contexto -- puerto de lib/providers/result_provider.dart.

import { createContext } from 'react';
import type { PracticeResult, PracticeStats } from '@/types/practiceResult';

export type ResultStatus = 'loading' | 'loaded' | 'error' | 'empty';

export interface ResultContextValue {
  results: PracticeResult[];
  status: ResultStatus;
  errorMessage: string | null;
  stats: PracticeStats | null;
  isLoading: boolean;
  hasResults: boolean;
  loadResults: (studentId: string) => Promise<void>;
  saveResult: (result: PracticeResult, parentId?: string | null) => Promise<void>;
  deleteResult: (resultId: string, studentId: string) => Promise<void>;
  getResultsBySubject: (subjectId: string) => PracticeResult[];
  averageBySubject: Record<string, number>;
  clearError: () => void;
}

export const ResultContext = createContext<ResultContextValue | undefined>(undefined);

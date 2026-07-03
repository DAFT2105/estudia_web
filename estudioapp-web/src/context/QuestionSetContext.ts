// src/context/QuestionSetContext.ts
//
// Definición del contexto -- puerto de lib/providers/question_set_provider.dart.

import { createContext } from 'react';
import type { CreateQuestionSetServiceParams } from '@/services/questionSetService';
import type { Question, QuestionPurpose } from '@/types/question';
import type { QuestionSet } from '@/types/questionSet';

export type QuestionSetStatus = 'initial' | 'loading' | 'loaded' | 'empty' | 'error';

export interface QuestionSetContextValue {
  sets: QuestionSet[];
  status: QuestionSetStatus;
  errorMessage: string | null;
  isLoading: boolean;
  loadSetsBySubject: (subjectId: string, purpose?: QuestionPurpose) => Promise<void>;
  createSet: (params: CreateQuestionSetServiceParams) => Promise<boolean>;
  deleteSet: (id: string) => Promise<boolean>;
  canEditSet: (set: QuestionSet, userId: string, userRole: string) => boolean;
  resolveQuestions: (set: QuestionSet, availableQuestions: Question[]) => Question[];
}

export const QuestionSetContext = createContext<QuestionSetContextValue | undefined>(
  undefined,
);

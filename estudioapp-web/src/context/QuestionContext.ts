// src/context/QuestionContext.ts
//
// Definición del contexto -- puerto de lib/providers/question_provider.dart.

import { createContext } from 'react';
import type {
  CreateQuestionServiceParams,
  RandomQuestionsParams,
} from '@/services/questionService';
import type {
  Question,
  QuestionDifficulty,
  QuestionStats,
  QuestionType,
} from '@/types/question';

export type QuestionStatus = 'loading' | 'loaded' | 'error' | 'empty';

export interface QuestionContextValue {
  questions: Question[];
  status: QuestionStatus;
  errorMessage: string | null;
  stats: QuestionStats | null;
  searchQuery: string;
  currentSubjectId: string | null;
  isLoading: boolean;
  hasQuestions: boolean;
  activeQuestions: Question[];
  questionsByDifficulty: Partial<Record<QuestionDifficulty, Question[]>>;
  questionsByType: Partial<Record<QuestionType, Question[]>>;
  uniqueTopics: string[];
  loadQuestionsBySubject: (subjectId: string) => Promise<void>;
  loadQuestionsByCreator: (creatorId: string) => Promise<void>;
  createQuestion: (params: CreateQuestionServiceParams) => Promise<boolean>;
  updateQuestion: (question: Question) => Promise<boolean>;
  deleteQuestion: (questionId: string) => Promise<boolean>;
  searchQuestions: (query: string, subjectId: string | null) => Promise<void>;
  clearSearch: (subjectId: string | null) => Promise<void>;
  filterByType: (subjectId: string, type: QuestionType) => Promise<void>;
  filterByDifficulty: (
    subjectId: string,
    difficulty: QuestionDifficulty,
  ) => Promise<void>;
  getRandomQuestions: (params: RandomQuestionsParams) => Promise<Question[]>;
  canEditQuestion: (question: Question, userId: string, userRole: string) => boolean;
  getQuestionById: (questionId: string) => Question | undefined;
  refresh: (subjectId: string | null) => Promise<void>;
}

export const QuestionContext = createContext<QuestionContextValue | undefined>(undefined);

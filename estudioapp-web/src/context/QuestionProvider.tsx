// src/context/QuestionProvider.tsx
//
// Puerto literal de lib/providers/question_provider.dart

import { useCallback, useState, type ReactNode } from 'react';
import { questionRepository } from '@/repositories/questionRepository';
import type {
  CreateQuestionServiceParams,
  RandomQuestionsParams,
} from '@/services/questionService';
import {
  QuestionException,
  type Question,
  type QuestionDifficulty,
  type QuestionStats,
  type QuestionType,
} from '@/types/question';
import { QuestionContext, type QuestionStatus } from './QuestionContext';

export function QuestionProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<QuestionStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus('error');
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const loadStats = useCallback(async (subjectId: string) => {
    try {
      const result = await questionRepository.getQuestionStats(subjectId);
      setStats(result);
    } catch (e) {
      console.warn('Error al cargar estadísticas de preguntas:', e);
    }
  }, []);

  const loadQuestionsBySubject = useCallback(
    async (subjectId: string) => {
      try {
        setCurrentSubjectId(subjectId);
        setStatus('loading');
        clearError();
        const loaded = await questionRepository.getQuestionsBySubject(subjectId);
        setQuestions(loaded);
        setStatus(loaded.length === 0 ? 'empty' : 'loaded');
        await loadStats(subjectId);
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al cargar preguntas: ${e}`);
      }
    },
    [clearError, setError, loadStats],
  );

  const loadQuestionsByCreator = useCallback(
    async (creatorId: string) => {
      try {
        setCurrentSubjectId(null);
        setStatus('loading');
        clearError();
        const loaded = await questionRepository.getQuestionsByCreator(creatorId);
        setQuestions(loaded);
        setStatus(loaded.length === 0 ? 'empty' : 'loaded');
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al cargar preguntas: ${e}`);
      }
    },
    [clearError, setError],
  );

  const createQuestion = useCallback(
    async (params: CreateQuestionServiceParams): Promise<boolean> => {
      try {
        clearError();
        const newQuestion = await questionRepository.createQuestion(params);
        setQuestions((prev) => [...prev, newQuestion]);
        setStatus('loaded');
        if (currentSubjectId === params.subjectId) {
          await loadStats(params.subjectId);
        }
        return true;
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al crear pregunta: ${e}`);
        return false;
      }
    },
    [currentSubjectId, clearError, setError, loadStats],
  );

  const updateQuestion = useCallback(
    async (question: Question): Promise<boolean> => {
      try {
        clearError();
        const updated = await questionRepository.updateQuestion(question);
        setQuestions((prev) => prev.map((q) => (q.id === question.id ? updated : q)));
        if (currentSubjectId === question.subjectId) {
          await loadStats(question.subjectId);
        }
        return true;
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al actualizar pregunta: ${e}`);
        return false;
      }
    },
    [currentSubjectId, clearError, setError, loadStats],
  );

  const deleteQuestion = useCallback(
    async (questionId: string): Promise<boolean> => {
      try {
        clearError();
        const target = questions.find((q) => q.id === questionId);
        const success = await questionRepository.deleteQuestion(questionId);
        if (success) {
          setQuestions((prev) => {
            const next = prev.filter((q) => q.id !== questionId);
            setStatus(next.length === 0 ? 'empty' : 'loaded');
            return next;
          });
          if (target && currentSubjectId === target.subjectId) {
            await loadStats(target.subjectId);
          }
        }
        return success;
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al eliminar pregunta: ${e}`);
        return false;
      }
    },
    [questions, currentSubjectId, clearError, setError, loadStats],
  );

  const searchQuestions = useCallback(
    async (queryText: string, subjectId: string | null) => {
      try {
        setSearchQuery(queryText);
        setStatus('loading');
        clearError();
        const results = await questionRepository.searchQuestions(queryText, subjectId);
        setQuestions(results);
        setStatus(results.length === 0 ? 'empty' : 'loaded');
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al buscar preguntas: ${e}`);
      }
    },
    [clearError, setError],
  );

  const clearSearch = useCallback(
    async (subjectId: string | null) => {
      setSearchQuery('');
      if (subjectId) {
        await loadQuestionsBySubject(subjectId);
      } else {
        setQuestions([]);
        setStatus('empty');
      }
    },
    [loadQuestionsBySubject],
  );

  const filterByType = useCallback(
    async (subjectId: string, type: QuestionType) => {
      try {
        setStatus('loading');
        clearError();
        const filtered = await questionRepository.getQuestionsByType(subjectId, type);
        setQuestions(filtered);
        setStatus(filtered.length === 0 ? 'empty' : 'loaded');
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al filtrar preguntas: ${e}`);
      }
    },
    [clearError, setError],
  );

  const filterByDifficulty = useCallback(
    async (subjectId: string, difficulty: QuestionDifficulty) => {
      try {
        setStatus('loading');
        clearError();
        const filtered = await questionRepository.getQuestionsByDifficulty(
          subjectId,
          difficulty,
        );
        setQuestions(filtered);
        setStatus(filtered.length === 0 ? 'empty' : 'loaded');
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al filtrar preguntas: ${e}`);
      }
    },
    [clearError, setError],
  );

  const getRandomQuestions = useCallback(
    async (params: RandomQuestionsParams): Promise<Question[]> => {
      try {
        return await questionRepository.getRandomQuestions(params);
      } catch (e) {
        if (e instanceof QuestionException) setError(e.message);
        else setError(`Error al obtener preguntas aleatorias: ${e}`);
        return [];
      }
    },
    [setError],
  );

  const canEditQuestion = useCallback(
    (question: Question, userId: string, userRole: string) =>
      questionRepository.canEditQuestion(question, userId, userRole),
    [],
  );

  const getQuestionById = useCallback(
    (questionId: string) => questions.find((q) => q.id === questionId),
    [questions],
  );

  const refresh = useCallback(
    async (subjectId: string | null) => {
      if (subjectId) await loadQuestionsBySubject(subjectId);
    },
    [loadQuestionsBySubject],
  );

  const activeQuestions = questions.filter((q) => q.isActive);

  const questionsByDifficulty = questions.reduce<
    Partial<Record<QuestionDifficulty, Question[]>>
  >((grouped, q) => {
    (grouped[q.difficulty] ??= []).push(q);
    return grouped;
  }, {});

  const questionsByType = questions.reduce<Partial<Record<QuestionType, Question[]>>>(
    (grouped, q) => {
      (grouped[q.type] ??= []).push(q);
      return grouped;
    },
    {},
  );

  const uniqueTopics = [
    ...new Set(questions.map((q) => q.topic).filter((t): t is string => !!t)),
  ].sort();

  return (
    <QuestionContext.Provider
      value={{
        questions,
        status,
        errorMessage,
        stats,
        searchQuery,
        currentSubjectId,
        isLoading: status === 'loading',
        hasQuestions: questions.length > 0,
        activeQuestions,
        questionsByDifficulty,
        questionsByType,
        uniqueTopics,
        loadQuestionsBySubject,
        loadQuestionsByCreator,
        createQuestion,
        updateQuestion,
        deleteQuestion,
        searchQuestions,
        clearSearch,
        filterByType,
        filterByDifficulty,
        getRandomQuestions,
        canEditQuestion,
        getQuestionById,
        refresh,
      }}
    >
      {children}
    </QuestionContext.Provider>
  );
}

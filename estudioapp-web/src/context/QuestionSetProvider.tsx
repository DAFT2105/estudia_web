// src/context/QuestionSetProvider.tsx
//
// Puerto literal de lib/providers/question_set_provider.dart

import { useCallback, useState, type ReactNode } from 'react';
import { questionSetRepository } from '@/repositories/questionSetRepository';
import type { CreateQuestionSetServiceParams } from '@/services/questionSetService';
import type { Question, QuestionPurpose } from '@/types/question';
import { QuestionSetException, type QuestionSet } from '@/types/questionSet';
import { QuestionSetContext, type QuestionSetStatus } from './QuestionSetContext';

export function QuestionSetProvider({ children }: { children: ReactNode }) {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [status, setStatus] = useState<QuestionSetStatus>('initial');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus('error');
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const loadSetsBySubject = useCallback(
    async (subjectId: string, purpose?: QuestionPurpose) => {
      try {
        setStatus('loading');
        clearError();
        const loaded = await questionSetRepository.getQuestionSetsBySubject(
          subjectId,
          purpose,
        );
        setSets(loaded);
        setStatus(loaded.length === 0 ? 'empty' : 'loaded');
      } catch (e) {
        if (e instanceof QuestionSetException) setError(e.message);
        else setError(`Error al cargar grupos de preguntas: ${e}`);
      }
    },
    [clearError, setError],
  );

  const createSet = useCallback(
    async (params: CreateQuestionSetServiceParams): Promise<boolean> => {
      try {
        clearError();
        const newSet = await questionSetRepository.createQuestionSet(params);
        setSets((prev) => [...prev, newSet]);
        setStatus('loaded');
        return true;
      } catch (e) {
        if (e instanceof QuestionSetException) setError(e.message);
        else setError(`Error al crear el grupo de preguntas: ${e}`);
        return false;
      }
    },
    [clearError, setError],
  );

  const deleteSet = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        clearError();
        const success = await questionSetRepository.deleteQuestionSet(id);
        if (success) setSets((prev) => prev.filter((s) => s.id !== id));
        return success;
      } catch (e) {
        if (e instanceof QuestionSetException) setError(e.message);
        else setError(`Error al eliminar el grupo de preguntas: ${e}`);
        return false;
      }
    },
    [clearError, setError],
  );

  const canEditSet = useCallback(
    (set: QuestionSet, userId: string, userRole: string) =>
      questionSetRepository.canEditQuestionSet(set, userId, userRole),
    [],
  );

  // Resuelve los IDs guardados en el set a los objetos Question reales,
  // preservando el orden en que el padre las eligió. Reutiliza preguntas ya
  // cargadas en memoria (no hace queries adicionales a Firestore). Si
  // alguna pregunta fue eliminada después de armar el set, se omite.
  const resolveQuestions = useCallback(
    (set: QuestionSet, availableQuestions: Question[]): Question[] => {
      const byId = new Map(availableQuestions.map((q) => [q.id, q]));
      return set.questionIds
        .map((id) => byId.get(id))
        .filter((q): q is Question => q != null);
    },
    [],
  );

  return (
    <QuestionSetContext.Provider
      value={{
        sets,
        status,
        errorMessage,
        isLoading: status === 'loading',
        loadSetsBySubject,
        createSet,
        deleteSet,
        canEditSet,
        resolveQuestions,
      }}
    >
      {children}
    </QuestionSetContext.Provider>
  );
}

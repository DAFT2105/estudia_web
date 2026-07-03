// src/context/SubjectProvider.tsx
//
// Puerto literal de lib/providers/subject_provider.dart

import { useCallback, useState, type ReactNode } from 'react';
import { subjectRepository } from '@/repositories/subjectRepository';
import type { CreateSubjectServiceParams } from '@/services/subjectService';
import { SubjectException, type Subject, type SubjectStats } from '@/types/subject';
import { SubjectContext, type SubjectStatus } from './SubjectContext';

export function SubjectProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [status, setStatus] = useState<SubjectStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<SubjectStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus('error');
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const loadStats = useCallback(async (userId: string, userRole: string) => {
    try {
      const result = await subjectRepository.getSubjectStats(userId, userRole);
      setStats(result);
    } catch (e) {
      // No se muestra error por estadísticas, solo se loguea -- igual que en Flutter.
      console.warn('Error al cargar estadísticas de materias:', e);
    }
  }, []);

  const loadSubjects = useCallback(
    async (userId: string, userRole: string) => {
      try {
        setStatus('loading');
        clearError();
        const loaded = await subjectRepository.getSubjects(userId, userRole);
        setSubjects(loaded);
        setStatus(loaded.length === 0 ? 'empty' : 'loaded');
        await loadStats(userId, userRole);
      } catch (e) {
        if (e instanceof SubjectException) setError(e.message);
        else setError(`Error al cargar materias: ${e}`);
      }
    },
    [clearError, setError, loadStats],
  );

  const createSubject = useCallback(
    async (
      params: CreateSubjectServiceParams & { userRole: string },
    ): Promise<boolean> => {
      try {
        clearError();
        const { userRole, ...createParams } = params;
        const newSubject = await subjectRepository.createSubject(createParams);
        setSubjects((prev) => [...prev, newSubject]);
        setStatus('loaded');
        await loadStats(params.createdBy, userRole);
        return true;
      } catch (e) {
        if (e instanceof SubjectException) setError(e.message);
        else setError(`Error al crear materia: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const updateSubject = useCallback(
    async (subject: Subject, userId: string, userRole: string): Promise<boolean> => {
      try {
        clearError();
        const updated = await subjectRepository.updateSubject(subject);
        setSubjects((prev) => prev.map((s) => (s.id === subject.id ? updated : s)));
        await loadStats(userId, userRole);
        return true;
      } catch (e) {
        if (e instanceof SubjectException) setError(e.message);
        else setError(`Error al actualizar materia: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const deleteSubject = useCallback(
    async (subjectId: string, userId: string, userRole: string): Promise<boolean> => {
      try {
        clearError();
        const success = await subjectRepository.deleteSubject(subjectId);
        if (success) {
          setSubjects((prev) => {
            const next = prev.filter((s) => s.id !== subjectId);
            setStatus(next.length === 0 ? 'empty' : 'loaded');
            return next;
          });
          await loadStats(userId, userRole);
        }
        return success;
      } catch (e) {
        if (e instanceof SubjectException) setError(e.message);
        else setError(`Error al eliminar materia: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  // Ver la nota en subjectRepository.ts: estos dos métodos no los usa
  // ninguna pantalla (assign_subjects_screen usa el StudentContext), se
  // mantienen por completitud de la interfaz.
  const assignStudentToSubject = useCallback(
    async (
      subjectId: string,
      studentId: string,
      userId: string,
      userRole: string,
    ): Promise<boolean> => {
      try {
        clearError();
        const updated = await subjectRepository.assignStudentToSubject(
          subjectId,
          studentId,
        );
        setSubjects((prev) => prev.map((s) => (s.id === subjectId ? updated : s)));
        await loadStats(userId, userRole);
        return true;
      } catch (e) {
        if (e instanceof SubjectException) setError(e.message);
        else setError(`Error al asignar estudiante: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const unassignStudentFromSubject = useCallback(
    async (
      subjectId: string,
      studentId: string,
      userId: string,
      userRole: string,
    ): Promise<boolean> => {
      try {
        clearError();
        const updated = await subjectRepository.unassignStudentFromSubject(
          subjectId,
          studentId,
        );
        setSubjects((prev) => prev.map((s) => (s.id === subjectId ? updated : s)));
        await loadStats(userId, userRole);
        return true;
      } catch (e) {
        if (e instanceof SubjectException) setError(e.message);
        else setError(`Error al desasignar estudiante: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const searchSubjects = useCallback(
    async (queryText: string, userId: string, userRole: string) => {
      try {
        setSearchQuery(queryText);
        setStatus('loading');
        clearError();
        const results = await subjectRepository.searchSubjects(
          queryText,
          userId,
          userRole,
        );
        setSubjects(results);
        setStatus(results.length === 0 ? 'empty' : 'loaded');
      } catch (e) {
        if (e instanceof SubjectException) setError(e.message);
        else setError(`Error al buscar materias: ${e}`);
      }
    },
    [clearError, setError],
  );

  const clearSearch = useCallback(
    async (userId: string, userRole: string) => {
      setSearchQuery('');
      await loadSubjects(userId, userRole);
    },
    [loadSubjects],
  );

  const canEditSubject = useCallback(
    (subject: Subject, userId: string, userRole: string) =>
      subjectRepository.canEditSubject(subject, userId, userRole),
    [],
  );

  const getSubjectById = useCallback(
    (subjectId: string) => subjects.find((s) => s.id === subjectId),
    [subjects],
  );

  const refresh = useCallback(
    async (userId: string, userRole: string) => {
      await loadSubjects(userId, userRole);
    },
    [loadSubjects],
  );

  const activeSubjects = subjects.filter((s) => s.isActive);

  const subjectsByDifficulty = subjects.reduce<Record<string, Subject[]>>(
    (grouped, subject) => {
      const difficulty = subject.difficulty ?? 'Medio';
      (grouped[difficulty] ??= []).push(subject);
      return grouped;
    },
    {},
  );

  return (
    <SubjectContext.Provider
      value={{
        subjects,
        status,
        errorMessage,
        stats,
        searchQuery,
        isLoading: status === 'loading',
        hasSubjects: subjects.length > 0,
        activeSubjects,
        subjectsByDifficulty,
        loadSubjects,
        createSubject,
        updateSubject,
        deleteSubject,
        assignStudentToSubject,
        unassignStudentFromSubject,
        searchSubjects,
        clearSearch,
        canEditSubject,
        getSubjectById,
        refresh,
      }}
    >
      {children}
    </SubjectContext.Provider>
  );
}

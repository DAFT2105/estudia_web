// src/context/StudentProvider.tsx
//
// Puerto literal de lib/providers/student_provider.dart

import { useCallback, useState, type ReactNode } from 'react';
import { studentRepository } from '@/repositories/studentRepository';
import type { CreateStudentParams } from '@/services/studentService';
import {
  StudentException,
  type Student,
  type StudentGrade,
  type StudentStats,
} from '@/types/student';
import { StudentContext, type StudentStatus } from './StudentContext';

export function StudentProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [status, setStatus] = useState<StudentStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus('error');
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const loadStats = useCallback(async (parentId: string) => {
    try {
      const result = await studentRepository.getStudentStats(parentId);
      setStats(result);
    } catch (e) {
      console.warn('Error al cargar estadísticas de estudiantes:', e);
    }
  }, []);

  // Carga los estudiantes del padre actual (por defecto) o todos si es
  // admin -- userRole es opcional con valor por defecto 'parent', igual
  // que en Dart, para no romper las llamadas existentes que solo pasan el ID.
  const loadStudents = useCallback(
    async (userId: string, userRole: string = 'parent') => {
      try {
        setStatus('loading');
        clearError();
        const loaded =
          userRole === 'admin'
            ? await studentRepository.getAllStudents()
            : await studentRepository.getStudentsByParent(userId);
        setStudents(loaded);
        setStatus(loaded.length === 0 ? 'empty' : 'loaded');

        // Las estadísticas son por padre -- no aplican al admin viendo todo.
        if (userRole !== 'admin') await loadStats(userId);
      } catch (e) {
        if (e instanceof StudentException) setError(e.message);
        else setError(`Error al cargar estudiantes: ${e}`);
      }
    },
    [clearError, setError, loadStats],
  );

  const createStudent = useCallback(
    async (
      params: CreateStudentParams,
    ): Promise<{ username: string; temporaryPassword: string } | null> => {
      try {
        clearError();
        const result = await studentRepository.createStudent(params);
        setStudents((prev) => [...prev, result.student]);
        setStatus('loaded');
        await loadStats(params.parentId);
        return {
          username: result.student.username,
          temporaryPassword: result.temporaryPassword,
        };
      } catch (e) {
        if (e instanceof StudentException) setError(e.message);
        else setError(`Error al crear estudiante: ${e}`);
        return null;
      }
    },
    [clearError, setError, loadStats],
  );

  const updateStudent = useCallback(
    async (student: Student, parentId: string): Promise<boolean> => {
      try {
        clearError();
        const updated = await studentRepository.updateStudent(student);
        setStudents((prev) => prev.map((s) => (s.id === student.id ? updated : s)));
        await loadStats(parentId);
        return true;
      } catch (e) {
        if (e instanceof StudentException) setError(e.message);
        else setError(`Error al actualizar estudiante: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const deleteStudent = useCallback(
    async (studentId: string, parentId: string): Promise<boolean> => {
      try {
        clearError();
        const success = await studentRepository.deleteStudent(studentId);
        if (success) {
          setStudents((prev) => {
            const next = prev.filter((s) => s.id !== studentId);
            setStatus(next.length === 0 ? 'empty' : 'loaded');
            return next;
          });
          await loadStats(parentId);
        }
        return success;
      } catch (e) {
        if (e instanceof StudentException) setError(e.message);
        else setError(`Error al eliminar estudiante: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const assignSubjectToStudent = useCallback(
    async (studentId: string, subjectId: string, parentId: string): Promise<boolean> => {
      try {
        clearError();
        const updated = await studentRepository.assignSubjectToStudent(
          studentId,
          subjectId,
        );
        setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
        await loadStats(parentId);
        return true;
      } catch (e) {
        if (e instanceof StudentException) setError(e.message);
        else setError(`Error al asignar materia: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const unassignSubjectFromStudent = useCallback(
    async (studentId: string, subjectId: string, parentId: string): Promise<boolean> => {
      try {
        clearError();
        const updated = await studentRepository.unassignSubjectFromStudent(
          studentId,
          subjectId,
        );
        setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
        await loadStats(parentId);
        return true;
      } catch (e) {
        if (e instanceof StudentException) setError(e.message);
        else setError(`Error al desasignar materia: ${e}`);
        return false;
      }
    },
    [clearError, setError, loadStats],
  );

  const searchStudents = useCallback(
    async (queryText: string, parentId: string) => {
      try {
        setSearchQuery(queryText);
        setStatus('loading');
        clearError();
        const results = await studentRepository.searchStudents(queryText, parentId);
        setStudents(results);
        setStatus(results.length === 0 ? 'empty' : 'loaded');
      } catch (e) {
        if (e instanceof StudentException) setError(e.message);
        else setError(`Error al buscar estudiantes: ${e}`);
      }
    },
    [clearError, setError],
  );

  const clearSearch = useCallback(
    async (parentId: string) => {
      setSearchQuery('');
      await loadStudents(parentId);
    },
    [loadStudents],
  );

  const canEditStudent = useCallback(
    (student: Student, userId: string, userRole: string) =>
      studentRepository.canEditStudent(student, userId, userRole),
    [],
  );

  const getStudentById = useCallback(
    (studentId: string) => students.find((s) => s.id === studentId),
    [students],
  );

  const getStudentsEligibleForSubject = useCallback(
    (subjectId: string) =>
      students.filter((s) => s.isActive && !s.assignedSubjects.includes(subjectId)),
    [students],
  );

  const refresh = useCallback(
    async (parentId: string) => {
      await loadStudents(parentId);
    },
    [loadStudents],
  );

  const activeStudents = students.filter((s) => s.isActive);
  const studentsWithSubjects = students.filter((s) => s.assignedSubjects.length > 0);
  const studentsWithoutSubjects = students.filter((s) => s.assignedSubjects.length === 0);
  const totalAssignedSubjects = students.reduce(
    (total, s) => total + s.assignedSubjects.length,
    0,
  );
  const studentsByGrade = students.reduce<Partial<Record<StudentGrade, Student[]>>>(
    (grouped, student) => {
      (grouped[student.grade] ??= []).push(student);
      return grouped;
    },
    {},
  );

  return (
    <StudentContext.Provider
      value={{
        students,
        status,
        errorMessage,
        stats,
        searchQuery,
        isLoading: status === 'loading',
        hasStudents: students.length > 0,
        activeStudents,
        studentsByGrade,
        studentsWithSubjects,
        studentsWithoutSubjects,
        totalAssignedSubjects,
        loadStudents,
        createStudent,
        updateStudent,
        deleteStudent,
        assignSubjectToStudent,
        unassignSubjectFromStudent,
        searchStudents,
        clearSearch,
        canEditStudent,
        getStudentById,
        getStudentsEligibleForSubject,
        refresh,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

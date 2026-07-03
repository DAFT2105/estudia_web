// src/context/StudentContext.ts
//
// Definición del contexto -- puerto de lib/providers/student_provider.dart.
// El componente proveedor vive en StudentProvider.tsx.

import { createContext } from 'react';
import type { CreateStudentParams } from '@/services/studentService';
import type { Student, StudentGrade, StudentStats } from '@/types/student';

export type StudentStatus = 'loading' | 'loaded' | 'error' | 'empty';

export interface StudentContextValue {
  students: Student[];
  status: StudentStatus;
  errorMessage: string | null;
  stats: StudentStats | null;
  searchQuery: string;
  isLoading: boolean;
  hasStudents: boolean;
  activeStudents: Student[];
  studentsByGrade: Partial<Record<StudentGrade, Student[]>>;
  studentsWithSubjects: Student[];
  studentsWithoutSubjects: Student[];
  totalAssignedSubjects: number;
  loadStudents: (userId: string, userRole?: string) => Promise<void>;
  createStudent: (
    params: CreateStudentParams,
  ) => Promise<{ username: string; temporaryPassword: string } | null>;
  updateStudent: (student: Student, parentId: string) => Promise<boolean>;
  deleteStudent: (studentId: string, parentId: string) => Promise<boolean>;
  assignSubjectToStudent: (
    studentId: string,
    subjectId: string,
    parentId: string,
  ) => Promise<boolean>;
  unassignSubjectFromStudent: (
    studentId: string,
    subjectId: string,
    parentId: string,
  ) => Promise<boolean>;
  searchStudents: (query: string, parentId: string) => Promise<void>;
  clearSearch: (parentId: string) => Promise<void>;
  canEditStudent: (student: Student, userId: string, userRole: string) => boolean;
  getStudentById: (studentId: string) => Student | undefined;
  getStudentsEligibleForSubject: (subjectId: string) => Student[];
  refresh: (parentId: string) => Promise<void>;
}

export const StudentContext = createContext<StudentContextValue | undefined>(undefined);

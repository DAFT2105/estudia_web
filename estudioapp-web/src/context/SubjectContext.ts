// src/context/SubjectContext.ts
//
// Definición del contexto -- puerto de lib/providers/subject_provider.dart.
// El componente proveedor vive en SubjectProvider.tsx.

import { createContext } from 'react';
import type { CreateSubjectServiceParams } from '@/services/subjectService';
import type { Subject, SubjectStats } from '@/types/subject';

export type SubjectStatus = 'loading' | 'loaded' | 'error' | 'empty';

export interface SubjectContextValue {
  subjects: Subject[];
  status: SubjectStatus;
  errorMessage: string | null;
  stats: SubjectStats | null;
  searchQuery: string;
  isLoading: boolean;
  hasSubjects: boolean;
  activeSubjects: Subject[];
  subjectsByDifficulty: Record<string, Subject[]>;
  loadSubjects: (userId: string, userRole: string) => Promise<void>;
  createSubject: (
    params: CreateSubjectServiceParams & { userRole: string },
  ) => Promise<boolean>;
  updateSubject: (subject: Subject, userId: string, userRole: string) => Promise<boolean>;
  deleteSubject: (
    subjectId: string,
    userId: string,
    userRole: string,
  ) => Promise<boolean>;
  assignStudentToSubject: (
    subjectId: string,
    studentId: string,
    userId: string,
    userRole: string,
  ) => Promise<boolean>;
  unassignStudentFromSubject: (
    subjectId: string,
    studentId: string,
    userId: string,
    userRole: string,
  ) => Promise<boolean>;
  searchSubjects: (query: string, userId: string, userRole: string) => Promise<void>;
  clearSearch: (userId: string, userRole: string) => Promise<void>;
  canEditSubject: (subject: Subject, userId: string, userRole: string) => boolean;
  getSubjectById: (subjectId: string) => Subject | undefined;
  refresh: (userId: string, userRole: string) => Promise<void>;
}

export const SubjectContext = createContext<SubjectContextValue | undefined>(undefined);

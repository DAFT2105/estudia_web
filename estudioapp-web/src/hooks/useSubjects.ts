// src/hooks/useSubjects.ts

import { useContext } from 'react';
import { SubjectContext } from '@/context/SubjectContext';

export function useSubjects() {
  const context = useContext(SubjectContext);
  if (!context) {
    throw new Error('useSubjects debe usarse dentro de <SubjectProvider>');
  }
  return context;
}

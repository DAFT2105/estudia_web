// src/hooks/useQuestionSets.ts

import { useContext } from 'react';
import { QuestionSetContext } from '@/context/QuestionSetContext';

export function useQuestionSets() {
  const context = useContext(QuestionSetContext);
  if (!context) {
    throw new Error('useQuestionSets debe usarse dentro de <QuestionSetProvider>');
  }
  return context;
}

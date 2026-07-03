// src/hooks/useQuestions.ts

import { useContext } from 'react';
import { QuestionContext } from '@/context/QuestionContext';

export function useQuestions() {
  const context = useContext(QuestionContext);
  if (!context) {
    throw new Error('useQuestions debe usarse dentro de <QuestionProvider>');
  }
  return context;
}

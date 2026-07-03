// src/hooks/useResults.ts

import { useContext } from 'react';
import { ResultContext } from '@/context/ResultContext';

export function useResults() {
  const context = useContext(ResultContext);
  if (!context) {
    throw new Error('useResults debe usarse dentro de <ResultProvider>');
  }
  return context;
}

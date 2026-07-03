// src/hooks/useUnsavedChangesGuard.ts
//
// Avisa al navegador (beforeunload) cuando hay cambios sin guardar en un
// formulario y el usuario intenta cerrar la pestaña o recargar. No cubre
// la navegación interna de React Router (eso se maneja con confirm()
// explícito en cada página, ej. AIGenerateQuestionsPage).

import { useEffect } from 'react';

export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}

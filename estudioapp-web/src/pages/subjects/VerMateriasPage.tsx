// src/pages/subjects/VerMateriasPage.tsx
//
// Puerto de ver_materias_screen.dart -- solo consulta, sin crear/editar/eliminar.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { getSubjectAreaDisplayName, getFormattedDuration } from '@/types/subject';

export function VerMateriasPage() {
  const { currentUser } = useAuth();
  const { activeSubjects, loadSubjects, isLoading } = useSubjects();

  useEffect(() => {
    if (currentUser) loadSubjects(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/" className="text-sm text-parent hover:underline">
          ← Inicio
        </Link>
        <h1 className="text-xl font-bold text-neutral-800">Mis Materias</h1>

        {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}
        {!isLoading && activeSubjects.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">
            No tienes materias creadas
          </p>
        )}

        <div className="space-y-2">
          {activeSubjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: '#1565C026' }}
              >
                📘
              </span>
              <div>
                <p className="font-bold text-neutral-800">{subject.name}</p>
                <p className="text-xs text-neutral-500">{subject.description}</p>
                <div className="mt-1 flex gap-2 text-[11px] text-neutral-400">
                  <span>{getSubjectAreaDisplayName(subject.area)}</span>
                  {getFormattedDuration(subject) && (
                    <span>· {getFormattedDuration(subject)}</span>
                  )}
                  <span>· {subject.assignedStudents.length} estudiante(s)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

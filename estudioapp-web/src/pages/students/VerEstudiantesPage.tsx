// src/pages/students/VerEstudiantesPage.tsx
//
// Puerto de ver_estudiantes_screen.dart -- solo consulta, sin crear/editar/eliminar.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStudents } from '@/hooks/useStudents';
import { useSubjects } from '@/hooks/useSubjects';
import { getStudentFullName, getGradeDisplayWithLevel } from '@/types/student';

export function VerEstudiantesPage() {
  const { currentUser } = useAuth();
  const { activeStudents, loadStudents, isLoading } = useStudents();
  const { activeSubjects, loadSubjects } = useSubjects();

  useEffect(() => {
    if (currentUser) {
      loadStudents(currentUser.id);
      loadSubjects(currentUser.id, currentUser.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/" className="text-sm text-parent hover:underline">
          ← Inicio
        </Link>
        <h1 className="text-xl font-bold text-neutral-800">Mis Estudiantes</h1>

        {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}
        {!isLoading && activeStudents.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">
            No tienes estudiantes registrados
          </p>
        )}

        <div className="space-y-2">
          {activeStudents.map((student) => {
            const assignedNames = activeSubjects
              .filter((s) => student.assignedSubjects.includes(s.id))
              .map((s) => s.name);
            return (
              <div
                key={student.id}
                className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: '#388E3C26' }}
                >
                  🎓
                </span>
                <div>
                  <p className="font-bold text-neutral-800">
                    {getStudentFullName(student)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {getGradeDisplayWithLevel(student)}
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {assignedNames.length > 0
                      ? assignedNames.join(', ')
                      : 'Sin materias asignadas'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

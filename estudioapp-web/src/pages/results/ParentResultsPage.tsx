// src/pages/results/ParentResultsPage.tsx
//
// Puerto funcional de parent_results_screen.dart. Igual que el original,
// usa `resultService.getResultsByParent` directo (una sola query filtrando
// por parentId, respetando las reglas de Firestore) en vez de pasar por
// ResultContext -- la pantalla original también hace
// `context.read<ResultService>()` directo, no por el provider.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStudents } from '@/hooks/useStudents';
import { getResultsByParent } from '@/services/resultService';
import { getStudentFullName, getGradeDisplayName, type Student } from '@/types/student';
import {
  EMPTY_PRACTICE_STATS,
  type PracticeResult,
  type PracticeStats,
} from '@/types/practiceResult';

function buildStats(results: PracticeResult[]): PracticeStats {
  if (results.length === 0) return EMPTY_PRACTICE_STATS;
  const total = results.length;
  const avg =
    results.reduce(
      (s, r) =>
        s + (r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : 0),
      0,
    ) / total;
  const best = results.reduce((a, b) => {
    const aPct = a.totalQuestions > 0 ? (a.correctAnswers / a.totalQuestions) * 100 : 0;
    const bPct = b.totalQuestions > 0 ? (b.correctAnswers / b.totalQuestions) * 100 : 0;
    return bPct > aPct ? b : a;
  });
  const subjectIds = new Set(results.map((r) => r.subjectId));
  return {
    totalSessions: total,
    averagePercentage: avg,
    bestResult: best,
    subjectCount: subjectIds.size,
    recentResults: results.slice(0, 5),
  };
}

function progressColor(percentage: number): string {
  if (percentage >= 90) return 'text-success';
  if (percentage >= 70) return 'text-primary';
  if (percentage >= 50) return 'text-warning';
  return 'text-error';
}

export function ParentResultsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { students, loadStudents, isLoading: studentsLoading } = useStudents();
  const [statsMap, setStatsMap] = useState<Record<string, PracticeStats>>({});

  useEffect(() => {
    if (currentUser) loadStudents(currentUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Reacciona a `students` una vez que el contexto termina de cargarlo --
  // no se puede asumir que ya está listo justo después de `await
  // loadStudents(...)` en el mismo efecto (el estado del context se
  // actualiza en un render aparte).
  useEffect(() => {
    if (!currentUser || students.length === 0) return;
    getResultsByParent(currentUser.id).then((allResults) => {
      const map: Record<string, PracticeStats> = {};
      for (const student of students) {
        map[student.id] = buildStats(
          allResults.filter((r) => r.studentId === student.id),
        );
      }
      setStatsMap(map);
    });
  }, [students, currentUser]);

  // Derivado del render, no de un useState propio -- evita necesitar
  // setState dentro del efecto solo para marcar "cargando".
  const statsReady =
    students.length === 0 || Object.keys(statsMap).length === students.length;
  const isLoading = studentsLoading || !statsReady;

  if (!currentUser) return null;

  const totalSessions = Object.values(statsMap).reduce(
    (s, st) => s + st.totalSessions,
    0,
  );
  const withActivity = Object.values(statsMap).filter((st) => st.totalSessions > 0);
  const globalAvg =
    withActivity.length > 0
      ? Math.round(
          withActivity.reduce((s, st) => s + st.averagePercentage, 0) /
            withActivity.length,
        )
      : 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Inicio
        </Link>
        <h1 className="text-xl font-bold text-neutral-800">Progreso de Estudiantes</h1>

        {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

        {!isLoading && students.length === 0 && (
          <div className="rounded-2xl bg-surface p-8 text-center">
            <p className="font-semibold text-neutral-700">
              No tienes estudiantes registrados
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Agrega estudiantes para ver su progreso
            </p>
          </div>
        )}

        {!isLoading && students.length > 0 && (
          <>
            <div className="rounded-2xl bg-primary/10 p-5">
              <p className="font-bold text-primary">Resumen General</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold text-neutral-800">{globalAvg}%</p>
                  <p className="text-[11px] text-neutral-500">Promedio general</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-neutral-800">{totalSessions}</p>
                  <p className="text-[11px] text-neutral-500">Sesiones totales</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-neutral-800">
                    {withActivity.length}/{students.length}
                  </p>
                  <p className="text-[11px] text-neutral-500">Con actividad</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {students.map((student: Student) => {
                const stats = statsMap[student.id];
                const hasActivity = stats && stats.totalSessions > 0;
                return (
                  <button
                    key={student.id}
                    onClick={() =>
                      navigate(`/resultados-padre/${student.id}`, { state: { student } })
                    }
                    className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-sm"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                      🎓
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-neutral-800">
                          {getStudentFullName(student)}
                        </p>
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                          {getGradeDisplayName(student.grade)}
                        </span>
                      </div>
                      {!hasActivity ? (
                        <p className="text-xs text-neutral-400">
                          Sin actividad registrada
                        </p>
                      ) : (
                        <>
                          <div className="mt-1 h-2 overflow-hidden rounded bg-neutral-200">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.round(stats.averagePercentage)}%` }}
                            />
                          </div>
                          <p
                            className={`mt-1 text-xs font-semibold ${progressColor(stats.averagePercentage)}`}
                          >
                            {Math.round(stats.averagePercentage)}% · {stats.totalSessions}{' '}
                            sesiones · {stats.subjectCount} materias
                          </p>
                        </>
                      )}
                    </div>
                    <span className="text-neutral-400">›</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

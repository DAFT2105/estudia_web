// src/pages/results/StudentDetailPage.tsx
//
// Puerto funcional de student_detail_screen.dart -- usa
// resultService.getResultsByParent directo, igual que el original.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getResultsByParent } from '@/services/resultService';
import {
  getStudentFullName,
  getGradeDisplayName,
  getStudentAge,
  type Student,
} from '@/types/student';
import {
  EMPTY_PRACTICE_STATS,
  getResultRatingEmoji,
  getResultRatingDisplayName,
  getRating,
  getPercentageRounded,
  getSessionTypeDisplayName,
  type PracticeResult,
  type PracticeStats,
  type SessionType,
} from '@/types/practiceResult';
import { exportToCsv } from '@/utils/exportCsv';

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

function formatDate(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString();
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-neutral-200 text-neutral-500'
      }`}
    >
      {label}
    </button>
  );
}

export function StudentDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const student = (location.state as { student: Student } | undefined)?.student;

  const [results, setResults] = useState<PracticeResult[]>([]);
  const [stats, setStats] = useState<PracticeStats>(EMPTY_PRACTICE_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<SessionType | null>(null);

  useEffect(() => {
    if (!student) return;
    getResultsByParent(student.parentId).then((allResults) => {
      const ownResults = allResults.filter((r) => r.studentId === student.id);
      setResults(ownResults);
      setStats(buildStats(ownResults));
      setIsLoading(false);
    });
  }, [student]);

  if (!student) return null;

  const filtered = filterType
    ? results.filter((r) => r.sessionType === filterType)
    : results;
  const practiceCount = results.filter((r) => r.sessionType === 'practice').length;
  const examCount = results.filter((r) => r.sessionType === 'exam').length;
  const age = getStudentAge(student);

  const bySubject = new Map<string, PracticeResult[]>();
  for (const r of results) {
    const list = bySubject.get(r.subjectName) ?? [];
    list.push(r);
    bySubject.set(r.subjectName, list);
  }

  const handleExportCsv = () => {
    exportToCsv(
      `resultados_${getStudentFullName(student).replace(/\s+/g, '_')}`,
      filtered,
      [
        { header: 'Materia', accessor: (r) => r.subjectName },
        { header: 'Tipo', accessor: (r) => getSessionTypeDisplayName(r.sessionType) },
        { header: 'Correctas', accessor: (r) => r.correctAnswers },
        { header: 'Total', accessor: (r) => r.totalQuestions },
        { header: 'Porcentaje', accessor: (r) => `${getPercentageRounded(r)}%` },
        { header: 'Fecha', accessor: (r) => new Date(r.completedAt).toLocaleDateString() },
      ],
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary hover:underline"
          >
            ← Volver
          </button>
          {results.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleExportCsv}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                ⬇ Exportar CSV
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                🖨 Imprimir
              </button>
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold text-neutral-800">
          {getStudentFullName(student)}
        </h1>

        {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

        {!isLoading && results.length === 0 && (
          <div className="rounded-2xl bg-surface p-8 text-center">
            <p className="font-bold text-neutral-700">{getStudentFullName(student)}</p>
            <p className="mt-3 font-semibold text-neutral-600">
              Sin actividad registrada
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Este estudiante aún no ha completado prácticas ni exámenes
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <>
            <div className="rounded-2xl bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-xs font-semibold">
                  {getGradeDisplayName(student.grade)}
                </span>
                {age != null && (
                  <span className="text-xs text-neutral-500">{age} años</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-primary/10 p-5">
              <p className="font-bold text-primary">Estadísticas Generales</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-neutral-800">
                    {Math.round(stats.averagePercentage)}%
                  </p>
                  <p className="text-[11px] text-neutral-500">Promedio</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-800">{practiceCount}</p>
                  <p className="text-[11px] text-neutral-500">Prácticas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-800">{examCount}</p>
                  <p className="text-[11px] text-neutral-500">Exámenes</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-800">
                    {stats.subjectCount}
                  </p>
                  <p className="text-[11px] text-neutral-500">Materias</p>
                </div>
              </div>
              {stats.bestResult && (
                <p className="mt-3 border-t border-primary/20 pt-3 text-sm text-neutral-700">
                  🏆 Mejor resultado:{' '}
                  <span className="font-bold">
                    {getPercentageRounded(stats.bestResult)}% en{' '}
                    {stats.bestResult.subjectName}
                  </span>
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-surface p-4 shadow-sm">
              <p className="mb-3 font-bold text-neutral-800">Progreso por Materia</p>
              <div className="space-y-3">
                {[...bySubject.entries()].map(([subjectName, subjectResults]) => {
                  const avg =
                    subjectResults.reduce(
                      (s, r) =>
                        s +
                        (r.totalQuestions > 0
                          ? (r.correctAnswers / r.totalQuestions) * 100
                          : 0),
                      0,
                    ) / subjectResults.length;
                  const best = Math.max(
                    ...subjectResults.map((r) => getPercentageRounded(r)),
                  );
                  return (
                    <div key={subjectName}>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-neutral-700">
                          {subjectName}
                        </span>
                        <span className={`font-bold ${progressColor(avg)}`}>
                          {Math.round(avg)}% prom.
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded bg-neutral-200">
                        <div className="h-full bg-primary" style={{ width: `${avg}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">
                        {subjectResults.length} sesiones · Mejor: {best}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-800">Historial</h2>
              <div className="flex gap-1">
                <FilterChip
                  label="Todos"
                  active={filterType === null}
                  onClick={() => setFilterType(null)}
                />
                <FilterChip
                  label="Práctica"
                  active={filterType === 'practice'}
                  onClick={() => setFilterType('practice')}
                />
                <FilterChip
                  label="Examen"
                  active={filterType === 'exam'}
                  onClick={() => setFilterType('exam')}
                />
              </div>
            </div>

            <div className="space-y-2">
              {filtered.map((result) => {
                const rating = getRating(result);
                const isExam = result.sessionType === 'exam';
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-current text-xs font-bold ${progressColor(getPercentageRounded(result))}`}
                    >
                      {getPercentageRounded(result)}%
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-bold text-neutral-800">{result.subjectName}</p>
                        <span>{getResultRatingEmoji(rating)}</span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {result.correctAnswers}/{result.totalQuestions} correctas ·{' '}
                        {getResultRatingDisplayName(rating)}
                      </p>
                      <div className="mt-1 flex gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            isExam
                              ? 'border-red-300 text-error'
                              : 'border-green-300 text-success'
                          }`}
                        >
                          {getSessionTypeDisplayName(result.sessionType)}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {formatDate(result.completedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

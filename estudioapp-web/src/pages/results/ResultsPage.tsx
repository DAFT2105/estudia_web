// src/pages/results/ResultsPage.tsx
//
// Puerto funcional de results_screen.dart.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useResults } from '@/hooks/useResults';
import {
  isPracticeStatsEmpty,
  getAveragePercentageRounded,
  getResultRatingEmoji,
  getResultRatingDisplayName,
  getRating,
  getPercentageRounded,
  getSessionTypeDisplayName,
  type SessionType,
} from '@/types/practiceResult';
import { exportToCsv } from '@/utils/exportCsv';

type Filter = SessionType | 'all';

function formatDate(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString();
}

function percentageColor(percentage: number): string {
  if (percentage >= 90) return 'text-success border-success';
  if (percentage >= 70) return 'text-primary border-primary';
  if (percentage >= 50) return 'text-warning border-warning';
  return 'text-error border-error';
}

export function ResultsPage() {
  const { currentUser } = useAuth();
  const { results, stats, isLoading, hasResults, loadResults } = useResults();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (currentUser) loadResults(currentUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const practiceCount = results.filter((r) => r.sessionType === 'practice').length;
  const examCount = results.filter((r) => r.sessionType === 'exam').length;
  const filtered =
    filter === 'all' ? results : results.filter((r) => r.sessionType === filter);

  const handleExportCsv = () => {
    exportToCsv(
      `resultados_${currentUser.name.replace(/\s+/g, '_')}`,
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
          <Link to="/" className="text-sm text-student hover:underline">
            ← Inicio
          </Link>
          {hasResults && (
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
        <h1 className="text-xl font-bold text-neutral-800">Mis Resultados</h1>

        {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

        {!isLoading && !hasResults && (
          <div className="rounded-2xl bg-surface p-8 text-center">
            <p className="font-semibold text-neutral-700">Aún no tienes resultados</p>
            <p className="mt-1 text-sm text-neutral-500">
              Completa una práctica o examen para ver tu progreso aquí
            </p>
            <Link
              to="/practicar"
              className="mt-4 inline-block rounded-xl bg-student px-4 py-2 text-sm font-semibold text-white"
            >
              ▶ Ir a Practicar
            </Link>
          </div>
        )}

        {!isLoading && hasResults && stats && !isPracticeStatsEmpty(stats) && (
          <>
            <div className="rounded-2xl bg-student/10 p-5">
              <p className="font-bold text-student">Mi Progreso General</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <Stat value={`${getAveragePercentageRounded(stats)}%`} label="Promedio" />
                <Stat value={String(practiceCount)} label="Prácticas" />
                <Stat value={String(examCount)} label="Exámenes" />
                <Stat value={String(stats.subjectCount)} label="Materias" />
              </div>
              {stats.bestResult && (
                <p className="mt-3 border-t border-student/20 pt-3 text-sm text-neutral-700">
                  🏆 Mejor resultado:{' '}
                  <span className="font-bold">
                    {getPercentageRounded(stats.bestResult)}% en{' '}
                    {stats.bestResult.subjectName}
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-800">Historial</h2>
              <div className="flex gap-1">
                <FilterChip
                  label={`Todos (${results.length})`}
                  active={filter === 'all'}
                  onClick={() => setFilter('all')}
                />
                <FilterChip
                  label={`Práctica (${practiceCount})`}
                  active={filter === 'practice'}
                  onClick={() => setFilter('practice')}
                />
                <FilterChip
                  label={`Examen (${examCount})`}
                  active={filter === 'exam'}
                  onClick={() => setFilter('exam')}
                />
              </div>
            </div>

            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-500">
                  Sin resultados para este filtro
                </p>
              )}
              {filtered.map((result) => {
                const rating = getRating(result);
                const percentage = getPercentageRounded(result);
                const isExam = result.sessionType === 'exam';
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${percentageColor(percentage)}`}
                    >
                      {percentage}%
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-neutral-800">{result.subjectName}</p>
                        <span>{getResultRatingEmoji(rating)}</span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {result.correctAnswers}/{result.totalQuestions} correctas ·{' '}
                        {getResultRatingDisplayName(rating)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            isExam
                              ? 'border-red-300 text-error'
                              : 'border-green-300 text-success'
                          }`}
                        >
                          {getSessionTypeDisplayName(result.sessionType)}
                        </span>
                        <span className="text-xs text-neutral-400">
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-neutral-800">{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
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
          ? 'border-student bg-student/10 text-student'
          : 'border-neutral-200 text-neutral-500'
      }`}
    >
      {label}
    </button>
  );
}

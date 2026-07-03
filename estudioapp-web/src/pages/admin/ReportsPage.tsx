// src/pages/admin/ReportsPage.tsx
//
// Puerto funcional de reports_screen.dart.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getSystemStats,
  getAveragePercentageRounded,
  getPracticePercentage,
  getExamPercentage,
  getRatingCount,
  getRatingPercentage,
  type AdminStats,
} from '@/services/adminStatsService';
import {
  getResultRatingDisplayName,
  getResultRatingEmoji,
  type ResultRating,
} from '@/types/practiceResult';

const RATINGS: { rating: ResultRating; color: string }[] = [
  { rating: 'excellent', color: '#43A047' },
  { rating: 'good', color: '#8BC34A' },
  { rating: 'regular', color: '#FF9800' },
  { rating: 'needsWork', color: '#E53935' },
];

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-surface p-6 text-center text-sm text-neutral-500 shadow-sm">
      {message}
    </div>
  );
}

export function ReportsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    getSystemStats()
      .then((result) => {
        setStats(result);
        setError(null);
      })
      .catch((e) => setError(`Error al cargar estadísticas: ${e}`))
      .finally(() => setIsLoading(false));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Link to="/" className="text-sm text-admin hover:underline">
            ← Inicio
          </Link>
          {stats && (
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              🖨 Imprimir reporte
            </button>
          )}
        </div>
        <h1 className="text-xl font-bold text-neutral-800">Reportes y Estadísticas</h1>

        {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error">
            {error}
            <button onClick={load} className="ml-2 underline">
              Reintentar
            </button>
          </div>
        )}

        {stats && (
          <>
            <h2 className="font-bold text-neutral-800">Resumen general</h2>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="Padres" value={stats.totalParents} color="#388E3C" />
              <SummaryCard
                label="Estudiantes"
                value={stats.totalStudents}
                color="#1565C0"
              />
              <SummaryCard label="Materias" value={stats.totalSubjects} color="#FB8C00" />
              <SummaryCard
                label="Preguntas"
                value={stats.totalQuestions}
                color="#00897B"
              />
              <SummaryCard
                label="Sesiones totales"
                value={stats.totalSessions}
                color="#7B1FA2"
              />
              <SummaryCard label="Admins" value={stats.totalAdmins} color="#5E35B1" />
            </div>

            <h2 className="font-bold text-neutral-800">Rendimiento del sistema</h2>
            {stats.totalSessions === 0 ? (
              <EmptyCard message="Aún no hay sesiones de práctica/examen registradas en el sistema" />
            ) : (
              <div className="rounded-2xl bg-surface p-4 shadow-sm">
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-bold text-neutral-800">
                    {getAveragePercentageRounded(stats)}%
                  </p>
                  <p className="text-xs text-neutral-500">
                    promedio de aciertos
                    <br />
                    en todo el sistema
                  </p>
                </div>
                <p className="mt-4 mb-2 text-sm font-semibold text-neutral-700">
                  Distribución de calificaciones
                </p>
                <div className="space-y-2">
                  {RATINGS.map(({ rating, color }) => {
                    const percentage = getRatingPercentage(stats, rating);
                    const count = getRatingCount(stats, rating);
                    return (
                      <div key={rating} className="flex items-center gap-2 text-xs">
                        <span className="w-24 shrink-0">
                          {getResultRatingEmoji(rating)}{' '}
                          {getResultRatingDisplayName(rating)}
                        </span>
                        <div className="h-3.5 flex-1 overflow-hidden rounded bg-neutral-200">
                          <div
                            className="h-full rounded"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h2 className="font-bold text-neutral-800">Práctica vs Examen</h2>
            {stats.totalSessions === 0 ? (
              <EmptyCard message="Sin sesiones registradas todavía" />
            ) : (
              <div className="rounded-2xl bg-surface p-4 shadow-sm">
                <div className="flex h-7 overflow-hidden rounded-lg">
                  {stats.practiceSessionsCount > 0 && (
                    <div
                      className="bg-student"
                      style={{ flex: stats.practiceSessionsCount }}
                    />
                  )}
                  {stats.examSessionsCount > 0 && (
                    <div
                      className="bg-orange-600"
                      style={{ flex: stats.examSessionsCount }}
                    />
                  )}
                </div>
                <div className="mt-4 flex justify-around text-center text-xs">
                  <div>
                    <p>💪 Práctica</p>
                    <p className="text-neutral-500">
                      {stats.practiceSessionsCount} sesiones (
                      {Math.round(getPracticePercentage(stats))}
                      %)
                    </p>
                  </div>
                  <div>
                    <p>📝 Examen</p>
                    <p className="text-neutral-500">
                      {stats.examSessionsCount} sesiones (
                      {Math.round(getExamPercentage(stats))}%)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

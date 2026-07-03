// src/pages/home/HomePage.tsx
//
// Dashboard web con estilo Learnify: cards de color, barras de progreso,
// tabla de próximas sesiones. Paleta: #1e293b / #ff4d2e / #34d399 / #facc15.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useStudents } from '@/hooks/useStudents';
import { useQuestions } from '@/hooks/useQuestions';
import { useResults } from '@/hooks/useResults';
import { useActivityAlerts } from '@/hooks/useActivityAlerts';
import { computeWeeklyGoalsProgress, getStudentFullName } from '@/types/student';
import { getResultsByParent } from '@/services/resultService';
import type { PracticeResult } from '@/types/practiceResult';

export function HomePage() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  return (
    <>
      {currentUser.role === 'admin' && <AdminDashboard />}
      {currentUser.role === 'parent' && <ParentDashboard />}
      {currentUser.role === 'student' && <StudentDashboard />}
    </>
  );
}

// ── Paleta de tarjetas de materias (rota entre subjects) ──────────────────

const CARD_PALETTES = [
  { bg: '#facc15', text: '#1e293b', badge: '#1e293b', badgeText: '#fff' },
  { bg: '#34d399', text: '#1e293b', badge: '#ff4d2e', badgeText: '#fff' },
  { bg: '#e8f4fd', text: '#1e293b', badge: '#34d399', badgeText: '#fff' },
  { bg: '#ffede9', text: '#1e293b', badge: '#ff4d2e', badgeText: '#fff' },
];

function getPalette(index: number) {
  return CARD_PALETTES[index % CARD_PALETTES.length];
}

// ── Shared ────────────────────────────────────────────────────────────────

function PageHeader({ greeting, name, subtitle }: { greeting: string; name: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] uppercase tracking-widest text-neutral-400 font-medium">{greeting}</p>
      <h1 className="mt-0.5 text-xl font-bold text-ink tracking-tight">{name}</h1>
      {subtitle && <p className="mt-1 text-[12px] text-neutral-500">{subtitle}</p>}
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-sm border border-neutral-100">
      <div className="mb-2 h-1 w-8 rounded-full" style={{ backgroundColor: color }} />
      <p className="text-2xl font-bold text-ink tracking-tight">{value}</p>
      <p className="mt-0.5 text-[12px] text-neutral-400">{label}</p>
    </div>
  );
}

function SectionHeader({
  title,
  linkTo,
  linkLabel,
}: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="text-[12px] font-medium text-coral-text hover:underline">
          {linkLabel ?? 'Ver todo'}
        </Link>
      )}
    </div>
  );
}

interface SubjectCardProps {
  title: string;
  category: string;
  progress: number;
  total: number;
  done: number;
  to: string;
  palette: (typeof CARD_PALETTES)[0];
}

function SubjectCard({ title, category, progress, total, done, to, palette }: SubjectCardProps) {
  return (
    <div className="flex flex-col rounded-xl p-4" style={{ backgroundColor: palette.bg }}>
      <div className="mb-2">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: palette.badge, color: palette.badgeText }}
        >
          {category}
        </span>
      </div>
      <h3 className="mb-3 text-[13px] font-bold leading-snug" style={{ color: palette.text }}>
        {title}
      </h3>
      <div className="mt-auto space-y-1.5">
        <div className="flex justify-between text-[11px]" style={{ color: palette.text + '99' }}>
          <span>Progreso</span>
          <span>{done}/{total} preguntas</span>
        </div>
        <div className="h-1 rounded-full bg-black/10">
          <div
            className="h-1 rounded-full bg-ink/70 transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
      <Link
        to={to}
        className="mt-3 flex items-center justify-center rounded-lg bg-coral py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Continuar
      </Link>
    </div>
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const actions = [
    { to: '/admin/usuarios', label: 'Usuarios', sub: 'Admins, padres y estudiantes', color: '#34d399' },
    { to: '/materias', label: 'Materias', sub: 'Todas las materias del sistema', color: '#facc15' },
    { to: '/estudiantes', label: 'Estudiantes', sub: 'Ver todos los estudiantes', color: '#ff4d2e' },
    { to: '/admin/reportes', label: 'Reportes', sub: 'Estadísticas del sistema', color: '#34d399' },
  ];

  return (
    <div>
      <PageHeader greeting="Bienvenido de vuelta" name={currentUser.name} subtitle="Panel de administración" />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="card-clickable group rounded-2xl border border-neutral-100 bg-surface p-5 shadow-sm"
          >
            <div className="mb-3 h-10 w-10 rounded-xl" style={{ backgroundColor: a.color + '33' }}>
              <div className="flex h-full items-center justify-center">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: a.color }} />
              </div>
            </div>
            <p className="font-semibold text-ink group-hover:text-coral-text transition-colors">{a.label}</p>
            <p className="mt-0.5 text-xs text-neutral-400">{a.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Parent ────────────────────────────────────────────────────────────────

function ParentDashboard() {
  const { currentUser } = useAuth();
  const { activeSubjects, loadSubjects } = useSubjects();
  const { activeStudents, loadStudents } = useStudents();
  const { activeQuestions, loadQuestionsByCreator } = useQuestions();
  const [parentResults, setParentResults] = useState<PracticeResult[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    loadSubjects(currentUser.id, currentUser.role);
    loadStudents(currentUser.id);
    loadQuestionsByCreator(currentUser.id);
    getResultsByParent(currentUser.id).then(setParentResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Calcula y registra alertas de actividad (resultados nuevos + inactividad)
  useActivityAlerts(currentUser?.id, activeStudents);

  if (!currentUser) return null;

  const studentsWithGoals = activeStudents.filter((s) => (s.weeklyGoals?.length ?? 0) > 0);

  const iaLink = activeSubjects[0]
    ? `/materias/${activeSubjects[0].id}/preguntas/generar-ia`
    : '/materias';

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="-m-6">
      {/* ── Subbar de acciones contextuales ── */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-surface px-6 py-2.5">
        <div>
          <p className="text-[11px] text-neutral-400">{todayLabel}</p>
          <p className="text-[13px] font-semibold text-ink">Hola, {currentUser.name.split(' ')[0]} 👋</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/materias/nueva"
            className="rounded-lg border border-neutral-200 bg-background px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-neutral-100 transition-colors"
          >
            + Nueva materia
          </Link>
          <Link
            to="/estudiantes"
            className="rounded-lg border border-neutral-200 bg-background px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-neutral-100 transition-colors"
          >
            Estudiantes
          </Link>
          <Link
            to="/resultados-padre"
            className="rounded-lg border border-neutral-200 bg-background px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-neutral-100 transition-colors"
          >
            📊 Reportes
          </Link>
          <Link
            to={iaLink}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: '#1e293b' }}
          >
            <span style={{ color: '#ff4d2e' }}>✦</span>
            Generar IA
          </Link>
        </div>
      </div>

      {/* ── Bento grid ── */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-3">

          {/* Hero — 2 columnas */}
          <div
            className="relative col-span-2 overflow-hidden rounded-2xl p-5"
            style={{ backgroundColor: '#1e293b' }}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-15" style={{ background: '#ff4d2e' }} />
            <div className="pointer-events-none absolute -bottom-4 right-20 h-16 w-16 rounded-full opacity-10" style={{ background: '#facc15' }} />
            <p className="relative text-[11px] font-semibold uppercase tracking-widest text-white/40">Resumen semanal</p>
            <h2 className="relative mt-1 text-[18px] font-bold text-white">
              {activeStudents.length} estudiante{activeStudents.length !== 1 ? 's' : ''} activo{activeStudents.length !== 1 ? 's' : ''}
            </h2>
            <p className="relative mt-1 text-[12px] text-white/50">
              {activeSubjects.length} materias · {activeQuestions.length} preguntas creadas
            </p>
            <Link
              to="/resultados-padre"
              className="relative mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: '#ff4d2e' }}
            >
              Ver actividad →
            </Link>
          </div>

          {/* Stat sesiones */}
          <div className="flex flex-col justify-between rounded-2xl p-5" style={{ background: '#ff4d2e' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Preguntas</p>
            <div>
              <p className="text-[32px] font-bold leading-none text-white">{activeQuestions.length}</p>
              <p className="mt-1 text-[11px] text-white/60">creadas en total</p>
            </div>
          </div>

          {/* Materias — tall (2 filas) */}
          <div className="row-span-2 rounded-2xl border border-neutral-200 bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink/50">Materias</p>
              <Link to="/materias" className="text-[11px] font-semibold text-coral-text hover:underline">Ver todas</Link>
            </div>
            {activeSubjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-[12px] text-neutral-400">Sin materias aún</p>
                <Link to="/materias/nueva" className="mt-2 text-[12px] font-semibold text-coral-text hover:underline">+ Crear</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSubjects.slice(0, 5).map((s, i) => {
                  const dots = ['#facc15', '#34d399', '#ff4d2e', '#a78bfa', '#38bdf8'];
                  return (
                    <Link key={s.id} to={`/materias/${s.id}/preguntas`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-neutral-50 transition-colors">
                      <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: dots[i % dots.length] }} />
                      <span className="flex-1 truncate text-[12px] font-medium text-ink">{s.name}</span>
                      <span className="text-[10px] text-neutral-400">{s.area ?? ''}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stat promedio */}
          <div className="flex flex-col justify-between rounded-2xl p-5" style={{ background: '#34d399' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(6,78,59,0.6)' }}>Promedio</p>
            <div>
              <p className="text-[32px] font-bold leading-none" style={{ color: '#064e3b' }}>
                {activeStudents.length > 0 ? `${activeStudents.length}` : '—'}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: 'rgba(6,78,59,0.55)' }}>estudiantes</p>
            </div>
          </div>

          {/* Acción rápida IA */}
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{ backgroundColor: '#1e293b' }}
          >
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-15" style={{ background: '#facc15' }} />
            <p className="relative text-[10px] font-semibold uppercase tracking-widest text-white/40">Acción rápida</p>
            <Link
              to={iaLink}
              className="relative mt-2 flex items-center gap-2 text-[13px] font-bold text-white hover:opacity-80 transition-opacity"
            >
              <span style={{ color: '#ff4d2e' }}>✦</span>
              Crear preguntas con IA
            </Link>
          </div>

        </div>

        {/* Metas semanales */}
        {studentsWithGoals.length > 0 && (
          <div className="mt-4">
            <SectionHeader title="Metas semanales" linkTo="/estudiantes" linkLabel="Gestionar" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {studentsWithGoals.map((student) => {
                const ownResults = parentResults.filter((r) => r.studentId === student.id);
                const progress = computeWeeklyGoalsProgress(student, ownResults);
                return (
                  <div key={student.id} className="rounded-2xl bg-surface p-4 shadow-sm border border-neutral-100">
                    <p className="mb-2 text-[13px] font-bold text-ink">{getStudentFullName(student)}</p>
                    <div className="space-y-1.5">
                      {progress.map((p) => (
                        <div key={p.goal.id} className="flex items-center justify-between text-[12px]">
                          <span className="text-neutral-500">
                            {p.goal.type === 'sessions' ? 'Sesiones' : 'Promedio'}
                            {p.goal.type === 'averageScore' ? ' %' : ''}
                          </span>
                          <span className={`font-semibold ${p.met ? 'text-success' : 'text-neutral-600'}`}>
                            {p.met ? '✅' : '⏳'} {p.current}/{p.goal.target}
                            {!p.met && p.daysLeft > 0 && (
                              <span className="ml-1 text-neutral-400">· {p.daysLeft}d</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Student ───────────────────────────────────────────────────────────────

function StudentDashboard() {
  const { currentUser } = useAuth();
  const { activeSubjects, loadSubjects } = useSubjects();
  const { stats, loadResults } = useResults();

  useEffect(() => {
    if (!currentUser) return;
    loadSubjects(currentUser.id, currentUser.role);
    loadResults(currentUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const subjectCount = currentUser.assignedSubjects?.length ?? 0;
  const sessionCount = stats?.totalSessions ?? 0;
  const averagePercentage = stats ? Math.round(stats.averagePercentage) : 0;
  const bestPct = stats?.bestResult
    ? Math.round(
        (stats.bestResult.correctAnswers / stats.bestResult.totalQuestions) * 100
      )
    : null;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          greeting="Bienvenido de vuelta"
          name={currentUser.name}
          subtitle={bestPct !== null ? `Tu mejor resultado: ${bestPct}%` : 'Listo para estudiar hoy?'}
        />
        <div className="flex gap-2">
          <Link
            to="/practicar"
            className="rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Practicar ahora
          </Link>
          <Link
            to="/examen"
            className="rounded-xl border border-neutral-200 bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-neutral-50"
          >
            Modo examen
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard value={String(subjectCount)} label="Materias asignadas" color="#facc15" />
        <StatCard value={String(sessionCount)} label="Sesiones realizadas" color="#34d399" />
        <StatCard value={`${averagePercentage}%`} label="Promedio general" color="#ff4d2e" />
      </div>

      {/* Mis materias como cards */}
      <SectionHeader title="Mis materias" linkTo="/materias" linkLabel="Ver todas" />

      {activeSubjects.length === 0 ? (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-neutral-200 p-10 text-center">
          <p className="text-sm text-neutral-400">Aún no tienes materias asignadas.</p>
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeSubjects.slice(0, 3).map((subject, i) => (
            <SubjectCard
              key={subject.id}
              title={subject.name}
              category={subject.area ?? 'General'}
              progress={averagePercentage}
              total={20}
              done={Math.round((averagePercentage / 100) * 20)}
              to="/practicar"
              palette={getPalette(i)}
            />
          ))}
        </div>
      )}

      {/* Próximas sesiones */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-2xl bg-surface p-5 shadow-sm border border-neutral-100">
          <SectionHeader title="Mis próximas sesiones" linkTo="/practicar" linkLabel="Ver todas" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs text-neutral-400">
                <th className="pb-3 font-medium">Materia</th>
                <th className="pb-3 font-medium">Modo</th>
                <th className="pb-3 font-medium text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {activeSubjects.slice(0, 4).map((subject) => (
                <tr key={subject.id}>
                  <td className="py-3 font-semibold text-ink">{subject.name}</td>
                  <td className="py-3 text-neutral-400">Práctica libre</td>
                  <td className="py-3 text-right">
                    <Link
                      to="/practicar"
                      className="rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Estudiar
                    </Link>
                  </td>
                </tr>
              ))}
              {activeSubjects.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-sm text-neutral-400">
                    Sin materias asignadas aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card recomendación */}
        <div className="rounded-2xl p-5 text-white" style={{ backgroundColor: '#1e293b' }}>
          <p className="mb-2 text-xs text-white/50">Consejo del día</p>
          <span className="inline-block rounded-lg bg-yellow px-2.5 py-1 text-xs font-semibold text-ink mb-3">
            Modo Examen
          </span>
          <h3 className="text-base font-bold leading-snug mb-2">
            Practica con tiempo límite para mejorar tu rendimiento
          </h3>
          <p className="text-xs text-white/50 mb-4">Simula condiciones reales de evaluación</p>
          <Link
            to="/examen"
            className="block rounded-xl bg-coral py-2 text-center text-sm font-semibold text-white hover:opacity-90"
          >
            Ir al examen
          </Link>
        </div>
      </div>
    </div>
  );
}

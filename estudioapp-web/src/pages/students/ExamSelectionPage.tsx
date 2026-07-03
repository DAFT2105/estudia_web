// src/pages/students/ExamSelectionPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useQuestionSets } from '@/hooks/useQuestionSets';
import type { Subject } from '@/types/subject';
import { questionAppliesTo } from '@/types/question';
import * as questionService from '@/services/questionService';

const CARD_COLORS = [
  { bg: '#facc15', text: '#1e293b' },
  { bg: '#34d399', text: '#1e293b' },
  { bg: '#dbeafe', text: '#1e3a5f' },
  { bg: '#d1fae5', text: '#064e3b' },
  { bg: '#ffe4e6', text: '#881337' },
  { bg: '#fef3c7', text: '#78350f' },
];

function getColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}

export function ExamSelectionPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { subjects, loadSubjects } = useSubjects();
  const { loadSetsBySubject, sets } = useQuestionSets();
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadSubjects(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || subjects.length === 0) return;
    const assigned = subjects.filter((s) => currentUser.assignedSubjects?.includes(s.id));
    Promise.all(
      assigned.map(async (s) => {
        const questions = await questionService.getQuestionsBySubject(s.id);
        const count = questions.filter((q) => questionAppliesTo(q, 'exam')).length;
        return [s.id, count] as const;
      }),
    ).then((entries) => {
      setQuestionCounts(Object.fromEntries(entries));
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, currentUser?.id]);

  if (!currentUser) return null;

  const assignedSubjects = subjects.filter((s) =>
    currentUser.assignedSubjects?.includes(s.id),
  );

  const handleSelect = async (subject: Subject) => {
    if ((questionCounts[subject.id] ?? 0) === 0) return;
    await loadSetsBySubject(subject.id, 'exam');
    if (sets.length === 0) {
      navigate(`/examen/${subject.id}/config`, { state: { subject } });
    } else {
      navigate(`/examen/${subject.id}/modo`, { state: { subject, purpose: 'exam' } });
    }
  };

  const totalAvailable = assignedSubjects.filter(
    (s) => (questionCounts[s.id] ?? 0) > 0,
  ).length;

  return (
    <div className="space-y-6">
      {/* Hero banner — tono oscuro con acento coral para examen */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ backgroundColor: '#1e293b' }}>
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xl">⏱</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-coral/80">
              Modo Examen
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">Selecciona una materia</h1>
          <p className="mt-1 text-[12px] text-white/50">
            Tiempo limitado · Sin respuestas hasta el final · Simula el examen real
          </p>
          {!isLoading && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-coral" />
              <span className="text-[11px] text-white/70">
                {totalAvailable} de {assignedSubjects.length} disponibles
              </span>
            </div>
          )}
        </div>
        <div
          className="absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-10"
          style={{ backgroundColor: '#ff4d2e' }}
        />
        <div
          className="absolute -bottom-4 right-16 h-20 w-20 rounded-full opacity-10"
          style={{ backgroundColor: '#34d399' }}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-neutral-200" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && assignedSubjects.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-12 text-center">
          <p className="text-[13px] font-semibold text-neutral-600">Sin materias asignadas</p>
          <p className="mt-1 text-[12px] text-neutral-400">
            Contacta a tu tutor para que te asigne materias
          </p>
        </div>
      )}

      {/* Grid de materias */}
      {!isLoading && assignedSubjects.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {assignedSubjects.map((subject, i) => {
            const count = questionCounts[subject.id] ?? 0;
            const hasQuestions = count > 0;
            const color = getColor(i);

            return (
              <button
                key={subject.id}
                onClick={() => handleSelect(subject)}
                disabled={!hasQuestions}
                className={[
                  'group flex flex-col rounded-2xl p-5 text-left',
                  hasQuestions
                    ? 'card-clickable'
                    : 'cursor-not-allowed opacity-50 grayscale',
                ].join(' ')}
                style={{ backgroundColor: hasQuestions ? color.bg : '#e5e7eb' }}
              >
                {/* Badge estado */}
                <div className="mb-3 flex items-start justify-between">
                  {subject.area ? (
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: hasQuestions ? color.text + '18' : '#00000010',
                        color: hasQuestions ? color.text : '#6b7280',
                      }}
                    >
                      {subject.area}
                    </span>
                  ) : <span />}
                  {hasQuestions ? (
                    <span className="text-[10px] font-semibold text-coral-text">●&nbsp;Listo</span>
                  ) : (
                    <span className="text-[10px] text-neutral-400">Sin preguntas</span>
                  )}
                </div>

                {/* Nombre */}
                <p
                  className="text-[14px] font-bold leading-snug"
                  style={{ color: hasQuestions ? color.text : '#6b7280' }}
                >
                  {subject.name}
                </p>
                {subject.description && (
                  <p
                    className="mt-0.5 line-clamp-2 text-[11px] leading-snug"
                    style={{ color: hasQuestions ? color.text + '88' : '#9ca3af' }}
                  >
                    {subject.description}
                  </p>
                )}

                {/* Stats */}
                {hasQuestions && (
                  <div className="mt-auto pt-3">
                    <p
                      className="text-[11px] font-semibold"
                      style={{ color: color.text + '99' }}
                    >
                      {count} {count === 1 ? 'pregunta' : 'preguntas'} disponibles
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div
                  className={[
                    'mt-4 flex items-center justify-center rounded-xl py-2 text-[12px] font-bold',
                    hasQuestions
                      ? 'bg-coral text-white transition-opacity group-hover:opacity-90'
                      : 'bg-neutral-300 text-neutral-500',
                  ].join(' ')}
                >
                  {hasQuestions ? 'Comenzar examen →' : 'No disponible'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Nota informativa */}
      {!isLoading && assignedSubjects.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-surface p-4">
          <span className="mt-0.5 text-base">ℹ️</span>
          <div>
            <p className="text-[12px] font-semibold text-ink">Sobre el Modo Examen</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              Las materias sin preguntas configuradas no están disponibles para examen. Las respuestas
              correctas se muestran al finalizar toda la sesión.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

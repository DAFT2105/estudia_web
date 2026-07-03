// src/pages/students/PracticeSelectionPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useQuestionSets } from '@/hooks/useQuestionSets';
import { getFormattedDuration, type Subject } from '@/types/subject';
import { questionAppliesTo } from '@/types/question';
import * as questionService from '@/services/questionService';

// Paleta de color rotativa para las cards — coincide con la del dashboard
const CARD_COLORS = [
  { bg: '#facc15', text: '#1e293b', icon: '#1e293b' },
  { bg: '#34d399', text: '#1e293b', icon: '#1e293b' },
  { bg: '#dbeafe', text: '#1e3a5f', icon: '#1e3a5f' },
  { bg: '#d1fae5', text: '#064e3b', icon: '#064e3b' },
  { bg: '#ffe4e6', text: '#881337', icon: '#881337' },
  { bg: '#fef3c7', text: '#78350f', icon: '#78350f' },
];

function getColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}

export function PracticeSelectionPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { subjects, loadSubjects } = useSubjects();
  const { loadSetsBySubject, sets } = useQuestionSets();
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      await loadSubjects(currentUser.id, currentUser.role);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || subjects.length === 0) return;
    const assigned = subjects.filter((s) => currentUser.assignedSubjects?.includes(s.id));
    Promise.all(
      assigned.map(async (s) => {
        const questions = await questionService.getQuestionsBySubject(s.id);
        const count = questions.filter((q) => questionAppliesTo(q, 'practice')).length;
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
    await loadSetsBySubject(subject.id, 'practice');
    if (sets.length === 0) {
      navigate(`/practicar/${subject.id}/config`, { state: { subject } });
    } else {
      navigate(`/practicar/${subject.id}/modo`, {
        state: { subject, purpose: 'practice' },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ backgroundColor: '#1e293b' }}>
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xl">💪</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow/80">
              Modo Práctica
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">Selecciona una materia</h1>
          <p className="mt-1 text-[12px] text-white/50">
            Sin límite de tiempo · Respuestas al instante · Aprende a tu ritmo
          </p>
        </div>
        {/* Decoration */}
        <div
          className="absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-10"
          style={{ backgroundColor: '#facc15' }}
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
            const duration = getFormattedDuration(subject);
            const color = getColor(i);
            const pct = count > 0 ? Math.min(100, (count / 30) * 100) : 0;

            return (
              <button
                key={subject.id}
                onClick={() => handleSelect(subject)}
                className="card-clickable group flex flex-col rounded-2xl p-5 text-left"
                style={{ backgroundColor: color.bg }}
              >
                {/* Área + nombre */}
                <div className="mb-3">
                  {subject.area && (
                    <span
                      className="mb-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: color.icon + '22', color: color.icon }}
                    >
                      {subject.area}
                    </span>
                  )}
                  <p className="text-[14px] font-bold leading-snug" style={{ color: color.text }}>
                    {subject.name}
                  </p>
                  {subject.description && (
                    <p
                      className="mt-0.5 line-clamp-2 text-[11px] leading-snug"
                      style={{ color: color.text + '99' }}
                    >
                      {subject.description}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-[11px]" style={{ color: color.text + 'aa' }}>
                    <span>{count} preguntas</span>
                    {duration && <span>{duration}</span>}
                  </div>
                  <div className="h-1 w-full rounded-full" style={{ backgroundColor: color.text + '18' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color.text + '60' }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <div
                  className="mt-4 flex items-center justify-center rounded-xl py-2 text-[12px] font-bold transition-opacity group-hover:opacity-90"
                  style={{ backgroundColor: '#ff4d2e', color: '#fff' }}
                >
                  Practicar →
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// src/pages/students/QuestionSetChooserPage.tsx
//
// Puerto funcional de question_set_chooser_screen.dart.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuestions } from '@/hooks/useQuestions';
import { useQuestionSets } from '@/hooks/useQuestionSets';
import { getQuestionCount } from '@/types/questionSet';
import type { Subject } from '@/types/subject';
import type { Question, QuestionPurpose } from '@/types/question';

const TIME_OPTIONS = [
  { minutes: 10, label: '10 min', subtitle: 'Rápido' },
  { minutes: 20, label: '20 min', subtitle: 'Estándar' },
  { minutes: 30, label: '30 min', subtitle: 'Extendido' },
  { minutes: 45, label: '45 min', subtitle: 'Largo' },
];

export function QuestionSetChooserPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as
    { subject: Subject; purpose: QuestionPurpose } | undefined;
  const subject = state?.subject;
  const purpose = state?.purpose ?? 'practice';
  const isExam = purpose === 'exam';

  const { questions, loadQuestionsBySubject } = useQuestions();
  const { sets, loadSetsBySubject, resolveQuestions } = useQuestionSets();
  const [isLoading, setIsLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingSetQuestions, setPendingSetQuestions] = useState<Question[] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    Promise.all([
      loadSetsBySubject(subjectId, purpose),
      loadQuestionsBySubject(subjectId),
    ]).then(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, purpose]);

  if (!subject || !subjectId) return null;

  const goToConfig = () => {
    const base = isExam ? '/examen' : '/practicar';
    navigate(`${base}/${subjectId}/config`, { state: { subject }, replace: true });
  };

  const startWithQuestions = (
    selectedQuestions: Question[],
    timeLimitMinutes?: number,
  ) => {
    const base = isExam ? '/examen' : '/practicar';
    navigate(`${base}/${subjectId}/jugar`, {
      state: { subject, questions: selectedQuestions, timeLimitMinutes },
      replace: true,
    });
  };

  const handleSetClick = (setId: string) => {
    const set = sets.find((s) => s.id === setId);
    if (!set) return;
    const resolved = resolveQuestions(set, questions);
    if (resolved.length === 0) {
      setFeedback('No se pudieron cargar las preguntas de este grupo');
      return;
    }
    if (!isExam) {
      startWithQuestions(resolved);
      return;
    }
    setPendingSetQuestions(resolved);
    setShowTimePicker(true);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-lg font-bold text-neutral-800">
          ¿Cómo quieres {isExam ? 'tomar el examen de' : 'practicar'} {subject.name}?
        </h1>

        {feedback && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {feedback}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-neutral-500">Cargando…</p>
        ) : (
          <div className="space-y-3">
            <button
              onClick={goToConfig}
              className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                🔀
              </span>
              <div>
                <p className="font-bold text-neutral-800">Aleatorio</p>
                <p className="text-xs text-neutral-500">
                  Preguntas al azar de toda la materia
                </p>
              </div>
            </button>

            {sets.length > 0 && (
              <>
                <p className="text-xs text-neutral-500">Armados por tu padre/madre</p>
                {sets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => handleSetClick(set.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-surface p-4 text-left"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
                      📋
                    </span>
                    <div>
                      <p className="font-bold text-neutral-800">{set.title}</p>
                      <p className="text-xs text-neutral-500">
                        {getQuestionCount(set)} preguntas
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {showTimePicker && pendingSetQuestions && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5">
              <h2 className="font-bold text-neutral-800">
                ¿Cuánto tiempo para este examen?
              </h2>
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => startWithQuestions(pendingSetQuestions, opt.minutes)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-2 text-left"
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-xs text-neutral-500">{opt.subtitle}</span>
                </button>
              ))}
              <button
                onClick={() => setShowTimePicker(false)}
                className="w-full text-center text-sm text-neutral-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

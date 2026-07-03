// src/pages/students/ExamConfigPage.tsx
//
// Puerto funcional de exam_config_screen.dart.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuestions } from '@/hooks/useQuestions';
import { questionAppliesTo, getQuestionDifficultyDisplayName } from '@/types/question';
import type { QuestionDifficulty } from '@/types/question';
import type { Subject } from '@/types/subject';

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const TIME_OPTIONS = [
  { minutes: 10, label: '10 min', subtitle: 'Rápido' },
  { minutes: 20, label: '20 min', subtitle: 'Estándar' },
  { minutes: 30, label: '30 min', subtitle: 'Extendido' },
  { minutes: 45, label: '45 min', subtitle: 'Largo' },
];

export function ExamConfigPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const subject = (location.state as { subject: Subject } | undefined)?.subject;

  const { questions, loadQuestionsBySubject, getRandomQuestions } = useQuestions();
  const [isLoading, setIsLoading] = useState(true);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    loadQuestionsBySubject(subjectId).then(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // Derivado puro del render -- nada de useState+useEffect para esto.
  const examQuestions = questions.filter((q) => questionAppliesTo(q, 'exam'));
  const questionCount = userCount ?? Math.min(10, examQuestions.length);

  if (!subject || !subjectId) return null;

  const availableTopics = [
    ...new Set(examQuestions.map((q) => q.topic).filter((t): t is string => !!t)),
  ].sort();

  const minQ = examQuestions.length >= 5 ? 5 : examQuestions.length;
  const maxQ = Math.min(examQuestions.length, 50);

  const secPerQuestion = Math.floor((timeLimitMinutes * 60) / Math.max(questionCount, 1));
  const timePerQuestion =
    secPerQuestion >= 60
      ? `${Math.floor(secPerQuestion / 60)}m ${secPerQuestion % 60}s`
      : `${secPerQuestion}s`;

  const handleStart = async () => {
    const selected = await getRandomQuestions({
      subjectId,
      count: questionCount,
      difficulty: difficulty ?? undefined,
      topic: topic ?? undefined,
      purpose: 'exam',
    });
    if (selected.length === 0) {
      setFeedback('No se encontraron preguntas con esos filtros');
      return;
    }
    navigate(`/examen/${subjectId}/jugar`, {
      state: { subject, questions: selected, timeLimitMinutes },
    });
  };

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-neutral-500">Cargando…</p>;
  }

  if (examQuestions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="font-semibold text-neutral-700">No hay preguntas disponibles</p>
        <p className="text-sm text-neutral-500">
          Tu tutor aún no ha agregado preguntas para esta materia
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 pb-28">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4">
          <div>
            <p className="font-bold text-neutral-800">{subject.name}</p>
            <p className="text-xs text-neutral-500">
              {examQuestions.length} preguntas disponibles
            </p>
          </div>
          <span className="rounded-full border border-red-300 bg-red-100 px-2 py-1 text-xs font-bold text-red-600">
            EXAMEN
          </span>
        </div>

        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="mb-2 font-semibold text-neutral-700">Tiempo límite</p>
          <div className="grid grid-cols-4 gap-2">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => setTimeLimitMinutes(opt.minutes)}
                className={`rounded-lg border py-2 text-center ${
                  timeLimitMinutes === opt.minutes
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-neutral-200 text-neutral-600'
                }`}
              >
                <p className="text-sm font-bold">{opt.label}</p>
                <p className="text-[10px]">{opt.subtitle}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-neutral-700">Cantidad de preguntas</span>
            <span className="font-bold text-student">{questionCount}</span>
          </div>
          <input
            type="range"
            min={minQ}
            max={maxQ}
            value={questionCount}
            onChange={(e) => setUserCount(Number(e.target.value))}
            className="w-full accent-student"
          />
        </div>

        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="mb-2 font-semibold text-neutral-700">Dificultad</p>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="Todas"
              selected={difficulty === null}
              onClick={() => setDifficulty(null)}
            />
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={getQuestionDifficultyDisplayName(d)}
                selected={difficulty === d}
                onClick={() => setDifficulty(d)}
              />
            ))}
          </div>
        </div>

        {availableTopics.length > 0 && (
          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="mb-2 font-semibold text-neutral-700">Tema</p>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="Todos"
                selected={topic === null}
                onClick={() => setTopic(null)}
              />
              {availableTopics.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={topic === t}
                  onClick={() => setTopic(t)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Resumen del examen</p>
          <p>{questionCount} preguntas</p>
          <p>{timeLimitMinutes} minutos</p>
          <p>~{timePerQuestion} por pregunta</p>
          {difficulty && (
            <p>Dificultad: {getQuestionDifficultyDisplayName(difficulty)}</p>
          )}
          {topic && <p>Tema: {topic}</p>}
          <p className="mt-2 rounded bg-red-100 px-2 py-1">
            ⚠ No verás las respuestas hasta finalizar el examen
          </p>
        </div>

        {feedback && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {feedback}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleStart}
          className="mx-auto block w-full max-w-2xl rounded-xl bg-error py-3 text-center font-bold text-white"
        >
          ⏱ Comenzar Examen
        </button>
      </div>
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        selected ? 'bg-error text-white' : 'bg-neutral-100 text-neutral-600'
      }`}
    >
      {label}
    </button>
  );
}

// src/pages/students/ExamModePage.tsx
//
// Puerto funcional de exam_mode_screen.dart.

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useResults } from '@/hooks/useResults';
import {
  getQuestionTypeDisplayName,
  getQuestionDifficultyDisplayName,
  isCorrectAnswer,
} from '@/types/question';
import type { Question } from '@/types/question';
import type { Subject } from '@/types/subject';
import type { PracticeResult } from '@/types/practiceResult';
import { ResultDialog } from './PracticeModePage';
import { QuestionPrompt } from '@/components/QuestionPrompt';
import { useConfirm } from '@/hooks/useConfirm';

export function ExamModePage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { saveResult } = useResults();
  const confirm = useConfirm();

  const state = location.state as
    { subject: Subject; questions: Question[]; timeLimitMinutes: number } | undefined;
  const subject = state?.subject;
  const questions = state?.questions ?? [];
  const timeLimitMinutes = state?.timeLimitMinutes ?? 20;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitMinutes * 60);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [resultDialog, setResultDialog] = useState<{
    result: PracticeResult;
    incorrect: number;
  } | null>(null);
  const startTimeRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const finish = async () => {
    if (finishedRef.current || !currentUser || !subject) return;
    finishedRef.current = true;

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    let correctCount = 0;
    questions.forEach((q, i) => {
      const answer = answers[i];
      if (answer && isCorrectAnswer(q, answer)) correctCount++;
    });

    const result: PracticeResult = {
      id: `exam_${Date.now()}`,
      studentId: currentUser.id,
      subjectId: subject.id,
      subjectName: subject.name,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      completedAt: new Date().toISOString(),
      difficultyFilter: 'all',
      durationSeconds,
      sessionType: 'exam',
    };
    await saveResult(result, currentUser.parentId);
    setResultDialog({ result, incorrect: questions.length - correctCount });
  };

  useEffect(() => {
    if (questions.length === 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!subject || !subjectId || questions.length === 0) return null;

  const currentQuestion = questions[index];
  const isLast = index === questions.length - 1;
  const progress = ((index + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerColor =
    remainingSeconds <= 60
      ? 'text-red-300'
      : remainingSeconds <= 180
        ? 'text-orange-300'
        : 'text-white';

  const handleExit = async () => {
    const ok = await confirm({
      title: '¿Salir del examen?',
      description: 'Tu progreso no se guardará si sales ahora.',
      confirmLabel: 'Salir',
      tone: 'danger',
    });
    if (ok) navigate(-1);
  };

  const setAnswer = (value: string) =>
    setAnswers((prev) => ({ ...prev, [index]: value }));

  return (
    <div className="flex flex-col" style={{ margin: '-1.5rem', height: 'calc(100% + 3rem)' }}>
      <div className="bg-student px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <button onClick={handleExit}>✕</button>
          <div className="text-center">
            <p className="text-sm font-semibold">{subject.name}</p>
            <p className="text-xs text-white/70">
              Pregunta {index + 1} de {questions.length}
            </p>
          </div>
          <span
            className={`rounded-full bg-black/20 px-3 py-1 text-sm font-bold ${timerColor}`}
          >
            ⏱ {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-neutral-200">
        <div className="h-full bg-student" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          ℹ Modo Examen — No verás las respuestas hasta el final
        </div>

        <div className="rounded-2xl bg-surface p-5 shadow-sm">
          <div className="mb-3 flex gap-2 text-xs">
            <span className="rounded bg-neutral-100 px-2 py-1 font-semibold text-neutral-600">
              {getQuestionTypeDisplayName(currentQuestion.type)}
            </span>
            <span className="rounded bg-neutral-100 px-2 py-1 font-semibold text-neutral-600">
              {getQuestionDifficultyDisplayName(currentQuestion.difficulty)}
            </span>
          </div>
          <QuestionPrompt
            question={currentQuestion}
            textClassName="text-lg font-semibold text-neutral-800"
          />
          {currentQuestion.topic && (
            <p className="mt-2 text-xs text-neutral-400">🏷 {currentQuestion.topic}</p>
          )}
        </div>

        <ExamAnswerOptions
          question={currentQuestion}
          selected={answers[index] ?? null}
          onSelect={setAnswer}
        />
      </div>

      <div className="border-t border-neutral-200 bg-white p-4">
        <p className="mb-2 text-center text-xs text-neutral-500">
          ✓ {answeredCount}/{questions.length} respondidas
        </p>
        <div className="flex gap-3">
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="flex-1 rounded-xl border border-student py-3 font-semibold text-student"
            >
              ← Anterior
            </button>
          )}
          <button
            onClick={() => (isLast ? setShowConfirmFinish(true) : setIndex((i) => i + 1))}
            className={`flex-[2] rounded-xl py-3 font-bold text-white ${isLast ? 'bg-success' : 'bg-student'}`}
          >
            {isLast ? '🏁 Finalizar Examen' : 'Siguiente →'}
          </button>
        </div>
      </div>

      {showConfirmFinish && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5">
            <h2 className="font-bold text-neutral-800">🏁 Finalizar Examen</h2>
            <p className="text-sm text-neutral-700">
              Has respondido {answeredCount} de {questions.length} preguntas.
            </p>
            {answeredCount < questions.length && (
              <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
                ⚠ {questions.length - answeredCount} sin responder
              </p>
            )}
            <p className="text-sm text-neutral-700">¿Seguro que quieres finalizar?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmFinish(false)}
                className="flex-1 rounded-xl border border-neutral-300 py-2 text-sm"
              >
                Revisar
              </button>
              <button
                onClick={() => {
                  setShowConfirmFinish(false);
                  finish();
                }}
                className="flex-1 rounded-xl bg-success py-2 text-sm font-semibold text-white"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {resultDialog && (
        <ResultDialog
          result={resultDialog.result}
          color="bg-student"
          breakdown={{
            incorrect: resultDialog.incorrect,
            minutes: Math.floor(resultDialog.result.durationSeconds / 60),
            seconds: resultDialog.result.durationSeconds % 60,
          }}
          onNewAttempt={() => {}}
          onFinish={() => navigate('/examen')}
        />
      )}
    </div>
  );
}

function ExamAnswerOptions({
  question,
  selected,
  onSelect,
}: {
  question: Question;
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  if (question.type === 'shortAnswer') {
    return (
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="mb-2 font-medium text-neutral-700">Escribe tu respuesta:</p>
        <input
          value={selected ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="Tu respuesta aquí..."
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-student focus:outline-none"
        />
      </div>
    );
  }

  const options =
    question.type === 'trueFalse' ? ['Verdadero', 'Falso'] : question.options;

  return (
    <div className="space-y-3">
      {options.map((option, i) => {
        const isSelected = selected === option;
        const prefix =
          question.type === 'trueFalse'
            ? i === 0
              ? '✓'
              : '✗'
            : String.fromCharCode(65 + i);
        return (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left ${
              isSelected ? 'border-student bg-student/10' : 'border-neutral-200 bg-white'
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                isSelected ? 'bg-student text-white' : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              {prefix}
            </span>
            <span
              className={isSelected ? 'font-semibold text-student' : 'text-neutral-800'}
            >
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}

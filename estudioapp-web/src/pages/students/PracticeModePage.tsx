// src/pages/students/PracticeModePage.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useResults } from '@/hooks/useResults';
import {
  getQuestionTypeDisplayName,
  getQuestionDifficultyDisplayName,
  isCorrectAnswer,
} from '@/types/question';
import {
  getRating,
  getResultRatingDisplayName,
  getResultRatingEmoji,
} from '@/types/practiceResult';
import type { Question } from '@/types/question';
import type { Subject } from '@/types/subject';
import type { PracticeResult } from '@/types/practiceResult';
import {
  HELP_PROMPT_SECONDS,
  generateHelpContent,
  type HelpContent,
  type StudentLevelInfo,
} from '@/services/practiceHelpService';
import { StepByStepModal } from '@/components/StepByStepModal';
import { QuestionPrompt } from '@/components/QuestionPrompt';
import { useConfirm } from '@/hooks/useConfirm';
import { getStudentById } from '@/services/studentService';

// ── Tipos de diálogo de ayuda ─────────────────────────────────────────────

type HelpPhase =
  | 'idle'          // sin diálogo
  | 'nudge'         // "¿Necesitas ayuda?" (mini diálogo)
  | 'loading'       // generando contenido con IA
  | 'steps'         // modal paso a paso abierto
  | 'error';        // error al generar

// ── Componente principal ──────────────────────────────────────────────────

export function PracticeModePage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { saveResult } = useResults();
  const confirm = useConfirm();

  const state = location.state as { subject: Subject; questions: Question[] } | undefined;
  const subject = state?.subject;
  const questions = state?.questions ?? [];

  // ── Estado de la sesión ──
  const [index, setIndex]               = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isChecked, setIsChecked]       = useState(false);
  const [isCorrect, setIsCorrect]       = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [resultDialog, setResultDialog] = useState<PracticeResult | null>(null);

  // ── Timer y ayuda ──
  const [secsLeft, setSecsLeft]         = useState(HELP_PROMPT_SECONDS);
  const [helpPhase, setHelpPhase]       = useState<HelpPhase>('idle');
  const [helpContent, setHelpContent]   = useState<HelpContent | null>(null);
  const [helpError, setHelpError]       = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // El currentUser (de la colección `users`) no trae grade/gradeLevel —
  // esos campos solo viven en `students/{uid}`. Se cargan aparte para que
  // el tutor IA pueda adaptar el lenguaje al nivel real del estudiante.
  const [studentLevelInfo, setStudentLevelInfo] = useState<StudentLevelInfo | null>(null);
  useEffect(() => {
    if (!currentUser) return;
    getStudentById(currentUser.id).then((student) => {
      if (student) setStudentLevelInfo({ grade: student.grade, gradeLevel: student.gradeLevel });
    });
  }, [currentUser?.id]);

  // ── Reinicia el timer al cambiar de pregunta ──
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecsLeft(HELP_PROMPT_SECONDS);
    setHelpPhase('idle');
    setHelpContent(null);
    setHelpError(null);
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  // El timer solo corre cuando la pregunta no está verificada y no hay diálogo abierto
  useEffect(() => {
    if (isChecked || helpPhase !== 'idle') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setHelpPhase('nudge');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, isChecked, helpPhase]);

  if (!subject || !subjectId || questions.length === 0) return null;

  const currentQuestion = questions[index];
  const isLast  = index === questions.length - 1;
  const progress = ((index + 1) / questions.length) * 100;

  // Porcentaje del timer para la barra de progreso de tiempo
  const timerPct = (secsLeft / HELP_PROMPT_SECONDS) * 100;
  const timerColor = secsLeft > 30 ? '#43a047' : secsLeft > 10 ? '#facc15' : '#ff4d2e';

  // ── Handlers ──

  const handleExit = async () => {
    const ok = await confirm({
      title: '¿Salir de la práctica?',
      description: 'Tu progreso no se guardará.',
      confirmLabel: 'Salir',
      tone: 'danger',
    });
    if (ok) navigate(-1);
  };

  const checkAnswer = () => {
    if (!selectedAnswer) return;
    const correct = isCorrectAnswer(currentQuestion, selectedAnswer);
    setIsChecked(true);
    setIsCorrect(correct);
    if (correct) setCorrectCount((c) => c + 1);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const goNext = () => {
    if (isLast) { finish(); return; }
    setIndex((i) => i + 1);
    setSelectedAnswer(null);
    setIsChecked(false);
    setIsCorrect(false);
    resetTimer();
  };

  const finish = async () => {
    if (!currentUser) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: PracticeResult = {
      id: `result_${Date.now()}`,
      studentId: currentUser.id,
      subjectId: subject.id,
      subjectName: subject.name,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      completedAt: new Date().toISOString(),
      difficultyFilter: 'all',
      durationSeconds,
      sessionType: 'practice',
    };
    await saveResult(result, currentUser.parentId);
    setResultDialog(result);
  };

  // ── Handlers de ayuda ──

  const handleKeepThinking = () => {
    // Cierra el nudge y reinicia el timer
    resetTimer();
  };

  const handleNeedHelp = async () => {
    setHelpPhase('loading');
    try {
      // Si todavía no cargó el documento real del estudiante, cae a un
      // nivel genérico razonable en vez de bloquear la ayuda.
      const levelInfo: StudentLevelInfo = studentLevelInfo ?? { grade: 'secundaria', gradeLevel: 1 };
      const content = await generateHelpContent(currentQuestion, subject, levelInfo);
      setHelpContent(content);
      setHelpPhase('steps');
    } catch (e) {
      setHelpError(e instanceof Error ? e.message : 'Error desconocido');
      setHelpPhase('error');
    }
  };

  const handleHelpReady = () => {
    // "Sí, ya entendí" — cierra el modal y reinicia el timer
    resetTimer();
  };

  const handleHelpNotReady = () => {
    // "Todavía no" — el StepByStepModal reinicia sus propios pasos; no cerramos
  };

  // ── Render ──

  return (
    <div className="flex flex-col" style={{ margin: '-1.5rem', height: 'calc(100% + 3rem)' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-3 text-ink" style={{ backgroundColor: '#facc15' }}>
          <button
            onClick={handleExit}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 text-sm font-bold hover:bg-black/20 active:scale-95"
          >
            ✕
          </button>
          <span className="text-[13px] font-semibold uppercase tracking-wide">
            {subject.name}
          </span>
          <span className="text-[12px] font-bold">
            {index + 1}/{questions.length}
          </span>
        </div>

        {/* Barra de progreso de la sesión */}
        <div className="h-1 w-full bg-black/10">
          <div className="h-full bg-ink/40 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Barra de tiempo por pregunta (solo cuando no está verificada) */}
        {!isChecked && (
          <div className="relative h-1 w-full bg-neutral-100">
            <div
              className="h-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
            />
            {/* Contador de segundos */}
            {secsLeft <= 15 && secsLeft > 0 && (
              <span
                className="absolute right-2 top-1 text-[10px] font-bold"
                style={{ color: timerColor }}
              >
                {secsLeft}s
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Contenido scrollable ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {!isChecked ? (
          <>
            <div className="rounded-xl bg-surface p-5 shadow-sm border border-neutral-100">
              <div className="mb-3 flex gap-2">
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {getQuestionTypeDisplayName(currentQuestion.type)}
                </span>
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {getQuestionDifficultyDisplayName(currentQuestion.difficulty)}
                </span>
              </div>
              <QuestionPrompt
                question={currentQuestion}
                textClassName="text-[15px] font-semibold text-ink leading-snug"
              />
              {currentQuestion.topic && (
                <p className="mt-2 text-[11px] text-neutral-400">🏷 {currentQuestion.topic}</p>
              )}
            </div>

            <AnswerOptions
              question={currentQuestion}
              selected={selectedAnswer}
              onSelect={setSelectedAnswer}
              disabled={false}
            />
          </>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-xl border-2 p-5 text-center ${isCorrect ? 'border-success bg-green-50' : 'border-error bg-red-50'}`}>
              <p className="text-4xl">{isCorrect ? '✅' : '❌'}</p>
              <p className={`mt-2 text-base font-bold ${isCorrect ? 'text-success' : 'text-error'}`}>
                {isCorrect ? '¡Correcto!' : 'Incorrecto'}
              </p>
            </div>
            {!isCorrect && (
              <div className="rounded-xl bg-green-50 p-4 text-[12px]">
                <p className="font-bold text-success">Respuesta correcta:</p>
                <p>{currentQuestion.correctAnswer}</p>
              </div>
            )}
            {currentQuestion.explanation && (
              <div className="rounded-xl bg-blue-50 p-4 text-[12px] text-blue-800">
                <p className="font-bold">Explicación</p>
                <p>{currentQuestion.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Botón principal siempre visible ── */}
      <div className="flex-shrink-0 border-t border-neutral-200 bg-surface px-5 py-4">
        <button
          onClick={isChecked ? goNext : checkAnswer}
          disabled={!isChecked && !selectedAnswer}
          className="w-full rounded-xl bg-coral py-3 text-[13px] font-bold text-white disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {isChecked ? (isLast ? 'Ver Resultados' : 'Siguiente Pregunta') : 'Verificar Respuesta'}
        </button>
      </div>

      {/* ── Diálogo de resultado final ── */}
      {resultDialog && (
        <ResultDialog
          result={resultDialog}
          color="bg-yellow"
          onNewAttempt={() => navigate(`/practicar/${subjectId}/config`, { state: { subject } })}
          onFinish={() => navigate('/practicar')}
        />
      )}

      {/* ── Mini diálogo: "¿Necesitas ayuda?" ── */}
      {helpPhase === 'nudge' && (
        <NudgeDialog
          onKeepThinking={handleKeepThinking}
          onNeedHelp={handleNeedHelp}
        />
      )}

      {/* ── Cargando ayuda ── */}
      {helpPhase === 'loading' && <LoadingHelpOverlay />}

      {/* ── Error de ayuda ── */}
      {helpPhase === 'error' && (
        <ErrorHelpDialog
          message={helpError ?? 'Error desconocido'}
          onClose={resetTimer}
        />
      )}

      {/* ── Modal paso a paso ── */}
      {helpPhase === 'steps' && helpContent && (
        <StepByStepModal
          content={helpContent}
          onReady={handleHelpReady}
          onNotReady={handleHelpNotReady}
        />
      )}
    </div>
  );
}

// ── NudgeDialog ────────────────────────────────────────────────────────────

function NudgeDialog({
  onKeepThinking,
  onNeedHelp,
}: {
  onKeepThinking: () => void;
  onNeedHelp: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 pb-8 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl"
        style={{ animation: 'slideUp 250ms ease' }}
      >
        <div className="mb-4 text-center">
          <span className="text-4xl">🤔</span>
          <h2 className="mt-2 text-[15px] font-bold text-ink">¿Necesitas ayuda?</h2>
          <p className="mt-1 text-[12px] text-neutral-400">
            Llevas un rato en esta pregunta. ¿Quieres ver un ejemplo similar resuelto paso a paso?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onKeepThinking}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-50 active:scale-[0.98] transition-all"
          >
            Estoy pensando 💭
          </button>
          <button
            onClick={onNeedHelp}
            className="flex-1 rounded-xl py-2.5 text-[12px] font-bold text-white active:scale-[0.98] transition-all hover:opacity-90"
            style={{ backgroundColor: '#ff4d2e' }}
          >
            Sí, necesito ayuda
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── LoadingHelpOverlay ─────────────────────────────────────────────────────

function LoadingHelpOverlay() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl bg-surface px-8 py-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-coral border-t-transparent" />
        <p className="text-[13px] font-semibold text-ink">Preparando tu ejercicio de ayuda…</p>
        <p className="mt-1 text-[11px] text-neutral-400">El tutor IA está generando un ejemplo</p>
      </div>
    </div>
  );
}

// ── ErrorHelpDialog ────────────────────────────────────────────────────────

function ErrorHelpDialog({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-2xl">
        <span className="text-4xl">⚠️</span>
        <p className="mt-2 text-[13px] font-bold text-ink">No se pudo generar la ayuda</p>
        <p className="mt-1 text-[12px] text-neutral-400">{message}</p>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-coral py-2.5 text-[12px] font-bold text-white hover:opacity-90 active:scale-[0.98]"
        >
          Continuar sin ayuda
        </button>
      </div>
    </div>
  );
}

// ── AnswerOptions ──────────────────────────────────────────────────────────

function AnswerOptions({
  question,
  selected,
  onSelect,
  disabled,
}: {
  question: Question;
  selected: string | null;
  onSelect: (v: string) => void;
  disabled: boolean;
}) {
  if (question.type === 'shortAnswer') {
    return (
      <div className="rounded-xl bg-surface p-4 shadow-sm border border-neutral-100">
        <p className="mb-2 text-[12px] font-medium text-neutral-600">Escribe tu respuesta:</p>
        <input
          value={selected ?? ''}
          disabled={disabled}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="Tu respuesta aquí..."
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-[13px] focus:border-coral focus:outline-none"
        />
      </div>
    );
  }

  const options =
    question.type === 'trueFalse' ? ['Verdadero', 'Falso'] : question.options;

  return (
    <div className="space-y-2">
      {options.map((option, i) => {
        const isSelected = selected === option;
        const prefix =
          question.type === 'trueFalse'
            ? i === 0 ? '✓' : '✗'
            : String.fromCharCode(65 + i);
        return (
          <button
            key={option}
            disabled={disabled}
            onClick={() => onSelect(option)}
            className={`answer-option flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left ${
              isSelected
                ? 'border-yellow bg-yellow/10'
                : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors ${
                isSelected ? 'text-white' : 'bg-neutral-100 text-neutral-500'
              }`}
              style={isSelected ? { backgroundColor: '#facc15', color: '#1e293b' } : {}}
            >
              {prefix}
            </span>
            <span className={`text-[13px] ${isSelected ? 'font-semibold text-ink' : 'text-neutral-700'}`}>
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── ResultDialog (exportado para ExamModePage) ─────────────────────────────

export function ResultDialog({
  result,
  color,
  onNewAttempt,
  onFinish,
  breakdown,
}: {
  result: PracticeResult;
  color: string;
  onNewAttempt: () => void;
  onFinish: () => void;
  breakdown?: { incorrect: number; minutes: number; seconds: number };
}) {
  const rating      = getRating(result);
  const percentage  = result.totalQuestions > 0
    ? Math.round((result.correctAnswers / result.totalQuestions) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 text-center shadow-2xl">
        <p className="text-4xl">{getResultRatingEmoji(rating)}</p>
        <p className="font-bold text-neutral-800">
          {result.sessionType === 'exam' ? '¡Examen Completado!' : '¡Práctica Completada!'}
        </p>
        <p className={`text-5xl font-bold ${color.replace('bg-', 'text-')}`}>
          {percentage}%
        </p>
        <p className="font-semibold text-neutral-700">{getResultRatingDisplayName(rating)}</p>
        <p className="text-sm text-neutral-500">
          {result.correctAnswers} de {result.totalQuestions} correctas
        </p>
        {breakdown && (
          <div className="flex justify-around pt-2 text-xs">
            <div>
              <p className="font-bold text-success">{result.correctAnswers}</p>
              <p className="text-neutral-500">Correctas</p>
            </div>
            <div>
              <p className="font-bold text-error">{breakdown.incorrect}</p>
              <p className="text-neutral-500">Incorrectas</p>
            </div>
            <div>
              <p className="font-bold text-primary">{breakdown.minutes}m {breakdown.seconds}s</p>
              <p className="text-neutral-500">Tiempo</p>
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          {!breakdown && (
            <button
              onClick={onNewAttempt}
              className="flex-1 rounded-xl border border-neutral-300 py-2 text-sm hover:bg-neutral-50 active:scale-[0.98]"
            >
              Nueva Práctica
            </button>
          )}
          <button
            onClick={onFinish}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold text-white active:scale-[0.98] hover:opacity-90 ${color}`}
          >
            {breakdown ? 'Ver Resultados' : 'Finalizar'}
          </button>
        </div>
      </div>
    </div>
  );
}

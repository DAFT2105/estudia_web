// src/components/StepByStepModal.tsx

import { useState } from 'react';
import type { HelpContent } from '@/services/practiceHelpService';
import {
  MultiplicationGrid,
  computeMultiplicationData,
  placeFull,
} from '@/components/MultiplicationGrid';
import { EquationGrid, computeEquationData } from '@/components/EquationGrid';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  content: HelpContent;
  onReady: () => void;
  onNotReady: () => void;
}

// ── Pasos visuales para multiplicación ───────────────────────────────────────

interface MultiplicationVisualStep {
  kind: 'multiplication-step';
  revealedCount: number;
  activeIndex: number;
  label: string;
  factor1: number;
  factor2: number;
  sum: number;
}

function buildMultiplicationVisualSteps(factor1: number, factor2: number): MultiplicationVisualStep[] {
  const data = computeMultiplicationData(factor1, factor2);
  const steps: MultiplicationVisualStep[] = [];

  steps.push({
    kind: 'multiplication-step',
    revealedCount: 0,
    activeIndex: -1,
    label: `Planteamos la multiplicación: ${factor1} × ${factor2}`,
    factor1, factor2, sum: data.sum,
  });

  data.partials.forEach((p, i) => {
    const product = factor1 * p.digit;
    steps.push({
      kind: 'multiplication-step',
      revealedCount: i + 1,
      activeIndex: i,
      label: `Multiplicamos ${factor1} × ${p.digit} (${placeFull(p.shift)}) = ${product}${'0'.repeat(p.shift)}`,
      factor1, factor2, sum: data.sum,
    });
  });

  return steps;
}

// ── Pasos visuales para ecuaciones ───────────────────────────────────────────

interface EquationVisualStep {
  kind: 'equation-step';
  revealedCount: number; // 0 = original · 1 = término aislado · 2 = solución
  label: string;
  a: number;
  b: number;
  c: number;
}

function fmtTerm(a: number): string {
  if (a === 1) return 'X';
  if (a === -1) return '-X';
  return `${a}X`;
}

function buildEquationVisualSteps(a: number, b: number, c: number): EquationVisualStep[] {
  const { x } = computeEquationData(a, b, c);
  const bAbs = Math.abs(b);
  const isAdd = b >= 0;
  const afterTranspose = c - b;

  const steps: EquationVisualStep[] = [
    {
      kind: 'equation-step',
      revealedCount: 0,
      label: `Planteamos la ecuación: ${fmtTerm(a)} ${isAdd ? '+' : '-'} ${bAbs} = ${c}`,
      a, b, c,
    },
    {
      kind: 'equation-step',
      revealedCount: 1,
      label: `Como el ${bAbs} está ${isAdd ? 'sumando' : 'restando'}, pasa al otro lado ${isAdd ? 'restando' : 'sumando'}: ${fmtTerm(a)} = ${afterTranspose}`,
      a, b, c,
    },
  ];

  if (a === 1) {
    steps.push({
      kind: 'equation-step',
      revealedCount: 2,
      label: `El coeficiente de X ya es 1, así que X = ${x}`,
      a, b, c,
    });
  } else if (a === -1) {
    steps.push({
      kind: 'equation-step',
      revealedCount: 2,
      label: `Multiplicamos ambos lados por -1: X = ${x}`,
      a, b, c,
    });
  } else {
    steps.push({
      kind: 'equation-step',
      revealedCount: 2,
      label: `Como el ${a} está multiplicando, pasa al otro lado dividiendo: X = ${x}`,
      a, b, c,
    });
  }

  return steps;
}

// ── Tipo unión de pasos ───────────────────────────────────────────────────────

type DisplayStep =
  | { kind: 'text'; index: number; text: string }
  | MultiplicationVisualStep
  | EquationVisualStep;

// ── Componente principal ──────────────────────────────────────────────────────

export function StepByStepModal({ content, onReady, onNotReady }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<'steps' | 'done'>('steps');

  const isMultiplication = content.visual?.type === 'multiplication';
  const isEquation       = content.visual?.type === 'equation';

  const displaySteps: DisplayStep[] = isMultiplication
    ? buildMultiplicationVisualSteps(
        (content.visual as { type: 'multiplication'; factor1: number; factor2: number }).factor1,
        (content.visual as { type: 'multiplication'; factor1: number; factor2: number }).factor2,
      )
    : isEquation
      ? buildEquationVisualSteps(
          (content.visual as { type: 'equation'; a: number; b: number; c: number }).a,
          (content.visual as { type: 'equation'; a: number; b: number; c: number }).b,
          (content.visual as { type: 'equation'; a: number; b: number; c: number }).c,
        )
      : content.steps.map((text, index) => ({ kind: 'text' as const, index, text }));

  const totalSteps = displaySteps.length;
  const isLastStep = currentStep >= totalSteps - 1;
  const visibleTextSteps = displaySteps.slice(0, currentStep + 1);

  const isVisualMode = isMultiplication || isEquation;

  const multData = isMultiplication
    ? computeMultiplicationData(
        (content.visual as { type: 'multiplication'; factor1: number; factor2: number }).factor1,
        (content.visual as { type: 'multiplication'; factor1: number; factor2: number }).factor2,
      )
    : null;

  const handleNext = () => {
    if (isLastStep) setPhase('done');
    else setCurrentStep((s) => s + 1);
  };

  const handleNotReady = () => {
    setCurrentStep(0);
    setPhase('steps');
    onNotReady();
  };

  const stepCounter = `${currentStep + 1} / ${totalSteps}`;

  const headerSubtitle = isMultiplication
    ? 'Resolución paso a paso en escalera'
    : isEquation
      ? 'Resolución paso a paso de la ecuación'
      : 'Ejemplo resuelto paso a paso';

  const nextButtonLabel = isMultiplication
    ? (currentStep === 0 ? 'Empezar a multiplicar →' : 'Siguiente dígito →')
    : isEquation
      ? (currentStep === 0 ? 'Empezar a despejar →' : 'Siguiente paso →')
      : 'Siguiente paso →';

  const containerRef = useFocusTrap<HTMLDivElement>(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-surface shadow-2xl"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 rounded-t-2xl px-6 py-4"
          style={{ backgroundColor: '#1e293b' }}
        >
          <span className="text-2xl">🧑‍🏫</span>
          <div>
            <p className="text-[13px] font-bold text-white">Tutor IA · Ejercicio similar</p>
            <p className="text-[11px] text-white/50">{headerSubtitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {displaySteps.map((_step, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor:
                    i < currentStep
                      ? '#43a047'
                      : i === currentStep && phase === 'steps'
                        ? '#ff4d2e'
                        : '#ffffff25',
                  transform: i === currentStep && phase === 'steps' ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Enunciado ── */}
        <div className="border-b border-neutral-100 px-6 py-3">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Ejercicio similar
          </p>
          <p className="text-[14px] font-semibold leading-snug text-ink">
            {content.similarExercise}
          </p>
        </div>

        {/* ── Cuerpo ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {phase === 'steps' && (
            <>
              {isMultiplication && (() => {
                const step = displaySteps[currentStep] as MultiplicationVisualStep;
                return (
                  <div key={currentStep} style={{ animation: 'fadeSlideIn 350ms ease' }} className="space-y-3">
                    <StepLabel label={step.label} revealedCount={step.revealedCount} />
                    <MultiplicationGrid
                      factor1={step.factor1}
                      factor2={step.factor2}
                      revealedCount={step.revealedCount}
                      activeIndex={step.activeIndex}
                    />
                    {step.revealedCount >= (multData?.partials.length ?? 0) && step.revealedCount > 0 && (
                      <SumBanner sum={step.sum} />
                    )}
                  </div>
                );
              })()}

              {isEquation && (() => {
                const step = displaySteps[currentStep] as EquationVisualStep;
                return (
                  <div key={currentStep} style={{ animation: 'fadeSlideIn 350ms ease' }} className="space-y-3">
                    <StepLabel label={step.label} revealedCount={step.revealedCount} />
                    <EquationGrid a={step.a} b={step.b} c={step.c} revealedCount={step.revealedCount} />
                  </div>
                );
              })()}

              {!isVisualMode && visibleTextSteps.map((step, i) => (
                step.kind === 'text' ? (
                  <div
                    key={i}
                    style={{ animation: i === currentStep ? 'fadeSlideIn 350ms ease' : undefined }}
                    className="flex gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4"
                  >
                    <div
                      className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ backgroundColor: i === currentStep ? '#ff4d2e' : '#1e293b' }}
                    >
                      {step.index + 1}
                    </div>
                    <p className="text-[13px] leading-relaxed text-ink">{step.text}</p>
                  </div>
                ) : null
              ))}

              {/* Botón siguiente */}
              <button
                onClick={handleNext}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#ff4d2e' }}
              >
                {isLastStep ? (
                  <>Ver respuesta final ✓</>
                ) : (
                  <>
                    {nextButtonLabel}
                    <span className="ml-1 text-white/60 text-[12px]">({stepCounter})</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* ── Fase final ── */}
          {phase === 'done' && (
            <div className="space-y-3">
              {isMultiplication && multData && (
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Resolución completa
                  </p>
                  <MultiplicationGrid
                    factor1={(content.visual as { type: 'multiplication'; factor1: number; factor2: number }).factor1}
                    factor2={(content.visual as { type: 'multiplication'; factor1: number; factor2: number }).factor2}
                    revealedCount={multData.partials.length}
                    activeIndex={-1}
                  />
                </div>
              )}

              {isEquation && (
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Resolución completa
                  </p>
                  <EquationGrid
                    a={(content.visual as { type: 'equation'; a: number; b: number; c: number }).a}
                    b={(content.visual as { type: 'equation'; a: number; b: number; c: number }).b}
                    c={(content.visual as { type: 'equation'; a: number; b: number; c: number }).c}
                    revealedCount={2}
                  />
                </div>
              )}

              {!isVisualMode && content.steps.map((step, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-neutral-50 p-3">
                  <div
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: '#43a047' }}
                  >
                    ✓
                  </div>
                  <p className="text-[12px] text-neutral-600">{step}</p>
                </div>
              ))}

              {/* Respuesta final */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: '#facc1533', border: '2px solid #facc15' }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/60">
                  Respuesta final del ejercicio similar
                </p>
                <p className="mt-1 text-[15px] font-bold text-ink">{content.finalAnswer}</p>
              </div>

              {/* ¿Listo? */}
              <div className="rounded-xl border border-neutral-200 bg-surface p-5 text-center">
                <p className="text-[14px] font-bold text-ink">¿Ya estás listo para tu pregunta?</p>
                <p className="mt-1 text-[12px] text-neutral-400">
                  Aplica el mismo método a tu pregunta original
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleNotReady}
                    className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-50 active:scale-[0.98]"
                  >
                    Todavía no — repetir
                  </button>
                  <button
                    onClick={onReady}
                    className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: '#ff4d2e' }}
                  >
                    Sí, ya entendí ✓
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Subcomponentes compartidos ────────────────────────────────────────────────

function StepLabel({ label, revealedCount }: { label: string; revealedCount: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-4 py-2.5"
      style={{
        backgroundColor: revealedCount === 0 ? '#1e293b' : '#fff7ed',
        border: revealedCount === 0 ? 'none' : '1.5px solid #ff4d2e40',
      }}
    >
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
        style={{ backgroundColor: revealedCount === 0 ? '#ffffff20' : '#ff4d2e', color: '#fff' }}
      >
        {revealedCount === 0 ? '→' : revealedCount}
      </span>
      <p className="text-[13px] font-semibold" style={{ color: revealedCount === 0 ? '#fff' : '#ff4d2e' }}>
        {label}
      </p>
    </div>
  );
}

function SumBanner({ sum }: { sum: number }) {
  return (
    <div className="rounded-xl px-4 py-3 text-center" style={{ backgroundColor: '#ff4d2e15', border: '1.5px solid #ff4d2e40' }}>
      <p className="text-[12px] font-semibold text-neutral-500">Suma de productos parciales</p>
      <p className="text-[18px] font-bold" style={{ color: '#ff4d2e' }}>= {sum.toLocaleString()}</p>
    </div>
  );
}

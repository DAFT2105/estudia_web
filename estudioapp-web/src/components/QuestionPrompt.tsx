// src/components/QuestionPrompt.tsx
//
// Muestra el planteamiento de una pregunta: si el texto corresponde a una
// multiplicación o ecuación lineal "directa", se renderiza como cuadrícula
// visual (sin revelar la respuesta — revealedCount=0/1 según el caso).
// En cualquier otro caso, se muestra el texto plano tal cual.

import type { Question } from '@/types/question';
import { tryExtractMultiplication, tryExtractEquation } from '@/services/mathQuestionDetectors';
import { MultiplicationGrid } from '@/components/MultiplicationGrid';
import { EquationGrid } from '@/components/EquationGrid';

interface Props {
  question: Question;
  /** Clase para el texto plano cuando no aplica ningún formato visual. */
  textClassName?: string;
}

export function QuestionPrompt({ question, textClassName }: Props) {
  const multiplication = tryExtractMultiplication(question);
  const equation = !multiplication ? tryExtractEquation(question) : null;

  if (multiplication) {
    return (
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-neutral-500">{question.text}</p>
        <MultiplicationGrid
          factor1={multiplication.factor1}
          factor2={multiplication.factor2}
          revealedCount={0}
        />
      </div>
    );
  }

  if (equation) {
    return (
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-neutral-500">{question.text}</p>
        <EquationGrid a={equation.a} b={equation.b} c={equation.c} revealedCount={0} />
      </div>
    );
  }

  return <p className={textClassName}>{question.text}</p>;
}

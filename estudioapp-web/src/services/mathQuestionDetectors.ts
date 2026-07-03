// src/services/mathQuestionDetectors.ts
//
// Detecta cuándo una pregunta de matemática es un "ejercicio directo"
// (multiplicación, ecuación lineal) que se puede mostrar como cuadrícula
// visual en vez de texto plano — tanto en el planteamiento de la pregunta
// (PracticeModePage/ExamModePage) como en el modal de ayuda (StepByStepModal).
//
// El criterio NO depende de cómo se generó la pregunta (manual, IA, imagen):
// se analiza el texto ya guardado. Si no matchea ningún patrón, se queda
// como texto plano — esto es aditivo, nunca obligatorio.

import type { Question } from '@/types/question';

// ── Detección ────────────────────────────────────────────────────────────────

/** Detecta si la pregunta trata de una multiplicación de varios dígitos. */
export function isMultiplicationQuestion(question: Question): boolean {
  const text = `${question.text} ${question.topic ?? ''}`.toLowerCase();
  return /multiplicaci[oó]n|multiplica|producto de|×|\bx\d|\d\s*x\s*\d/.test(text);
}

/** Detecta preguntas de secuencias/patrones — propensas a "pasarse" de término. */
export function isSequenceQuestion(question: Question): boolean {
  const text = `${question.text} ${question.topic ?? ''}`.toLowerCase();
  return /secuencia|sucesi[oó]n|patr[oó]n|siguiente (n[uú]mero|t[eé]rmino|valor)|qu[eé] (n[uú]mero|t[eé]rmino) sigue/.test(text);
}

/** Detecta ecuaciones lineales / despejes — requiere "=" y mención de variable o "despejar". */
export function isEquationQuestion(question: Question): boolean {
  const text = `${question.text} ${question.topic ?? ''}`;
  if (!text.includes('=')) return false;
  return /ecuaci[oó]n|despejar|resolver para\s*x|hallar (el valor de\s*)?x|\bx\s*=|\d+\s*x\b/i.test(text);
}

// ── Extracción de números desde el texto de la pregunta ──────────────────────

function parseLocaleNumber(raw: string): number {
  // Quita separadores de miles (puntos o comas) usados como agrupador
  return Number(raw.replace(/[.,](?=\d{3}\b)/g, '').replace(/[.,]$/g, ''));
}

/**
 * Intenta extraer los dos factores de una pregunta de multiplicación, ej:
 * "¿Cuál es el resultado de 542 × 819?" → { factor1: 542, factor2: 819 }
 * Devuelve null si no se detecta multiplicación o no se pueden extraer
 * ambos factores como enteros positivos.
 */
export function tryExtractMultiplication(
  question: Question,
): { factor1: number; factor2: number } | null {
  if (!isMultiplicationQuestion(question)) return null;

  // Acepta "×" o "x" entre dos números (con posibles separadores de miles)
  const match = question.text.match(/(\d[\d.,]*)\s*[×x]\s*(\d[\d.,]*)/i);
  if (!match) return null;

  const factor1 = parseLocaleNumber(match[1]);
  const factor2 = parseLocaleNumber(match[2]);

  if (!Number.isFinite(factor1) || !Number.isFinite(factor2)) return null;
  if (factor1 <= 0 || factor2 <= 0) return null;
  if (!Number.isInteger(factor1) || !Number.isInteger(factor2)) return null;

  return { factor1, factor2 };
}

/**
 * Intenta extraer los coeficientes de una ecuación lineal a·X + b = c, ej:
 * "Resuelve: 3X + 15 = 45" → { a: 3, b: 15, c: 45 }
 * "15 + 3X = 45"           → { a: 3, b: 15, c: 45 } (mismo resultado, orden distinto)
 * Soporta b negativo (ej. "3X - 15 = 45" → b: -15).
 * Devuelve null si no se detecta ecuación o no se pueden extraer los 3
 * coeficientes enteros con solución entera para X.
 */
export function tryExtractEquation(
  question: Question,
): { a: number; b: number; c: number } | null {
  if (!isEquationQuestion(question)) return null;

  const text = question.text.replace(/\s+/g, ' ');

  // Forma "aX ± b = c"  (el término con la variable va primero)
  const formA = text.match(/(-?\d*)\s*X\s*([+-])\s*(\d+)\s*=\s*(-?\d+)/i);
  // Forma "b ± aX = c"  (la constante va primero)
  const formB = text.match(/(-?\d+)\s*([+-])\s*(\d*)\s*X\s*=\s*(-?\d+)/i);

  let a: number | null = null;
  let b: number | null = null;
  let c: number | null = null;

  if (formA) {
    const coefRaw = formA[1];
    a = coefRaw === '' || coefRaw === '-' ? (coefRaw === '-' ? -1 : 1) : Number(coefRaw);
    const sign = formA[2] === '+' ? 1 : -1;
    b = sign * Number(formA[3]);
    c = Number(formA[4]);
  } else if (formB) {
    const constant = Number(formB[1]);
    const sign = formB[2] === '+' ? 1 : -1;
    const coefRaw = formB[3];
    const coef = coefRaw === '' ? 1 : Number(coefRaw);
    a = sign * coef;
    b = constant;
    c = Number(formB[4]);
  }

  if (a == null || b == null || c == null) return null;
  if (a === 0 || !Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) return null;

  const x = (c - b) / a;
  if (!Number.isInteger(x)) return null;

  return { a, b, c };
}

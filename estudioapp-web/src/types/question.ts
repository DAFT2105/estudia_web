// src/types/question.ts
//
// Puerto literal de lib/models/question.dart

export type QuestionType = 'multipleChoice' | 'trueFalse' | 'shortAnswer';

const QUESTION_TYPE_DISPLAY_NAME: Record<QuestionType, string> = {
  multipleChoice: 'Opción Múltiple',
  trueFalse: 'Verdadero/Falso',
  shortAnswer: 'Respuesta Corta',
};

export function getQuestionTypeDisplayName(type: QuestionType): string {
  return QUESTION_TYPE_DISPLAY_NAME[type];
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

const QUESTION_DIFFICULTY_DISPLAY_NAME: Record<QuestionDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
};

const QUESTION_DIFFICULTY_VALUE: Record<QuestionDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function getQuestionDifficultyDisplayName(difficulty: QuestionDifficulty): string {
  return QUESTION_DIFFICULTY_DISPLAY_NAME[difficulty];
}

export function getQuestionDifficultyValue(difficulty: QuestionDifficulty): number {
  return QUESTION_DIFFICULTY_VALUE[difficulty];
}

/**
 * Para qué modo está pensada la pregunta. Exclusivo: una pregunta es para
 * Práctica O para Examen, no ambas. `undefined`/`null` = preguntas creadas
 * antes de que existiera este campo — se tratan como válidas para AMBOS
 * modos (ver `questionAppliesTo`), nunca desaparecen de ningún lado por no
 * haber sido re-etiquetadas.
 */
export type QuestionPurpose = 'practice' | 'exam';

const QUESTION_PURPOSE_DISPLAY_NAME: Record<QuestionPurpose, string> = {
  practice: 'Práctica',
  exam: 'Examen',
};

export function getQuestionPurposeDisplayName(purpose: QuestionPurpose): string {
  return QUESTION_PURPOSE_DISPLAY_NAME[purpose];
}

export interface Question {
  id: string;
  subjectId: string; // Materia a la que pertenece
  createdBy: string; // ID del usuario que la creó
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  topic?: string | null;
  difficulty: QuestionDifficulty;
  purpose?: QuestionPurpose | null;
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
  imageUrl?: string | null; // Para futuro
}

/** Equivalente a `Question.isCorrect` */
export function isCorrectAnswer(question: Question, answer: string): boolean {
  return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
}

/** Letra de la opción correcta (A, B, C, D) — solo para multipleChoice */
export function getCorrectOptionLetter(question: Question): string | null {
  if (question.type !== 'multipleChoice') return null;
  const index = question.options.findIndex(
    (opt) => opt.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase(),
  );
  if (index === -1) return null;
  return String.fromCharCode(65 + index); // 65 = 'A'
}

/**
 * ¿Esta pregunta aplica para el modo dado? Las preguntas sin `purpose`
 * definido se consideran válidas para AMBOS modos.
 */
export function questionAppliesTo(question: Question, mode: QuestionPurpose): boolean {
  return question.purpose == null || question.purpose === mode;
}

/** Validar que la pregunta esté bien formada — equivalente a `Question.isValid` */
export function isQuestionValid(question: Question): boolean {
  if (question.text.trim().length === 0) return false;
  if (question.correctAnswer.trim().length === 0) return false;

  switch (question.type) {
    case 'multipleChoice':
      return (
        question.options.length >= 2 &&
        question.options.length <= 6 &&
        question.options.includes(question.correctAnswer)
      );
    case 'trueFalse':
      return ['verdadero', 'falso', 'true', 'false'].includes(
        question.correctAnswer.toLowerCase(),
      );
    case 'shortAnswer':
      return question.correctAnswer.length <= 100;
  }
}

export const QUESTION_DEFAULTS = {
  difficulty: 'medium' as QuestionDifficulty,
  isActive: true,
} as const;

export class QuestionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionException';
  }
}

/**
 * Puerto de la clase `QuestionStats` definida en question_service.dart —
 * se calcula en memoria a partir de la lista de preguntas de una materia.
 */
export interface QuestionStats {
  totalQuestions: number;
  questionsByType: Record<QuestionType, number>;
  questionsByDifficulty: Record<QuestionDifficulty, number>;
  uniqueTopics: number;
  topicsList: string[];
}

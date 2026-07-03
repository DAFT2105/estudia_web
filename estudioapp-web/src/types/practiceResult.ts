// src/types/practiceResult.ts
//
// Puerto literal de lib/models/practice_result.dart

export type SessionType = 'practice' | 'exam';

const SESSION_TYPE_DISPLAY_NAME: Record<SessionType, string> = {
  practice: 'Práctica',
  exam: 'Examen',
};

const SESSION_TYPE_EMOJI: Record<SessionType, string> = {
  practice: '💪',
  exam: '📝',
};

export function getSessionTypeDisplayName(type: SessionType): string {
  return SESSION_TYPE_DISPLAY_NAME[type];
}

export function getSessionTypeEmoji(type: SessionType): string {
  return SESSION_TYPE_EMOJI[type];
}

export type ResultRating = 'excellent' | 'good' | 'regular' | 'needsWork';

const RESULT_RATING_DISPLAY_NAME: Record<ResultRating, string> = {
  excellent: '¡Excelente!',
  good: '¡Bien!',
  regular: 'Regular',
  needsWork: 'A mejorar',
};

const RESULT_RATING_EMOJI: Record<ResultRating, string> = {
  excellent: '🏆',
  good: '⭐',
  regular: '📚',
  needsWork: '💪',
};

export function getResultRatingDisplayName(rating: ResultRating): string {
  return RESULT_RATING_DISPLAY_NAME[rating];
}

export function getResultRatingEmoji(rating: ResultRating): string {
  return RESULT_RATING_EMOJI[rating];
}

export type QuestionDifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

const QUESTION_DIFFICULTY_FILTER_DISPLAY_NAME: Record<QuestionDifficultyFilter, string> =
  {
    all: 'Todas',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
  };

export function getQuestionDifficultyFilterDisplayName(
  filter: QuestionDifficultyFilter,
): string {
  return QUESTION_DIFFICULTY_FILTER_DISPLAY_NAME[filter];
}

/** Resultado inmutable una vez creado — reglas de Firestore: allow update, delete: if false */
export interface PracticeResult {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
  difficultyFilter: QuestionDifficultyFilter;
  durationSeconds: number;
  sessionType: SessionType;
}

export function getIncorrectAnswers(result: PracticeResult): number {
  return result.totalQuestions - result.correctAnswers;
}

export function getPercentage(result: PracticeResult): number {
  return result.totalQuestions > 0
    ? (result.correctAnswers / result.totalQuestions) * 100
    : 0;
}

export function getPercentageRounded(result: PracticeResult): number {
  return Math.round(getPercentage(result));
}

/** Equivalente a `PracticeResult.rating` */
export function getRating(result: PracticeResult): ResultRating {
  const percentage = getPercentage(result);
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'regular';
  return 'needsWork';
}

export const PRACTICE_RESULT_DEFAULTS = {
  difficultyFilter: 'all' as QuestionDifficultyFilter,
  durationSeconds: 0,
  sessionType: 'practice' as SessionType,
} as const;

export class ResultException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResultException';
  }
}

/**
 * Puerto de la clase `PracticeStats` definida en result_service.dart —
 * se calcula a partir de la lista de resultados de un estudiante.
 */
export interface PracticeStats {
  totalSessions: number;
  averagePercentage: number;
  bestResult: PracticeResult | null;
  subjectCount: number;
  recentResults: PracticeResult[];
}

export function isPracticeStatsEmpty(stats: PracticeStats): boolean {
  return stats.totalSessions === 0;
}

export function getAveragePercentageRounded(stats: PracticeStats): number {
  return Math.round(stats.averagePercentage);
}

export const EMPTY_PRACTICE_STATS: PracticeStats = {
  totalSessions: 0,
  averagePercentage: 0,
  bestResult: null,
  subjectCount: 0,
  recentResults: [],
};

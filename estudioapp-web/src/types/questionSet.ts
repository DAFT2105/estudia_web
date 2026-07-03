// src/types/questionSet.ts
//
// Puerto literal de lib/models/question_set.dart

import type { QuestionPurpose } from './question';

/**
 * Un grupo de preguntas elegidas a mano por el padre (de uno o varios temas
 * dentro de la misma materia) para armar un Examen o Práctica reutilizable
 * — alternativa a la generación aleatoria.
 */
export interface QuestionSet {
  id: string;
  subjectId: string;
  createdBy: string; // ID del padre que lo armó
  title: string; // Ej: "Examen Bimestral 1"
  description?: string | null;
  purpose: QuestionPurpose; // Coherente con las preguntas que contiene — no se mezclan modos
  questionIds: string[]; // En el orden elegido por el padre
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
}

export function getQuestionCount(set: QuestionSet): number {
  return set.questionIds.length;
}

/** Equivalente a `QuestionSet.canEdit` */
export function canEditQuestionSet(
  set: QuestionSet,
  userId: string,
  userRole: string,
): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'parent') return set.createdBy === userId;
  return false;
}

export class QuestionSetException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionSetException';
  }
}

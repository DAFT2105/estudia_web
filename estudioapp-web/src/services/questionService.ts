// src/services/questionService.ts
//
// Puerto de lib/services/question_service.dart

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  isQuestionValid,
  questionAppliesTo,
  QuestionException,
  type Question,
  type QuestionDifficulty,
  type QuestionPurpose,
  type QuestionStats,
  type QuestionType,
} from '@/types/question';

const QUESTIONS_COLLECTION = 'questions';

function questionFromDoc(id: string, data: DocumentData): Question {
  return {
    id,
    subjectId: data.subjectId,
    createdBy: data.createdBy,
    text: data.text,
    type: data.type,
    options: data.options ?? [],
    correctAnswer: data.correctAnswer,
    explanation: data.explanation ?? null,
    topic: data.topic ?? null,
    difficulty: data.difficulty ?? 'medium',
    purpose: data.purpose ?? null,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
    updatedAt: data.updatedAt
      ? data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt
      : null,
    isActive: data.isActive ?? true,
    imageUrl: data.imageUrl ?? null,
  };
}

function questionToFirestore(question: Question): DocumentData {
  return {
    subjectId: question.subjectId,
    createdBy: question.createdBy,
    text: question.text,
    type: question.type,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation ?? null,
    topic: question.topic ?? null,
    difficulty: question.difficulty,
    purpose: question.purpose ?? null,
    createdAt: Timestamp.fromDate(new Date(question.createdAt)),
    updatedAt: question.updatedAt
      ? Timestamp.fromDate(new Date(question.updatedAt))
      : null,
    isActive: question.isActive,
    imageUrl: question.imageUrl ?? null,
  };
}

/** Obtener todas las preguntas activas (solo admin) */
export async function getAllQuestions(): Promise<Question[]> {
  try {
    const snap = await getDocs(
      query(collection(db, QUESTIONS_COLLECTION), where('isActive', '==', true)),
    );
    return snap.docs.map((d) => questionFromDoc(d.id, d.data()));
  } catch (e) {
    throw new QuestionException(`Error al obtener preguntas: ${e}`);
  }
}

/** Obtener preguntas activas de una materia */
export async function getQuestionsBySubject(subjectId: string): Promise<Question[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, QUESTIONS_COLLECTION),
        where('subjectId', '==', subjectId),
        where('isActive', '==', true),
      ),
    );
    return snap.docs.map((d) => questionFromDoc(d.id, d.data()));
  } catch (e) {
    throw new QuestionException(`Error al obtener preguntas por materia: ${e}`);
  }
}

/** Obtener preguntas activas de un creador */
export async function getQuestionsByCreator(creatorId: string): Promise<Question[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, QUESTIONS_COLLECTION),
        where('createdBy', '==', creatorId),
        where('isActive', '==', true),
      ),
    );
    return snap.docs.map((d) => questionFromDoc(d.id, d.data()));
  } catch (e) {
    throw new QuestionException(`Error al obtener preguntas por creador: ${e}`);
  }
}

/** Obtener pregunta por ID */
export async function getQuestionById(questionId: string): Promise<Question | null> {
  try {
    const snap = await getDoc(doc(db, QUESTIONS_COLLECTION, questionId));
    if (!snap.exists()) return null;
    return questionFromDoc(snap.id, snap.data());
  } catch (e) {
    throw new QuestionException(`Error al obtener pregunta: ${e}`);
  }
}

export interface CreateQuestionServiceParams {
  subjectId: string;
  createdBy: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  topic?: string | null;
  difficulty?: QuestionDifficulty;
  purpose: QuestionPurpose;
}

/** Crear nueva pregunta en Firestore */
export async function createQuestion(
  params: CreateQuestionServiceParams,
): Promise<Question> {
  try {
    const docRef = doc(collection(db, QUESTIONS_COLLECTION));
    const question: Question = {
      id: docRef.id,
      subjectId: params.subjectId,
      createdBy: params.createdBy,
      text: params.text,
      type: params.type,
      options: params.options,
      correctAnswer: params.correctAnswer,
      explanation: params.explanation ?? null,
      topic: params.topic ?? null,
      difficulty: params.difficulty ?? 'medium',
      purpose: params.purpose,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      isActive: true,
      imageUrl: null,
    };

    // Validar antes de guardar -- misma lógica que antes
    if (!isQuestionValid(question)) {
      throw new QuestionException('La pregunta no es válida');
    }

    await setDoc(docRef, questionToFirestore(question));
    return question;
  } catch (e) {
    if (e instanceof QuestionException) throw e;
    throw new QuestionException(`Error al crear pregunta: ${e}`);
  }
}

/** Actualizar pregunta existente en Firestore */
export async function updateQuestion(question: Question): Promise<Question> {
  try {
    if (!isQuestionValid(question)) {
      throw new QuestionException('La pregunta no es válida');
    }
    const updated: Question = { ...question, updatedAt: new Date().toISOString() };
    await updateDoc(
      doc(db, QUESTIONS_COLLECTION, question.id),
      questionToFirestore(updated),
    );
    return updated;
  } catch (e) {
    if (e instanceof QuestionException) throw e;
    throw new QuestionException(`Error al actualizar pregunta: ${e}`);
  }
}

/** Eliminar pregunta -- soft delete (isActive: false) */
export async function deleteQuestion(questionId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, QUESTIONS_COLLECTION, questionId), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (e) {
    throw new QuestionException(`Error al eliminar pregunta: ${e}`);
  }
}

/**
 * Buscar preguntas por texto, tema o explicación. Firestore no tiene
 * full-text -- se filtra en memoria sobre la materia.
 */
export async function searchQuestions(
  queryText: string,
  subjectId: string | null,
): Promise<Question[]> {
  const questions = subjectId
    ? await getQuestionsBySubject(subjectId)
    : await getAllQuestions();
  const lowercaseQuery = queryText.toLowerCase();
  return questions.filter(
    (q) =>
      q.text.toLowerCase().includes(lowercaseQuery) ||
      (q.topic?.toLowerCase().includes(lowercaseQuery) ?? false) ||
      (q.explanation?.toLowerCase().includes(lowercaseQuery) ?? false),
  );
}

/** Filtrar preguntas por tipo dentro de una materia */
export async function getQuestionsByType(
  subjectId: string,
  type: QuestionType,
): Promise<Question[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, QUESTIONS_COLLECTION),
        where('subjectId', '==', subjectId),
        where('type', '==', type),
        where('isActive', '==', true),
      ),
    );
    return snap.docs.map((d) => questionFromDoc(d.id, d.data()));
  } catch (e) {
    throw new QuestionException(`Error al filtrar por tipo: ${e}`);
  }
}

/** Filtrar preguntas por dificultad dentro de una materia */
export async function getQuestionsByDifficulty(
  subjectId: string,
  difficulty: QuestionDifficulty,
): Promise<Question[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, QUESTIONS_COLLECTION),
        where('subjectId', '==', subjectId),
        where('difficulty', '==', difficulty),
        where('isActive', '==', true),
      ),
    );
    return snap.docs.map((d) => questionFromDoc(d.id, d.data()));
  } catch (e) {
    throw new QuestionException(`Error al filtrar por dificultad: ${e}`);
  }
}

export interface RandomQuestionsParams {
  subjectId: string;
  count?: number;
  difficulty?: QuestionDifficulty;
  topic?: string;
  purpose?: QuestionPurpose;
}

/**
 * Obtener preguntas aleatorias para práctica o examen. Se trae todo el set
 * y se mezcla en memoria -- no hay "shuffle" nativo en Firestore.
 */
export async function getRandomQuestions(
  params: RandomQuestionsParams,
): Promise<Question[]> {
  try {
    let questions = await getQuestionsBySubject(params.subjectId);

    // appliesTo() ya trata las preguntas legacy (purpose == null) como
    // válidas para ambos modos.
    if (params.purpose) {
      questions = questions.filter((q) => questionAppliesTo(q, params.purpose!));
    }
    if (params.difficulty) {
      questions = questions.filter((q) => q.difficulty === params.difficulty);
    }
    if (params.topic) {
      const topic = params.topic.toLowerCase();
      questions = questions.filter((q) => q.topic?.toLowerCase() === topic);
    }

    // Fisher-Yates -- equivalente a `questions.shuffle()` de Dart
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, params.count ?? 10);
  } catch (e) {
    throw new QuestionException(`Error al obtener preguntas aleatorias: ${e}`);
  }
}

/** Obtener estadísticas de preguntas por materia -- se calcula en memoria */
export async function getQuestionStats(subjectId: string): Promise<QuestionStats> {
  const questions = await getQuestionsBySubject(subjectId);

  const typeCount: Record<QuestionType, number> = {
    multipleChoice: 0,
    trueFalse: 0,
    shortAnswer: 0,
  };
  const difficultyCount: Record<QuestionDifficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  const topics = new Set<string>();

  for (const question of questions) {
    typeCount[question.type] = (typeCount[question.type] ?? 0) + 1;
    difficultyCount[question.difficulty] =
      (difficultyCount[question.difficulty] ?? 0) + 1;
    if (question.topic) topics.add(question.topic);
  }

  return {
    totalQuestions: questions.length,
    questionsByType: typeCount,
    questionsByDifficulty: difficultyCount,
    uniqueTopics: topics.size,
    topicsList: [...topics].sort(),
  };
}

// src/services/questionSetService.ts
//
// Puerto de lib/services/question_set_service.dart

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
  type Query,
} from 'firebase/firestore';
import { db } from './firebase';
import { QuestionSetException, type QuestionSet } from '@/types/questionSet';
import type { QuestionPurpose } from '@/types/question';

const QUESTION_SETS_COLLECTION = 'questionSets';

function questionSetFromDoc(id: string, data: DocumentData): QuestionSet {
  return {
    id,
    subjectId: data.subjectId,
    createdBy: data.createdBy,
    title: data.title,
    description: data.description ?? null,
    purpose: data.purpose,
    questionIds: data.questionIds ?? [],
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
  };
}

function questionSetToFirestore(set: QuestionSet): DocumentData {
  return {
    subjectId: set.subjectId,
    createdBy: set.createdBy,
    title: set.title,
    description: set.description ?? null,
    purpose: set.purpose,
    questionIds: set.questionIds,
    createdAt: Timestamp.fromDate(new Date(set.createdAt)),
    updatedAt: set.updatedAt ? Timestamp.fromDate(new Date(set.updatedAt)) : null,
    isActive: set.isActive,
  };
}

export interface CreateQuestionSetServiceParams {
  subjectId: string;
  createdBy: string;
  title: string;
  description?: string | null;
  purpose: QuestionPurpose;
  questionIds: string[];
}

/** Crear un nuevo set de preguntas armado a mano */
export async function createQuestionSet(
  params: CreateQuestionSetServiceParams,
): Promise<QuestionSet> {
  try {
    if (params.questionIds.length === 0) {
      throw new QuestionSetException('Debes seleccionar al menos una pregunta');
    }

    const docRef = doc(collection(db, QUESTION_SETS_COLLECTION));
    const set: QuestionSet = {
      id: docRef.id,
      subjectId: params.subjectId,
      createdBy: params.createdBy,
      title: params.title,
      description: params.description ?? null,
      purpose: params.purpose,
      questionIds: params.questionIds,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      isActive: true,
    };

    await setDoc(docRef, questionSetToFirestore(set));
    return set;
  } catch (e) {
    if (e instanceof QuestionSetException) throw e;
    throw new QuestionSetException(`Error al crear el grupo de preguntas: ${e}`);
  }
}

/** Obtener sets activos de una materia -- opcionalmente filtrados por modo */
export async function getQuestionSetsBySubject(
  subjectId: string,
  purpose?: QuestionPurpose,
): Promise<QuestionSet[]> {
  try {
    const constraints = [
      where('subjectId', '==', subjectId),
      where('isActive', '==', true),
    ];
    if (purpose) constraints.push(where('purpose', '==', purpose));

    const snap = await getDocs(
      query(
        collection(db, QUESTION_SETS_COLLECTION),
        ...constraints,
      ) as Query<DocumentData>,
    );
    return snap.docs.map((d) => questionSetFromDoc(d.id, d.data()));
  } catch (e) {
    throw new QuestionSetException(`Error al obtener grupos de preguntas: ${e}`);
  }
}

/** Obtener sets activos creados por un padre */
export async function getQuestionSetsByCreator(
  creatorId: string,
): Promise<QuestionSet[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, QUESTION_SETS_COLLECTION),
        where('createdBy', '==', creatorId),
        where('isActive', '==', true),
      ),
    );
    return snap.docs.map((d) => questionSetFromDoc(d.id, d.data()));
  } catch (e) {
    throw new QuestionSetException(`Error al obtener tus grupos de preguntas: ${e}`);
  }
}

export async function getQuestionSetById(id: string): Promise<QuestionSet | null> {
  try {
    const snap = await getDoc(doc(db, QUESTION_SETS_COLLECTION, id));
    if (!snap.exists()) return null;
    return questionSetFromDoc(snap.id, snap.data());
  } catch (e) {
    throw new QuestionSetException(`Error al obtener el grupo de preguntas: ${e}`);
  }
}

export async function updateQuestionSet(set: QuestionSet): Promise<QuestionSet> {
  try {
    const updated: QuestionSet = { ...set, updatedAt: new Date().toISOString() };
    await updateDoc(
      doc(db, QUESTION_SETS_COLLECTION, set.id),
      questionSetToFirestore(updated),
    );
    return updated;
  } catch (e) {
    throw new QuestionSetException(`Error al actualizar el grupo de preguntas: ${e}`);
  }
}

/** Eliminar -- soft delete */
export async function deleteQuestionSet(id: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, QUESTION_SETS_COLLECTION, id), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (e) {
    throw new QuestionSetException(`Error al eliminar el grupo de preguntas: ${e}`);
  }
}

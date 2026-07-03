// src/services/resultService.ts
//
// Puerto de lib/services/result_service.dart

import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ResultException,
  type PracticeResult,
  type PracticeStats,
  EMPTY_PRACTICE_STATS,
} from '@/types/practiceResult';

const RESULTS_COLLECTION = 'results';

function resultFromDoc(id: string, data: DocumentData): PracticeResult {
  return {
    id,
    studentId: data.studentId,
    subjectId: data.subjectId,
    subjectName: data.subjectName,
    totalQuestions: data.totalQuestions,
    correctAnswers: data.correctAnswers,
    completedAt:
      data.completedAt instanceof Timestamp
        ? data.completedAt.toDate().toISOString()
        : data.completedAt,
    difficultyFilter: data.difficultyFilter ?? 'all',
    durationSeconds: data.durationSeconds ?? 0,
    sessionType: data.sessionType ?? 'practice',
  };
}

/**
 * [parentId] se guarda como campo extra para que las reglas de seguridad
 * permitan al padre leer los resultados de sus hijos:
 *   allow read: if uid == studentId || uid == parentId
 */
function resultToFirestore(
  result: PracticeResult,
  parentId?: string | null,
): DocumentData {
  return {
    studentId: result.studentId,
    subjectId: result.subjectId,
    subjectName: result.subjectName,
    totalQuestions: result.totalQuestions,
    correctAnswers: result.correctAnswers,
    completedAt: Timestamp.fromDate(new Date(result.completedAt)),
    difficultyFilter: result.difficultyFilter,
    durationSeconds: result.durationSeconds,
    sessionType: result.sessionType,
    ...(parentId ? { parentId } : {}),
  };
}

/**
 * Guardar resultado en Firestore.
 *
 * `parentId` es opcional pero necesario para las reglas de producción. Sin
 * él, el padre no podrá leer los resultados de su hijo. Debe pasarse
 * siempre que se conozca el padre del estudiante.
 */
export async function saveResult(
  result: PracticeResult,
  parentId?: string | null,
): Promise<void> {
  try {
    // Usamos el ID del modelo como ID del documento, igual que en Dart.
    await setDoc(
      doc(db, RESULTS_COLLECTION, result.id),
      resultToFirestore(result, parentId),
    );
  } catch (e) {
    throw new ResultException(`Error al guardar resultado: ${e}`);
  }
}

/** Obtener todos los resultados -- solo para admin o testing */
export async function getAllResults(): Promise<PracticeResult[]> {
  try {
    const snap = await getDocs(
      query(collection(db, RESULTS_COLLECTION), orderBy('completedAt', 'desc')),
    );
    return snap.docs.map((d) => resultFromDoc(d.id, d.data()));
  } catch (e) {
    throw new ResultException(`Error al obtener resultados: ${e}`);
  }
}

/** Obtener resultados de un estudiante, del más reciente al más antiguo */
export async function getResultsByStudent(studentId: string): Promise<PracticeResult[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, RESULTS_COLLECTION),
        where('studentId', '==', studentId),
        orderBy('completedAt', 'desc'),
      ),
    );
    return snap.docs.map((d) => resultFromDoc(d.id, d.data()));
  } catch (e) {
    throw new ResultException(`Error al obtener resultados del estudiante: ${e}`);
  }
}

/** Obtener resultados de un estudiante filtrados por materia */
export async function getResultsByStudentAndSubject(
  studentId: string,
  subjectId: string,
): Promise<PracticeResult[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, RESULTS_COLLECTION),
        where('studentId', '==', studentId),
        where('subjectId', '==', subjectId),
        orderBy('completedAt', 'desc'),
      ),
    );
    return snap.docs.map((d) => resultFromDoc(d.id, d.data()));
  } catch (e) {
    throw new ResultException(`Error al obtener resultados por materia: ${e}`);
  }
}

/** Obtener resultados de todos los hijos de un padre (requiere parentId guardado, ver saveResult) */
export async function getResultsByParent(parentId: string): Promise<PracticeResult[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, RESULTS_COLLECTION),
        where('parentId', '==', parentId),
        orderBy('completedAt', 'desc'),
      ),
    );
    return snap.docs.map((d) => resultFromDoc(d.id, d.data()));
  } catch (e) {
    throw new ResultException(`Error al obtener resultados del padre: ${e}`);
  }
}

/**
 * Eliminar un resultado por ID.
 *
 * ⚠️ NOTA DE SEGURIDAD (igual que en Dart): con las reglas de producción
 * acordadas, los resultados son de solo-creación
 * (`allow update, delete: if false`). Este método funciona en desarrollo
 * pero queda bloqueado en producción -- se conserva solo para uso de admin
 * o limpieza de datos de prueba.
 */
export async function deleteResult(resultId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RESULTS_COLLECTION, resultId));
  } catch (e) {
    throw new ResultException(`Error al eliminar resultado: ${e}`);
  }
}

/** Eliminar todos los resultados de un estudiante -- mismo caso de bloqueo en producción. */
export async function deleteResultsByStudent(studentId: string): Promise<void> {
  try {
    const snap = await getDocs(
      query(collection(db, RESULTS_COLLECTION), where('studentId', '==', studentId)),
    );
    if (snap.empty) return;
    const batch = writeBatch(db);
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
  } catch (e) {
    throw new ResultException(`Error al eliminar resultados del estudiante: ${e}`);
  }
}

function buildStats(results: PracticeResult[]): PracticeStats {
  if (results.length === 0) return EMPTY_PRACTICE_STATS;

  const totalSessions = results.length;
  const avgPercentage =
    results.reduce(
      (sum, r) =>
        sum + (r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : 0),
      0,
    ) / totalSessions;
  const bestResult = results.reduce((best, r) => {
    const bestPct =
      best.totalQuestions > 0 ? (best.correctAnswers / best.totalQuestions) * 100 : 0;
    const pct = r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : 0;
    return pct > bestPct ? r : best;
  });

  const bySubject = new Map<string, PracticeResult[]>();
  for (const r of results) {
    const list = bySubject.get(r.subjectId) ?? [];
    list.push(r);
    bySubject.set(r.subjectId, list);
  }

  return {
    totalSessions,
    averagePercentage: avgPercentage,
    bestResult,
    subjectCount: bySubject.size,
    recentResults: results.slice(0, 5),
  };
}

/** Calcular estadísticas de práctica/examen de un estudiante */
export async function getStudentStats(studentId: string): Promise<PracticeStats> {
  const results = await getResultsByStudent(studentId);
  return buildStats(results);
}

/** Calcular estadísticas agrupadas por materia para un estudiante -- útil para la vista del padre */
export async function getStatsBySubject(
  studentId: string,
): Promise<Record<string, PracticeStats>> {
  const results = await getResultsByStudent(studentId);
  const bySubject = new Map<string, PracticeResult[]>();
  for (const r of results) {
    const list = bySubject.get(r.subjectId) ?? [];
    list.push(r);
    bySubject.set(r.subjectId, list);
  }
  const statsMap: Record<string, PracticeStats> = {};
  for (const [subjectId, subjectResults] of bySubject) {
    statsMap[subjectId] = { ...buildStats(subjectResults), subjectCount: 1 };
  }
  return statsMap;
}

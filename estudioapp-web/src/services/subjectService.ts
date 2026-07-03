// src/services/subjectService.ts
//
// Puerto de lib/services/subject_service.dart

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { SubjectException, type Subject } from '@/types/subject';
import type { UserRole } from '@/types/user';

const SUBJECTS_COLLECTION = 'subjects';

function subjectFromDoc(id: string, data: DocumentData): Subject {
  return {
    id,
    name: data.name,
    description: data.description,
    createdBy: data.createdBy,
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
    assignedStudents: data.assignedStudents ?? [],
    color: data.color ?? 'blue',
    icon: data.icon ?? 'book',
    estimatedDuration: data.estimatedDuration ?? null,
    timeUnit: data.timeUnit ?? null,
    difficulty: data.difficulty ?? null,
    area: data.area ?? 'otra',
  };
}

function subjectToFirestore(subject: Subject): DocumentData {
  return {
    name: subject.name,
    description: subject.description,
    createdBy: subject.createdBy,
    createdAt: Timestamp.fromDate(new Date(subject.createdAt)),
    updatedAt: subject.updatedAt ? Timestamp.fromDate(new Date(subject.updatedAt)) : null,
    isActive: subject.isActive,
    assignedStudents: subject.assignedStudents,
    color: subject.color,
    icon: subject.icon,
    estimatedDuration: subject.estimatedDuration ?? null,
    timeUnit: subject.timeUnit ?? null,
    difficulty: subject.difficulty ?? null,
    area: subject.area,
  };
}

/** Obtener todas las materias activas (solo admin) */
export async function getAllSubjects(): Promise<Subject[]> {
  try {
    const snap = await getDocs(
      query(collection(db, SUBJECTS_COLLECTION), where('isActive', '==', true)),
    );
    return snap.docs.map((d) => subjectFromDoc(d.id, d.data()));
  } catch (e) {
    throw new SubjectException(`Error al obtener materias: ${e}`);
  }
}

/** Obtener materias filtradas según el rol del usuario */
export async function getSubjectsByUser(
  userId: string,
  userRole: UserRole | string,
): Promise<Subject[]> {
  try {
    switch (userRole) {
      case 'admin':
        // Admin ve todas las materias activas
        return getAllSubjects();

      case 'parent': {
        // Padre ve solo las materias que él creó
        const snap = await getDocs(
          query(
            collection(db, SUBJECTS_COLLECTION),
            where('createdBy', '==', userId),
            where('isActive', '==', true),
          ),
        );
        return snap.docs.map((d) => subjectFromDoc(d.id, d.data()));
      }

      case 'student': {
        // Estudiante ve solo materias donde está asignado
        const snap = await getDocs(
          query(
            collection(db, SUBJECTS_COLLECTION),
            where('assignedStudents', 'array-contains', userId),
            where('isActive', '==', true),
          ),
        );
        return snap.docs.map((d) => subjectFromDoc(d.id, d.data()));
      }

      default:
        return [];
    }
  } catch (e) {
    throw new SubjectException(`Error al obtener materias por usuario: ${e}`);
  }
}

export interface CreateSubjectServiceParams {
  name: string;
  description: string;
  createdBy: string;
  color?: Subject['color'];
  icon?: Subject['icon'];
  estimatedDuration?: number | null;
  timeUnit?: Subject['timeUnit'];
  difficulty?: string | null;
  assignedStudents?: string[];
  area: Subject['area'];
}

/** Crear nueva materia en Firestore */
export async function createSubject(
  params: CreateSubjectServiceParams,
): Promise<Subject> {
  try {
    // Firestore genera el ID -- equivalente a `_firestore.collection().doc()`
    const docRef = doc(collection(db, SUBJECTS_COLLECTION));

    const subject: Subject = {
      id: docRef.id,
      name: params.name,
      description: params.description,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      isActive: true,
      color: params.color ?? 'blue',
      icon: params.icon ?? 'book',
      estimatedDuration: params.estimatedDuration ?? null,
      timeUnit: params.timeUnit ?? null,
      difficulty: params.difficulty ?? null,
      assignedStudents: params.assignedStudents ?? [],
      area: params.area,
    };

    await setDoc(docRef, subjectToFirestore(subject));
    return subject;
  } catch (e) {
    throw new SubjectException(`Error al crear materia: ${e}`);
  }
}

/** Actualizar materia existente en Firestore */
export async function updateSubject(subject: Subject): Promise<Subject> {
  try {
    const updated: Subject = { ...subject, updatedAt: new Date().toISOString() };
    await updateDoc(
      doc(db, SUBJECTS_COLLECTION, subject.id),
      subjectToFirestore(updated),
    );
    return updated;
  } catch (e) {
    throw new SubjectException(`Error al actualizar materia: ${e}`);
  }
}

/**
 * Eliminar materia -- soft delete (isActive: false). No se borra el
 * documento para preservar integridad referencial con preguntas y
 * resultados que apuntan a este subjectId.
 */
export async function deleteSubject(subjectId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, SUBJECTS_COLLECTION, subjectId), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (e) {
    throw new SubjectException(`Error al eliminar materia: ${e}`);
  }
}

/** Obtener materia por ID */
export async function getSubjectById(subjectId: string): Promise<Subject | null> {
  try {
    const snap = await getDoc(doc(db, SUBJECTS_COLLECTION, subjectId));
    if (!snap.exists()) return null;
    return subjectFromDoc(snap.id, snap.data());
  } catch (e) {
    throw new SubjectException(`Error al obtener materia: ${e}`);
  }
}

/**
 * Buscar materias por nombre o descripción. Firestore no tiene búsqueda de
 * texto nativa -- se trae la lista filtrada por usuario y se filtra en memoria.
 */
export async function searchSubjects(
  queryText: string,
  userId: string,
  userRole: string,
): Promise<Subject[]> {
  const subjects = await getSubjectsByUser(userId, userRole);
  const lowercaseQuery = queryText.toLowerCase();
  return subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(lowercaseQuery) ||
      s.description.toLowerCase().includes(lowercaseQuery),
  );
}

/**
 * Asignar estudiante a materia usando arrayUnion (atómico).
 *
 * NOTA: este método existe en el `SubjectRepository` original por
 * completitud de la interfaz, pero no se invoca desde ninguna pantalla de
 * la app -- `assign_subjects_screen.dart` usa exclusivamente el camino
 * `StudentService.assignSubjectToStudent` (ver studentService.ts), que
 * actualiza `students`, `subjects` y `users` en un solo batch atómico. Este
 * método solo toca `subjects.assignedStudents`, así que usarlo dejaría a
 * `students.assignedSubjects` desincronizado -- se porta para no perder
 * superficie de la interfaz original, no para usarse desde la UI.
 */
export async function assignStudentToSubject(
  subjectId: string,
  studentId: string,
): Promise<Subject> {
  try {
    const snap = await getDoc(doc(db, SUBJECTS_COLLECTION, subjectId));
    if (!snap.exists()) throw new SubjectException('Materia no encontrada');
    const subject = subjectFromDoc(snap.id, snap.data());

    if (subject.assignedStudents.includes(studentId)) {
      throw new SubjectException('Estudiante ya está asignado a esta materia');
    }

    await updateDoc(doc(db, SUBJECTS_COLLECTION, subjectId), {
      assignedStudents: arrayUnion(studentId),
      updatedAt: Timestamp.now(),
    });

    return {
      ...subject,
      assignedStudents: [...subject.assignedStudents, studentId],
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    if (e instanceof SubjectException) throw e;
    throw new SubjectException(`Error al asignar estudiante: ${e}`);
  }
}

/** Desasignar estudiante de materia usando arrayRemove (atómico) — ver nota arriba. */
export async function unassignStudentFromSubject(
  subjectId: string,
  studentId: string,
): Promise<Subject> {
  try {
    const snap = await getDoc(doc(db, SUBJECTS_COLLECTION, subjectId));
    if (!snap.exists()) throw new SubjectException('Materia no encontrada');
    const subject = subjectFromDoc(snap.id, snap.data());

    await updateDoc(doc(db, SUBJECTS_COLLECTION, subjectId), {
      assignedStudents: arrayRemove(studentId),
      updatedAt: Timestamp.now(),
    });

    return {
      ...subject,
      assignedStudents: subject.assignedStudents.filter((id) => id !== studentId),
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    if (e instanceof SubjectException) throw e;
    throw new SubjectException(`Error al desasignar estudiante: ${e}`);
  }
}

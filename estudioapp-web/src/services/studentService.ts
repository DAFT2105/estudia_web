// src/services/studentService.ts
//
// Puerto de lib/services/student_service.dart — en esta fase (1.4) solo se
// porta la creación de estudiantes (username + instancia secundaria + clave
// temporal + batch atómico). El resto del CRUD (listar, editar, soft-delete,
// asignar materias, búsqueda) llega en la Etapa 2, Fase 2.2.

import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db, firebaseApp } from './firebase';
import { AppConstants } from '@/utils/appConstants';
import {
  getStudentFullName,
  splitLegacyName,
  StudentException,
  type Student,
  type StudentAvatar,
  type StudentGrade,
  type WeeklyGoal,
} from '@/types/student';

const STUDENTS_COLLECTION = 'students';
const USERS_COLLECTION = 'users';

// Nombre único para la instancia secundaria de Firebase — igual que en Dart.
const SECONDARY_APP_NAME = 'studentCreation';

// Caracteres usados para generar claves temporales — se excluyen 0/O y
// 1/l/I para evitar confusión visual al copiarla a mano.
const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

interface FirebaseErrorLike {
  code: string;
}

function isFirebaseErrorLike(error: unknown): error is FirebaseErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Quita tildes/ñ y caracteres no alfabéticos, deja todo en minúsculas.
 * "José Ñúñez" → "josennez"
 */
export function normalizeForUsername(text: string): string {
  const withAccents = 'áéíóúÁÉÍÓÚñÑüÜ';
  const withoutAccents = 'aeiouAEIOUnNuU';
  let result = text;
  for (let i = 0; i < withAccents.length; i++) {
    result = result.split(withAccents[i]).join(withoutAccents[i]);
  }
  return result.toLowerCase().replace(/[^a-z]/g, '');
}

/** Email sintético usado internamente por Firebase Auth — el estudiante nunca lo ve. */
export function buildSyntheticEmail(username: string): string {
  return `${username}@${AppConstants.studentEmailDomain}`;
}

/**
 * Genera una clave temporal aleatoria con `crypto.getRandomValues` (el
 * equivalente web de `Random.secure()`). Usa descarte por rechazo en vez de
 * módulo directo para no introducir sesgo en la distribución de caracteres.
 */
export function generateTemporaryPassword(length = 8): string {
  const charsLength = PASSWORD_CHARS.length;
  const maxValid = Math.floor(256 / charsLength) * charsLength;
  const buffer = new Uint8Array(1);
  let result = '';
  while (result.length < length) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < maxValid) {
      result += PASSWORD_CHARS[buffer[0] % charsLength];
    }
  }
  return result;
}

interface StudentAuthAccountResult {
  uid: string;
  username: string;
  temporaryPassword: string;
}

/**
 * Genera un username único probando candidatos crecientes y crea la cuenta
 * Auth correspondiente en la instancia secundaria de Firebase. La sesión
 * del padre NO se interrumpe en ningún momento.
 *
 * Algoritmo (idéntico al de Dart):
 *   1 letra del nombre + primer apellido  → "jperez"
 *   2 letras del nombre + primer apellido  → "juperez" (si "jperez" ya existe)
 *   ...hasta agotar el nombre
 *   Si aun así hay colisión: nombre completo + apellido + sufijo numérico
 *
 * La unicidad la garantiza Firebase Auth mismo (`auth/email-already-in-use`),
 * sin necesitar queries ni reglas de Firestore adicionales.
 */
async function createStudentAuthAccount(
  nombres: string,
  apellidos: string,
): Promise<StudentAuthAccountResult> {
  const nombreNorm = normalizeForUsername(nombres);
  const apellidosParts = apellidos.trim().split(/\s+/);
  const primerApellido = apellidosParts[0] ?? '';
  const apellidoNorm = normalizeForUsername(primerApellido);

  if (!nombreNorm || !apellidoNorm) {
    throw new StudentException('Nombres y apellidos deben contener al menos una letra');
  }

  const temporaryPassword = generateTemporaryPassword();

  // Verificar si ya existe una instancia colgada de un intento anterior y eliminarla
  const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  if (existing) {
    await deleteApp(existing).catch(() => {});
  }

  // Crear segunda instancia con las mismas credenciales del proyecto
  const secondaryApp = initializeApp(firebaseApp.options, SECONDARY_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const tryCandidate = async (
      candidate: string,
    ): Promise<StudentAuthAccountResult | null> => {
      try {
        const credential = await createUserWithEmailAndPassword(
          secondaryAuth,
          buildSyntheticEmail(candidate),
          temporaryPassword,
        );
        return { uid: credential.user.uid, username: candidate, temporaryPassword };
      } catch (e) {
        if (isFirebaseErrorLike(e) && e.code === 'auth/email-already-in-use') return null;
        throw e;
      }
    };

    // Paso 1: 1 letra del nombre, 2 letras, 3... hasta agotar el nombre
    for (let n = 1; n <= nombreNorm.length; n++) {
      const candidate = nombreNorm.slice(0, n) + apellidoNorm;
      const result = await tryCandidate(candidate);
      if (result) return result;
    }

    // Paso 2: último recurso — nombre completo + apellido + sufijo numérico
    const fullBase = nombreNorm + apellidoNorm;
    for (let suffix = 2; suffix <= 99; suffix++) {
      const result = await tryCandidate(`${fullBase}${suffix}`);
      if (result) return result;
    }

    throw new StudentException(
      'No se pudo generar un usuario único para este estudiante. Intenta con un nombre o apellido distinto.',
    );
  } finally {
    // Siempre eliminar la instancia secundaria al terminar, con éxito o sin él.
    await deleteApp(secondaryApp).catch(() => {});
  }
}

function studentFromFirestore(
  id: string,
  data: DocumentData,
  parentId?: string,
): Student {
  // Compatibilidad con documentos creados antes del sistema de username
  // (tenían un único campo `name` en vez de nombres/apellidos/username) --
  // igual que `Student.fromJson` en Dart.
  const legacyName = data.name as string | undefined;
  let nombres = (data.nombres as string) ?? '';
  let apellidos = (data.apellidos as string) ?? '';
  if (!nombres && legacyName?.trim()) {
    const split = splitLegacyName(legacyName);
    nombres = split.nombres;
    apellidos = split.apellidos;
  }

  return {
    id,
    nombres,
    apellidos,
    username: (data.username as string) ?? '',
    email: (data.email as string) ?? null,
    parentId: (data.parentId as string) ?? parentId ?? '',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
    updatedAt: data.updatedAt
      ? data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt
      : null,
    isActive: (data.isActive as boolean) ?? true,
    assignedSubjects: (data.assignedSubjects as string[]) ?? [],
    grade: (data.grade as StudentGrade) ?? 'primaria',
    gradeLevel: (data.gradeLevel as number) ?? null,
    birthDate: data.birthDate
      ? data.birthDate instanceof Timestamp
        ? data.birthDate.toDate().toISOString()
        : data.birthDate
      : null,
    notes: (data.notes as string) ?? null,
    avatar: (data.avatar as StudentAvatar) ?? 'student1',
    weeklyGoals: Array.isArray(data.weeklyGoals) ? (data.weeklyGoals as WeeklyGoal[]) : [],
  };
}

function studentToFirestore(student: Student): DocumentData {
  return {
    nombres: student.nombres,
    apellidos: student.apellidos,
    name: getStudentFullName(student), // se mantiene por compatibilidad con datos legacy
    username: student.username,
    email: student.email ?? null,
    parentId: student.parentId,
    createdAt: Timestamp.fromDate(new Date(student.createdAt)),
    updatedAt: student.updatedAt ? Timestamp.fromDate(new Date(student.updatedAt)) : null,
    isActive: student.isActive,
    assignedSubjects: student.assignedSubjects,
    grade: student.grade,
    gradeLevel: student.gradeLevel ?? null,
    birthDate: student.birthDate ? Timestamp.fromDate(new Date(student.birthDate)) : null,
    notes: student.notes ?? null,
    avatar: student.avatar,
    weeklyGoals: student.weeklyGoals ?? [],
  };
}

export interface CreateStudentParams {
  nombres: string;
  apellidos: string;
  email?: string | null;
  parentId: string;
  grade?: StudentGrade;
  gradeLevel?: number | null;
  birthDate?: string | null;
  notes?: string | null;
  avatar?: StudentAvatar;
}

/**
 * Crea un nuevo estudiante.
 *
 * Flujo (idéntico al de `StudentService.createStudent`):
 * 1. Genera un `username` único y crea la cuenta Auth correspondiente vía
 *    instancia secundaria (sin afectar la sesión del padre)
 * 2. Fuerza refresh del token del padre para que Firestore lo reconozca
 * 3. Batch atómico: crea `students/{uid}` y `users/{uid}` juntos, marcando
 *    `mustChangePassword: true`
 * 4. Devuelve el Student creado + la clave temporal en texto plano (única
 *    vez que existe — el padre debe copiarla/compartirla ahora)
 */
export async function createStudent(
  params: CreateStudentParams,
): Promise<{ student: Student; temporaryPassword: string }> {
  const {
    nombres,
    apellidos,
    email = null,
    parentId,
    grade = 'primaria',
    gradeLevel = null,
    birthDate = null,
    notes = null,
    avatar = 'student1',
  } = params;

  try {
    // Paso 1 — username único + cuenta Auth
    const authResult = await createStudentAuthAccount(nombres, apellidos);

    // Paso 2 — refrescar el token del padre antes de escribir en Firestore
    await auth.currentUser?.getIdToken(true);

    const now = new Date().toISOString();
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : null;

    const student: Student = {
      id: authResult.uid, // ID del documento = UID de Firebase Auth
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      username: authResult.username,
      email: cleanEmail,
      parentId,
      createdAt: now,
      updatedAt: null,
      isActive: true,
      assignedSubjects: [],
      grade,
      gradeLevel,
      birthDate,
      notes,
      avatar,
    };

    // Paso 3 — batch atómico: students/{uid} + users/{uid}
    const batch = writeBatch(db);

    batch.set(doc(db, STUDENTS_COLLECTION, authResult.uid), studentToFirestore(student));

    batch.set(doc(db, USERS_COLLECTION, authResult.uid), {
      id: authResult.uid,
      email: buildSyntheticEmail(authResult.username),
      username: authResult.username,
      name: getStudentFullName(student),
      role: 'student',
      parentId,
      assignedSubjects: [],
      isActive: true,
      mustChangePassword: true,
      createdAt: Timestamp.fromDate(new Date(now)),
      lastLogin: null,
    });

    await batch.commit();

    return { student, temporaryPassword: authResult.temporaryPassword };
  } catch (e) {
    if (e instanceof StudentException) throw e;
    if (isFirebaseErrorLike(e)) {
      throw new StudentException(`Error al crear cuenta del estudiante: ${e.code}`);
    }
    throw new StudentException(`Error al crear estudiante: ${e}`);
  }
}

/** Obtener todos los estudiantes activos (solo admin) */
export async function getAllStudents(): Promise<Student[]> {
  try {
    const snap = await getDocs(
      query(collection(db, STUDENTS_COLLECTION), where('isActive', '==', true)),
    );
    return snap.docs.map((d) => studentFromFirestore(d.id, d.data()));
  } catch (e) {
    throw new StudentException(`Error al obtener estudiantes: ${e}`);
  }
}

/** Obtener estudiantes activos de un padre */
export async function getStudentsByParent(parentId: string): Promise<Student[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, STUDENTS_COLLECTION),
        where('parentId', '==', parentId),
        where('isActive', '==', true),
      ),
    );
    return snap.docs.map((d) => studentFromFirestore(d.id, d.data(), parentId));
  } catch (e) {
    throw new StudentException(`Error al obtener estudiantes del padre: ${e}`);
  }
}

/** Obtener estudiante por ID */
export async function getStudentById(studentId: string): Promise<Student | null> {
  try {
    const snap = await getDoc(doc(db, STUDENTS_COLLECTION, studentId));
    if (!snap.exists()) return null;
    return studentFromFirestore(snap.id, snap.data());
  } catch (e) {
    throw new StudentException(`Error al obtener estudiante: ${e}`);
  }
}

/** Actualizar estudiante existente -- sincroniza el nombre en users/{uid} */
export async function updateStudent(student: Student): Promise<Student> {
  try {
    const updated: Student = { ...student, updatedAt: new Date().toISOString() };

    const batch = writeBatch(db);
    batch.update(doc(db, STUDENTS_COLLECTION, student.id), studentToFirestore(updated));
    batch.update(doc(db, USERS_COLLECTION, student.id), {
      name: getStudentFullName(updated),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    return updated;
  } catch (e) {
    throw new StudentException(`Error al actualizar estudiante: ${e}`);
  }
}

/** Eliminar estudiante -- soft delete (isActive: false), sincronizado en users/{uid} */
export async function deleteStudent(studentId: string): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, STUDENTS_COLLECTION, studentId), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, USERS_COLLECTION, studentId), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
    await batch.commit();
    return true;
  } catch (e) {
    throw new StudentException(`Error al eliminar estudiante: ${e}`);
  }
}

/**
 * Asignar materia a estudiante -- batch atómico que sincroniza `students`,
 * `subjects` y `users` en una sola operación. Este es el camino real que
 * usa `assign_subjects_screen.dart` (ver nota en subjectService.ts).
 */
export async function assignSubjectToStudent(
  studentId: string,
  subjectId: string,
): Promise<Student> {
  try {
    const snap = await getDoc(doc(db, STUDENTS_COLLECTION, studentId));
    if (!snap.exists()) throw new StudentException('Estudiante no encontrado');
    const student = studentFromFirestore(snap.id, snap.data());

    if (student.assignedSubjects.includes(subjectId)) {
      throw new StudentException('El estudiante ya tiene esta materia asignada');
    }

    const batch = writeBatch(db);
    batch.update(doc(db, STUDENTS_COLLECTION, studentId), {
      assignedSubjects: arrayUnion(subjectId),
      updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, 'subjects', subjectId), {
      assignedStudents: arrayUnion(studentId),
      updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, USERS_COLLECTION, studentId), {
      assignedSubjects: arrayUnion(subjectId),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    return {
      ...student,
      assignedSubjects: [...student.assignedSubjects, subjectId],
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    if (e instanceof StudentException) throw e;
    throw new StudentException(`Error al asignar materia: ${e}`);
  }
}

/** Desasignar materia de estudiante -- batch atómico, ver nota arriba. */
export async function unassignSubjectFromStudent(
  studentId: string,
  subjectId: string,
): Promise<Student> {
  try {
    const snap = await getDoc(doc(db, STUDENTS_COLLECTION, studentId));
    if (!snap.exists()) throw new StudentException('Estudiante no encontrado');
    const student = studentFromFirestore(snap.id, snap.data());

    const batch = writeBatch(db);
    batch.update(doc(db, STUDENTS_COLLECTION, studentId), {
      assignedSubjects: arrayRemove(subjectId),
      updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, 'subjects', subjectId), {
      assignedStudents: arrayRemove(studentId),
      updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, USERS_COLLECTION, studentId), {
      assignedSubjects: arrayRemove(subjectId),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    return {
      ...student,
      assignedSubjects: student.assignedSubjects.filter((id) => id !== subjectId),
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    if (e instanceof StudentException) throw e;
    throw new StudentException(`Error al desasignar materia: ${e}`);
  }
}

/** Buscar estudiantes por nombre, usuario o email dentro de un padre */
export async function searchStudents(
  queryText: string,
  parentId: string,
): Promise<Student[]> {
  const students = await getStudentsByParent(parentId);
  const lowercaseQuery = queryText.toLowerCase();
  return students.filter(
    (s) =>
      getStudentFullName(s).toLowerCase().includes(lowercaseQuery) ||
      s.username.toLowerCase().includes(lowercaseQuery) ||
      (s.email?.toLowerCase().includes(lowercaseQuery) ?? false) ||
      (s.notes?.toLowerCase().includes(lowercaseQuery) ?? false),
  );
}

/** Obtener estudiantes que tienen una materia específica asignada */
export async function getStudentsWithSubject(subjectId: string): Promise<Student[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, STUDENTS_COLLECTION),
        where('assignedSubjects', 'array-contains', subjectId),
        where('isActive', '==', true),
      ),
    );
    return snap.docs.map((d) => studentFromFirestore(d.id, d.data()));
  } catch (e) {
    throw new StudentException(`Error al obtener estudiantes por materia: ${e}`);
  }
}

/**
 * Verificar si un email ya está en uso. El email es opcional -- solo aplica
 * si el padre decide asignarle uno (ej. integración futura con colegios).
 */
export async function isEmailInUse(
  email: string,
  options: { excludeStudentId?: string; parentId?: string } = {},
): Promise<boolean> {
  if (!email.trim()) return false;
  try {
    const constraints = [
      where('email', '==', email.toLowerCase()),
      where('isActive', '==', true),
    ];
    if (options.parentId) constraints.push(where('parentId', '==', options.parentId));

    const snap = await getDocs(
      query(collection(db, STUDENTS_COLLECTION), ...constraints),
    );
    if (snap.empty) return false;
    if (options.excludeStudentId) {
      return snap.docs.some((d) => d.id !== options.excludeStudentId);
    }
    return true;
  } catch (e) {
    throw new StudentException(`Error al verificar email: ${e}`);
  }
}

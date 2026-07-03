// src/services/authService.ts
//
// Puerto literal de lib/services/auth_service.dart

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signOut,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, UserRole } from '@/types/user';

const USERS_COLLECTION = 'users';

export class AuthException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthException';
  }
}

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

/** Equivalente a `AuthService._mapFirebaseError` — el SDK JS usa códigos con prefijo `auth/`. */
function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No existe una cuenta con ese email';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta';
    case 'auth/invalid-credential':
      return 'Email o contraseña incorrectos';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese email';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres';
    case 'auth/invalid-email':
      return 'El formato del email no es válido';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido desactivada';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intenta más tarde';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet';
    case 'auth/requires-recent-login':
      return 'Por seguridad, inicia sesión nuevamente';
    case 'auth/account-exists-with-different-credential':
      return 'Ya existe una cuenta con ese email usando otro método de login';
    default:
      return `Error de autenticación: ${code}`;
  }
}

function parseDate(value: unknown): string {
  if (value == null) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function userFromFirestore(id: string, data: DocumentData): User {
  return {
    id,
    email: data.email as string,
    name: data.name as string,
    role: data.role as UserRole,
    createdAt: parseDate(data.createdAt),
    lastLogin: data.lastLogin != null ? parseDate(data.lastLogin) : null,
    isActive: (data.isActive as boolean) ?? true,
    assignedSubjects: (data.assignedSubjects as string[]) ?? null,
    parentId: (data.parentId as string) ?? null,
    username: (data.username as string) ?? null,
    mustChangePassword: (data.mustChangePassword as boolean) ?? false,
  };
}

function userToFirestore(user: User): DocumentData {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: Timestamp.fromDate(new Date(user.createdAt)),
    lastLogin: user.lastLogin ? Timestamp.fromDate(new Date(user.lastLogin)) : null,
    isActive: user.isActive,
    assignedSubjects: user.assignedSubjects ?? null,
    parentId: user.parentId ?? null,
    username: user.username ?? null,
    mustChangePassword: user.mustChangePassword,
  };
}

async function getUserProfile(uid: string): Promise<User> {
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) {
      throw new AuthException('Perfil de usuario no encontrado');
    }
    return userFromFirestore(snap.id, snap.data());
  } catch (e) {
    if (e instanceof AuthException) throw e;
    throw new AuthException(`Error al obtener perfil: ${e}`);
  }
}

/** Login con email y contraseña */
export async function authenticate(
  email: string,
  password: string,
): Promise<User | null> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password.trim(),
    );
    if (!credential.user) return null;
    return await getUserProfile(credential.user.uid);
  } catch (e) {
    if (e instanceof AuthException) throw e;
    if (isFirebaseErrorLike(e)) throw new AuthException(mapFirebaseError(e.code));
    throw new AuthException(`Error al iniciar sesión: ${e}`);
  }
}

/**
 * Login con Google — exclusivo para padres.
 *
 * Flujo:
 * 1. Muestra el popup de selección de cuenta de Google
 * 2. Si es el primer ingreso del usuario (no tiene doc en `users/`), crea
 *    automáticamente su perfil con rol "parent"
 * 3. Devuelve el User con su perfil completo
 *
 * Devuelve `null` si el usuario cerró el popup sin elegir cuenta.
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    if (!credential.user) return null;

    const uid = credential.user.uid;
    const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? false;

    if (isNewUser) {
      const now = new Date().toISOString();
      const email = credential.user.email ?? '';
      const newUser: User = {
        id: uid,
        email,
        name: credential.user.displayName ?? email.split('@')[0] ?? 'Usuario',
        role: 'parent', // Google Sign-In es solo para padres
        createdAt: now,
        lastLogin: null,
        isActive: true,
        assignedSubjects: null,
        parentId: null,
        username: null,
        mustChangePassword: false,
      };
      await setDoc(doc(db, USERS_COLLECTION, uid), userToFirestore(newUser));
      return newUser;
    }

    return await getUserProfile(uid);
  } catch (e) {
    if (e instanceof AuthException) throw e;
    if (isFirebaseErrorLike(e)) {
      // Equivalente a "el usuario canceló el selector de cuentas" en Flutter
      // (allí se detecta por mensaje; el SDK JS lo expone como código propio).
      if (
        e.code === 'auth/popup-closed-by-user' ||
        e.code === 'auth/cancelled-popup-request'
      ) {
        return null;
      }
      throw new AuthException(mapFirebaseError(e.code));
    }
    throw new AuthException(`Error al iniciar sesión con Google: ${e}`);
  }
}

/** Obtener usuario actualmente autenticado */
export async function getSavedUser(): Promise<User | null> {
  try {
    const current = auth.currentUser;
    if (!current) return null;
    return await getUserProfile(current.uid);
  } catch {
    return null;
  }
}

/** Cerrar sesión */
export async function clearSession(): Promise<void> {
  await signOut(auth);
}

export interface RegisterParams {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  parentId?: string | null;
  assignedSubjects?: string[] | null;
}

/** Registrar nuevo usuario */
export async function register(params: RegisterParams): Promise<User | null> {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password.trim(),
    );
    if (!credential.user) return null;

    const uid = credential.user.uid;
    const now = new Date().toISOString();
    const newUser: User = {
      id: uid,
      email: params.email.trim(),
      name: params.name.trim(),
      role: params.role,
      createdAt: now,
      lastLogin: null,
      isActive: true,
      assignedSubjects: params.assignedSubjects ?? null,
      parentId: params.parentId ?? null,
      username: null,
      mustChangePassword: false,
    };
    await setDoc(doc(db, USERS_COLLECTION, uid), userToFirestore(newUser));
    return newUser;
  } catch (e) {
    if (isFirebaseErrorLike(e)) throw new AuthException(mapFirebaseError(e.code));
    throw new AuthException(`Error al registrar usuario: ${e}`);
  }
}

/** Actualizar perfil de usuario en Firestore */
export async function updateUserProfile(user: User): Promise<User> {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, user.id), userToFirestore(user));
    return user;
  } catch (e) {
    throw new AuthException(`Error al actualizar usuario: ${e}`);
  }
}

/** Cambiar contraseña — requiere reautenticación con la contraseña actual */
export async function changeUserPassword(
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  try {
    const current = auth.currentUser;
    if (!current || !current.email) {
      throw new AuthException('No hay sesión activa');
    }
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
    await updatePassword(current, newPassword);
    return true;
  } catch (e) {
    if (e instanceof AuthException) throw e;
    if (isFirebaseErrorLike(e)) throw new AuthException(mapFirebaseError(e.code));
    throw new AuthException(`Error al cambiar contraseña: ${e}`);
  }
}

/** Obtener todos los usuarios (solo admin — las reglas de Firestore lo exigen) */
export async function getAllUsers(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    return snap.docs.map((d) => userFromFirestore(d.id, d.data()));
  } catch (e) {
    throw new AuthException(`Error al obtener usuarios: ${e}`);
  }
}

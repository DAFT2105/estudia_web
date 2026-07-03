// src/types/user.ts
//
// Puerto literal de lib/models/user.dart

export type UserRole = 'admin' | 'parent' | 'student';

const ROLE_DISPLAY_NAME: Record<UserRole, string> = {
  admin: 'Administrador',
  parent: 'Padre',
  student: 'Alumno',
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: 'Control total del sistema',
  parent: 'Gestión de materias y preguntas',
  student: 'Realizar práctica y exámenes',
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'manage_users',
    'manage_subjects',
    'manage_questions',
    'view_all_results',
    'system_settings',
    'export_data',
  ],
  parent: [
    'manage_subjects',
    'manage_questions',
    'view_student_results',
    'assign_subjects',
  ],
  student: ['take_quiz', 'practice_mode', 'view_own_results', 'view_assigned_subjects'],
};

export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAME[role];
}

export function getRoleDescription(role: UserRole): string {
  return ROLE_DESCRIPTION[role];
}

export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string; // ISO 8601 — equivalente a DateTime de Dart
  lastLogin?: string | null;
  isActive: boolean;
  assignedSubjects?: string[] | null; // Para estudiantes
  parentId?: string | null; // Para estudiantes, referencia al padre
  username?: string | null; // Para estudiantes sin email propio
  mustChangePassword: boolean; // Fuerza definir clave propia en el próximo login
}

/** Equivalente a `User.hasPermission` */
export function userHasPermission(user: User, permission: string): boolean {
  return getRolePermissions(user.role).includes(permission);
}

export const isAdmin = (user: User): boolean => user.role === 'admin';
export const isParent = (user: User): boolean => user.role === 'parent';
export const isStudent = (user: User): boolean => user.role === 'student';

/** Defaults explícitos — equivalentes a los valores por defecto del constructor Dart */
export const USER_DEFAULTS = {
  isActive: true,
  mustChangePassword: false,
} as const;

// src/context/AuthContext.ts
//
// Definicion del contexto, separada del componente AuthProvider (en
// AuthProvider.tsx) por pedido del propio linter de React Refresh: un
// archivo que mezcla un Context con un componente rompe el fast-refresh.

import { createContext } from 'react';
import type { RegisterParams } from '@/services/authService';
import type { User } from '@/types/user';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  currentUser: User | null;
  status: AuthStatus;
  errorMessage: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  registerUser: (params: RegisterParams) => Promise<boolean>;
  updateCurrentUser: (user: User) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  getUsers: () => Promise<User[]>;
  toggleUserActive: (user: User) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Equivalente a `AuthProvider.testCredentials` */
export const TEST_CREDENTIALS: Record<string, string> = {
  Administrador: 'admin@escuela.com / admin123',
  Padre: 'padre@familia.com / padre123',
  Estudiante: 'estudiante@escuela.com / estudiante123',
};

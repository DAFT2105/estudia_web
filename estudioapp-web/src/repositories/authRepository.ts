// src/repositories/authRepository.ts
//
// Puerto literal de lib/repositories/auth_repository.dart (interfaz) y
// lib/repositories/auth_repository_impl.dart (implementación).

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/services/firebase';
import * as authService from '@/services/authService';
import type { RegisterParams } from '@/services/authService';
import type { User } from '@/types/user';

/** Equivalente a la clase abstracta `AuthRepository` de Dart. */
export interface AuthRepository {
  login(email: string, password: string): Promise<User | null>;
  loginWithGoogle(): Promise<User | null>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  register(params: RegisterParams): Promise<User | null>;
  isLoggedIn(): Promise<boolean>;
  updateUser(user: User): Promise<User | null>;
  deleteUser(userId: string): Promise<boolean>;
  getUsers(): Promise<User[]>;
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>;
  resetPassword(email: string): Promise<boolean>;
  hasPermission(permission: string): boolean;
  refreshToken(): Promise<boolean>;
}

export const authRepository: AuthRepository = {
  async login(email, password) {
    return authService.authenticate(email, password);
  },

  async loginWithGoogle() {
    return authService.signInWithGoogle();
  },

  async logout() {
    await authService.clearSession();
  },

  async getCurrentUser() {
    return authService.getSavedUser();
  },

  async register(params) {
    return authService.register(params);
  },

  async isLoggedIn() {
    const user = await authService.getSavedUser();
    return user != null;
  },

  async updateUser(user) {
    return authService.updateUserProfile(user);
  },

  // Igual que en Flutter: no implementado todavía, stub que devuelve false.
  async deleteUser(_userId) {
    return false;
  },

  async getUsers() {
    return authService.getAllUsers();
  },

  async changePassword(currentPassword, newPassword) {
    return authService.changeUserPassword(currentPassword, newPassword);
  },

  // A diferencia del resto de métodos, en Flutter este NO pasa por
  // AuthService — llama directo a fb.FirebaseAuth.instance. Se replica igual.
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch {
      return false;
    }
  },

  // Igual que en Flutter: stub que siempre devuelve false. La verificación
  // real de permisos vive en `userHasPermission` (types/user.ts), consumida
  // desde AuthContext — este método nunca se usa efectivamente en la UI.
  hasPermission(_permission) {
    return false;
  },

  async refreshToken() {
    try {
      const current = auth.currentUser;
      if (!current) return false;
      await current.getIdToken(true);
      return true;
    } catch {
      return false;
    }
  },
};

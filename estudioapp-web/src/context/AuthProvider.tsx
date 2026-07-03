// src/context/AuthProvider.tsx
//
// Puerto literal de lib/providers/auth_provider.dart -- el componente
// proveedor en si. La definicion del contexto vive en AuthContext.ts.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authRepository } from '@/repositories/authRepository';
import { AuthException } from '@/services/authService';
import type { RegisterParams } from '@/services/authService';
import { AppConstants } from '@/utils/appConstants';
import { isValidEmail } from '@/utils/validators';
import { userHasPermission, type User } from '@/types/user';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus('error');
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  // Verificar estado de autenticacion al iniciar -- equivalente a
  // `AuthProvider._checkAuthStatus`, llamado desde el constructor en Dart.
  useEffect(() => {
    let active = true;
    (async () => {
      setStatus('loading');
      try {
        const user = await authRepository.getCurrentUser();
        if (!active) return;
        if (user) {
          setCurrentUser(user);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      } catch (e) {
        if (active) setError(`Error al verificar autenticación: ${e}`);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    setStatus('loading');
    clearError();
    try {
      const user = await authRepository.loginWithGoogle();
      if (!user) {
        // null = usuario cerro el popup sin elegir cuenta (no es un error)
        setStatus('unauthenticated');
        return false;
      }
      setCurrentUser(user);
      setStatus('authenticated');
      return true;
    } catch (e) {
      if (e instanceof AuthException) setError(e.message);
      else setError(`Error al iniciar sesión con Google: ${e}`);
      return false;
    }
  }, [clearError, setError]);

  // Login con email (padre/admin) o usuario (estudiante sin correo propio)
  const login = useCallback(
    async (identifier: string, password: string): Promise<boolean> => {
      setStatus('loading');
      clearError();

      const trimmedIdentifier = identifier.trim();

      if (!trimmedIdentifier || !password.trim()) {
        setError('Usuario/Email y contraseña son requeridos');
        return false;
      }

      let resolvedEmail: string;
      if (trimmedIdentifier.includes('@')) {
        // Padre, admin, o (a futuro) estudiante con correo institucional
        if (!isValidEmail(trimmedIdentifier)) {
          setError('Formato de email inválido');
          return false;
        }
        resolvedEmail = trimmedIdentifier;
      } else {
        // Estudiante sin correo propio -- su "usuario" mapea a un email sintetico
        resolvedEmail = `${trimmedIdentifier.toLowerCase()}@${AppConstants.studentEmailDomain}`;
      }

      try {
        const user = await authRepository.login(resolvedEmail, password.trim());
        if (user) {
          setCurrentUser(user);
          setStatus('authenticated');
          return true;
        }
        setError('Error desconocido durante el login');
        return false;
      } catch (e) {
        if (e instanceof AuthException) setError(e.message);
        else setError(`Error durante el login: ${e}`);
        return false;
      }
    },
    [clearError, setError],
  );

  const logout = useCallback(async () => {
    setStatus('loading');
    try {
      await authRepository.logout();
      setCurrentUser(null);
      setStatus('unauthenticated');
      clearError();
    } catch (e) {
      setError(`Error durante el logout: ${e}`);
    }
  }, [clearError, setError]);

  // Registro de nuevo usuario (solo para admin/parent con permiso manage_users)
  //
  // Nota heredada de auth_provider.dart: si falla por permisos, `setError`
  // cambia `status` a 'error', lo cual -- igual que en la app Flutter --
  // puede hacer que el routing saque a un usuario YA autenticado de vuelta
  // al login mientras se decide como se usa este metodo desde la UI (llega
  // en la Etapa 5, panel de admin). Documentado para no perderlo de vista.
  const registerUser = useCallback(
    async (params: RegisterParams): Promise<boolean> => {
      setStatus('loading');
      clearError();

      if (!currentUser || !userHasPermission(currentUser, 'manage_users')) {
        setError('No tienes permisos para registrar usuarios');
        return false;
      }

      if (!params.email.trim() || !params.name.trim() || !params.password.trim()) {
        setError('Todos los campos son requeridos');
        return false;
      }
      if (!isValidEmail(params.email)) {
        setError('Formato de email inválido');
        return false;
      }
      if (params.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return false;
      }

      try {
        const newUser = await authRepository.register({
          ...params,
          email: params.email.trim(),
          name: params.name.trim(),
          password: params.password.trim(),
        });
        if (newUser) return true;
        setError('Error desconocido durante el registro');
        return false;
      } catch (e) {
        if (e instanceof AuthException) setError(e.message);
        else setError(`Error durante el registro: ${e}`);
        return false;
      }
    },
    [currentUser, clearError, setError],
  );

  const updateCurrentUser = useCallback(
    async (updatedUser: User): Promise<boolean> => {
      try {
        const result = await authRepository.updateUser(updatedUser);
        if (result) {
          setCurrentUser(result);
          return true;
        }
        return false;
      } catch (e) {
        if (e instanceof AuthException) setError(e.message);
        else setError(`Error al actualizar usuario: ${e}`);
        return false;
      }
    },
    [setError],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<boolean> => {
      clearError();

      if (!currentPassword || !newPassword) {
        setError('Las contraseñas son requeridas');
        return false;
      }
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres');
        return false;
      }

      try {
        const success = await authRepository.changePassword(currentPassword, newPassword);
        if (!success) setError('Error al cambiar contraseña');
        return success;
      } catch (e) {
        if (e instanceof AuthException) setError(e.message);
        else setError(`Error al cambiar contraseña: ${e}`);
        return false;
      }
    },
    [clearError, setError],
  );

  const getUsers = useCallback(async (): Promise<User[]> => {
    if (!currentUser || !userHasPermission(currentUser, 'manage_users')) {
      throw new AuthException('No tienes permisos para ver usuarios');
    }
    return authRepository.getUsers();
  }, [currentUser]);

  // Activar/desactivar la cuenta de cualquier usuario (solo para admin)
  const toggleUserActive = useCallback(
    async (user: User): Promise<boolean> => {
      try {
        if (!currentUser || !userHasPermission(currentUser, 'manage_users')) {
          throw new AuthException('No tienes permisos para gestionar usuarios');
        }
        const updated: User = { ...user, isActive: !user.isActive };
        const result = await authRepository.updateUser(updated);
        return result != null;
      } catch (e) {
        if (e instanceof AuthException) setError(e.message);
        else setError(`Error al actualizar usuario: ${e}`);
        return false;
      }
    },
    [currentUser, setError],
  );

  const hasPermission = useCallback(
    (permission: string): boolean =>
      currentUser ? userHasPermission(currentUser, permission) : false,
    [currentUser],
  );

  const value: AuthContextValue = {
    currentUser,
    status,
    errorMessage,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login,
    loginWithGoogle,
    logout,
    registerUser,
    updateCurrentUser,
    changePassword,
    getUsers,
    toggleUserActive,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

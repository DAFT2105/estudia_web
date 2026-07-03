// src/router/ProtectedRoute.tsx
//
// Equivalente de enrutamiento al switch de `AuthWrapper` en main.dart, más
// la restricción por rol mencionada en la sección 4 (Etapa 1, Fase 1.6) del
// plan técnico.
//
// IMPORTANTE: este componente es solo una conveniencia de UX en el cliente.
// El límite de seguridad real sigue siendo las reglas de Firestore +
// Custom Claims (`request.auth.token.admin == true`), asignados con el
// script de Node.js externo al repo — el cliente nunca asigna ni lee ese
// claim directamente, solo el campo `role` del perfil para decidir qué
// mostrar.

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/user';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { status, currentUser } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status !== 'authenticated' || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.mustChangePassword) {
    return <Navigate to="/cambiar-clave" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Sin pantalla de "no autorizado" todavía — redirige a Home, que ya
    // sabe qué mostrarle a cada rol. Se puede refinar en etapas posteriores.
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// src/context/ToastContext.tsx

import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

/** Entrada persistente en el panel de notificaciones (campanita del topbar). */
export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number; // Date.now()
  read: boolean;
}

export interface NotifyOptions {
  /** Si se da, evita duplicados — no se inserta si ya existe una notificación con este id. */
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  /** Inserta directo en el historial de la campanita, SIN popup flotante — para alertas calculadas en segundo plano (ej. inactividad, resultados nuevos). */
  notify: (options: NotifyOptions) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

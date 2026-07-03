// src/context/ToastProvider.tsx
//
// Sistema de notificaciones toast propio — reemplaza alert()/confirm()
// nativos del navegador para mensajes de éxito/error/info ante creación,
// actualización y eliminación de registros.

import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext, type ToastOptions, type ToastVariant, type NotificationItem, type NotifyOptions } from './ToastContext';

const MAX_NOTIFICATIONS = 30;

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant' | 'durationMs'>> {
  id: string;
  description?: string;
  leaving: boolean;
}

const DEFAULT_DURATION = 4000;

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string; iconBg: string }> = {
  success: { bg: '#ffffff', border: '#43a04733', icon: '✓', iconBg: '#43a047' },
  error:   { bg: '#ffffff', border: '#e5393533', icon: '✕', iconBg: '#e53935' },
  info:    { bg: '#ffffff', border: '#34d39933', icon: 'i', iconBg: '#34d399' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    // Espera la animación de salida antes de remover del DOM
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? 'info',
      durationMs: options.durationMs ?? DEFAULT_DURATION,
      leaving: false,
    };
    setToasts((prev) => [...prev, item]);
    const timer = setTimeout(() => dismiss(id), item.durationMs);
    timers.current.set(id, timer);

    // Registra también en el historial persistente (panel de notificaciones)
    setNotifications((prev) => {
      const entry: NotificationItem = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'info',
        createdAt: Date.now(),
        read: false,
      };
      return [entry, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  }, [dismiss]);

  const success = useCallback((title: string, description?: string) => {
    showToast({ title, description, variant: 'success' });
  }, [showToast]);

  const error = useCallback((title: string, description?: string) => {
    showToast({ title, description, variant: 'error', durationMs: 6000 });
  }, [showToast]);

  const info = useCallback((title: string, description?: string) => {
    showToast({ title, description, variant: 'info' });
  }, [showToast]);

  const notify = useCallback((options: NotifyOptions) => {
    setNotifications((prev) => {
      // Evita duplicados cuando se pasa un id estable (ej. alertas calculadas)
      if (options.id && prev.some((n) => n.id === options.id)) return prev;
      const entry: NotificationItem = {
        id: options.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'info',
        createdAt: Date.now(),
        read: false,
      };
      return [entry, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return (
    <ToastContext.Provider
      value={{ showToast, success, error, info, notify, notifications, unreadCount, markAllRead, clearNotifications }}
    >

      {children}

      {/* Contenedor de toasts — esquina superior derecha, encima de todo */}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-lg"
              style={{
                borderColor: style.border,
                backgroundColor: style.bg,
                animation: toast.leaving
                  ? 'toastOut 200ms ease forwards'
                  : 'toastIn 250ms ease',
              }}
            >
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                style={{ backgroundColor: style.iconBg }}
              >
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-ink">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 rounded-md p-0.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
                aria-label="Cerrar notificación"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(16px) scale(0.97); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

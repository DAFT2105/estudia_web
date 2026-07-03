// src/context/ConfirmProvider.tsx
//
// Ventana emergente propia de confirmación — reemplaza window.confirm()
// nativo. Uso: const confirm = useConfirm(); const ok = await confirm({...}).

import { useCallback, useRef, useState } from 'react';
import { ConfirmContext, type ConfirmOptions } from './ConfirmContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPending({ ...options, resolve });
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {pending && (
        <ConfirmDialogBody
          pending={pending}
          onCancel={() => settle(false)}
          onConfirm={() => settle(true)}
        />
      )}

      <style>{`
        @keyframes confirmOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes confirmPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
}

// ── Subcomponente — separado para poder usar el focus trap solo cuando está montado ──

function ConfirmDialogBody({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingConfirm;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDanger = pending.tone === 'danger';
  const containerRef = useFocusTrap<HTMLDivElement>(true, onCancel);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      style={{ animation: 'confirmOverlayIn 150ms ease' }}
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl"
        style={{ animation: 'confirmPanelIn 200ms ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white"
            style={{ backgroundColor: isDanger ? '#e53935' : '#ff4d2e' }}
          >
            {isDanger ? '!' : '?'}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p id="confirm-dialog-title" className="text-[14px] font-bold text-ink">
              {pending.title}
            </p>
            {pending.description && (
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                {pending.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-[13px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-[0.98]"
          >
            {pending.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: isDanger ? '#e53935' : '#ff4d2e' }}
          >
            {pending.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

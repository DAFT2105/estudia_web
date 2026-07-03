// src/components/ErrorBoundary.tsx
//
// Atrapa errores no controlados en el árbol de React y muestra una UI de
// fallback amigable en vez de una pantalla blanca. Class component porque
// React solo soporta getDerivedStateFromError/componentDidCatch en clases.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Error no controlado:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-lg">
          <span className="text-4xl">⚠️</span>
          <h1 className="mt-3 text-lg font-bold text-ink">Algo salió mal</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            Ocurrió un error inesperado en la aplicación. Puedes intentar recargar la página
            o volver al inicio.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-neutral-50 p-3 text-left text-[10px] text-error">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-5 flex gap-3">
            <button
              onClick={this.handleGoHome}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-[13px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Ir al inicio
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 rounded-xl bg-coral py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}

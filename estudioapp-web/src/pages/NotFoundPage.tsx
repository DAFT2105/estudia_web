// src/pages/NotFoundPage.tsx

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-6xl font-bold text-coral">404</p>
        <h1 className="mt-3 text-lg font-bold text-ink">Página no encontrada</h1>
        <p className="mt-2 text-[13px] text-neutral-500">
          La página que buscas no existe o se movió de lugar.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-coral px-5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}

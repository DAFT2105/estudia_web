// src/components/LoadingScreen.tsx
//
// Puerto de la clase `LoadingScreen` definida en main.dart.

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-blue-50">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-800 text-xl font-semibold text-white">
        EA
      </div>
      <h1 className="text-xl font-bold text-neutral-800">EstudioApp</h1>
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        role="status"
        aria-label="Cargando"
      />
      <p className="text-sm text-neutral-500">Cargando...</p>
    </div>
  );
}

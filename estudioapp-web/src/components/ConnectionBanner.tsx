// src/components/ConnectionBanner.tsx
//
// Banner fijo que avisa cuando se pierde la conexión a internet —
// Firestore sigue intentando en segundo plano, pero el usuario debe saber
// que sus cambios podrían no estar guardándose.

import { useEffect, useState } from 'react';

export function ConnectionBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !justReconnected) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-semibold text-white"
      style={{ backgroundColor: isOnline ? '#43a047' : '#e53935' }}
      role="status"
    >
      {isOnline ? (
        <>✓ Conexión restablecida</>
      ) : (
        <>⚠ Sin conexión a internet — los cambios podrían no guardarse</>
      )}
    </div>
  );
}

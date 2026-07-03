// src/main.tsx
//
// Equivalente al `void main() async { ... }` de main.dart: inicializa
// Firebase/App Check antes de montar la app.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { activateAppCheck } from '@/services/firebase';
import '@/styles/index.css';

// App Check requiere una site key real de reCAPTCHA para funcionar — en
// los primeros pasos de la Etapa 0 puede no estar configurada todavía, así
// que se omite con una advertencia en vez de romper el arranque local.
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  activateAppCheck();
} else {
  console.warn(
    '[EstudioApp] VITE_RECAPTCHA_SITE_KEY no está configurada — App Check desactivado en este entorno.',
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// src/services/firebase.ts
//
// Inicialización del SDK de Firebase para web — equivalente a los bloques
// `Firebase.initializeApp(...)` y `FirebaseAppCheck.instance.activate(...)`
// de lib/main.dart.
//
// Diferencia clave frente a Flutter: en Android, App Check usa Play
// Integrity; en web no existe ese proveedor, así que se usa reCAPTCHA v3
// (ver sección 13 del documento técnico — "Consideraciones para la versión web").

import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

/**
 * Activa App Check con reCAPTCHA v3.
 *
 * En desarrollo (`import.meta.env.DEV`), habilita el debug token igual que
 * el `AndroidProvider.debug` de Flutter — el SDK imprime el token en la
 * consola del navegador para registrarlo manualmente en Firebase Console.
 *
 * Se exporta como función (no se ejecuta al importar el módulo) porque
 * `initializeAppCheck` requiere que el documento ya esté disponible y solo
 * debe llamarse una vez, desde `main.tsx`.
 */
export function activateAppCheck() {
  if (import.meta.env.DEV) {
    // Equivalente al AndroidProvider.debug — ver consola para el token
    // y registrarlo en Firebase Console > App Check > Apps.
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  return initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

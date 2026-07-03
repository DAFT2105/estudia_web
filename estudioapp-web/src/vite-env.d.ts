/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Site key de reCAPTCHA v3 para Firebase App Check (equivalente web de Play Integrity) */
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_GROQ_MODEL: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GEMINI_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

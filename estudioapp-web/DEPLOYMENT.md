# Guía de despliegue — EstudioApp Web

## 1. App Check en producción (Fase 6.2)

En Flutter, App Check usa Play Integrity (Android) registrado con la huella SHA-256
del keystore. En web **no existe Play Integrity** — el equivalente es **reCAPTCHA
v3** (o Enterprise), ya integrado en `src/services/firebase.ts` desde la Etapa 0.

Pasos en Firebase Console (proyecto `estudia-pe`):

1. **App Check → Apps** → registrar la app web (si no existe todavía como app
   separada del proyecto — Firebase permite varias apps por proyecto, una por
   plataforma).
2. Elegir **reCAPTCHA v3** como proveedor → genera un *site key* público y un
   *secret key* privado (el secret nunca va al cliente, solo lo usa Firebase
   internamente).
3. Copiar el site key a `VITE_RECAPTCHA_SITE_KEY` en el `.env` de producción.
4. **App Check → Apps → [tu app] → Forzar aplicación**: activar el modo
   **"Aplicar"** para Firestore — el mismo modo que Android ya tiene activado (ver
   sección 8 del documento técnico original). Mientras esté en modo "Supervisión",
   las peticiones sin token válido se loguean pero no se bloquean — no lo dejes así
   en producción.
5. Probar en `localhost` antes: con `import.meta.env.DEV`, `activateAppCheck()` ya
   activa el debug token automáticamente (ver comentario en `firebase.ts`) — el SDK
   imprime un token en la consola del navegador, que hay que registrar manualmente en
   **App Check → Apps → ⋮ → Administrar tokens de depuración** antes de poder probar
   contra reglas en modo "Aplicar" desde tu máquina.

No hay huella SHA-256 que registrar para web — ese pendiente del documento técnico
original (sección 12, "Release / Play Store") es exclusivo de Android y no aplica
aquí.

## 2. Variables de entorno de producción

Completar `.env` (nunca commitearlo) con las credenciales reales:

```bash
cp .env.example .env
```

Ver `.env.example` para la lista completa (Firebase, reCAPTCHA, Groq, Gemini). Las
claves de Groq/Gemini son las mismas que ya usa la app Flutter — no hay que generar
credenciales nuevas, son por proveedor de IA, no por cliente.

## 3. Build de producción

```bash
npm run build
```

Esto corre `tsc -b && vite build` y genera `dist/`. Verificar antes de desplegar:

```bash
npm run lint
npm run test
npm run preview   # sirve dist/ localmente para una última revisión visual
```

## 4. Firebase Hosting (Fase 6.5)

Se eligió Firebase Hosting (en vez de Vercel/Netlify) porque el proyecto ya vive en
el ecosistema Firebase — un solo lugar para Auth, Firestore, App Check y Hosting.

### Primera vez

```bash
npm install -g firebase-tools   # si no lo tienes instalado globalmente
firebase login
```

Este repo ya incluye `firebase.json` con la configuración de Hosting (carpeta
`dist/`, reescritura de SPA para que las rutas de React Router funcionen al
recargar la página). Falta vincularlo a tu proyecto real:

```bash
cp .firebaserc.example .firebaserc
# editar .firebaserc y reemplazar "TU_PROJECT_ID_AQUI" por "estudia-pe"
```

### Desplegar

```bash
npm run build
firebase deploy --only hosting
```

### Nota sobre las reglas de Firestore

`firebase.json` **no incluye** un target de `firestore` — las reglas se gestionan
directamente en Firebase Console (igual que en el proyecto Flutter, ver
`SECURITY_CHECKLIST.md`) y no hay un archivo `firestore.rules` en ningún repo del
proyecto. Si en algún momento se decide versionar las reglas, se pueden traer con
`firebase firestore:rules:get` antes de agregar un target de despliegue para ellas.

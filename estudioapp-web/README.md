# EstudioApp Web

Migración de EstudioApp (Flutter) a React + Firebase, manteniendo el mismo backend
(Firestore, Auth, App Check, reglas de seguridad y Custom Claims).

El plan completo de arquitectura y el roadmap por etapas/fases vive en
`estudioapp-web-plan-tecnico.md` (documento de planificación, no se commitea con el
código). Este repo solo contiene el código.

## Stack

- Vite + React 19 + TypeScript
- React Router v6
- Context API + hooks custom (equivalente a los `ChangeNotifier`/`Provider` de Flutter)
- Firebase JS SDK v10 (modular) — Auth, Firestore, App Check (reCAPTCHA v3)
- Tailwind CSS v4
- React Hook Form
- Vitest + React Testing Library

## Setup

```bash
npm install
cp .env.example .env   # completar con las credenciales reales de Firebase/IA
npm run dev
```

## Documentación adicional

- `SECURITY_CHECKLIST.md` — verificación manual de las reglas de Firestore por
  colección y rol, y estado de los pendientes conocidos.
- `DEPLOYMENT.md` — App Check en producción (reCAPTCHA) y despliegue a Firebase
  Hosting.
- `TESTING_CHECKLIST.md` — flujos críticos a probar manualmente contra un proyecto
  Firebase real (login dual, creación de estudiantes, generación con IA, examen
  completo, panel de admin).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Type-check (`tsc -b`) + build de producción |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run test` | Vitest (una corrida) |
| `npm run test:watch` | Vitest en modo watch |

## Estructura

```
src/
  types/        # Interfaces + enums - puerto de lib/models/*.dart
  services/     # Acceso a Firestore/Auth - puerto de lib/services/*.dart
  repositories/ # Interfaz + implementacion - puerto de lib/repositories/
  context/      # Equivalente a los ChangeNotifier de lib/providers/
  hooks/        # use* - consumen el contexto
  pages/        # Pantallas, organizadas igual que lib/screens/ (auth, home, students, subjects, questions, results, admin)
  components/   # Componentes compartidos
  router/       # React Router
  utils/        # Constantes y helpers - puerto de lib/utils/
  styles/       # Tailwind + paleta de AppTheme
```

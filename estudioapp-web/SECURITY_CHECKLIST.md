# Checklist de seguridad — EstudioApp Web

> Las reglas de Firestore viven en Firebase Console, no en este repositorio (igual
> que en la app Flutter — ver sección 7 del documento técnico original). Esta
> checklist sirve para **verificar manualmente, contra el proyecto real
> `estudia-pe`**, que el SDK JS respeta las mismas reglas que ya respeta el SDK
> Flutter. No se puede automatizar dentro de este entorno de desarrollo porque
> requiere credenciales reales y el Firebase Emulator Suite (que necesita
> descargar binarios desde dominios de Google no disponibles aquí).

## Patrón general de las reglas (resumen, no el texto exacto)

```
allow read, write: if request.auth.uid == resource.data.createdBy
                    || request.auth.token.admin == true;
```

El bypass de admin depende del **Custom Claim** `admin: true` en el token, no del
campo `role` del documento — ese claim lo asigna el script de Node.js externo al
repo. Verificar esto es el punto más importante de toda la checklist: si alguna
prueba de admin falla, lo primero a revisar es si la cuenta de prueba realmente
tiene el claim (no solo `role: 'admin'` en Firestore).

## Cómo verificar cada colección

Para cada fila: iniciar sesión con el rol indicado en la app web real (no en este
entorno), intentar la acción, y confirmar que Firestore devuelve `permission-denied`
cuando corresponde (visible en la consola del navegador como un error de
`FirebaseError`).

| Colección | Quién debería poder leer | Quién debería poder escribir | Cómo probarlo |
|---|---|---|---|
| `users` | El propio usuario su doc; admin todos | El propio usuario su doc; admin todos | Login como padre A, intentar leer `users/{uid del padre B}` desde la consola del navegador (`getDoc`) → debe fallar |
| `students` | El propio estudiante; su padre (`parentId`); admin todos | El padre creador (`parentId`); admin | Login como padre A, intentar `getDocs` sobre `students` filtrando por `parentId == padre B` → debe devolver vacío o fallar, nunca datos de otro padre |
| `subjects` | Lectura abierta a cualquier autenticado (necesario para que el estudiante vea materias asignadas) | Solo el creador (`createdBy`); admin | Login como padre A, intentar `updateDoc` sobre una materia de padre B → debe fallar |
| `questions` | Lectura abierta a cualquier autenticado | Solo el creador; admin | Login como estudiante, leer preguntas de su materia asignada → debe funcionar (lectura abierta); intentar `updateDoc` sobre cualquier pregunta → debe fallar siempre para un estudiante |
| `questionSets` | Lectura abierta | Solo el creador; admin | Igual patrón que `questions` |
| `results` | El propio estudiante; su padre (si se guardó `parentId` al crear, ver `resultService.saveResult`); admin | Solo creación por el propio estudiante; **inmutable para todos** (`allow update, delete: if false`) | Login como estudiante, intentar `updateDoc` o `deleteDoc` sobre un resultado ya guardado (propio o ajeno) → debe fallar siempre, incluso sobre el propio |

## Caso particular: `parentId` en `results`

`resultService.saveResult` guarda `parentId` como campo extra **solo si se le pasa
explícitamente** (ver `src/services/resultService.ts`). Si en algún punto se llama a
`saveResult` sin pasar el `parentId` del estudiante, el padre **no podrá leer** ese
resultado después (la regla de Firestore exige `uid == parentId`, y el campo
simplemente no estaría ahí). Verificar específicamente:

1. Un estudiante completa una práctica o examen.
2. El padre de ese estudiante visita `/resultados-padre` (`ParentResultsPage`).
3. El resultado recién creado debe aparecer ahí. Si no aparece, revisar que
   `PracticeModePage`/`ExamModePage` efectivamente pasan `currentUser.parentId` al
   llamar `saveResult` (ya lo hacen en el código actual — esto es una verificación de
   regresión para cuando se modifique ese flujo, no una alerta de un bug conocido).

## Pendientes conocidos aplicables a la web (Fase 6.3)

| Pendiente | Estado | Detalle |
|---|---|---|
| Protección de enumeración de usuarios | **Pendiente de revisar** — no es código, es un toggle en Firebase Console → Authentication → Configuración. Aplica igual a web que a Flutter (no es específico de ningún cliente). | Activarlo antes de producción; revisar cuotas en Google Cloud Console → APIs y servicios → Identity Toolkit API |
| Apple Sign-In | Diferido (igual que en Flutter) | Requiere cuenta Apple Developer ($99/año). No se portó porque ni siquiera existe en la versión móvil actual |
| Facebook Sign-In | Diferido (igual que en Flutter) | Requiere cuenta Meta for Developers verificada. Mismo estado que Apple Sign-In |
| Huella SHA-256 de producción | **No aplica a web** | Era específico del Play Integrity de Android (App Check). La web usa reCAPTCHA, que no requiere huellas SHA — ver `DEPLOYMENT.md` para el equivalente real en web |
| Estudiantes de prueba antiguos (sin username) | Igual que en Flutter | `studentFromFirestore` ya incluye el mismo fallback de `Student.fromJson` (`splitLegacyName`) — verificado con test unitario en `studentService.test.ts` |

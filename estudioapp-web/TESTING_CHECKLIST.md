# Checklist de testing manual end-to-end — EstudioApp Web

> Por qué manual y no automatizado: un E2E real (Playwright/Cypress) necesita un
> navegador con binarios descargados desde dominios de Google/Microsoft no
> disponibles en este entorno de desarrollo, **y** un proyecto Firebase real con
> datos de prueba. Esta checklist reemplaza esa automatización por ahora — sigue
> cada flujo una sola vez contra `estudia-pe` (o un proyecto Firebase de prueba)
> después de completar `.env`. Los 63 tests unitarios (`npm run test`) ya cubren la
> lógica de negocio pura (red de seguridad de IA, generación de username, cálculo de
> resultados, validaciones de formularios) — esta checklist cubre lo que esos tests
> no pueden: la integración real con Firebase Auth/Firestore en el navegador.

## 1. Login dual (la pieza más particular del proyecto)

- [ ] Login con email real (padre) → entra al dashboard de padre
- [ ] Login con email real (admin) → entra al dashboard de admin
- [ ] Login con usuario sin "@" (estudiante) → se le agrega el dominio sintético y
      entra como estudiante
- [ ] Login con credenciales incorrectas → mensaje de error visible, no crashea
- [ ] Google Sign-In primera vez → crea perfil de padre automáticamente
- [ ] Google Sign-In segunda vez (mismo usuario) → entra directo, no duplica el perfil

## 2. Creación de estudiantes (instancia secundaria de Firebase)

- [ ] Crear un estudiante nuevo → se muestra usuario + clave temporal una sola vez
- [ ] **Verificar que la sesión del padre sigue activa** después de crear el
      estudiante (el punto crítico de la instancia secundaria — si esto falla, la app
      te habría deslogueado)
- [ ] Crear un segundo estudiante con nombre/apellido que generaría el mismo
      username que el primero → debe generar un username distinto (ej. `jperez` →
      `juperez`), no fallar
- [ ] Cerrar sesión del padre, iniciar sesión con el usuario+clave temporal del
      estudiante recién creado → fuerza la pantalla de cambio de clave obligatorio
- [ ] Cambiar la clave → ya no vuelve a pedir cambio de clave en el siguiente login

## 3. Materias, banco de preguntas y generación con IA

- [ ] Crear una materia → aparece en la lista
- [ ] Crear una pregunta manual de cada tipo (opción múltiple, verdadero/falso,
      respuesta corta) → se guarda y aparece en el banco
- [ ] Generar preguntas por texto (Groq) → llegan preguntas a la pantalla de revisión
- [ ] Generar preguntas por imagen (Gemini), usando la cámara real del navegador →
      el flujo de "Tomar otra"/"Aceptar" funciona, y llegan preguntas nuevas (no
      copiadas de la imagen)
- [ ] Generar preguntas de una materia de área **Matemática** → confirmar en la
      explicación de al menos una pregunta que el cálculo se ve correcto (verificación
      matemática activa)
- [ ] Armar un `QuestionSet` seleccionando preguntas con checkboxes → aparece en
      "Grupos de preguntas"

## 4. Asignación

- [ ] Asignar una materia a un estudiante desde "Por estudiante" → aparece reflejado
      también en "Por materia"
- [ ] Desasignar desde "Por materia" → desaparece también del lado del estudiante

## 5. Práctica y examen (estudiante)

- [ ] Practicar una materia asignada en modo aleatorio → feedback inmediato por
      pregunta, resultado guardado al final
- [ ] Practicar usando un `QuestionSet` armado por el padre (si existe alguno) → salta
      la pantalla de configuración
- [ ] Examen con cronómetro → el tiempo corre, se puede navegar atrás/adelante entre
      preguntas, no se ve la respuesta correcta hasta finalizar
- [ ] Dejar correr el cronómetro hasta cero sin finalizar manualmente → el examen se
      autofinaliza y guarda el resultado
- [ ] Ver "Mis Resultados" → el resultado recién creado aparece en el historial

## 6. Resultados vistos por el padre

- [ ] El padre ve el resultado del estudiante en `/resultados-padre`
      inmediatamente después de que el estudiante lo completa (sin recargar
      manualmente la colección — confirma que `parentId` se guardó correctamente, ver
      `SECURITY_CHECKLIST.md`)
- [ ] Entrar al detalle de un estudiante específico → desglose por materia coincide
      con lo esperado

## 7. Panel de administrador

- [ ] Login como admin → ve el dashboard de admin, no el de padre/estudiante
- [ ] Usuarios → buscar, filtrar por rol, desactivar una cuenta de prueba y
      confirmar que esa cuenta ya no puede iniciar sesión
- [ ] Reportes → las cifras del resumen general coinciden con lo creado en los pasos
      anteriores (cantidad de materias, preguntas, sesiones)

## 8. Casos de error esperados (no deberían romper la app)

- [ ] Generar preguntas con IA sin conexión a internet → mensaje de error claro, no
      pantalla en blanco
- [ ] Intentar acceder a `/admin/usuarios` logueado como padre → redirige a inicio
      (no error 500 ni pantalla rota)
- [ ] Recargar la página estando a mitad de un examen → el examen se pierde (esperado,
      documentado como limitación equivalente a cerrar la app en Flutter), pero la app
      no queda en un estado roto — vuelve al login o al home según corresponda

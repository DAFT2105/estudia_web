// src/utils/appConstants.ts
//
// Puerto literal de lib/utils/app_constants.dart

/** Constantes compartidas entre distintas capas de la app. */
export const AppConstants = {
  /**
   * Dominio sintético usado para construir el "email" interno de Firebase
   * Auth de los estudiantes que no tienen un correo propio.
   * Firebase Auth exige formato de email válido, pero este dominio nunca
   * recibe correos reales — el estudiante solo ve y usa su `username`.
   *
   * Usado en:
   *  - studentService al crear la cuenta Auth del estudiante
   *  - authContext al iniciar sesión (detecta "usuario" vs "correo")
   */
  studentEmailDomain: 'alumno.estudioapp.local',
} as const;

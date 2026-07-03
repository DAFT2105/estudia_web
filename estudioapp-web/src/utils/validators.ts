// src/utils/validators.ts
//
// Puerto del regex de email usado en `AuthProvider._isValidEmail` (y
// duplicado en el validator de `login_screen.dart`). Se centraliza aquí una
// sola vez para que AuthContext y LoginPage no puedan divergir.

export const EMAIL_REGEX = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

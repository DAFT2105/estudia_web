import { describe, it, expect } from 'vitest';
import { isValidEmail } from './validators';

describe('isValidEmail', () => {
  it.each(['padre@familia.com', 'admin@escuela.com', 'nombre.apellido@dominio.co'])(
    'acepta %s',
    (value) => {
      expect(isValidEmail(value)).toBe(true);
    },
  );

  it.each(['jperez', 'sin-arroba', 'usuario@', '@dominio.com', 'a@b'])(
    'rechaza %s',
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});

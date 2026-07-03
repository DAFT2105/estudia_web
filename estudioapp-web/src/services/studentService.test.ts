import { describe, it, expect, vi } from 'vitest';

// normalizeForUsername / buildSyntheticEmail / generateTemporaryPassword son
// funciones puras, pero studentService.ts importa `@/services/firebase` a
// nivel de módulo (que llama `getAuth()` apenas se carga). Sin un proyecto
// Firebase real conectado en este entorno de pruebas, eso lanzaría
// `auth/invalid-api-key` solo por importar el archivo — se mockea para que
// el test ejercite la lógica pura sin depender de credenciales reales.
vi.mock('@/services/firebase', () => ({
  auth: {},
  db: {},
  firebaseApp: { options: {} },
}));

import {
  normalizeForUsername,
  buildSyntheticEmail,
  generateTemporaryPassword,
} from './studentService';

describe('normalizeForUsername', () => {
  it('quita tildes y ñ, y baja a minúsculas', () => {
    expect(normalizeForUsername('José Ñúñez')).toBe('josenunez');
  });

  it('quita caracteres no alfabéticos (espacios, números, símbolos)', () => {
    expect(normalizeForUsername("O'Connor 2")).toBe('oconnor');
  });

  it('devuelve cadena vacía si no hay letras', () => {
    expect(normalizeForUsername('1234')).toBe('');
  });
});

describe('buildSyntheticEmail', () => {
  it('usa el dominio sintético de estudiantes', () => {
    expect(buildSyntheticEmail('jperez')).toBe('jperez@alumno.estudioapp.local');
  });
});

describe('generateTemporaryPassword', () => {
  it('genera 8 caracteres por defecto', () => {
    expect(generateTemporaryPassword()).toHaveLength(8);
  });

  it('respeta una longitud distinta', () => {
    expect(generateTemporaryPassword(12)).toHaveLength(12);
  });

  it('nunca incluye caracteres visualmente confundibles (0 O 1 l I)', () => {
    const password = generateTemporaryPassword(200); // muestra grande
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it('genera valores distintos entre llamadas (no es un charset fijo repetido)', () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).not.toBe(b);
  });
});

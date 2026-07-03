import { describe, it, expect } from 'vitest';
import { parseQuestionsFromJSON } from './aiQuestionService';

function buildResponse(preguntas: unknown[]): string {
  return JSON.stringify({ preguntas });
}

describe('parseQuestionsFromJSON — red de seguridad estructural', () => {
  it('acepta una pregunta cuando valor_correcto y respuesta_correcta ya coinciden', () => {
    const content = buildResponse([
      {
        texto: '¿Cuánto es 2 + 2?',
        tipo: 'multipleChoice',
        opciones: ['3', '4', '5', '6'],
        valor_correcto: '4',
        respuesta_correcta: '4',
        explicacion: '2 + 2 = 4',
        tema: 'Suma',
      },
    ]);

    const result = parseQuestionsFromJSON(content, 'medium');

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correctAnswer).toBe('4');
    expect(result.corrected).toBe(0);
    expect(result.discarded).toBe(0);
  });

  it('autocorrige cuando valor_correcto está en las opciones pero respuesta_correcta no coincide', () => {
    // Simula el caso real que motivó la verificación matemática: la IA
    // calculó bien (valor_correcto) pero etiquetó mal la respuesta.
    const content = buildResponse([
      {
        texto: '¿Cuánto es 5 x 3?',
        tipo: 'multipleChoice',
        opciones: ['10', '15', '20', '25'],
        valor_correcto: '15',
        respuesta_correcta: '20',
        explicacion: '5 x 3 = 15',
        tema: 'Multiplicación',
      },
    ]);

    const result = parseQuestionsFromJSON(content, 'medium');

    expect(result.questions).toHaveLength(1);
    // Se confía en valor_correcto (el resultado del cálculo), no en
    // respuesta_correcta -- la pregunta se guarda con el valor correcto.
    expect(result.questions[0].correctAnswer).toBe('15');
    expect(result.corrected).toBe(1);
    expect(result.discarded).toBe(0);
  });

  it('descarta cuando ningún valor coincide con ninguna opción', () => {
    const content = buildResponse([
      {
        texto: '¿Cuánto es 7 + 8?',
        tipo: 'multipleChoice',
        opciones: ['10', '12', '20', '25'],
        valor_correcto: '15', // no está en las opciones
        respuesta_correcta: '99', // tampoco está
        explicacion: '7 + 8 = 15',
        tema: 'Suma',
      },
    ]);

    const result = parseQuestionsFromJSON(content, 'medium');

    expect(result.questions).toHaveLength(0);
    expect(result.corrected).toBe(0);
    expect(result.discarded).toBe(1);
  });

  it('no aplica la verificación de opciones a respuesta_corta (sin opciones)', () => {
    const content = buildResponse([
      {
        texto: '¿Cuál es la capital de Perú?',
        tipo: 'shortAnswer',
        opciones: [],
        valor_correcto: 'Lima',
        respuesta_correcta: 'Lima',
        explicacion: 'Lima es la capital de Perú',
        tema: 'Geografía',
      },
    ]);

    const result = parseQuestionsFromJSON(content, 'easy');

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correctAnswer).toBe('Lima');
    expect(result.discarded).toBe(0);
  });

  it('descarta preguntas sin texto', () => {
    const content = buildResponse([
      { tipo: 'multipleChoice', opciones: [], respuesta_correcta: 'x' },
    ]);

    const result = parseQuestionsFromJSON(content, 'medium');

    expect(result.questions).toHaveLength(0);
    expect(result.discarded).toBe(1);
  });

  it('limpia bloques de markdown ```json antes de parsear', () => {
    const raw =
      '```json\n' +
      buildResponse([
        {
          texto: '¿Verdadero o falso: el sol es una estrella?',
          tipo: 'trueFalse',
          opciones: ['Verdadero', 'Falso'],
          valor_correcto: 'Verdadero',
          respuesta_correcta: 'Verdadero',
          tema: 'Astronomía',
        },
      ]) +
      '\n```';

    const result = parseQuestionsFromJSON(raw, 'easy');

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correctAnswer).toBe('Verdadero');
  });

  it('procesa un lote mixto: una acepta, una se autocorrige, una se descarta', () => {
    const content = buildResponse([
      {
        texto: 'Pregunta correcta de entrada',
        tipo: 'multipleChoice',
        opciones: ['A', 'B'],
        valor_correcto: 'A',
        respuesta_correcta: 'A',
      },
      {
        texto: 'Pregunta que requiere autocorrección',
        tipo: 'multipleChoice',
        opciones: ['A', 'B'],
        valor_correcto: 'B',
        respuesta_correcta: 'A',
      },
      {
        texto: 'Pregunta imposible de corregir',
        tipo: 'multipleChoice',
        opciones: ['A', 'B'],
        valor_correcto: 'C',
        respuesta_correcta: 'D',
      },
    ]);

    const result = parseQuestionsFromJSON(content, 'medium');

    expect(result.questions).toHaveLength(2);
    expect(result.corrected).toBe(1);
    expect(result.discarded).toBe(1);
  });
});

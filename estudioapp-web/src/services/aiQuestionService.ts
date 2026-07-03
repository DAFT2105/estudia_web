// src/services/aiQuestionService.ts
//
// Puerto literal de lib/services/ai_question_service.dart. El bloque de
// verificación matemática, los prompts, y la red de seguridad estructural
// (_parseQuestionsFromJSON) se mantienen exactamente iguales -- es la pieza
// con más riesgo si se traduce de memoria en vez de carácter por carácter.

import type { QuestionDifficulty, QuestionType } from '@/types/question';
import type { SubjectArea } from '@/types/subject';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_QUESTIONS = 20;

export class AIException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIException';
  }
}

/** Pregunta generada por IA, antes de guardarse en Firestore -- `selected` es estado de UI. */
export interface AIGeneratedQuestion {
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  topic?: string | null;
  difficulty: QuestionDifficulty;
  selected: boolean;
}

export interface AIGenerationResult {
  questions: AIGeneratedQuestion[];
  corrected: number;
  discarded: number;
}

function clampCount(count: number): number {
  return Math.min(Math.max(count, 1), MAX_QUESTIONS);
}

// ─────────────────────────────────────────────
// HELPERS -- Prompts (idénticos a los de Dart)
// ─────────────────────────────────────────────

const DIFFICULTY_TEXT: Record<QuestionDifficulty, string> = {
  easy: 'fácil (nivel básico, conceptos fundamentales)',
  medium: 'media (nivel intermedio, aplicación de conceptos)',
  hard: 'difícil (nivel avanzado, análisis y síntesis)',
};

const DIFFICULTY_TEXT_IMAGE: Record<QuestionDifficulty, string> = {
  easy: 'fácil (conceptos básicos y fundamentales)',
  medium: 'media (aplicación práctica de los conceptos)',
  hard: 'difícil (análisis profundo y resolución de problemas complejos)',
};

const TYPE_TEXT: Record<QuestionType, string> = {
  multipleChoice: 'opción múltiple con exactamente 4 alternativas (A, B, C, D)',
  trueFalse: 'verdadero o falso',
  shortAnswer: 'respuesta corta',
};

function typeToString(type: QuestionType): string {
  return type;
}

/**
 * Instrucción extra que se inyecta SOLO para materias del área Matemática
 * -- pide a la IA verificar su propia aritmética paso a paso antes de
 * responder, para reducir errores de cálculo.
 */
function mathVerificationBlock(area: SubjectArea): string {
  if (area !== 'matematica') return '';
  return `

⚠️ VERIFICACIÓN OBLIGATORIA (materia de Matemática) — sigue este orden exacto:
1. Resuelve el ejercicio TÚ MISMO paso a paso, mostrando el cálculo completo.
2. Anota el resultado final numérico que obtuviste.
3. Construye las 4 opciones de modo que UNA de ellas sea exactamente ese resultado (las otras 3 deben ser distractores plausibles, no el resultado correcto).
4. Copia ese resultado, EXACTO y sin cambiar nada, en los campos "valor_correcto" Y "respuesta_correcta".
- NO generes primero las opciones al azar y luego "ajustes" la respuesta — el orden es: calcular → recién ahí elegir cuál opción es la correcta.
- En el campo "explicacion", resume el cálculo en MÁXIMO 3 líneas cortas (esto reemplaza la regla general de 2 líneas, solo para esta materia) — prioriza mostrar los números clave del cálculo, no expliques con prosa larga.
- Revisa la operación una segunda vez antes de responder — los errores aritméticos no son aceptables.
`;
}

function buildTextPrompt(params: {
  subjectName: string;
  topic: string;
  count: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  area: SubjectArea;
}): string {
  const { subjectName, topic, count, difficulty, type, area } = params;
  return `
Genera exactamente ${count} preguntas de ${TYPE_TEXT[type]} sobre "${topic}" para la materia "${subjectName}".
Dificultad: ${DIFFICULTY_TEXT[difficulty]}.
${mathVerificationBlock(area)}
Responde ÚNICAMENTE con este JSON, sin texto adicional:

{
  "preguntas": [
    {
      "texto": "¿Texto de la pregunta?",
      "tipo": "${typeToString(type)}",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "valor_correcto": "Copia EXACTA de la opción correcta, idéntica a como aparece en \\"opciones\\"",
      "respuesta_correcta": "Debe ser IDÉNTICO al campo valor_correcto — no un valor distinto",
      "explicacion": "Breve explicación de por qué es correcta",
      "tema": "${topic}"
    }
  ]
}

Reglas importantes:
- Para opción múltiple: exactamente 4 opciones, solo una correcta
- Para verdadero/falso: opciones = ["Verdadero", "Falso"]
- Para respuesta corta: opciones = []
- "valor_correcto" y "respuesta_correcta" DEBEN ser el mismo texto exacto — nunca uno calculado y otro distinto
- "valor_correcto" DEBE estar copiado literalmente de la lista "opciones", sin cambiar ni un carácter
- La explicación debe ser breve (máximo 2 líneas)
- Genera exactamente ${count} preguntas
`;
}

function buildImagePrompt(params: {
  subjectName: string;
  count: number;
  difficulty: QuestionDifficulty;
  gradeLevel: string;
  area: SubjectArea;
}): string {
  const { subjectName, count, difficulty, gradeLevel, area } = params;
  return `
Analiza esta imagen educativa de la materia "${subjectName}" para estudiantes de ${gradeLevel}.

PASO 1 — Identifica:
- ¿Qué tema o concepto educativo se está enseñando?
- ¿Qué tipo de contenido contiene? (teoría, ejemplos, ejercicios, fórmulas, diagramas)
- ¿Cuál es el nivel de los conceptos mostrados?

PASO 2 — Genera exactamente ${count} preguntas NUEVAS y ORIGINALES:
- NO copies las preguntas que aparecen en la imagen
- Crea ejercicios NUEVOS basados en el MISMO TEMA que identificaste
- Las preguntas deben ser apropiadas para estudiantes de ${gradeLevel}
- Dificultad: ${DIFFICULTY_TEXT_IMAGE[difficulty]}
- Si el tema incluye matemáticas o fórmulas, crea ejercicios numéricos nuevos con valores distintos
- Si el tema es conceptual, crea preguntas de comprensión y aplicación
${mathVerificationBlock(area)}
PASO 3 — Formato de respuesta (JSON puro, sin texto adicional):

{
  "tema_identificado": "Nombre del tema detectado en la imagen",
  "preguntas": [
    {
      "texto": "Texto de la pregunta nueva",
      "tipo": "multipleChoice",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "valor_correcto": "Copia EXACTA de la opción correcta, idéntica a como aparece en \\"opciones\\"",
      "respuesta_correcta": "Debe ser IDÉNTICO al campo valor_correcto — no un valor distinto",
      "explicacion": "Por qué esta respuesta es correcta",
      "tema": "Subtema específico"
    }
  ]
}

Reglas estrictas:
- Exactamente ${count} preguntas nuevas y originales
- Exactamente 4 opciones por pregunta de opción múltiple
- Solo una respuesta correcta por pregunta
- "valor_correcto" y "respuesta_correcta" DEBEN ser el mismo texto exacto, copiado literalmente de "opciones"
- Las preguntas deben evaluar comprensión y aplicación, no memorización de la imagen
- Adapta el vocabulario al nivel ${gradeLevel}
`;
}

// ─────────────────────────────────────────────
// HELPERS -- Parsing y red de seguridad estructural
// ─────────────────────────────────────────────

function parseType(tipo: string): QuestionType {
  switch (tipo.toLowerCase()) {
    case 'multiplechoice':
    case 'multiple_choice':
    case 'opcion_multiple':
      return 'multipleChoice';
    case 'truefalse':
    case 'true_false':
    case 'verdaderofalso':
    case 'verdadero_falso':
      return 'trueFalse';
    case 'shortanswer':
    case 'short_answer':
    case 'respuesta_corta':
      return 'shortAnswer';
    default:
      return 'multipleChoice';
  }
}

/**
 * Devuelve las preguntas válidas + cuántas se corrigieron automáticamente
 * (la IA calculó bien pero etiquetó mal la opción correcta) y cuántas se
 * descartaron (ni el valor calculado ni la respuesta marcada existen entre
 * las opciones -- imposible de corregir sin inventar datos).
 *
 * Esta es la "red de seguridad" -- independiente de si la pregunta vino de
 * Groq o de Gemini, y de si el área es Matemática o no.
 */
export function parseQuestionsFromJSON(
  content: string,
  defaultDifficulty: QuestionDifficulty,
): AIGenerationResult {
  try {
    let cleanContent = content.replaceAll('```json', '').replaceAll('```', '').trim();

    const startIndex = cleanContent.indexOf('{');
    const endIndex = cleanContent.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      throw new AIException('No se encontró JSON válido en la respuesta');
    }
    cleanContent = cleanContent.slice(startIndex, endIndex + 1);

    const json = JSON.parse(cleanContent) as { preguntas?: unknown[] };
    const preguntas = json.preguntas ?? [];

    const validQuestions: AIGeneratedQuestion[] = [];
    let corrected = 0;
    let discarded = 0;

    for (const p of preguntas) {
      const pregunta = p as Record<string, unknown>;
      const textoPregunta = pregunta.texto as string | undefined;
      if (!textoPregunta) {
        discarded++;
        continue;
      }

      const tipoStr = (pregunta.tipo as string) ?? 'multipleChoice';
      const tipo = parseType(tipoStr);
      const opciones = Array.isArray(pregunta.opciones)
        ? (pregunta.opciones as unknown[]).map((o) => String(o))
        : [];

      let respuestaCorrecta = (pregunta.respuesta_correcta as string) ?? '';
      const valorCorrecto = pregunta.valor_correcto as string | undefined;

      // Solo verificamos contra "opciones" cuando realmente las hay
      // (multipleChoice/trueFalse) -- respuesta_corta no tiene opciones.
      if (opciones.length > 0) {
        const matchInOptions = (value: string | undefined | null): string | null => {
          if (value == null) return null;
          const normalized = value.trim().toLowerCase();
          return opciones.find((o) => o.trim().toLowerCase() === normalized) ?? null;
        };

        const matchFromValorCorrecto = matchInOptions(valorCorrecto);
        const matchFromRespuesta = matchInOptions(respuestaCorrecta);

        if (matchFromValorCorrecto != null) {
          // valor_correcto (el resultado del cálculo) SÍ está entre las
          // opciones -- confiamos en él por encima de respuesta_correcta,
          // ya que es el que viene directo del cómputo paso a paso.
          if (matchFromRespuesta !== matchFromValorCorrecto) corrected++;
          respuestaCorrecta = matchFromValorCorrecto;
        } else if (matchFromRespuesta != null) {
          // No hay valor_correcto usable, pero respuesta_correcta sí
          // coincide con alguna opción -- se deja tal cual.
          respuestaCorrecta = matchFromRespuesta;
        } else {
          // Ninguno de los dos coincide con ninguna opción -- no hay forma
          // confiable de corregir esto sin inventar datos.
          discarded++;
          continue;
        }
      }

      validQuestions.push({
        text: textoPregunta,
        type: tipo,
        options: opciones,
        correctAnswer: respuestaCorrecta,
        explanation: (pregunta.explicacion as string) ?? null,
        topic: (pregunta.tema as string) ?? null,
        difficulty: defaultDifficulty,
        selected: true,
      });
    }

    return { questions: validQuestions, corrected, discarded };
  } catch (e) {
    if (e instanceof AIException) throw e;
    if (e instanceof SyntaxError) {
      throw new AIException(
        'La respuesta de la IA se cortó antes de terminar (probablemente por pedir demasiadas preguntas o explicaciones muy largas). ' +
          'Intenta de nuevo con menos preguntas o una dificultad más simple.',
      );
    }
    throw new AIException(`Error al procesar respuesta de IA: ${e}`);
  }
}

// ─────────────────────────────────────────────
// MÉTODOS PÚBLICOS
// ─────────────────────────────────────────────

export interface GenerateFromTextParams {
  subjectName: string;
  topic: string;
  count: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  area: SubjectArea;
}

/** Genera preguntas a partir de un tema usando Groq + Llama */
export async function generateFromText(
  params: GenerateFromTextParams,
): Promise<AIGenerationResult> {
  if (!GROQ_API_KEY) throw new AIException('Groq API key no configurada');

  const clampedCount = clampCount(params.count);
  const prompt = buildTextPrompt({ ...params, count: clampedCount });

  try {
    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto en educación. Generas preguntas de examen en formato JSON estricto. Solo respondes con JSON válido, sin texto adicional, sin markdown, sin bloques de código.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new AIException(
        `Error de Groq API: ${response.status} — ${await response.text()}`,
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content as string;
    return parseQuestionsFromJSON(content, params.difficulty);
  } catch (e) {
    if (e instanceof AIException) throw e;
    throw new AIException(`Error al conectar con Groq: ${e}`);
  }
}

/** Convierte un Blob/File a base64 puro (sin el prefijo `data:...;base64,`) */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface GenerateFromImageParams {
  imageBlob: Blob;
  mimeType: string;
  subjectName: string;
  count: number;
  difficulty: QuestionDifficulty;
  gradeLevel: string;
  area: SubjectArea;
}

/**
 * Analiza imagen e identifica el tema, luego genera preguntas NUEVAS
 * adaptadas al grado y dificultad seleccionada.
 *
 * Diferencia frente a Dart: en vez de `File` (dart:io) recibe un `Blob` del
 * navegador (un `File` de `<input type="file">` o un frame capturado de
 * `getUserMedia` convertido a Blob vía canvas) -- ver AIGenerateQuestionsPage.
 */
export async function generateFromImage(
  params: GenerateFromImageParams,
): Promise<AIGenerationResult> {
  if (!GEMINI_API_KEY) throw new AIException('Gemini API key no configurada');

  const clampedCount = clampCount(params.count);
  const base64Image = await blobToBase64(params.imageBlob);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = buildImagePrompt({ ...params, count: clampedCount });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: params.mimeType, data: base64Image } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new AIException(
        `Error de Gemini API: ${response.status} — ${await response.text()}`,
      );
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text as string;
    return parseQuestionsFromJSON(content, params.difficulty);
  } catch (e) {
    if (e instanceof AIException) throw e;
    throw new AIException(`Error al conectar con Gemini: ${e}`);
  }
}

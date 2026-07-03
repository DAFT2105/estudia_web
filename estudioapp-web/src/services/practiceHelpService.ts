// src/services/practiceHelpService.ts
//
// Genera un ejercicio similar + guía pedagógica paso a paso para la ventana de
// ayuda del modo práctica. El nivel educativo del estudiante determina el
// lenguaje, la profundidad y si los pasos son guías de razonamiento o cálculos
// directos.

import type { Question } from '@/types/question';
import type { Subject } from '@/types/subject';
import type { StudentGrade } from '@/types/student';
import {
  isMultiplicationQuestion,
  isSequenceQuestion,
  isEquationQuestion,
} from '@/services/mathQuestionDetectors';

// ── Configuración parametrizable ────────────────────────────────────────────

/**
 * Segundos antes de que aparezca el diálogo "¿Necesitas ayuda?".
 * Para producción se recomienda 120 (2 minutos); para pruebas, 60 (1 minuto).
 */
export const HELP_PROMPT_SECONDS = 60;

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Operación visual que se renderiza como componente gráfico en el modal. */
export type VisualOperation =
  | { type: 'multiplication'; factor1: number; factor2: number }
  | { type: 'equation'; a: number; b: number; c: number }; // a·X + b = c

export interface HelpContent {
  similarExercise: string;
  steps: string[];
  finalAnswer: string;
  visual?: VisualOperation; // presente cuando hay cuadrícula que renderizar
}

/** Información mínima de nivel del estudiante que necesita el servicio. */
export interface StudentLevelInfo {
  grade?: StudentGrade | null;
  gradeLevel?: number | null;
}

// ── Configuración de nivel educativo ────────────────────────────────────────

interface LevelConfig {
  label: string;            // Texto legible para el prompt
  vocabulary: string;       // Instrucción de vocabulario y tono
  mathApproach: string;     // Instrucción específica para matemáticas
  guideStyle: string;       // Cómo deben estar formulados los pasos
}

function getLevelConfig(student: StudentLevelInfo): LevelConfig {
  const grade = student.grade ?? 'secundaria';
  const level = student.gradeLevel ?? 1;

  const gradeNames: Record<StudentGrade, string> = {
    preescolar: 'Preescolar',
    primaria: 'Primaria',
    secundaria: 'Secundaria',
    preparatoria: 'Preparatoria',
    universidad: 'Universidad',
  };
  const hasNumericLevel = grade === 'primaria' || grade === 'secundaria';
  const displayLabel = hasNumericLevel && level
    ? `${gradeNames[grade]} ${level}°`
    : gradeNames[grade];

  const configs: Record<StudentGrade, LevelConfig> = {
    preescolar: {
      label: displayLabel,
      vocabulary: 'Usa palabras muy simples, frases cortas y ejemplos con objetos cotidianos (manzanas, pelotas, etc.). Nada de símbolos matemáticos formales.',
      mathApproach: 'Resuelve el ejercicio similar contando en voz alta con objetos o dedos, mostrando el conteo completo hasta llegar al resultado.',
      guideStyle: 'Cada paso muestra el conteo o agrupación con objetos reales (ej: "Tenías 3 pelotas, llegan 2 más: 3, 4... ¡4!"), avanzando hasta el resultado final.',
    },
    primaria: level <= 3 ? {
      label: displayLabel,
      vocabulary: 'Usa lenguaje sencillo y concreto. Puedes usar dibujos mentales y comparaciones con situaciones de la vida real.',
      mathApproach: 'Descompón el problema en partes pequeñas y resuelve el ejercicio similar de forma completa, mostrando cada operación con sus números reales (sin saltar cálculos).',
      guideStyle: 'Cada paso muestra una parte del procedimiento ya resuelta con números reales (ej: "Sumamos las unidades: 4 + 7 = 11"), avanzando hacia el resultado final del ejercicio similar.',
    } : {
      label: displayLabel,
      vocabulary: 'Usa lenguaje claro y directo, apropiado para un niño de 9-12 años. Puedes usar términos matemáticos básicos (suma, producto, fracción, etc.).',
      mathApproach: 'Resuelve el ejercicio similar de forma completa, mostrando el procedimiento estándar (ej. multiplicación en columnas, suma con acarreo) con los números reales en cada paso.',
      guideStyle: 'Cada paso desarrolla una parte concreta del cálculo con números reales y su resultado parcial, igual que se vería resuelto en el cuaderno.',
    },
    secundaria: level <= 3 ? {
      label: displayLabel,
      vocabulary: 'Usa terminología escolar correcta. Puedes mencionar propiedades, definiciones y reglas formales que el alumno ya debería conocer.',
      mathApproach: 'Aplica el concepto o propiedad correspondiente y desarrolla el cálculo completo del ejercicio similar, mostrando cada operación con sus valores reales.',
      guideStyle: 'Cada paso nombra la propiedad o regla que se usa Y muestra la operación resuelta con números reales (ej: "Aplicamos la propiedad distributiva: 3(x+2) = 3x + 6").',
    } : {
      label: displayLabel,
      vocabulary: 'Puedes usar lenguaje matemático formal (variables, expresiones, teoremas básicos). Espera que el alumno recuerde fórmulas vistas en clase.',
      mathApproach: 'Desarrolla la estrategia de resolución y ejecuta el cálculo completo del ejercicio similar, con cada operación y su resultado parcial visibles.',
      guideStyle: 'Cada paso indica la herramienta o fórmula usada Y el desarrollo numérico/algebraico completo de ese paso.',
    },
    preparatoria: {
      label: displayLabel,
      vocabulary: 'Usa terminología técnica correcta del área. Puedes asumir conocimiento de álgebra, geometría analítica y pre-cálculo.',
      mathApproach: 'Aplica el método de resolución (sustitución, factorización, regla de derivación, etc.) y desarrolla el cálculo completo del ejercicio similar paso a paso.',
      guideStyle: 'Cada paso nombra el método usado Y muestra su desarrollo matemático completo con resultados intermedios.',
    },
    universidad: {
      label: displayLabel,
      vocabulary: 'Usa terminología universitaria precisa. Asume conocimiento sólido del área. Puedes referenciar teoremas o definiciones formales.',
      mathApproach: 'Desarrolla la solución formal completa del ejercicio similar: identifica el dominio, aplica el método teórico y muestra el desarrollo matemático con resultados intermedios.',
      guideStyle: 'Cada paso indica la herramienta teórica que aplica Y desarrolla el cálculo o demostración correspondiente con resultados visibles.',
    },
  };

  return configs[grade];
}

// ── Acceso a variables de entorno ────────────────────────────────────────────

const GROQ_API_KEY  = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_MODEL    = (import.meta.env.VITE_GROQ_MODEL as string) || 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ── Prompt ───────────────────────────────────────────────────────────────────

function buildHelpPrompt(question: Question, subject: Subject, student: StudentLevelInfo): string {
  const isMath = subject.area === 'matematica';
  const isMultiplication = isMath && isMultiplicationQuestion(question);
  const isSequence = isMath && isSequenceQuestion(question);
  const isEquation = isMath && !isMultiplication && isEquationQuestion(question);
  const cfg = getLevelConfig(student);

  const equationBlock = isEquation
    ? `
⚠️ ECUACIÓN LINEAL — instrucciones especiales:
- PRIMERO evalúa: ¿la ecuación original (y por tanto tu ejercicio similar) se puede escribir naturalmente como a·X + b = c, con "a" Y "b" AMBOS distintos de cero?
  · Esto incluye ecuaciones con resta (a·X - b = c) — interpreta "b" como negativo en ese caso.
  · Esto NO incluye ecuaciones con fracciones/división (ej: "X/3 = 8", "2X/5 = 4"), ni ecuaciones sin término constante (ej: "3X = 12"), ni con variable en ambos lados (ej: "2X + 3 = X + 10").
- SI ENCAJA en a·X + b = c con a≠0 y b≠0:
    - El ejercicio similar debe tener la MISMA estructura (a·X + b = c), coeficientes ENTEROS y solución X ENTERA.
    - NO expliques el procedimiento numérico en los pasos — el sistema generará la resolución visual automáticamente.
    - Escribe SOLO 2 pasos breves describiendo el método (sin resolver ni mostrar números intermedios):
        Paso 1: Presentación de la ecuación (ej: "Planteamos la ecuación: 3X + 15 = 45")
        Paso 2: Descripción breve del método usando TRANSPOSICIÓN DE TÉRMINOS, no "operar a ambos lados" (ej: "Pasamos los términos al otro lado del igual cambiando su operación: lo que suma pasa restando, lo que multiplica pasa dividiendo")
    - Agrega el campo "operacion_visual":
        "operacion_visual": { "tipo": "ecuacion", "a": <entero, distinto de 0>, "b": <entero, DISTINTO DE 0, puede ser negativo>, "c": <entero> }
      La ecuación representada es: a·X + b = c
    - OBLIGATORIO: verifica que (c - b) sea divisible EXACTAMENTE entre a, de modo que X = (c-b)/a sea un número entero.
    - "respuesta_final" debe ser igual a ese valor entero de X.
- SI NO ENCAJA (fracciones, sin constante, variable en ambos lados, etc.):
    - NO incluyas el campo "operacion_visual" — omítelo por completo del JSON.
    - Resuelve el ejercicio similar con 4 a 6 pasos de texto normales, mostrando cada operación con números reales (como el resto de matemática).
`
    : '';

  const sequenceBlock = isSequence
    ? `
⚠️ SECUENCIAS/PATRONES — error común a evitar:
- Identifica la regla (diferencia, razón, fórmula) usando SOLO los términos dados.
- Aplica la regla EXACTAMENTE UNA VEZ al último término dado para obtener el siguiente término — NO calcules términos adicionales más allá de lo que pide la pregunta.
- Ejemplo del error a evitar: si la secuencia es 1,2,4,8,16 y preguntan el siguiente término, la respuesta es 16×2=32 — NO sigas multiplicando para llegar a 64 (eso sería el término después del siguiente).
- Antes de escribir "respuesta_final", cuenta cuántos términos pide la pregunta (normalmente UNO) y confirma que tu resultado corresponde exactamente a esa cantidad de pasos desde el último término dado.
`
    : '';

  const staircaseBlock = isMultiplication
    ? `
⚠️ MULTIPLICACIÓN EN ESCALERA — instrucciones especiales:
- El ejercicio similar DEBE ser una multiplicación entera, con operandos de la misma cantidad de dígitos que el original.
- NO expliques el procedimiento numérico en los pasos — el sistema generará la cuadrícula visual automáticamente.
- Escribe SOLO 2 pasos breves:
    Paso 1: Presentación de los factores (ej: "Identificamos los factores: A y B")
    Paso 2: Descripción breve del método (ej: "Usamos la multiplicación en escalera: multiplicamos cada dígito de B por A, desplazamos y sumamos")
- Agrega el campo "operacion_visual" con los factores enteros:
    "operacion_visual": { "tipo": "multiplicacion", "factor1": <número entero A>, "factor2": <número entero B> }
- Verifica que A × B coincida exactamente con el valor en "respuesta_final".
`
    : '';

  const mathBlock = isMath
    ? `
⚠️ ÁREA MATEMÁTICA — reglas obligatorias:
- El ejercicio similar debe usar valores DISTINTOS al original, misma estructura y dificultad.
- DEBES resolver el ejercicio similar COMPLETO, paso a paso, mostrando el procedimiento real con números (igual que se vería resuelto a mano: multiplicación en columnas/escalera, suma con acarreo, despeje de ecuación, etc.).
- Cada paso muestra una parte del cálculo CON sus números reales y su resultado parcial — no te quedes en preguntas abstractas.
- AUTO-VERIFICACIÓN OBLIGATORIA antes de responder: relee tu último paso y confirma que el resultado que escribiste ahí es EXACTAMENTE el mismo número que vas a poner en "respuesta_final" — ni un paso antes ni un paso después. Si no coinciden, corrige el último paso o la respuesta final hasta que sean idénticos.
- El campo "respuesta_final" debe coincidir exactamente con el resultado del último paso.
- La pregunta ORIGINAL del estudiante NO se resuelve aquí — solo el ejercicio similar. El estudiante debe aplicar el mismo procedimiento a su propia pregunta.
${staircaseBlock}${sequenceBlock}${equationBlock}`
    : `
- Resuelve el ejercicio similar de forma completa y concreta, mostrando el desarrollo real (no la pregunta original del estudiante).
- El estudiante debe poder ver el procedimiento completo aplicado al ejemplo, y luego aplicarlo por su cuenta a su propia pregunta.
`;

  return `Eres un tutor educativo experto. Un estudiante está atascado en esta pregunta. Le vas a mostrar un EJERCICIO SIMILAR resuelto paso a paso por completo (no la pregunta original), para que luego él aplique el mismo procedimiento a su propia pregunta.

NIVEL DEL ESTUDIANTE: ${cfg.label}
VOCABULARIO Y TONO: ${cfg.vocabulary}
ENFOQUE PARA ESTA ÁREA: ${cfg.mathApproach}
CÓMO DEBEN SER LOS PASOS: ${cfg.guideStyle}

PREGUNTA ORIGINAL (NO la resuelvas, es solo referencia de tipo/dificultad):
"${question.text}"
${question.options?.length ? `Opciones: ${question.options.join(' | ')}` : ''}
Materia: ${subject.name}${subject.area ? ` (Área: ${subject.area})` : ''}
${question.topic ? `Tema: ${question.topic}` : ''}
${mathBlock}
TU TAREA:
1. Crear UN ejercicio SIMILAR con datos distintos, del mismo tipo y dificultad, apropiado para el nivel ${cfg.label}.
2. Resolverlo COMPLETO en 4 a 6 pasos, mostrando el procedimiento real y los cálculos con números reales en cada paso, hasta llegar al resultado.
   - El lenguaje debe ser el adecuado para el nivel: ${cfg.vocabulary}
   - No omitas operaciones — el estudiante debe poder seguir cada cálculo.
3. Indicar la respuesta final del ejercicio similar (debe coincidir con el resultado mostrado en el último paso).

Responde ÚNICAMENTE con este JSON válido, sin texto extra ni markdown:

{
  "ejercicio_similar": "Enunciado completo del ejercicio similar",
  "pasos": [
    "Paso 1: ...",
    "Paso 2: ...",
    "Paso 3: ...",
    "Paso 4: ..."
  ],
  "respuesta_final": "La respuesta del ejercicio similar",
  "operacion_visual": { "tipo": "multiplicacion", "factor1": 0, "factor2": 0 }
}

El campo "operacion_visual" es OPCIONAL:
- "tipo": "multiplicacion" con "factor1"/"factor2" — solo si el ejercicio es multiplicación.
- "tipo": "ecuacion" con "a"/"b"/"c" (ambos a≠0 y b≠0) — solo si la ecuación encaja exactamente en a·X + b = c.
- Omítelo del JSON en cualquier otro caso (incluye ecuaciones con fracciones, sin constante, o variable en ambos lados).

Reglas estrictas:
- Si incluyes "operacion_visual" (multiplicación o ecuación que encaja): EXACTAMENTE 2 pasos.
- Si NO incluyes "operacion_visual" (no es multiplicación, o es una ecuación que no encaja en el molde): entre 4 y 6 pasos, resolviendo todo con números reales en el texto.
- Cada paso empieza con "Paso N:".
- Usa el nivel de lenguaje indicado.
`;
}

// ── Función principal ────────────────────────────────────────────────────────

export async function generateHelpContent(
  question: Question,
  subject: Subject,
  student: StudentLevelInfo,
): Promise<HelpContent> {
  if (!GROQ_API_KEY) {
    return buildFallbackHelp(question, student);
  }

  const prompt = buildHelpPrompt(question, subject, student);

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
            'Eres un tutor educativo experto. Respondes SOLO con JSON válido, sin texto adicional ni bloques de código. Resuelves el ejercicio similar completo y con cálculos reales, sin resolver la pregunta original del estudiante.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error Groq: ${response.status}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const raw = data.choices[0].message.content;

  return parseHelpContent(raw);
}

// ── Parsing ──────────────────────────────────────────────────────────────────

function parseHelpContent(raw: string): HelpContent {
  try {
    let clean = raw.replaceAll('```json', '').replaceAll('```', '').trim();
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('JSON no encontrado');
    clean = clean.slice(start, end + 1);

    const json = JSON.parse(clean) as {
      ejercicio_similar?: string;
      pasos?: unknown[];
      respuesta_final?: string;
      operacion_visual?: {
        tipo?: string;
        factor1?: unknown; factor2?: unknown;
        a?: unknown; b?: unknown; c?: unknown;
      };
    };

    const steps = Array.isArray(json.pasos)
      ? json.pasos.map((p) => String(p)).filter(Boolean)
      : [];

    // Extrae la operación visual solo cuando los valores son válidos
    let visual: VisualOperation | undefined;
    const ov = json.operacion_visual;
    if (ov?.tipo === 'multiplicacion') {
      const f1 = Number(ov.factor1);
      const f2 = Number(ov.factor2);
      if (Number.isFinite(f1) && Number.isFinite(f2) && f1 > 0 && f2 > 0) {
        visual = { type: 'multiplication', factor1: Math.trunc(f1), factor2: Math.trunc(f2) };
      }
    } else if (ov?.tipo === 'ecuacion') {
      const a = Number(ov.a);
      const b = Number(ov.b);
      const c = Number(ov.c);
      // Válida solo si a≠0, b≠0 (b=0 deja un paso de transposición vacío/confuso)
      // y la solución X = (c-b)/a es un entero exacto
      if (
        Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) &&
        a !== 0 && b !== 0 && Number.isInteger((c - b) / a)
      ) {
        visual = { type: 'equation', a: Math.trunc(a), b: Math.trunc(b), c: Math.trunc(c) };
      }
    }

    return {
      similarExercise: json.ejercicio_similar ?? 'Ejercicio similar no disponible.',
      steps: steps.length > 0 ? steps : ['No se pudieron generar los pasos.'],
      finalAnswer: json.respuesta_final ?? 'Ver con tu tutor.',
      visual,
    };
  } catch {
    throw new Error('No se pudo interpretar la respuesta de la IA.');
  }
}

// ── Fallback sin API ─────────────────────────────────────────────────────────

function buildFallbackHelp(question: Question, student: StudentLevelInfo): HelpContent {
  const cfg = getLevelConfig(student);
  return {
    similarExercise: `Ejercicio de práctica relacionado con: "${question.topic ?? question.text.slice(0, 60)}..."`,
    steps: [
      'Paso 1: Lee el enunciado con calma e identifica cuáles son los datos que te dan.',
      'Paso 2: Pregúntate: ¿qué es lo que me están pidiendo encontrar?',
      'Paso 3: Piensa en qué concepto o método de tu nivel aplica a este tipo de problema.',
      'Paso 4: Organiza los datos y aplica el método que elegiste, paso a paso.',
      'Paso 5: Revisa si tu resultado tiene sentido con el enunciado.',
    ],
    finalAnswer: `Aplica los pasos anteriores usando lo que has aprendido en ${cfg.label}.`,
  };
}

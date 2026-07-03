// src/pages/questions/AIGenerateQuestionsPage.tsx
//
// Puerto funcional de ai_generate_screen.dart. Diferencias deliberadas
// frente a Flutter, documentadas en el plan técnico:
//  - Cámara: `getUserMedia` + canvas en vez de `image_picker` nativo.
//  - Galería: `<input type="file">` (el propio selector del navegador ya
//    deja ver la foto antes de confirmar, igual que la galería en Flutter).
//  - El campo `_detectedTopic` de la pantalla original se declara pero
//    nunca se asigna desde el resultado de Gemini -- es código inerte en
//    la app original (no llegó a conectarse el "tema_identificado" del
//    JSON). No se reprodujo esa UI muerta.
//  - El diálogo de "¿salir sin guardar?" usa el ConfirmDialog propio
//    (useConfirm) en vez de window.confirm() nativo.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useQuestions } from '@/hooks/useQuestions';
import { getStudentsWithSubject } from '@/services/studentService';
import {
  generateFromText,
  generateFromImage,
  AIException,
  type AIGeneratedQuestion,
} from '@/services/aiQuestionService';
import { detectMostCommonGradeLevel } from '@/utils/gradeDetection';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import {
  getQuestionTypeDisplayName,
  getQuestionDifficultyDisplayName,
  getQuestionPurposeDisplayName,
  type QuestionDifficulty,
  type QuestionPurpose,
  type QuestionType,
} from '@/types/question';

type Tab = 'texto' | 'imagen';
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const TYPES: QuestionType[] = ['multipleChoice', 'trueFalse', 'shortAnswer'];
const PURPOSES: QuestionPurpose[] = ['practice', 'exam'];
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

/** Redimensiona una imagen grande antes de enviarla a Gemini -- mismo límite que `maxWidth/maxHeight: 1920` de ImagePicker. */
function resizeImageBlob(source: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo obtener el contexto de canvas'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen')),
        'image/jpeg',
        JPEG_QUALITY,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(source);
  });
}

export function AIGenerateQuestionsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { subjects, loadSubjects } = useSubjects();
  const { createQuestion } = useQuestions();
  const confirm = useConfirm();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('texto');

  // ── Flujo A -- por texto
  const [topic, setTopic] = useState('');
  const [textCount, setTextCount] = useState(10);
  const [textDifficulty, setTextDifficulty] = useState<QuestionDifficulty>('medium');
  const [questionType, setQuestionType] = useState<QuestionType>('multipleChoice');

  // ── Flujo B -- por imagen
  const [selectedImage, setSelectedImage] = useState<Blob | null>(null);
  const [pendingCameraPhoto, setPendingCameraPhoto] = useState<Blob | null>(null);
  const [imageCount, setImageCount] = useState(10);
  const [imageDifficulty, setImageDifficulty] = useState<QuestionDifficulty>('medium');
  const [detectedGrade, setDetectedGrade] = useState('primaria (6-12 años)');
  const [isLoadingGrade, setIsLoadingGrade] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Estado general
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIGeneratedQuestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationFeedback, setValidationFeedback] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<QuestionPurpose>('practice');
  const [isSaving, setIsSaving] = useState(false);

  const subject = subjects.find((s) => s.id === subjectId);

  useEffect(() => {
    if (currentUser && subjectId) loadSubjects(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, subjectId]);

  // Detectar el grado más común entre los estudiantes asignados -- igual
  // que `_loadStudentGrade`, accede al servicio directo (la pantalla
  // original también bypassea el repository/provider aquí).
  useEffect(() => {
    if (!subjectId) return;
    getStudentsWithSubject(subjectId)
      .then((students) => {
        if (students.length > 0) setDetectedGrade(detectMostCommonGradeLevel(students));
      })
      .catch(() => {
        /* si falla, se mantiene "primaria" por defecto */
      })
      .finally(() => setIsLoadingGrade(false));
  }, [subjectId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!currentUser || !subjectId) return null;

  const confirmDiscard = async (): Promise<boolean> => {
    if (generatedQuestions.length === 0) return true;
    return confirm({
      title: '¿Descartar preguntas generadas?',
      description: `Tienes ${generatedQuestions.length} pregunta(s) generada(s) sin guardar. Si continúas, se perderán.`,
      confirmLabel: 'Descartar',
      tone: 'danger',
    });
  };

  const handleBack = async () => {
    if (await confirmDiscard()) navigate(`/materias/${subjectId}/preguntas`);
  };

  // ── Galería ──────────────────────────────────────────────
  const handleGalleryPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    try {
      setSelectedImage(await resizeImageBlob(file));
    } catch {
      setSelectedImage(file);
    }
    e.target.value = '';
  };

  // ── Cámara ───────────────────────────────────────────────
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      // El <video> se monta en este mismo render; el stream se asigna en un
      // efecto aparte una vez que la ref ya existe.
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setErrorMessage(
        'No se pudo acceder a la cámara. Revisa los permisos del navegador.',
      );
    }
  };

  const closeCameraStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight),
    );
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) setPendingCameraPhoto(blob);
        closeCameraStream();
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  };

  const retakePhoto = () => {
    setPendingCameraPhoto(null);
    openCamera();
  };

  const acceptPhoto = () => {
    setSelectedImage(pendingCameraPhoto);
    setPendingCameraPhoto(null);
  };

  // ── Generación ───────────────────────────────────────────
  const showValidationFeedback = (corrected: number, discarded: number) => {
    if (corrected === 0 && discarded === 0) return setValidationFeedback(null);
    const parts: string[] = [];
    if (corrected > 0)
      parts.push(`${corrected} pregunta(s) corregida(s) automáticamente`);
    if (discarded > 0) parts.push(`${discarded} descartada(s) por inconsistencias`);
    setValidationFeedback(
      `Revisión automática: ${parts.join(' y ')}. Aun así, revisa las preguntas antes de guardar.`,
    );
  };

  const handleGenerateFromText = async () => {
    if (!topic.trim()) {
      setErrorMessage('Escribe un tema para generar preguntas');
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const result = await generateFromText({
        subjectName: subject?.name ?? '',
        topic: topic.trim(),
        count: textCount,
        difficulty: textDifficulty,
        type: questionType,
        area: subject?.area ?? 'otra',
      });
      setGeneratedQuestions(result.questions);
      showValidationFeedback(result.corrected, result.discarded);
    } catch (e) {
      setErrorMessage(e instanceof AIException ? e.message : `Error inesperado: ${e}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromImage = async () => {
    if (!selectedImage) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const result = await generateFromImage({
        imageBlob: selectedImage,
        mimeType: selectedImage.type || 'image/jpeg',
        subjectName: subject?.name ?? '',
        count: imageCount,
        difficulty: imageDifficulty,
        gradeLevel: detectedGrade,
        area: subject?.area ?? 'otra',
      });
      setGeneratedQuestions(result.questions);
      showValidationFeedback(result.corrected, result.discarded);
    } catch (e) {
      setErrorMessage(e instanceof AIException ? e.message : `Error inesperado: ${e}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelected = (index: number) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q)),
    );
  };

  const selectedCount = generatedQuestions.filter((q) => q.selected).length;

  const handleSave = async () => {
    const selected = generatedQuestions.filter((q) => q.selected);
    if (selected.length === 0) return;
    setIsSaving(true);
    let savedCount = 0;
    for (const q of selected) {
      const success = await createQuestion({
        subjectId,
        createdBy: currentUser.id,
        text: q.text,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
        purpose,
      });
      if (success) savedCount++;
    }
    setIsSaving(false);
    if (savedCount > 0) {
      toast.success(
        savedCount === 1 ? 'Pregunta creada' : `${savedCount} preguntas creadas`,
        savedCount < selected.length
          ? `${selected.length - savedCount} no se pudieron guardar`
          : undefined,
      );
      navigate(`/materias/${subjectId}/preguntas`);
    } else {
      setErrorMessage('No se pudo guardar ninguna pregunta');
      toast.error('No se pudo guardar ninguna pregunta');
    }
  };

  // ── Pantalla de revisión ─────────────────────────────────
  if (generatedQuestions.length > 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="space-y-3 bg-primary/10 p-4">
          <p className="font-medium text-neutral-800">
            {generatedQuestions.length} pregunta(s) generada(s) -- selecciona las que
            quieres guardar
          </p>
          {validationFeedback && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {validationFeedback}
            </div>
          )}
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700">
              ¿Para qué modo son estas preguntas?
            </p>
            <div className="flex gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPurpose(p)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    purpose === p ? 'bg-primary text-white' : 'bg-white text-neutral-600'
                  }`}
                >
                  {getQuestionPurposeDisplayName(p)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {generatedQuestions.map((q, index) => (
            <label
              key={index}
              className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm"
            >
              <input
                type="checkbox"
                checked={q.selected}
                onChange={() => toggleSelected(index)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <div className="flex-1">
                <div className="mb-1 flex gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
                    {getQuestionTypeDisplayName(q.type)}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
                    {getQuestionDifficultyDisplayName(q.difficulty)}
                  </span>
                </div>
                <p className="font-semibold text-neutral-800">{q.text}</p>
                {q.options.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {q.options.map((opt, i) => {
                      const isCorrect = opt === q.correctAnswer;
                      return (
                        <li
                          key={i}
                          className={
                            isCorrect ? 'font-semibold text-success' : 'text-neutral-500'
                          }
                        >
                          {String.fromCharCode(65 + i)}) {opt} {isCorrect && '✓'}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {q.explanation && (
                  <div className="mt-2 rounded-lg bg-blue-50 px-2 py-1.5 text-xs text-blue-700">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-neutral-200 bg-white p-4">
          <button
            onClick={async () => {
              if (await confirmDiscard()) setGeneratedQuestions([]);
            }}
            className="text-sm text-neutral-600"
          >
            ← Volver
          </button>
          <span className="flex-1 text-right text-sm font-semibold text-primary">
            {selectedCount} seleccionadas
          </span>
          <button
            onClick={handleSave}
            disabled={selectedCount === 0 || isSaving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? 'Guardando…' : `Guardar ${selectedCount}`}
          </button>
        </div>
      </div>
    );
  }

  // ── Tabs de generación ───────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <button onClick={handleBack} className="text-sm text-primary hover:underline">
          ← Banco de preguntas
        </button>
        <h1 className="text-xl font-bold text-neutral-800">
          Generar con IA {subject ? `· ${subject.name}` : ''}
        </h1>

        <div className="flex gap-2 border-b border-neutral-200">
          <button
            onClick={() => setTab('texto')}
            className={`px-4 py-2 text-sm font-medium ${tab === 'texto' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500'}`}
          >
            Por texto
          </button>
          <button
            onClick={() => setTab('imagen')}
            className={`px-4 py-2 text-sm font-medium ${tab === 'imagen' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500'}`}
          >
            Por imagen
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error">
            {errorMessage}
          </div>
        )}

        {tab === 'texto' && (
          <div className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm">
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              ⚡ Groq + Llama 3.3 70B · ~2 segundos de respuesta
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-700">
                Tema o descripción
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={2}
                placeholder="Ej: Factorización de polinomios, Segunda Guerra Mundial..."
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <CountSlider value={textCount} onChange={setTextCount} />
            <DifficultySelector selected={textDifficulty} onChange={setTextDifficulty} />

            <div>
              <p className="mb-1 text-sm font-medium text-neutral-700">
                Tipo de pregunta
              </p>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQuestionType(t)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      questionType === t
                        ? 'bg-primary text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {getQuestionTypeDisplayName(t)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateFromText}
              disabled={isGenerating}
              className="relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '200px 200px',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <span style={{ color: '#ff4d2e' }}>✦</span>
                {isGenerating ? 'Generando…' : 'Generar con IA'}
                <span className="text-xs font-normal text-white/40">Groq</span>
              </span>
            </button>
          </div>
        )}

        {tab === 'imagen' && (
          <div className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              ✨ Gemini 2.5 Flash · ~5 segundos · Analiza imágenes
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              🎓{' '}
              {isLoadingGrade ? 'Detectando nivel…' : `Nivel detectado: ${detectedGrade}`}
            </div>

            <ImagePicker
              selectedImage={selectedImage}
              pendingCameraPhoto={pendingCameraPhoto}
              isCameraOpen={isCameraOpen}
              videoRef={videoRef}
              onGalleryPick={handleGalleryPick}
              onOpenCamera={openCamera}
              onCapture={capturePhoto}
              onRetake={retakePhoto}
              onAccept={acceptPhoto}
              onClear={() => setSelectedImage(null)}
            />

            <CountSlider value={imageCount} onChange={setImageCount} />
            <DifficultySelector
              selected={imageDifficulty}
              onChange={setImageDifficulty}
            />

            <button
              onClick={handleGenerateFromImage}
              disabled={isGenerating || !selectedImage}
              className="relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '200px 200px',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <span style={{ color: '#ff4d2e' }}>✦</span>
                {isGenerating ? 'Generando…' : 'Analizar con Gemini'}
                <span className="text-xs font-normal text-white/40">Vision</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CountSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-700">Cantidad de preguntas</span>
        <span className="font-bold text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function DifficultySelector({
  selected,
  onChange,
}: {
  selected: QuestionDifficulty;
  onChange: (d: QuestionDifficulty) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-neutral-700">Dificultad</p>
      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selected === d ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {getQuestionDifficultyDisplayName(d)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImagePicker({
  selectedImage,
  pendingCameraPhoto,
  isCameraOpen,
  videoRef,
  onGalleryPick,
  onOpenCamera,
  onCapture,
  onRetake,
  onAccept,
  onClear,
}: {
  selectedImage: Blob | null;
  pendingCameraPhoto: Blob | null;
  isCameraOpen: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onGalleryPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCamera: () => void;
  onCapture: () => void;
  onRetake: () => void;
  onAccept: () => void;
  onClear: () => void;
}) {
  // Estado 1: cámara abierta -- video en vivo + botón de captura
  if (isCameraOpen) {
    return (
      <div className="space-y-2">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-48 w-full rounded-xl bg-black object-cover"
        />
        <button
          onClick={onCapture}
          className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-white"
        >
          Capturar foto
        </button>
      </div>
    );
  }

  // Estado 2: foto recién tomada, esperando confirmación
  if (pendingCameraPhoto) {
    return (
      <div className="space-y-2">
        <img
          src={URL.createObjectURL(pendingCameraPhoto)}
          alt="Foto capturada"
          className="h-44 w-full rounded-xl border-2 border-orange-400 object-cover"
        />
        <div className="flex gap-2">
          <button
            onClick={onRetake}
            className="flex-1 rounded-xl border border-neutral-300 py-2 text-sm"
          >
            Tomar otra
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-xl bg-success py-2 text-sm font-semibold text-white"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  // Estado 3: ya hay una imagen aceptada (de cámara o galería)
  if (selectedImage) {
    return (
      <div className="relative">
        <img
          src={URL.createObjectURL(selectedImage)}
          alt="Imagen seleccionada"
          className="h-44 w-full rounded-xl border-2 border-blue-500 object-cover"
        />
        <button
          onClick={onClear}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-error text-white"
        >
          ×
        </button>
      </div>
    );
  }

  // Estado 4: nada elegido -- dos opciones lado a lado
  return (
    <div className="flex gap-3">
      <label className="flex h-44 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-neutral-300 bg-neutral-50 text-center">
        <input type="file" accept="image/*" onChange={onGalleryPick} className="hidden" />
        <span className="text-sm text-neutral-600">📁 Toca para seleccionar imagen</span>
        <span className="mt-1 text-xs text-neutral-400">
          Foto de libro, pizarra o examen
        </span>
      </label>
      <button
        onClick={onOpenCamera}
        className="flex h-44 w-32 flex-col items-center justify-center rounded-xl border border-primary/40 bg-primary/5 text-primary"
      >
        <span className="text-sm font-semibold">📷 Tomar foto</span>
      </button>
    </div>
  );
}

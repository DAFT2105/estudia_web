// src/pages/questions/QuestionFormPage.tsx
//
// Crear/editar pregunta manualmente -- puerto funcional de
// question_form_screen.dart.

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuestions } from '@/hooks/useQuestions';
import { useSubjects } from '@/hooks/useSubjects';
import {
  getQuestionTypeDisplayName,
  getQuestionDifficultyDisplayName,
  getQuestionPurposeDisplayName,
} from '@/types/question';
import type { QuestionDifficulty, QuestionPurpose, QuestionType } from '@/types/question';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface QuestionFormValues {
  text: string;
  type: QuestionType;
  options: { value: string }[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: QuestionDifficulty;
  purpose: QuestionPurpose;
}

const TYPES: QuestionType[] = ['multipleChoice', 'trueFalse', 'shortAnswer'];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const PURPOSES: QuestionPurpose[] = ['practice', 'exam'];

export function QuestionFormPage() {
  const { subjectId, questionId } = useParams<{
    subjectId: string;
    questionId: string;
  }>();
  const isEditing = Boolean(questionId);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { questions, createQuestion, updateQuestion, errorMessage } = useQuestions();
  const { subjects, loadSubjects } = useSubjects();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const existing = isEditing ? questions.find((q) => q.id === questionId) : undefined;
  const subject = subjects.find((s) => s.id === subjectId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<QuestionFormValues>({
    defaultValues: {
      text: '',
      type: 'multipleChoice',
      options: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
      correctAnswer: '',
      explanation: '',
      topic: '',
      difficulty: 'medium',
      purpose: 'practice',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const selectedType = watch('type');
  const optionValues = watch('options');
  const correctAnswer = watch('correctAnswer');
  const textValue = watch('text');
  const textLength = textValue?.length ?? 0;

  useEffect(() => {
    if (currentUser) loadSubjects(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    if (existing) {
      reset({
        text: existing.text,
        type: existing.type,
        options:
          existing.options.length > 0
            ? existing.options.map((o) => ({ value: o }))
            : [{ value: '' }],
        correctAnswer: existing.correctAnswer,
        explanation: existing.explanation ?? '',
        topic: existing.topic ?? '',
        difficulty: existing.difficulty,
        purpose: existing.purpose ?? 'practice',
      });
    }
  }, [existing, reset]);

  useUnsavedChangesGuard(isDirty && !isSubmitting);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  if (!currentUser || !subjectId) return null;

  const onSubmit = async (values: QuestionFormValues) => {
    setIsSubmitting(true);
    try {
      const options =
        values.type === 'multipleChoice'
          ? values.options.map((o) => o.value).filter((v) => v.trim())
          : values.type === 'trueFalse'
            ? ['Verdadero', 'Falso']
            : [];

      let success: boolean;
      if (existing) {
        success = await updateQuestion({
          ...existing,
          text: values.text,
          type: values.type,
          options,
          correctAnswer: values.correctAnswer,
          explanation: values.explanation || null,
          topic: values.topic || null,
          difficulty: values.difficulty,
          purpose: values.purpose,
        });
      } else {
        success = await createQuestion({
          subjectId,
          createdBy: currentUser.id,
          text: values.text,
          type: values.type,
          options,
          correctAnswer: values.correctAnswer,
          explanation: values.explanation || null,
          topic: values.topic || null,
          difficulty: values.difficulty,
          purpose: values.purpose,
        });
      }
      if (success) {
        toast.success(existing ? 'Pregunta actualizada' : 'Pregunta creada');
        navigate(`/materias/${subjectId}/preguntas`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Materias', to: '/materias' },
            { label: subject?.name ?? 'Preguntas', to: `/materias/${subjectId}/preguntas` },
            { label: existing ? 'Editar pregunta' : 'Nueva pregunta' },
          ]}
        />

        <Link
          to={`/materias/${subjectId}/preguntas`}
          className="text-sm text-primary hover:underline"
        >
          ← Volver al banco de preguntas
        </Link>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl bg-surface p-6 shadow-md"
        >
          <h1 className="text-lg font-bold text-neutral-800">
            {existing ? 'Editar pregunta' : 'Nueva pregunta'}
          </h1>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm text-neutral-700" htmlFor="text">
                Texto de la pregunta
              </label>
              <span
                className={`text-xs ${
                  textLength > 500 || (textLength > 0 && textLength < 10)
                    ? 'text-error'
                    : 'text-neutral-400'
                }`}
              >
                {textLength}/500
              </span>
            </div>
            <textarea
              id="text"
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('text', {
                required: 'Requerido',
                minLength: { value: 10, message: 'Debe tener al menos 10 caracteres' },
                maxLength: { value: 500, message: 'No puede exceder 500 caracteres' },
              })}
            />
            {errors.text ? (
              <p className="mt-1 text-xs text-error">{errors.text.message}</p>
            ) : (
              textLength > 0 && textLength < 10 && (
                <p className="mt-1 text-xs text-neutral-400">
                  Faltan {10 - textLength} caracteres como mínimo
                </p>
              )
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="type">
              Tipo
            </label>
            <select
              id="type"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('type')}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {getQuestionTypeDisplayName(t)}
                </option>
              ))}
            </select>
          </div>

          {selectedType === 'multipleChoice' && (
            <div>
              <label className="mb-1 block text-sm text-neutral-700">
                Opciones — marca la respuesta correcta
              </label>
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const value = optionValues?.[index]?.value ?? '';
                  const isCorrect = value.trim() !== '' && value === correctAnswer;
                  return (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={isCorrect}
                        onChange={() => setValue('correctAnswer', value, { shouldValidate: true })}
                        disabled={value.trim() === ''}
                        className="h-4 w-4 flex-shrink-0 accent-primary disabled:opacity-30"
                        aria-label={`Marcar opción ${index + 1} como correcta`}
                      />
                      <input
                        className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        placeholder={`Opción ${index + 1}`}
                        {...register(`options.${index}.value`, {
                          onChange: (e) => {
                            // Si esta opción era la correcta, sincroniza el nuevo texto
                            if (correctAnswer === value) {
                              setValue('correctAnswer', e.target.value, { shouldValidate: true });
                            }
                          },
                        })}
                      />
                      {fields.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isCorrect) setValue('correctAnswer', '');
                            remove(index);
                          }}
                          className="rounded-lg border border-red-200 px-2 py-2 text-xs text-error"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {fields.length < 6 && (
                <button
                  type="button"
                  onClick={() => append({ value: '' })}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  + Agregar opción
                </button>
              )}
              {/* Validación oculta: exige correctAnswer aunque no haya input visible */}
              <input type="hidden" {...register('correctAnswer', { required: 'Selecciona la opción correcta' })} />
              {errors.correctAnswer && (
                <p className="mt-1 text-xs text-error">{errors.correctAnswer.message}</p>
              )}
            </div>
          )}

          {selectedType !== 'multipleChoice' && (
            <div>
              <label
                className="mb-1 block text-sm text-neutral-700"
                htmlFor="correctAnswer"
              >
                Respuesta correcta
              </label>
              {selectedType === 'trueFalse' ? (
                <select
                  id="correctAnswer"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  {...register('correctAnswer', { required: 'Requerido' })}
                >
                  <option value="">Selecciona...</option>
                  <option value="Verdadero">Verdadero</option>
                  <option value="Falso">Falso</option>
                </select>
              ) : (
                <input
                  id="correctAnswer"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Respuesta corta (máx. 100 caracteres)"
                  {...register('correctAnswer', { required: 'Requerido' })}
                />
              )}
              {errors.correctAnswer && (
                <p className="mt-1 text-xs text-error">{errors.correctAnswer.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-700" htmlFor="difficulty">
                Dificultad
              </label>
              <select
                id="difficulty"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('difficulty')}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {getQuestionDifficultyDisplayName(d)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-700" htmlFor="purpose">
                Modo
              </label>
              <select
                id="purpose"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('purpose')}
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {getQuestionPurposeDisplayName(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="topic">
              Tema (opcional)
            </label>
            <input
              id="topic"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('topic')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="explanation">
              Explicación (opcional)
            </label>
            <textarea
              id="explanation"
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('explanation')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting
              ? 'Guardando…'
              : existing
                ? 'Guardar cambios'
                : 'Crear pregunta'}
          </button>
        </form>
      </div>
    </div>
  );
}

// src/pages/questions/QuestionSetsPage.tsx
//
// Puerto funcional de question_sets_screen.dart -- el padre filtra el
// banco de preguntas por un modo específico, elige cuáles entran al grupo
// con checkboxes, y le pone título.

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuestions } from '@/hooks/useQuestions';
import { useQuestionSets } from '@/hooks/useQuestionSets';
import {
  getQuestionPurposeDisplayName,
  questionAppliesTo,
  type QuestionPurpose,
} from '@/types/question';
import { getQuestionCount } from '@/types/questionSet';

interface NewSetFormValues {
  title: string;
  description: string;
  purpose: QuestionPurpose;
}

export function QuestionSetsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { currentUser } = useAuth();
  const { questions, loadQuestionsBySubject } = useQuestions();
  const { sets, status, errorMessage, loadSetsBySubject, createSet, deleteSet } =
    useQuestionSets();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<NewSetFormValues>({
    defaultValues: { title: '', description: '', purpose: 'practice' },
  });

  const formPurpose = watch('purpose');

  useEffect(() => {
    if (subjectId) {
      loadQuestionsBySubject(subjectId);
      loadSetsBySubject(subjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  if (!currentUser || !subjectId) return null;

  // Solo preguntas que aplican al modo elegido pueden entrar al grupo --
  // mismo filtro `appliesTo` que usa selección aleatoria.
  const eligibleQuestions = questions.filter((q) => questionAppliesTo(q, formPurpose));

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async (values: NewSetFormValues) => {
    const success = await createSet({
      subjectId,
      createdBy: currentUser.id,
      title: values.title,
      description: values.description || null,
      purpose: values.purpose,
      questionIds: [...selectedQuestionIds],
    });
    if (success) {
      setIsCreating(false);
      setSelectedQuestionIds(new Set());
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to={`/materias/${subjectId}/preguntas`}
          className="text-sm text-primary hover:underline"
        >
          ← Banco de preguntas
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-800">Grupos de preguntas</h1>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              + Nuevo grupo
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error">
            {errorMessage}
          </div>
        )}

        {isCreating && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3 rounded-2xl bg-surface p-4 shadow-md"
          >
            <input
              placeholder="Título del grupo"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('title', {
                required: 'El título es requerido',
                maxLength: { value: 80, message: 'Máx. 80 caracteres' },
              })}
            />
            {errors.title && <p className="text-xs text-error">{errors.title.message}</p>}

            <textarea
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('description')}
            />

            <div>
              <span className="mb-1 block text-sm text-neutral-700">
                ¿Para qué modo es este grupo?
              </span>
              <div className="flex gap-3">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" value="practice" {...register('purpose')} />{' '}
                  Práctica
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" value="exam" {...register('purpose')} /> Examen
                </label>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-sm text-neutral-700">
                Selecciona preguntas ({selectedQuestionIds.size} elegidas)
              </span>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {eligibleQuestions.length === 0 && (
                  <p className="text-xs text-neutral-400">
                    No hay preguntas disponibles para el modo{' '}
                    {getQuestionPurposeDisplayName(formPurpose)}.
                  </p>
                )}
                {eligibleQuestions.map((q) => (
                  <label
                    key={q.id}
                    className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.has(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>{q.text}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setSelectedQuestionIds(new Set());
                  reset();
                }}
                className="flex-1 rounded-xl border border-neutral-300 py-2 text-sm text-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={selectedQuestionIds.size === 0}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Crear grupo
              </button>
            </div>
          </form>
        )}

        {status === 'loading' && <p className="text-sm text-neutral-500">Cargando…</p>}
        {status === 'empty' && !isCreating && (
          <p className="text-sm text-neutral-500">No hay grupos armados todavía.</p>
        )}

        <div className="space-y-2">
          {sets.map((set) => (
            <div
              key={set.id}
              className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-neutral-800">{set.title}</p>
                {set.description && (
                  <p className="text-xs text-neutral-500">{set.description}</p>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  {getQuestionPurposeDisplayName(set.purpose)} · {getQuestionCount(set)}{' '}
                  pregunta(s)
                </p>
              </div>
              {confirmDeleteId === set.id ? (
                <button
                  onClick={() => {
                    deleteSet(set.id);
                    setConfirmDeleteId(null);
                  }}
                  className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Confirmar
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(set.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-error"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

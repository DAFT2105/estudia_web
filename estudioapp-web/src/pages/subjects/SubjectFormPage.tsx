// src/pages/subjects/SubjectFormPage.tsx
//
// Crear/editar materia -- puerto funcional de create_subject_screen.dart.
// Mismo único formulario para ambos casos, igual que en Flutter (recibe un
// subjectId opcional vía la URL).

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  getSubjectAreaDisplayName,
  type SubjectArea,
  type SubjectColor,
  type SubjectIcon,
  type TimeUnit,
} from '@/types/subject';

interface SubjectFormValues {
  name: string;
  description: string;
  area: SubjectArea;
  color: SubjectColor;
  icon: SubjectIcon;
  difficulty: string;
  estimatedDuration: string;
  timeUnit: TimeUnit;
}

const AREAS: SubjectArea[] = [
  'matematica',
  'comunicacion',
  'cienciasSociales',
  'cienciaYTecnologia',
  'ingles',
  'arteYCultura',
  'educacionFisica',
  'otra',
];
const COLORS: SubjectColor[] = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'teal',
  'pink',
  'indigo',
];
const DIFFICULTIES = ['Fácil', 'Medio', 'Difícil'];

export function SubjectFormPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const isEditing = Boolean(subjectId);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { subjects, createSubject, updateSubject, errorMessage } = useSubjects();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const existing = isEditing ? subjects.find((s) => s.id === subjectId) : undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SubjectFormValues>({
    defaultValues: {
      name: '',
      description: '',
      area: 'otra',
      color: 'blue',
      icon: 'book',
      difficulty: 'Medio',
      estimatedDuration: '',
      timeUnit: 'minutes',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        description: existing.description,
        area: existing.area,
        color: existing.color,
        icon: existing.icon,
        difficulty: existing.difficulty ?? 'Medio',
        estimatedDuration: existing.estimatedDuration?.toString() ?? '',
        timeUnit: existing.timeUnit ?? 'minutes',
      });
    }
  }, [existing, reset]);

  useUnsavedChangesGuard(isDirty && !isSubmitting);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  if (!currentUser) return null;

  const onSubmit = async (values: SubjectFormValues) => {
    setIsSubmitting(true);
    try {
      const estimatedDuration = values.estimatedDuration
        ? Number(values.estimatedDuration)
        : null;

      let success: boolean;
      if (existing) {
        success = await updateSubject(
          {
            ...existing,
            name: values.name,
            description: values.description,
            area: values.area,
            color: values.color,
            icon: values.icon,
            difficulty: values.difficulty,
            estimatedDuration,
            timeUnit: estimatedDuration ? values.timeUnit : null,
          },
          currentUser.id,
          currentUser.role,
        );
      } else {
        success = await createSubject({
          name: values.name,
          description: values.description,
          createdBy: currentUser.id,
          userRole: currentUser.role,
          area: values.area,
          color: values.color,
          icon: values.icon,
          difficulty: values.difficulty,
          estimatedDuration,
          timeUnit: estimatedDuration ? values.timeUnit : null,
        });
      }
      if (success) {
        toast.success(existing ? 'Materia actualizada' : 'Materia creada', values.name);
        navigate('/materias');
      }
      // Si falló, el useEffect que observa errorMessage muestra el toast con el motivo real
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
            { label: existing ? 'Editar materia' : 'Nueva materia' },
          ]}
        />

        <Link to="/materias" className="text-sm text-primary hover:underline">
          ← Volver a materias
        </Link>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl bg-surface p-6 shadow-md"
        >
          <h1 className="text-lg font-bold text-neutral-800">
            {existing ? 'Editar materia' : 'Nueva materia'}
          </h1>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="name">
              Nombre
            </label>
            <input
              id="name"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('name', {
                required: 'El nombre de la materia es requerido',
                maxLength: {
                  value: 50,
                  message: 'El nombre no puede exceder 50 caracteres',
                },
              })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="description">
              Descripción
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('description', {
                required: 'La descripción es requerida',
                maxLength: {
                  value: 200,
                  message: 'La descripción no puede exceder 200 caracteres',
                },
              })}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-error">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="area">
              Área curricular
            </label>
            <select
              id="area"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('area')}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {getSubjectAreaDisplayName(a)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-400">
              Define qué prompt de IA se usa al generar preguntas para esta materia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-700" htmlFor="color">
                Color
              </label>
              <select
                id="color"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('color')}
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block text-sm text-neutral-700"
                htmlFor="estimatedDuration"
              >
                Duración estimada
              </label>
              <input
                id="estimatedDuration"
                type="number"
                min={0}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('estimatedDuration')}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-700" htmlFor="timeUnit">
                Unidad
              </label>
              <select
                id="timeUnit"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('timeUnit')}
              >
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando…' : existing ? 'Guardar cambios' : 'Crear materia'}
          </button>
        </form>
      </div>
    </div>
  );
}

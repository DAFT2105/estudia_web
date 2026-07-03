// src/pages/students/StudentFormPage.tsx
//
// Crear/editar estudiante -- puerto funcional de student_form_screen.dart.
// Reemplaza la versión mínima de la Etapa 1 (que llamaba a studentService
// directo): ahora pasa por StudentContext -> studentRepository, con todas
// las validaciones de formato (sección 3.2 del plan técnico) y todos los
// campos del modelo (grado, nivel, fecha de nacimiento, notas, avatar).

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStudents } from '@/hooks/useStudents';
import { useSubjects } from '@/hooks/useSubjects';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  gradeHasNumericLevel,
  gradeMaxLevel,
  getGradeDisplayName,
  type StudentAvatar,
  type StudentGrade,
  type WeeklyGoal,
  type WeeklyGoalType,
} from '@/types/student';

interface StudentFormValues {
  nombres: string;
  apellidos: string;
  email: string;
  grade: StudentGrade;
  gradeLevel: string;
  birthDate: string;
  notes: string;
  avatar: StudentAvatar;
}

const GRADES: StudentGrade[] = [
  'preescolar',
  'primaria',
  'secundaria',
  'preparatoria',
  'universidad',
];
const AVATARS: StudentAvatar[] = [
  'student1',
  'student2',
  'student3',
  'student4',
  'student5',
  'student6',
];

export function StudentFormPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const isEditing = Boolean(studentId);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { students, createStudent, updateStudent, errorMessage } = useStudents();
  const { activeSubjects, loadSubjects } = useSubjects();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    temporaryPassword: string;
  } | null>(null);
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);

  const existing = isEditing ? students.find((s) => s.id === studentId) : undefined;

  useEffect(() => {
    if (currentUser) loadSubjects(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<StudentFormValues>({
    defaultValues: {
      nombres: '',
      apellidos: '',
      email: '',
      grade: 'primaria',
      gradeLevel: '',
      birthDate: '',
      notes: '',
      avatar: 'student1',
    },
  });

  const selectedGrade = watch('grade');

  useEffect(() => {
    if (existing) {
      reset({
        nombres: existing.nombres,
        apellidos: existing.apellidos,
        email: existing.email ?? '',
        grade: existing.grade,
        gradeLevel: existing.gradeLevel?.toString() ?? '',
        birthDate: existing.birthDate?.slice(0, 10) ?? '',
        notes: existing.notes ?? '',
        avatar: existing.avatar,
      });
      setGoals(existing.weeklyGoals ?? []);
    }
  }, [existing, reset]);

  useUnsavedChangesGuard(isDirty && !isSubmitting);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  if (!currentUser) return null;

  const addGoal = () => {
    setGoals((prev) => [
      ...prev,
      { id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type: 'sessions', target: 3, subjectId: null },
    ]);
  };

  const removeGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGoal = (id: string, patch: Partial<WeeklyGoal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const onSubmit = async (values: StudentFormValues) => {
    setIsSubmitting(true);
    setCreatedCredentials(null);
    try {
      const gradeLevel =
        values.gradeLevel && gradeHasNumericLevel(values.grade)
          ? Number(values.gradeLevel)
          : null;

      if (existing) {
        const success = await updateStudent(
          {
            ...existing,
            nombres: values.nombres,
            apellidos: values.apellidos,
            email: values.email || null,
            grade: values.grade,
            gradeLevel,
            birthDate: values.birthDate || null,
            notes: values.notes || null,
            avatar: values.avatar,
            weeklyGoals: goals,
          },
          currentUser.id,
        );
        if (success) {
          toast.success('Estudiante actualizado', `${values.nombres} ${values.apellidos}`);
          navigate('/estudiantes');
        }
      } else {
        const result = await createStudent({
          nombres: values.nombres,
          apellidos: values.apellidos,
          email: values.email || null,
          parentId: currentUser.id,
          grade: values.grade,
          gradeLevel,
          birthDate: values.birthDate || null,
          notes: values.notes || null,
          avatar: values.avatar,
        });
        if (result) {
          toast.success('Estudiante creado', `${values.nombres} ${values.apellidos}`);
          setCreatedCredentials(result);
          reset();
        }
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
            { label: 'Estudiantes', to: '/estudiantes' },
            { label: existing ? 'Editar estudiante' : 'Nuevo estudiante' },
          ]}
        />

        <Link to="/estudiantes" className="text-sm text-primary hover:underline">
          ← Volver a estudiantes
        </Link>

        {createdCredentials && (
          <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-800">
              Guarda o comparte esta clave ahora — no se mostrará de nuevo.
            </p>
            <div className="flex justify-between rounded-lg bg-white px-3 py-2">
              <span className="text-neutral-500">Usuario</span>
              <span className="font-mono font-semibold">
                {createdCredentials.username}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-white px-3 py-2">
              <span className="text-neutral-500">Clave temporal</span>
              <span className="font-mono font-semibold">
                {createdCredentials.temporaryPassword}
              </span>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl bg-surface p-6 shadow-md"
        >
          <h1 className="text-lg font-bold text-neutral-800">
            {existing ? 'Editar estudiante' : 'Nuevo estudiante'}
          </h1>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-700" htmlFor="nombres">
                Nombres
              </label>
              <input
                id="nombres"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('nombres', {
                  required: 'Requerido',
                  maxLength: { value: 50, message: 'Máx. 50 caracteres' },
                })}
              />
              {errors.nombres && (
                <p className="mt-1 text-xs text-error">{errors.nombres.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-700" htmlFor="apellidos">
                Apellidos
              </label>
              <input
                id="apellidos"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('apellidos', {
                  required: 'Requerido',
                  maxLength: { value: 50, message: 'Máx. 50 caracteres' },
                })}
              />
              {errors.apellidos && (
                <p className="mt-1 text-xs text-error">{errors.apellidos.message}</p>
              )}
            </div>
          </div>

          {existing && (
            <div className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
              Usuario: <span className="font-mono">{existing.username}</span> (no editable
              -- se generó al crear la cuenta)
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="email">
              Email (opcional)
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('email')}
            />
            <p className="mt-1 text-xs text-neutral-400">
              Reservado para integración futura con colegios.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-700" htmlFor="grade">
                Grado
              </label>
              <select
                id="grade"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                {...register('grade')}
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {getGradeDisplayName(g)}
                  </option>
                ))}
              </select>
            </div>
            {gradeHasNumericLevel(selectedGrade) && (
              <div>
                <label
                  className="mb-1 block text-sm text-neutral-700"
                  htmlFor="gradeLevel"
                >
                  Nivel (1-{gradeMaxLevel(selectedGrade)})
                </label>
                <input
                  id="gradeLevel"
                  type="number"
                  min={1}
                  max={gradeMaxLevel(selectedGrade)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  {...register('gradeLevel')}
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="birthDate">
              Fecha de nacimiento (opcional)
            </label>
            <input
              id="birthDate"
              type="date"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('birthDate')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="avatar">
              Avatar
            </label>
            <select
              id="avatar"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('avatar')}
            >
              {AVATARS.map((a, i) => (
                <option key={a} value={a}>
                  Avatar {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="notes">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('notes')}
            />
          </div>

          {existing && (
            <div className="space-y-2 border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-neutral-700">
                  Metas semanales
                </label>
                <button
                  type="button"
                  onClick={addGoal}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  + Agregar meta
                </button>
              </div>

              {goals.length === 0 && (
                <p className="text-xs text-neutral-400">
                  Sin metas definidas — ej. "3 prácticas por semana" o "70% de promedio en Matemática".
                </p>
              )}

              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-2 rounded-xl border border-neutral-200 p-2.5">
                  <select
                    value={goal.type}
                    onChange={(e) => updateGoal(goal.id, { type: e.target.value as WeeklyGoalType })}
                    className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                  >
                    <option value="sessions">Sesiones</option>
                    <option value="averageScore">Promedio (%)</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={goal.type === 'averageScore' ? 100 : 50}
                    value={goal.target}
                    onChange={(e) => updateGoal(goal.id, { target: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                  />
                  <select
                    value={goal.subjectId ?? ''}
                    onChange={(e) => updateGoal(goal.id, { subjectId: e.target.value || null })}
                    className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                  >
                    <option value="">Todas las materias</option>
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeGoal(goal.id)}
                    className="flex-shrink-0 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-error hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting
              ? 'Guardando…'
              : existing
                ? 'Guardar cambios'
                : 'Crear estudiante'}
          </button>
        </form>
      </div>
    </div>
  );
}

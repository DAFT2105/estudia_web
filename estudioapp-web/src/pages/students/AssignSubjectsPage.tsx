// src/pages/students/AssignSubjectsPage.tsx
//
// Puerto funcional de assign_subjects_screen.dart -- dos vistas: por
// estudiante (switches + cambios pendientes + guardar) y por materia
// (lista de asignados + desasignar rápido). Usa
// StudentContext.assignSubjectToStudent/unassignSubjectFromStudent -- el
// único camino atómico real (ver nota en subjectService.ts).

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStudents } from '@/hooks/useStudents';
import { useSubjects } from '@/hooks/useSubjects';
import { getStudentFullName, getGradeDisplayName } from '@/types/student';
import { getFormattedDuration } from '@/types/subject';

type Tab = 'porEstudiante' | 'porMateria';
type PendingChange = { studentId: string; subjectId: string; assign: boolean };

export function AssignSubjectsPage() {
  const { currentUser } = useAuth();
  const {
    activeStudents,
    loadStudents,
    assignSubjectToStudent,
    unassignSubjectFromStudent,
  } = useStudents();
  const { activeSubjects, loadSubjects } = useSubjects();

  const [tab, setTab] = useState<Tab>('porEstudiante');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [pending, setPending] = useState<Map<string, PendingChange>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadStudents(currentUser.id);
      loadSubjects(currentUser.id, currentUser.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  // Estudiante "actual": el seleccionado explícitamente, o el primero de la
  // lista por defecto -- derivado en el render, sin useEffect+setState.
  const currentStudent =
    activeStudents.find((s) => s.id === selectedStudentId) ?? activeStudents[0] ?? null;

  if (activeStudents.length === 0 || activeSubjects.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Link to="/" className="self-start text-sm text-primary hover:underline">
          ← Inicio
        </Link>
        <p className="text-lg font-semibold text-neutral-800">
          {activeStudents.length === 0 && activeSubjects.length === 0
            ? 'Necesitas crear estudiantes y materias'
            : activeStudents.length === 0
              ? 'Necesitas crear estudiantes primero'
              : 'Necesitas crear materias primero'}
        </p>
        <p className="text-sm text-neutral-500">
          Crea al menos un estudiante y una materia para poder asignar.
        </p>
      </div>
    );
  }

  const pendingKey = (studentId: string, subjectId: string) =>
    `${studentId}|||${subjectId}`;

  const toggleAssignment = (
    studentId: string,
    subjectId: string,
    currentFinalState: boolean,
    isCurrentlyAssigned: boolean,
  ) => {
    const key = pendingKey(studentId, subjectId);
    const newValue = !currentFinalState;
    setPending((prev) => {
      const next = new Map(prev);
      if (newValue === isCurrentlyAssigned) next.delete(key);
      else next.set(key, { studentId, subjectId, assign: newValue });
      return next;
    });
  };

  const saveChanges = async () => {
    if (!currentUser || pending.size === 0) return;
    setIsSaving(true);
    let successCount = 0;
    const total = pending.size;

    for (const change of pending.values()) {
      const success = change.assign
        ? await assignSubjectToStudent(change.studentId, change.subjectId, currentUser.id)
        : await unassignSubjectFromStudent(
            change.studentId,
            change.subjectId,
            currentUser.id,
          );
      if (success) successCount++;
    }

    setFeedback(`${successCount} de ${total} cambios aplicados`);
    setPending(new Map());
    setIsSaving(false);
    await loadStudents(currentUser.id);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Inicio
        </Link>
        <h1 className="text-xl font-bold text-neutral-800">Asignar materias</h1>

        <div className="flex gap-2 border-b border-neutral-200">
          <button
            onClick={() => setTab('porEstudiante')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'porEstudiante'
                ? 'border-b-2 border-primary text-primary'
                : 'text-neutral-500'
            }`}
          >
            Por estudiante
          </button>
          <button
            onClick={() => setTab('porMateria')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'porMateria'
                ? 'border-b-2 border-primary text-primary'
                : 'text-neutral-500'
            }`}
          >
            Por materia
          </button>
        </div>

        {feedback && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-success">
            {feedback}
          </div>
        )}

        {tab === 'porEstudiante' && (
          <div className="space-y-3">
            <select
              value={currentStudent?.id ?? ''}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setPending(new Map());
              }}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {activeStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {getStudentFullName(s)} — {getGradeDisplayName(s.grade)}
                </option>
              ))}
            </select>

            {currentStudent && (
              <div className="space-y-2">
                {activeSubjects.map((subject) => {
                  const isCurrentlyAssigned = currentStudent.assignedSubjects.includes(
                    subject.id,
                  );
                  const key = pendingKey(currentStudent.id, subject.id);
                  const change = pending.get(key);
                  const finalState = change ? change.assign : isCurrentlyAssigned;

                  const pendingTone = change
                    ? finalState
                      ? { border: 'border-success', bg: 'bg-success/5' }
                      : { border: 'border-warning', bg: 'bg-warning/10' }
                    : { border: 'border-transparent', bg: 'bg-surface' };

                  return (
                    <label
                      key={subject.id}
                      className={`flex items-center justify-between rounded-2xl border-2 p-4 shadow-sm transition-colors duration-150 ${pendingTone.border} ${pendingTone.bg}`}
                    >
                      <div>
                        <p className="font-semibold text-neutral-800">{subject.name}</p>
                        <p className="text-xs text-neutral-500">{subject.description}</p>
                        {change && (
                          <p
                            className={`mt-1 text-xs font-semibold ${
                              finalState ? 'text-success' : 'text-warning'
                            }`}
                          >
                            {finalState ? '✓ Se asignará al guardar' : '✕ Se quitará al guardar'}
                          </p>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={finalState}
                        onChange={() =>
                          toggleAssignment(
                            currentStudent.id,
                            subject.id,
                            finalState,
                            isCurrentlyAssigned,
                          )
                        }
                        className="h-5 w-5 accent-primary"
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {pending.size > 0 && (
              <div className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-md">
                <span className="text-sm font-semibold text-neutral-700">
                  {pending.size} cambio(s) pendiente(s)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPending(new Map())}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={isSaving}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {isSaving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'porMateria' && (
          <div className="space-y-3">
            {activeSubjects.map((subject) => {
              const assignedStudents = activeStudents.filter((s) =>
                s.assignedSubjects.includes(subject.id),
              );
              return (
                <div key={subject.id} className="rounded-2xl bg-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-800">{subject.name}</p>
                      <p className="text-xs text-neutral-500">
                        {assignedStudents.length} estudiante(s) asignado(s)
                        {getFormattedDuration(subject) &&
                          ` · ${getFormattedDuration(subject)}`}
                      </p>
                    </div>
                  </div>
                  {assignedStudents.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {assignedStudents.map((student) => (
                        <li
                          key={student.id}
                          className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-1.5 text-sm"
                        >
                          <span>{getStudentFullName(student)}</span>
                          <button
                            onClick={async () => {
                              if (!currentUser) return;
                              const success = await unassignSubjectFromStudent(
                                student.id,
                                subject.id,
                                currentUser.id,
                              );
                              setFeedback(
                                success
                                  ? 'Materia desasignada'
                                  : 'Error al desasignar materia',
                              );
                            }}
                            className="text-xs text-error hover:underline"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

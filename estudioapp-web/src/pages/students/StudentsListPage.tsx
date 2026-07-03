// src/pages/students/StudentsListPage.tsx
//
// Puerto funcional de students_screen.dart / ver_estudiantes_screen.dart.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStudents } from '@/hooks/useStudents';
import { getStudentFullName, getGradeDisplayWithLevel } from '@/types/student';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { SortSelect } from '@/components/SortSelect';

const PAGE_SIZE = 10;
type SortKey = 'name_asc' | 'name_desc' | 'grade' | 'subjects_desc';

export function StudentsListPage() {
  const { currentUser } = useAuth();
  const {
    students,
    status,
    errorMessage,
    loadStudents,
    searchStudents,
    clearSearch,
    deleteStudent,
  } = useStudents();
  const [searchInput, setSearchInput] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name_asc');
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (currentUser) loadStudents(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  if (!currentUser) return null;

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) await searchStudents(searchInput, currentUser.id);
    else await clearSearch(currentUser.id);
  };

  const handleDelete = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const ok = await confirm({
      title: '¿Eliminar este estudiante?',
      description: student
        ? `Se eliminará a ${getStudentFullName(student)} y no se puede deshacer.`
        : 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    const success = await deleteStudent(studentId, currentUser.id);
    if (success) toast.success('Estudiante eliminado', student ? getStudentFullName(student) : undefined);
  };

  const sortedStudents = useMemo(() => {
    const copy = [...students];
    switch (sortKey) {
      case 'name_asc': return copy.sort((a, b) => getStudentFullName(a).localeCompare(getStudentFullName(b)));
      case 'name_desc': return copy.sort((a, b) => getStudentFullName(b).localeCompare(getStudentFullName(a)));
      case 'grade': return copy.sort((a, b) => a.grade.localeCompare(b.grade));
      case 'subjects_desc': return copy.sort((a, b) => b.assignedSubjects.length - a.assignedSubjects.length);
      default: return copy;
    }
  }, [students, sortKey]);

  const { page, setPage, totalPages, pageItems, totalItems } = usePagination(sortedStudents, PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Inicio
          </Link>
          {currentUser.role === 'parent' && (
            <Link
              to="/estudiantes/nuevo"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              + Nuevo estudiante
            </Link>
          )}
        </div>

        <h1 className="text-xl font-bold text-neutral-800">Estudiantes</h1>

        <div className="flex flex-wrap gap-2">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre, usuario, email o notas"
              className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700"
            >
              Buscar
            </button>
          </form>
          <SortSelect
            value={sortKey}
            onChange={setSortKey}
            options={[
              { value: 'name_asc', label: 'Nombre (A-Z)' },
              { value: 'name_desc', label: 'Nombre (Z-A)' },
              { value: 'grade', label: 'Grado' },
              { value: 'subjects_desc', label: 'Más materias' },
            ]}
          />
        </div>

        {status === 'loading' && <p className="text-sm text-neutral-500">Cargando…</p>}
        {status === 'empty' && (
          <p className="text-sm text-neutral-500">
            No hay estudiantes para mostrar todavía.
          </p>
        )}

        {status !== 'loading' && (
        <div className="space-y-2">
          {pageItems.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-neutral-800">
                  {getStudentFullName(student)}
                </p>
                <p className="text-xs text-neutral-500">
                  Usuario: <span className="font-mono">{student.username}</span>
                </p>
                <div className="mt-1 flex gap-2 text-xs text-neutral-400">
                  <span>{getGradeDisplayWithLevel(student)}</span>
                  <span>· {student.assignedSubjects.length} materia(s)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/estudiantes/${student.id}/editar`}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(student.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-error transition-colors hover:bg-red-50 active:scale-[0.97]"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
        )}

        {status !== 'loading' && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>
    </div>
  );
}

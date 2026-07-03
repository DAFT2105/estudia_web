// src/pages/subjects/SubjectsListPage.tsx
//
// Puerto funcional de subjects_screen.dart / ver_materias_screen.dart --
// lista, búsqueda y acciones de editar/eliminar.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { getSubjectAreaDisplayName, getFormattedDuration } from '@/types/subject';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { SortSelect } from '@/components/SortSelect';

const PAGE_SIZE = 10;
type SortKey = 'name_asc' | 'name_desc' | 'area' | 'students_desc';

export function SubjectsListPage() {
  const { currentUser } = useAuth();
  const {
    subjects,
    status,
    errorMessage,
    loadSubjects,
    searchSubjects,
    clearSearch,
    deleteSubject,
  } = useSubjects();
  const [searchInput, setSearchInput] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name_asc');
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (currentUser) loadSubjects(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  // El toast es el único canal de error — evita duplicar con una caja inline
  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  if (!currentUser) return null;

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim())
      await searchSubjects(searchInput, currentUser.id, currentUser.role);
    else await clearSearch(currentUser.id, currentUser.role);
  };

  const handleDelete = async (subjectId: string) => {
    const name = subjects.find((s) => s.id === subjectId)?.name;
    const ok = await confirm({
      title: '¿Eliminar esta materia?',
      description: name
        ? `Se eliminará "${name}" junto con sus preguntas asociadas. Esta acción no se puede deshacer.`
        : 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    const success = await deleteSubject(subjectId, currentUser.id, currentUser.role);
    if (success) toast.success('Materia eliminada', name ?? undefined);
  };

  const sortedSubjects = useMemo(() => {
    const copy = [...subjects];
    switch (sortKey) {
      case 'name_asc': return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc': return copy.sort((a, b) => b.name.localeCompare(a.name));
      case 'area': return copy.sort((a, b) => a.area.localeCompare(b.area));
      case 'students_desc': return copy.sort((a, b) => b.assignedStudents.length - a.assignedStudents.length);
      default: return copy;
    }
  }, [subjects, sortKey]);

  const { page, setPage, totalPages, pageItems, totalItems } = usePagination(sortedSubjects, PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Materias</h1>
          <p className="mt-0.5 text-[12px] text-neutral-400">
            {subjects.length} {subjects.length === 1 ? 'materia registrada' : 'materias registradas'}
          </p>
        </div>
        {currentUser.role === 'parent' && (
          <Link
            to="/materias/nueva"
            className="flex items-center gap-1.5 rounded-xl bg-coral px-4 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            <span className="text-base leading-none">+</span> Nueva materia
          </Link>
        )}
      </div>

      <div className="flex max-w-3xl flex-wrap gap-2">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300"
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o descripción"
              className="w-full rounded-xl border border-neutral-200 bg-surface py-2.5 pl-9 pr-3 text-[13px] focus:border-coral focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-neutral-200 bg-surface px-5 py-2.5 text-[13px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-[0.98]"
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
            { value: 'area', label: 'Área' },
            { value: 'students_desc', label: 'Más estudiantes' },
          ]}
        />
      </div>

      {status === 'loading' && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-200" />
          ))}
        </div>
      )}

      {status === 'empty' && (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-12 text-center">
          <p className="text-[13px] font-semibold text-neutral-600">No hay materias para mostrar todavía</p>
          {currentUser.role === 'parent' && (
            <p className="mt-1 text-[12px] text-neutral-400">Crea tu primera materia con el botón de arriba</p>
          )}
        </div>
      )}

      {status !== 'loading' && (
      <div className="space-y-3">
        {pageItems.map((subject) => (
          <div
            key={subject.id}
            className="card-clickable flex items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-surface p-5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold uppercase tracking-tight text-ink">
                {subject.name}
              </p>
              {subject.description && (
                <p className="mt-0.5 truncate text-[12px] text-neutral-500">{subject.description}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-neutral-400">
                <span className="font-medium">{getSubjectAreaDisplayName(subject.area)}</span>
                {subject.difficulty && <span>· {subject.difficulty}</span>}
                {getFormattedDuration(subject) && <span>· {getFormattedDuration(subject)}</span>}
                <span>· {subject.assignedStudents.length} estudiante(s)</span>
              </div>
            </div>

            {currentUser.role === 'parent' && (
              <div className="flex flex-shrink-0 gap-2">
                <Link
                  to={`/materias/${subject.id}/preguntas`}
                  className="rounded-lg border border-coral px-3 py-1.5 text-[12px] font-semibold text-coral-text transition-colors hover:bg-coral/5 active:scale-[0.97]"
                >
                  Preguntas
                </Link>
                <Link
                  to={`/materias/${subject.id}/editar`}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-[0.97]"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(subject.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-semibold text-error transition-colors hover:bg-red-50 active:scale-[0.97]"
                >
                  Eliminar
                </button>
              </div>
            )}
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
  );
}

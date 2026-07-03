// src/pages/questions/QuestionsListPage.tsx
//
// Puerto funcional de questions_screen.dart -- filtros por tipo,
// dificultad y modo de uso, búsqueda, y accesos a generación con IA y
// grupos de preguntas.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuestions } from '@/hooks/useQuestions';
import { useSubjects } from '@/hooks/useSubjects';
import {
  getQuestionTypeDisplayName,
  getQuestionDifficultyDisplayName,
  getQuestionPurposeDisplayName,
  getCorrectOptionLetter,
  type Question,
  type QuestionDifficulty,
  type QuestionPurpose,
  type QuestionType,
} from '@/types/question';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { SortSelect } from '@/components/SortSelect';

type TypeFilter = 'todos' | QuestionType;
type DifficultyFilter = 'todas' | QuestionDifficulty;
type PurposeFilter = 'todos' | QuestionPurpose;
type SortKey = 'recent' | 'oldest' | 'difficulty_asc' | 'difficulty_desc';

const PAGE_SIZE = 10;
const DIFFICULTY_ORDER: Record<QuestionDifficulty, number> = { easy: 0, medium: 1, hard: 2 };

export function QuestionsListPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { currentUser } = useAuth();
  const { subjects, loadSubjects } = useSubjects();
  const {
    questions,
    status,
    errorMessage,
    loadQuestionsBySubject,
    searchQuestions,
    clearSearch,
    deleteQuestion,
  } = useQuestions();

  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('todas');
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>('todos');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (subjectId) loadQuestionsBySubject(subjectId);
    if (currentUser) loadSubjects(currentUser.id, currentUser.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, currentUser?.id]);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  if (!currentUser || !subjectId) return null;

  const subject = subjects.find((s) => s.id === subjectId);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) await searchQuestions(searchInput, subjectId);
    else await clearSearch(subjectId);
  };

  const handleDelete = async (questionId: string) => {
    const ok = await confirm({
      title: '¿Eliminar esta pregunta?',
      description: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    const success = await deleteQuestion(questionId);
    if (success) toast.success('Pregunta eliminada');
  };

  const filtered = questions.filter((q: Question) => {
    if (typeFilter !== 'todos' && q.type !== typeFilter) return false;
    if (difficultyFilter !== 'todas' && q.difficulty !== difficultyFilter) return false;
    if (purposeFilter !== 'todos') {
      // 'todos' deja pasar todo; cualquier otro valor exige coincidencia
      // exacta -- las preguntas legacy (purpose null) no aparecen al
      // filtrar por un modo específico, igual que el filtro estricto de
      // Flutter (distinto de `appliesTo`, que sí las deja pasar para jugar).
      if (q.purpose !== purposeFilter) return false;
    }
    return true;
  });

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sortKey) {
      case 'recent':
        return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case 'oldest':
        return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'difficulty_asc':
        return copy.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
      case 'difficulty_desc':
        return copy.sort((a, b) => DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty]);
      default:
        return copy;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey]);

  const { page, setPage, totalPages, pageItems, totalItems } = usePagination(sorted, PAGE_SIZE);

  // Limpia la selección cuando cambian filtros/búsqueda/página — evita
  // eliminar por error preguntas que ya no están visibles.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [typeFilter, difficultyFilter, purposeFilter, sortKey, page, searchInput]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPageSelected = pageItems.length > 0 && pageItems.every((q) => selectedIds.has(q.id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageItems.forEach((q) => next.delete(q.id));
      } else {
        pageItems.forEach((q) => next.add(q.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    const ok = await confirm({
      title: `¿Eliminar ${count} pregunta(s)?`,
      description: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar todas',
      tone: 'danger',
    });
    if (!ok) return;
    const results = await Promise.all([...selectedIds].map((id) => deleteQuestion(id)));
    const succeeded = results.filter(Boolean).length;
    setSelectedIds(new Set());
    if (succeeded === count) toast.success(`${succeeded} pregunta(s) eliminada(s)`);
    else if (succeeded > 0) toast.error(`Se eliminaron ${succeeded} de ${count}`, 'Algunas no se pudieron borrar');
    else toast.error('No se pudo eliminar ninguna pregunta');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Materias', to: '/materias' },
            { label: subject?.name ?? 'Preguntas' },
          ]}
        />

        <div className="flex items-center justify-between">
          <Link to="/materias" className="text-sm text-primary hover:underline">
            ← Materias
          </Link>
          <div className="flex gap-2">
            <Link
              to={`/materias/${subjectId}/preguntas/grupos`}
              className="rounded-xl border border-primary px-3 py-2 text-xs font-semibold text-primary"
            >
              Grupos
            </Link>
            <Link
              to={`/materias/${subjectId}/preguntas/generar-ia`}
              className="rounded-xl border border-primary px-3 py-2 text-xs font-semibold text-primary"
            >
              Generar con IA
            </Link>
            <Link
              to={`/materias/${subjectId}/preguntas/nueva`}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
            >
              + Nueva
            </Link>
          </div>
        </div>

        <h1 className="text-xl font-bold text-neutral-800">
          Preguntas {subject ? `· ${subject.name}` : ''}
        </h1>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por texto, tema o explicación"
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="todos">Todos los tipos</option>
            <option value="multipleChoice">
              {getQuestionTypeDisplayName('multipleChoice')}
            </option>
            <option value="trueFalse">{getQuestionTypeDisplayName('trueFalse')}</option>
            <option value="shortAnswer">
              {getQuestionTypeDisplayName('shortAnswer')}
            </option>
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="todas">Todas las dificultades</option>
            <option value="easy">{getQuestionDifficultyDisplayName('easy')}</option>
            <option value="medium">{getQuestionDifficultyDisplayName('medium')}</option>
            <option value="hard">{getQuestionDifficultyDisplayName('hard')}</option>
          </select>
          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value as PurposeFilter)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="todos">Práctica y examen</option>
            <option value="practice">{getQuestionPurposeDisplayName('practice')}</option>
            <option value="exam">{getQuestionPurposeDisplayName('exam')}</option>
          </select>
          <SortSelect
            value={sortKey}
            onChange={setSortKey}
            options={[
              { value: 'recent', label: 'Más recientes' },
              { value: 'oldest', label: 'Más antiguas' },
              { value: 'difficulty_asc', label: 'Dificultad ↑' },
              { value: 'difficulty_desc', label: 'Dificultad ↓' },
            ]}
          />
        </div>

        {status === 'loading' && <p className="text-sm text-neutral-500">Cargando…</p>}
        {status === 'empty' && (
          <p className="text-sm text-neutral-500">
            No hay preguntas para mostrar todavía.
          </p>
        )}

        {status !== 'loading' && totalItems > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-surface px-3 py-2">
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAllOnPage}
                className="h-3.5 w-3.5 accent-primary"
              />
              Seleccionar página
              {selectedIds.size > 0 && (
                <span className="text-neutral-400">· {selectedIds.size} seleccionada(s)</span>
              )}
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-error transition-colors hover:bg-red-50 active:scale-[0.97]"
              >
                Eliminar seleccionadas
              </button>
            )}
          </div>
        )}

        {status !== 'loading' && (
        <div className="space-y-2">
          {pageItems.map((question) => (
            <div key={question.id} className="rounded-2xl bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(question.id)}
                    onChange={() => toggleSelected(question.id)}
                    className="mt-1 h-3.5 w-3.5 flex-shrink-0 accent-primary"
                  />
                  <div>
                  <p className="font-semibold text-neutral-800">{question.text}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-400">
                    <span>{getQuestionTypeDisplayName(question.type)}</span>
                    <span>· {getQuestionDifficultyDisplayName(question.difficulty)}</span>
                    <span>
                      ·{' '}
                      {question.purpose
                        ? getQuestionPurposeDisplayName(question.purpose)
                        : 'Práctica y examen'}
                    </span>
                    {question.topic && <span>· {question.topic}</span>}
                  </div>
                  {question.type === 'multipleChoice' && (
                    <ul className="mt-2 space-y-0.5 text-xs">
                      {question.options.map((opt, i) => {
                        const isCorrect = opt === question.correctAnswer;
                        return (
                          <li
                            key={i}
                            className={
                              isCorrect
                                ? 'font-semibold text-success'
                                : 'text-neutral-500'
                            }
                          >
                            {String.fromCharCode(65 + i)}) {opt} {isCorrect && '✓'}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {question.type !== 'multipleChoice' && (
                    <p className="mt-2 text-xs font-semibold text-success">
                      Respuesta: {question.correctAnswer}
                    </p>
                  )}
                  {question.type === 'multipleChoice' &&
                    getCorrectOptionLetter(question) && (
                      <p className="mt-1 text-xs text-neutral-400">
                        Opción correcta: {getCorrectOptionLetter(question)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    to={`/materias/${subjectId}/preguntas/${question.id}/editar`}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-700"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs text-error transition-colors hover:bg-red-50 active:scale-[0.97]"
                  >
                    Eliminar
                  </button>
                </div>
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

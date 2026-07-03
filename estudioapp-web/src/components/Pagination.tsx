// src/components/Pagination.tsx
//
// Paginación client-side genérica — usada en listas de materias,
// estudiantes y preguntas, que cargan todo el array de una vez.

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }: Props) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Genera un rango compacto de páginas con elipsis cuando hay muchas
  const pages: (number | '…')[] = [];
  const windowSize = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - windowSize && p <= currentPage + windowSize)
    ) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-4 sm:flex-row">
      <p className="text-[12px] text-neutral-400">
        Mostrando {start}–{end} de {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Página anterior"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-[12px] text-neutral-300">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-semibold transition-colors ${
                p === currentPage
                  ? 'bg-coral text-white'
                  : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>
    </div>
  );
}

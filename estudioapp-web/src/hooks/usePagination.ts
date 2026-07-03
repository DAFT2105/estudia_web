// src/hooks/usePagination.ts

import { useEffect, useMemo, useState } from 'react';

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Si la lista se achica (filtro/búsqueda) y la página actual queda fuera de rango, retrocede
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, totalPages, pageItems, totalItems: items.length };
}

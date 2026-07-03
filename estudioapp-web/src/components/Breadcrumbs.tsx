// src/components/Breadcrumbs.tsx
//
// Rastro de navegación para flujos anidados (ej: Materias > Aritmética >
// Preguntas > Nueva). El último ítem es la página actual (no es link).

import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string; // si no tiene `to`, es la página actual
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-3 flex items-center gap-1.5 text-[12px]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-300">›</span>}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-neutral-400 transition-colors hover:text-coral-text"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-ink' : 'text-neutral-400'}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

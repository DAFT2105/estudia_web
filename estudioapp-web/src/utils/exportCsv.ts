// src/utils/exportCsv.ts
//
// Exporta un array de objetos a un archivo .csv y dispara su descarga.
// Sin dependencias externas — suficiente para tablas simples de resultados.

function escapeCsvValue(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => unknown;
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const headerLine = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(c.accessor(row))).join(','),
  );
  const csv = [headerLine, ...dataLines].join('\n');

  // BOM para que Excel detecte UTF-8 correctamente (tildes, ñ)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

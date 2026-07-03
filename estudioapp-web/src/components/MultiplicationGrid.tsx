// src/components/MultiplicationGrid.tsx

export interface PartialProduct {
  digit: number;
  shift: number;
  shiftedValue: number;
}

export interface MultiplicationData {
  factor1: number;
  factor2: number;
  partials: PartialProduct[];
  sum: number;
  totalCols: number;
}

const PLACE_LABELS = ['U', 'D', 'C', 'UM', 'DM', 'CM', 'UMM'];
const PLACE_FULL   = ['Unidades', 'Decenas', 'Centenas', 'Unidades de Millar', 'Decenas de Millar', 'Centenas de Millar', 'Unidades de Millón'];

const COLUMN_COLORS = [
  { bg: '#e0e7ff', text: '#1e3a5f' },
  { bg: '#fde68a', text: '#78350f' },
  { bg: '#fecdd3', text: '#881337' },
  { bg: '#d1fae5', text: '#064e3b' },
  { bg: '#e0f2fe', text: '#075985' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#fef9c3', text: '#713f12' },
];

export function placeLabel(shift: number) { return PLACE_LABELS[shift] ?? `10^${shift}`; }
export function placeFull(shift: number)  { return PLACE_FULL[shift]   ?? `Posición ${shift}`; }
function placeColor(shift: number)        { return COLUMN_COLORS[shift % COLUMN_COLORS.length]; }

// ── Cálculo de acarreos dígito a dígito ──────────────────────────────────────

interface CarryStep {
  posDigit: number;   // dígito del multiplicando (de derecha a izquierda)
  multiplied: number; // posDigit × multiplierDigit
  carryIn: number;    // acarreo que entró
  total: number;      // multiplied + carryIn
  written: number;    // dígito escrito (total % 10)
  carryOut: number;   // acarreo que sale (Math.floor(total / 10))
}

function computeCarrySteps(factor1: number, multiplierDigit: number): CarryStep[] {
  const digits = String(factor1).split('').map(Number).reverse(); // derecha a izquierda
  const steps: CarryStep[] = [];
  let carry = 0;

  for (let i = 0; i < digits.length; i++) {
    const posDigit   = digits[i];
    const multiplied = posDigit * multiplierDigit;
    const total      = multiplied + carry;
    const written    = total % 10;
    const carryOut   = Math.floor(total / 10);
    steps.push({ posDigit, multiplied, carryIn: carry, total, written, carryOut });
    carry = carryOut;
  }

  // Si queda acarreo final (ej. 9×9=81+carry→ puede dejar carry al final)
  if (carry > 0) {
    steps.push({ posDigit: -1, multiplied: 0, carryIn: carry, total: carry, written: carry, carryOut: 0 });
  }

  return steps;
}

export function computeMultiplicationData(f1: number, f2: number): MultiplicationData {
  const a = Math.abs(Math.trunc(f1));
  const b = Math.abs(Math.trunc(f2));
  const bStr = String(b);
  const totalB = bStr.length;

  const partials: PartialProduct[] = bStr
    .split('')
    .map((ch, idxFromLeft) => {
      const digit = Number(ch);
      const shift = totalB - 1 - idxFromLeft;
      return { digit, shift, shiftedValue: a * digit * Math.pow(10, shift) };
    })
    .sort((x, y) => x.shift - y.shift);

  const sum       = partials.reduce((acc, p) => acc + p.shiftedValue, 0);
  const totalCols = Math.max(String(a).length, String(b).length, String(sum).length);
  return { factor1: a, factor2: b, partials, sum, totalCols };
}

// ── Helpers de celda ─────────────────────────────────────────────────────────

const CELL_W = 36; // px — ancho fijo de cada celda de dígito
const CELL_H = 32; // px

function toCells(value: number, totalCols: number) {
  return String(value).padStart(totalCols, ' ').split('');
}

interface DigitRowProps {
  cells: string[];
  color?: string;
  bold?: boolean;
  animate?: boolean;
}

function DigitRow({ cells, color = '#1e293b', bold = false, animate = false }: DigitRowProps) {
  return (
    <div
      className="flex justify-end"
      style={{
        gap: '2px',
        animation: animate ? 'fadeSlideIn 350ms ease' : undefined,
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            width: CELL_W,
            height: CELL_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            fontSize: 15,
            fontWeight: bold ? 700 : 600,
            color: c === ' ' ? 'transparent' : color,
          }}
        >
          {c === ' ' ? '0' : c}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  factor1: number;
  factor2: number;
  revealedCount?: number;
  activeIndex?: number;
}

export function MultiplicationGrid({ factor1, factor2, revealedCount, activeIndex }: Props) {
  const data     = computeMultiplicationData(factor1, factor2);
  const { partials, sum, totalCols } = data;
  const revealed = revealedCount ?? partials.length;
  const showSum  = revealed >= partials.length && partials.length > 1;

  const headerShifts = Array.from({ length: totalCols }, (_, i) => totalCols - 1 - i);

  // Calcula los acarreos del paso activo para mostrarlos encima del header
  // carryAtShift[s] = valor que llega a la columna s desde la columna s-1
  const carryAtShift: Record<number, number> = {};
  if (activeIndex != null && activeIndex >= 0 && activeIndex < partials.length) {
    const ap = partials[activeIndex];
    const carries = computeCarrySteps(factor1, ap.digit);
    carries.forEach((s, ci) => {
      // El acarreo de la posición ci (dígito local) va a la columna ci+1 del producto.
      // En coordenadas de grid absoluto: columna = ap.shift + ci + 1
      if (s.carryOut > 0) {
        carryAtShift[ap.shift + ci + 1] = s.carryOut;
      }
    });
  }
  const hasCarries = Object.keys(carryAtShift).length > 0;

  // Ancho fijo de la zona de números (para que etiquetas queden siempre fuera)
  const gridWidth = totalCols * CELL_W + (totalCols - 1) * 2;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white p-5">
      {/*
        Layout: 2 columnas CSS grid
          col-1 (fija): área de dígitos — todos los números se alinean entre sí
          col-2 (auto): etiquetas de cada producto parcial — FUERA de la zona de números
      */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${gridWidth}px auto`,
          rowGap: 0,
          alignItems: 'center',
        }}
      >
        {/* ── Fila de acarreos (encima del header, solo cuando hay acarreos activos) ── */}
        {hasCarries && (
          <>
            <div className="flex justify-end" style={{ gap: 2, marginBottom: 2 }}>
              {headerShifts.map((shift, i) => {
                const carry = carryAtShift[shift];
                return (
                  <div
                    key={i}
                    style={{
                      width: CELL_W, height: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {carry != null && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, fontFamily: 'monospace',
                        color: '#ff4d2e',
                        lineHeight: 1,
                      }}>
                        {carry}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div />
          </>
        )}

        {/* ── Encabezado de valor posicional ── */}
        <div className="flex justify-end mb-1" style={{ gap: 2 }}>
          {headerShifts.map((shift, i) => {
            const c = placeColor(shift);
            const carry = carryAtShift[shift];
            return (
              <div
                key={i}
                style={{
                  width: CELL_W,
                  height: 24,
                  backgroundColor: c.bg,
                  color: c.text,
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  // Resalta la columna que recibe acarreo
                  outline: carry != null ? '1.5px solid #ff4d2e80' : 'none',
                  outlineOffset: 1,
                }}
              >
                {placeLabel(shift)}
              </div>
            );
          })}
        </div>
        <div /> {/* etiqueta vacía */}

        {/* ── Multiplicando ── */}
        <DigitRow cells={toCells(factor1, totalCols)} />
        <div />

        {/* ── Multiplicador ── */}
        <div className="flex items-center justify-end" style={{ gap: 2 }}>
          <span style={{ fontSize: 16, color: '#9ca3af', marginRight: 6 }}>×</span>
          <div className="flex justify-end" style={{ gap: 2 }}>
            {toCells(factor2, totalCols).map((c, i) => (
              <div
                key={i}
                style={{
                  width: CELL_W,
                  height: CELL_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                {c === ' ' ? '' : c}
              </div>
            ))}
          </div>
        </div>
        <div />

        {/* ── Separador superior ── */}
        <div
          className="col-span-2"
          style={{ gridColumn: '1 / -1', borderTop: '2px solid #1e293b', margin: '8px 0' }}
        />

        {/* ── Productos parciales ── */}
        {partials.slice(0, revealed).map((p, i) => {
          const isActive  = i === activeIndex;
          const digitColor = isActive ? '#ff4d2e' : '#374151';

          // Separa dígitos reales de los ceros de posición (shift)
          // rawStr = resultado de factor1 × dígito sin desplazamiento
          const rawStr      = String(factor1 * p.digit);
          const leadSpaces  = totalCols - rawStr.length - p.shift; // espacios a la izquierda

          return (
            <>
              {/* Col 1: dígitos — celdas a medida */}
              <div
                key={`num-${i}`}
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 2,
                  borderRadius: 6,
                  outline: isActive ? '2px solid #ff4d2e' : 'none',
                  outlineOffset: 2,
                  animation: isActive ? 'fadeSlideIn 350ms ease' : undefined,
                }}
              >
                {/* Espacios en blanco a la izquierda */}
                {Array.from({ length: Math.max(0, leadSpaces) }).map((_, si) => (
                  <div key={`sp-${si}`} style={{ width: CELL_W, height: CELL_H }} />
                ))}

                {/* Dígitos reales del producto sin shift */}
                {rawStr.split('').map((c, ci) => (
                  <div
                    key={`d-${ci}`}
                    style={{
                      width: CELL_W, height: CELL_H,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'monospace', fontSize: 15,
                      fontWeight: isActive ? 700 : 600,
                      color: digitColor,
                    }}
                  >
                    {c}
                  </div>
                ))}

                {/* Ceros de posición → cuadradito negro */}
                {Array.from({ length: p.shift }).map((_, zi) => (
                  <div
                    key={`z-${zi}`}
                    style={{
                      width: CELL_W, height: CELL_H,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 10, height: 10,
                        backgroundColor: isActive ? '#ff4d2e' : '#1e293b',
                        borderRadius: 2,
                        opacity: isActive ? 0.7 : 0.5,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Col 2: etiqueta + acarreos cuando es el paso activo */}
              <div
                key={`lbl-${i}`}
                style={{
                  paddingLeft: 16,
                  animation: isActive ? 'fadeSlideIn 350ms ease' : undefined,
                }}
              >
                {/* Etiqueta breve siempre visible */}
                <span style={{
                  whiteSpace: 'nowrap', fontSize: 11,
                  color: isActive ? '#ff4d2e' : '#9ca3af',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  ← {factor1} × {p.digit} ({placeFull(p.shift)})
                </span>

                {/* Detalle de acarreos — solo para el paso activo */}
                {isActive && p.digit > 0 && (() => {
                  const carries = computeCarrySteps(factor1, p.digit);
                  // Solo mostramos si hay al menos un acarreo real
                  const hasCarry = carries.some(s => s.carryOut > 0);
                  if (!hasCarry) return null;
                  return (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {carries.map((s, ci) => {
                        if (s.posDigit === -1) return null; // acarreo residual ya incluido
                        const hasCarryIn  = s.carryIn > 0;
                        const hasCarryOut = s.carryOut > 0;
                        return (
                          <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                            {/* Operación */}
                            <span style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace' }}>
                              {s.posDigit} × {p.digit}
                              {hasCarryIn ? ` + ${s.carryIn}` : ''}
                              {' = '}
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.total}</span>
                            </span>
                            {/* Resultado: escribe X */}
                            <span style={{
                              fontSize: 10, color: '#fff',
                              backgroundColor: '#ff4d2e',
                              borderRadius: 3, padding: '1px 5px',
                              fontWeight: 700,
                            }}>
                              ↓{s.written}
                            </span>
                            {/* Acarreo */}
                            {hasCarryOut && (
                              <span style={{
                                fontSize: 10, color: '#fff',
                                backgroundColor: '#1e293b',
                                borderRadius: 3, padding: '1px 5px',
                                fontWeight: 700,
                              }}>
                                lleva {s.carryOut}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          );
        })}

        {/* Placeholder cuando no hay parciales aún */}
        {revealed === 0 && (
          <>
            <div style={{ height: CELL_H, opacity: 0.15 }}>
              <DigitRow cells={toCells(0, totalCols)} />
            </div>
            <div />
          </>
        )}

        {/* ── Separador inferior + suma ── */}
        {showSum && (
          <>
            <div
              style={{ gridColumn: '1 / -1', borderTop: '2px solid #1e293b', margin: '8px 0' }}
            />
            <div style={{ animation: 'fadeSlideIn 350ms ease' }}>
              <DigitRow cells={toCells(sum, totalCols)} color="#ff4d2e" bold />
            </div>
            <div />
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

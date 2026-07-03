// src/components/EquationGrid.tsx
//
// Resolución visual de una ecuación lineal a·X + b = c usando el método de
// TRANSPOSICIÓN DE TÉRMINOS ("lo que suma, pasa restando" y viceversa),
// en vez de la balanza de "operar a ambos lados". El cálculo se hace en
// código — la IA solo aporta los coeficientes enteros.

export interface EquationData {
  a: number;
  b: number;
  c: number;
  x: number;
}

export function computeEquationData(a: number, b: number, c: number): EquationData {
  const x = (c - b) / a;
  return { a, b, c, x };
}

function fmtTerm(a: number): string {
  if (a === 1) return 'X';
  if (a === -1) return '-X';
  return `${a}X`;
}

interface Props {
  a: number;
  b: number;
  c: number;
  /** 0 = ecuación original · 1 = término constante transpuesto · 2 = solución final */
  revealedCount?: number;
}

function EqLine({
  text, color = '#1e293b', bold = false, big = false,
}: { text: string; color?: string; bold?: boolean; big?: boolean }) {
  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: big ? 19 : 15,
        fontWeight: bold ? 700 : 500,
        color,
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}

function TransposeNote({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <div style={{ height: 1, flex: 1, maxWidth: 28, backgroundColor: '#facc15' }} />
      <span
        style={{
          fontSize: 11.5, fontWeight: 700, color: '#92660a',
          backgroundColor: '#fef3c7', padding: '3px 10px', borderRadius: 999,
          whiteSpace: 'nowrap',
        }}
      >
        ↴ {text}
      </span>
      <div style={{ height: 1, flex: 1, maxWidth: 28, backgroundColor: '#facc15' }} />
    </div>
  );
}

export function EquationGrid({ a, b, c, revealedCount }: Props) {
  const { x } = computeEquationData(a, b, c);
  const revealed = revealedCount ?? 2;

  const bAbs = Math.abs(b);
  const isAdd = b >= 0; // b está sumando en el lado izquierdo
  const afterTranspose = c - b; // a·X = afterTranspose

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="space-y-1.5">
        {/* ── Ecuación original ── */}
        <EqLine text={`${fmtTerm(a)} ${isAdd ? '+' : '-'} ${bAbs} = ${c}`} />

        {/* ── Paso 1: transponer el término constante ── */}
        {revealed >= 1 && (
          <div style={{ animation: 'fadeSlideIn 350ms ease' }}>
            <TransposeNote text={`el ${bAbs} pasa ${isAdd ? 'restando' : 'sumando'} al otro lado`} />
            <EqLine text={`${fmtTerm(a)} = ${c} ${isAdd ? '-' : '+'} ${bAbs}`} />
            <EqLine text={`${fmtTerm(a)} = ${afterTranspose}`} bold color="#1e293b" />
          </div>
        )}

        {/* ── Paso 2: transponer el coeficiente (división) ── */}
        {revealed >= 2 && (
          <div style={{ animation: 'fadeSlideIn 350ms ease' }}>
            {a !== 1 && a !== -1 ? (
              <>
                <TransposeNote text={`el ${a} pasa dividiendo al otro lado`} />
                <EqLine text={`X = ${afterTranspose} / ${a}`} />
              </>
            ) : a === -1 ? (
              <TransposeNote text="multiplicamos ambos lados por -1" />
            ) : null}
            <EqLine text={`X = ${x}`} bold big color="#ff4d2e" />
          </div>
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

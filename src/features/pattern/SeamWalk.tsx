import type { SeamResult } from '../../lib/pattern/validate';
import type { Piece } from '../../lib/pattern/types';
import { edgeLength } from '../../lib/pattern/outline';
import { formatLength, Unit } from '../../lib/units';

interface Mark {
  at: number;
  count: number;
  label?: string;
}

function sideInfo(pieces: Piece[], side: SeamResult['relation']['a']) {
  const parts: { name: string; from: number; to: number }[] = [];
  const marks: Mark[] = [];
  let acc = 0;
  for (const s of side) {
    const p = pieces.find((x) => x.id === s.pieceId);
    if (!p) continue;
    for (const id of s.edgeIds) {
      const e = p.edges.find((x) => x.id === id);
      if (!e) continue;
      const L = edgeLength(p, e);
      for (let k = 0; k < (s.factor ?? 1); k++) {
        parts.push({ name: `${p.name} · ${e.label}`, from: acc, to: acc + L });
        for (const n of p.notches.filter((x) => x.edgeId === id)) marks.push({ at: acc + n.s, count: n.count, label: n.label });
        acc += L;
      }
    }
  }
  return { parts, marks, total: acc };
}

/** Las dos orillas de una costura, extendidas en línea recta y a la misma escala. */
export function SeamWalk({ result, pieces, unit }: { result: SeamResult; pieces: Piece[]; unit: Unit }) {
  const A = sideInfo(pieces, result.relation.a);
  const B = sideInfo(pieces, result.relation.b);
  const max = Math.max(A.total, B.total);
  const W = 1000;
  const k = (W - 40) / max;
  const bar = (info: ReturnType<typeof sideInfo>, y: number, color: string, label: string) => (
    <g>
      <text x={20} y={y - 16} fontSize={22} fill="var(--ink-2)" fontWeight={600}>{label} · {formatLength(info.total, unit, { decimals: unit === 'cm' ? 2 : 3 })}</text>
      {info.parts.map((p, i) => (
        <g key={i}>
          <rect x={20 + p.from * k} y={y} width={Math.max(1, (p.to - p.from) * k)} height={18} fill={color} opacity={i % 2 ? 0.75 : 1} rx={3} />
        </g>
      ))}
      {info.marks.map((m, i) =>
        Array.from({ length: m.count }).map((_, j) => <line key={`${i}-${j}`} x1={20 + m.at * k + (j - (m.count - 1) / 2) * 6} x2={20 + m.at * k + (j - (m.count - 1) / 2) * 6} y1={y - 6} y2={y + 24} stroke="var(--ink)" strokeWidth={3} />)
      )}
    </g>
  );
  const ratio = result.ratio;
  const stretch = result.relation.kind !== 'igual';
  return (
    <div className="stack">
      <svg viewBox={`0 0 ${W} 210`} style={{ width: '100%', background: 'var(--canvas)', borderRadius: 12, border: '1px solid var(--line)' }} role="img" aria-label="Costura desenrollada">
        {bar(A, 50, '#24584a', 'Lado A')}
        {bar(B, 150, '#3f6fa0', 'Lado B')}
        {stretch &&
          Array.from({ length: 9 }).map((_, i) => {
            const t = (i + 1) / 10;
            return <line key={i} x1={20 + A.total * t * k} y1={70} x2={20 + B.total * t * k} y2={150} stroke="var(--tape)" strokeWidth={2} strokeDasharray="4 4" />;
          })}
        {!stretch && Math.abs(A.total - B.total) > 0.05 && <rect x={20 + Math.min(A.total, B.total) * k} y={40} width={Math.abs(A.total - B.total) * k} height={140} fill="var(--thread)" opacity={0.15} />}
      </svg>
      <div className="small">
        {stretch ? (
          <>Relación A/B: <span className="measure">{ratio.toFixed(2)}</span> (admitido {result.relation.ratioMin}–{result.relation.ratioMax}). Las líneas amarillas muestran cómo se reparte el {result.relation.kind === 'estirado' ? 'estiramiento' : result.relation.kind === 'fruncido' ? 'frunce' : 'embebido'} a lo largo de la costura.</>
        ) : (
          <>Diferencia: <span className="measure">{formatLength(Math.abs(A.total - B.total), unit, { decimals: unit === 'cm' ? 2 : 3 })}</span> (tolerancia {formatLength(result.relation.tolerance ?? 0, unit)}). Los piquetes deben quedar enfrentados.</>
        )}
      </div>
      <ul className="tiny muted" style={{ margin: 0, paddingLeft: 16 }}>
        {[...A.parts.map((p) => `A: ${p.name}`), ...B.parts.map((p) => `B: ${p.name}`)].map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}

import { memo } from 'react';
import type { Piece } from '../../lib/pattern/types';
import type { CutOutline } from '../../lib/pattern/offset';
import { edgeSvgPath, orientation, outwardNormal, pieceSeamPath, pointOnEdge, polylinePath } from '../../lib/pattern/outline';
import { add, mul, norm, sub } from '../../lib/geom/vec';

export interface PieceStyle {
  selected?: boolean;
  dim?: boolean;
  badEdges?: Set<string>;
  hiEdgesA?: Set<string>;
  hiEdgesB?: Set<string>;
  showAllowance?: boolean;
  fill?: string;
}

/** Dibuja una pieza en coordenadas locales (mm). */
export const PieceSvg = memo(function PieceSvg({ piece, cut, style }: { piece: Piece; cut?: CutOutline; style: PieceStyle }) {
  const o = orientation(piece);
  const gA = piece.grain.a;
  const gB = piece.grain.b;
  const gd = norm(sub(gB, gA));
  const gAngle = (Math.atan2(gd.y, gd.x) * 180) / Math.PI;
  const mid = { x: (gA.x + gB.x) / 2, y: (gA.y + gB.y) / 2 };
  const side = { x: -gd.y, y: gd.x };
  const textAngle = gAngle > 90 || gAngle < -90 ? gAngle + 180 : gAngle;
  const label = add(mid, mul(side, 18));
  const ink = style.selected ? 'var(--mat)' : 'var(--ink)';
  const arrow = (tip: { x: number; y: number }, d: { x: number; y: number }) => {
    const b = sub(tip, mul(d, 7));
    const p = { x: -d.y, y: d.x };
    return `M${tip.x} ${tip.y} L${b.x + p.x * 2.6} ${b.y + p.y * 2.6} L${b.x - p.x * 2.6} ${b.y - p.y * 2.6} Z`;
  };
  return (
    <g opacity={style.dim ? 0.45 : 1}>
      {cut && style.showAllowance !== false && <path d={polylinePath(cut.points)} fill={style.fill ?? 'var(--surface)'} stroke={ink} strokeWidth={style.selected ? 2 : 1.3} vectorEffect="non-scaling-stroke" />}
      {(!cut || style.showAllowance === false) && <path d={pieceSeamPath(piece)} fill={style.fill ?? 'var(--surface)'} stroke="none" />}
      {piece.edges.map((e) => {
        const fold = e.finish === 'doblez' || e.finish === 'dobladillo' || e.finish === 'jareta';
        const bad = style.badEdges?.has(e.id);
        const a = style.hiEdgesA?.has(e.id);
        const b = style.hiEdgesB?.has(e.id);
        return (
          <path
            key={e.id}
            d={edgeSvgPath(piece, e)}
            fill="none"
            stroke={a ? 'var(--mat)' : b ? '#3f6fa0' : bad ? 'var(--thread)' : ink}
            strokeWidth={a || b ? 3.2 : bad ? 2.2 : 1}
            strokeDasharray={fold ? '9 3 2 3' : e.allowance > 0 ? '5 3.5' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {piece.lines.map((l) => (
        <line
          key={l.id}
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
          stroke={l.kind === 'referencia' ? 'var(--ink-3)' : 'var(--ink-2)'}
          strokeWidth={l.kind === 'referencia' ? 0.7 : 1}
          strokeDasharray={l.kind === 'pespunte' ? '1 3' : l.kind === 'doblez' ? '9 3 2 3' : l.kind === 'colocacion' ? '6 3' : undefined}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {piece.notches.map((n) => {
        const e = piece.edges.find((x) => x.id === n.edgeId);
        if (!e) return null;
        const at = pointOnEdge(piece, e, n.s);
        const nr = outwardNormal(at.tangent, o);
        const offs = n.count === 2 ? [-2, 2] : [0];
        return offs.map((k) => {
          const base = add(at.p, mul(at.tangent, k));
          const outer = add(base, mul(nr, e.allowance));
          const inner = add(outer, mul(nr, -Math.max(4, Math.min(6, e.allowance || 5))));
          return <line key={`${n.id}${k}`} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={ink} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />;
        });
      })}
      <line x1={gA.x} y1={gA.y} x2={gB.x} y2={gB.y} stroke={ink} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      <path d={arrow(gB, gd)} fill={ink} />
      <path d={arrow(gA, mul(gd, -1))} fill={ink} />
      <text x={label.x} y={label.y} fontSize={Math.max(10, Math.min(30, Math.hypot(gB.x - gA.x, gB.y - gA.y) / 22))} fontWeight={600} textAnchor="middle" fill={ink} transform={`rotate(${textAngle} ${label.x} ${label.y})`} style={{ fontFamily: 'var(--sans)' }}>
        {piece.name}
      </text>
      <text x={label.x + side.x * 14} y={label.y + side.y * 14} fontSize={8} textAnchor="middle" fill="var(--ink-2)" transform={`rotate(${textAngle} ${label.x + side.x * 14} ${label.y + side.y * 14})`} style={{ fontFamily: 'var(--sans)' }}>
        {piece.cut.onFold ? `Cortar ${piece.cut.qty} al doblez` : `Cortar ${piece.cut.qty}${piece.cut.mirrorPairs ? ' en par' : ''}`}
      </text>
    </g>
  );
});

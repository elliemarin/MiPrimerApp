import { useMemo } from 'react';
import { buildPattern, PatternState } from '../../lib/pattern/engine';
import { pieceSeamPath } from '../../lib/pattern/outline';
import type { Piece } from '../../lib/pattern/types';
import type { Mat } from '../../lib/geom/vec';
import { findSize } from '../../lib/sizes/tables';
import { useApp } from '../../store/app';

const COLORS = ['#3f6fa0', '#b07d00', '#8a4fa3', '#b4273a', '#2f7a63'];

/** Contornos superpuestos (versiones guardadas o tallas) para comparar. */
export function OverlaySvg({ state, pieces, matOf }: { state: PatternState; pieces: Piece[]; matOf: (id: string) => Mat }) {
  const projects = useApp((s) => s.projects);
  const overlays = state.overlays ?? [];
  const built = useMemo(
    () =>
      overlays.map((o) => {
        let s: PatternState | undefined;
        if (o.type === 'talla') {
          const row = findSize(o.tableId, o.code);
          if (row) s = { ...state, body: row.values, overrides: {}, overlays: [] };
        } else {
          for (const p of Object.values(projects)) {
            const v = p.patternVersions.find((x) => x.id === o.versionId);
            if (v) s = v.data;
          }
        }
        return { o, b: s ? buildPattern(s) : null };
      }),
    [overlays, state, projects]
  );
  if (!overlays.length) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {built.map(({ o, b }, i) =>
        b?.pieces.map((p) => {
          if (!pieces.some((x) => x.id === p.id)) return null;
          // Alinear por el primer nodo con la pieza actual para comparar formas.
          const cur = pieces.find((x) => x.id === p.id)!;
          const a0 = cur.nodes[0];
          const b0 = p.nodes.find((n) => n.id === a0.id) ?? p.nodes[0];
          return (
            <g key={`${o.id}-${p.id}`} transform={`matrix(${matOf(p.id).join(' ')}) translate(${a0.x - b0.x} ${a0.y - b0.y})`}>
              <path d={pieceSeamPath(p)} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={1.4} strokeDasharray="6 3" vectorEffect="non-scaling-stroke" opacity={0.9} />
            </g>
          );
        })
      )}
    </g>
  );
}

export const OVERLAY_COLORS = COLORS;

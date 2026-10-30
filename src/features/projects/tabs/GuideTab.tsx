import { useMemo } from 'react';
import { useApp } from '../../../store/app';
import type { Project } from '../../../store/types';
import { Empty } from '../../../ui/components';
import { buildPattern } from '../../../lib/pattern/engine';
import { computeCutouts, appliqueSteps } from '../../studio/despiece';
import { pieceSeamPath } from '../../../lib/pattern/outline';
import { bboxOf } from '../../../lib/geom/vec';
import type { Piece } from '../../../lib/pattern/types';

function PieceThumb({ piece }: { piece: Piece }) {
  const b = bboxOf(piece.nodes.map((n) => ({ x: n.x, y: n.y })));
  const pad = 20;
  return (
    <svg viewBox={`${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + 2 * pad} ${b.maxY - b.minY + 2 * pad}`} style={{ width: 64, height: 76, background: 'var(--canvas)', borderRadius: 8, border: '1px solid var(--line)' }} role="img" aria-label={piece.name}>
      <path d={pieceSeamPath(piece)} fill="#fff" stroke="#1d2420" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function GuideTab({ project }: { project: Project }) {
  const updateProject = useApp((s) => s.updateProject);
  const fabrics = useApp((s) => s.fabrics);
  const unit = useApp((s) => s.settings.unit);
  const built = useMemo(() => (project.pattern ? buildPattern(project.pattern) : null), [project.pattern]);
  const cutouts = useMemo(() => (project.design ? computeCutouts(project.design, fabrics, unit) : []), [project.design, fabrics, unit]);
  const steps = [...(built?.result?.steps ?? []).map((s) => ({ ...s, kind: 'patron' as const })), ...appliqueSteps(cutouts).map((s) => ({ ...s, pieces: [] as string[], kind: 'aplicacion' as const }))];
  if (!steps.length) return <Empty icon="check" title="La guía se genera sola" body="Aparece al crear un patrón o al asignar técnicas de recorte en el estudio, y nombra las piezas reales del proyecto." />;
  const done = steps.filter((s) => project.guide.checks[s.id]).length;
  const setCheck = (id: string, v: boolean) => updateProject(project.id, (p) => ({ ...p, guide: { ...p.guide, checks: { ...p.guide.checks, [id]: v } } }), v ? 'Paso completado.' : undefined);
  const setNote = (id: string, v: string) => updateProject(project.id, (p) => ({ ...p, guide: { ...p.guide, notes: { ...p.guide.notes, [id]: v } } }));
  return (
    <div className="stack-lg" style={{ maxWidth: 820 }}>
      <div className="spread">
        <p className="muted small">{done} de {steps.length} pasos completados. La guía corresponde a las piezas y recortes actuales del proyecto.</p>
        <div style={{ width: 140, height: 8, borderRadius: 99, background: 'var(--sunken)', overflow: 'hidden' }}>
          <div style={{ width: `${(done / steps.length) * 100}%`, height: '100%', background: 'var(--mat)' }} />
        </div>
      </div>
      <ol className="steps" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {steps.map((s, i) => {
          const checked = !!project.guide.checks[s.id];
          const pieces = (s.pieces ?? []).map((id) => built?.pieces.find((p) => p.id === id)).filter(Boolean) as Piece[];
          return (
            <li key={s.id} className={`step${checked ? ' done' : ''}`}>
              <label className="n" style={{ cursor: 'pointer' }}>
                <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => setCheck(s.id, e.target.checked)} />
                {checked ? '✓' : i + 1}
              </label>
              <div className="grow stack" style={{ gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div className="small muted">{s.detail}</div>
                </div>
                {pieces.length > 0 && (
                  <div className="row-wrap">
                    {pieces.map((p) => (
                      <figure key={p.id} style={{ margin: 0, textAlign: 'center' }}>
                        <PieceThumb piece={p} />
                        <figcaption className="tiny muted">{p.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                <input className="input" style={{ minHeight: 38, fontSize: 15 }} placeholder="Nota para este paso" value={project.guide.notes[s.id] ?? ''} onChange={(e) => setNote(s.id, e.target.value)} />
                <label className="row small" style={{ gap: 8 }}>
                  <input type="checkbox" checked={checked} onChange={(e) => setCheck(s.id, e.target.checked)} /> Hecho y verificado
                </label>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

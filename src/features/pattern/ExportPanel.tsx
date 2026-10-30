import { useMemo, useState } from 'react';
import { useApp } from '../../store/app';
import type { BuiltPattern, PatternState } from '../../lib/pattern/engine';
import { layoutMatrix } from '../../lib/pattern/engine';
import { pieceDrawable, Drawable } from '../../lib/draw/drawable';
import { arrangeForTiles, exportTiledPdf, tilesWithContent, unionBBox } from '../../lib/pdf/export';
import { computeGrid, contentBox, TileSettings, validateTileSettings } from '../../lib/pdf/tile';
import { Button, Field, LengthInput, Notice, Segmented, Switch } from '../../ui/components';
import { bboxOf, Pt } from '../../lib/geom/vec';
import { cmdsToSvg } from '../../lib/draw/paths';
import type { Project } from '../../store/types';
import { exportRecord, freezeDeps, depsLines } from '../../store/exports';
import { saveBlob, canShareFiles } from '../../lib/download';
import { slugify } from '../../lib/ids';
import { formatLength } from '../../lib/units';
import { piecesSvg } from '../../lib/draw/svgExport';

export function piecesToDrawables(built: BuiltPattern, state: PatternState, ids: string[], subtitle: string, version: string, useCanvas: boolean): Drawable[] {
  return built.pieces
    .filter((p) => ids.includes(p.id))
    .map((p) => {
      const c = built.cuts.get(p.id)!;
      const b = bboxOf(c.points);
      const pivot: Pt = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const lay = state.layout[p.id];
      const m = useCanvas ? layoutMatrix(lay, pivot) : layoutMatrix(lay ? { x: 0, y: 0, rot: lay.rot, mirror: lay.mirror } : undefined, pivot);
      return pieceDrawable(p, c, m, { subtitle, version });
    });
}

export function ExportPanel({ project, state, built }: { project: Project; state: PatternState; built: BuiltPattern | null }) {
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const profiles = useApp((s) => s.profiles);
  const updateProject = useApp((s) => s.updateProject);
  const addFile = useApp((s) => s.addFile);
  const toast = useApp((s) => s.toast);
  const unit = settings.unit;
  const tile: TileSettings = { ...settings.tile, footer: 13 };
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [useCanvas, setUseCanvas] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const all = (built?.pieces ?? []).filter((p) => !state.hidden.includes(p.id));
  const ids = selectedIds ?? all.filter((p) => !state.noExport?.includes(p.id)).map((p) => p.id);
  const errors = built?.issues.filter((i) => i.level === 'error') ?? [];
  const settingErrors = validateTileSettings(tile);
  const prof = state.measurementRef ? profiles[state.measurementRef.profileId] : undefined;
  const mv = prof?.versions.find((v) => v.id === state.measurementRef?.versionId);
  const subtitle = prof ? `${prof.name} · medidas v${mv?.n ?? '?'}` : project.name;

  const drawables = useMemo(() => {
    if (!built || !ids.length) return [];
    const ds = piecesToDrawables(built, state, ids, subtitle, '', useCanvas);
    return useCanvas ? ds : arrangeForTiles(ds, tile);
  }, [built, state, ids.join(','), useCanvas, tile.margin, tile.overlap, tile.orientation, subtitle]); // eslint-disable-line react-hooks/exhaustive-deps
  const grid = drawables.length ? computeGrid(unionBBox(drawables), tile) : null;
  const withContent = grid ? tilesWithContent(grid, drawables) : new Set<string>();
  const pages = [...withContent].filter((c) => !excluded.includes(c));

  const panelBlocked = built?.issues.some(issue=>issue.level==='error'&&/^(panel-|component-)/.test(issue.code)) ?? false;
  const doExport = async (share: boolean) => {
    if(panelBlocked) return;
    if (!built) return;
    setBusy(true);
    try {
      const { project: frozen, deps } = freezeDeps(project, profiles, { pattern: true });
      const version = `patrón v${deps.pattern?.n}`;
      const ds = piecesToDrawables(built, state, ids, subtitle, version, useCanvas);
      const arranged = useCanvas ? ds : arrangeForTiles(ds, tile);
      const info = {
        title: project.name,
        lines: [...depsLines(frozen, deps), `Hojas: carta 215.9 × 279.4 mm, ${tile.orientation}; margen ${tile.margin} mm; solapamiento ${tile.overlap} mm`, `Piezas: ${built.pieces.filter((p) => ids.includes(p.id)).map((p) => p.name).join(', ')}`],
        footer: `${project.name.slice(0, 28)} · ${version}`,
        json: { proyecto: project.name, proyectoId: project.id, dependencias: deps, configuracion: tile, piezas: ids, hojas: pages, fecha: new Date().toISOString() }
      };
      const res = await exportTiledPdf(arranged, { settings: tile, pages }, info);
      const blob = new Blob([res.bytes], { type: 'application/pdf' });
      const fileName = `${slugify(project.name)}-patron-v${deps.pattern?.n}.pdf`;
      const fileId = await addFile(blob, fileName);
      const rec = exportRecord('pdf-patron', fileId, fileName, { ...tile, piezas: ids, hojas: res.pages }, deps);
      updateProject(project.id, () => ({ ...frozen, exports: [...frozen.exports, rec], status: frozen.status === 'patronaje' ? 'corte' : frozen.status }), `PDF de patrón exportado (${res.pages.length} hojas, ${version}).`);
      await saveBlob(blob, fileName, share);
      toast(`PDF listo: ${res.pages.length + 1} páginas.`, 'ok');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo generar el PDF.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportSvg = async () => {
    if (!built || panelBlocked) return;
    const { project: frozen, deps } = freezeDeps(project, profiles, { pattern: true });
    const ds = piecesToDrawables(built, state, ids, subtitle, `patrón v${deps.pattern?.n}`, true);
    const svg = piecesSvg(ds, `${project.name} · patrón v${deps.pattern?.n}`);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const fileName = `${slugify(project.name)}-patron-v${deps.pattern?.n}.svg`;
    const fileId = await addFile(blob, fileName);
    updateProject(project.id, () => ({ ...frozen, exports: [...frozen.exports, exportRecord('svg-diseno', fileId, fileName, { escala: '1:1 en mm' }, deps)] }), 'SVG del patrón exportado.');
    await saveBlob(blob, fileName);
  };

  if (!built || !all.length) return <p className="muted">No hay piezas para exportar.</p>;
  const c = contentBox(tile);
  return (
    <div className="stack-lg">
      <a className="btn" href={`#/confeccion/${project.id}`}>PDF con piezas, materiales e instrucciones</a>
      {panelBlocked&&<Notice tone="err">Los paneles o complementos necesitan revisión. Corrige los cortes en el estudio o las medidas en Personalizar antes de exportar. Revisa los detalles en Revisión.</Notice>}
      {!panelBlocked&&errors.length > 0 && <Notice tone="err">El patrón tiene {errors.length} errores de geometría. Puedes exportar, pero revisa la pestaña Revisión primero.</Notice>}
      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Piezas</h3>
        <div className="group">
          {all.map((p) => (
            <label key={p.id} className="list-row" style={{ minHeight: 48 }}>
              <input type="checkbox" checked={ids.includes(p.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...ids, p.id] : ids.filter((x) => x !== p.id))} />
              <span className="grow">{p.name}</span>
              <span className="small muted">{p.cut.onFold ? `${p.cut.qty} al doblez` : `×${p.cut.qty}`}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Hoja carta (215.9 × 279.4 mm)</h3>
        <Segmented value={tile.orientation} onChange={(o) => setSettings((s) => ({ ...s, tile: { ...s.tile, orientation: o } }))} options={[{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }]} />
        <div className="grid-2">
          <Field label="Margen no imprimible" hint="Por lado">
            <LengthInput mm={tile.margin} min={0} max={40} onChange={(v) => v !== undefined && setSettings((s) => ({ ...s, tile: { ...s.tile, margin: v } }))} />
          </Field>
          <Field label="Solapamiento" hint="Zona para pegar">
            <LengthInput mm={tile.overlap} min={0} max={50} onChange={(v) => v !== undefined && setSettings((s) => ({ ...s, tile: { ...s.tile, overlap: v } }))} />
          </Field>
        </div>
        <p className="tiny faint">Área útil por hoja: {formatLength(c.w, unit)} × {formatLength(c.h, unit)} (el pie de 13 mm lleva código, barra de 10 cm e instrucciones).</p>
        <Switch label="Usar la colocación del lienzo" checked={useCanvas} onChange={setUseCanvas} />
        {settingErrors.map((e) => <Notice key={e} tone="err">{e}</Notice>)}
      </section>
      {grid && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Vista previa · {pages.length} hojas + portada</h3>
          <PagePreview drawables={drawables} grid={grid} withContent={withContent} excluded={excluded} toggle={(code) => setExcluded(excluded.includes(code) ? excluded.filter((x) => x !== code) : [...excluded, code])} />
          <p className="tiny faint">Toca una hoja para excluirla o incluirla. Las hojas vacías no se imprimen.</p>
        </section>
      )}
      <div className="stack">
        <Button variant="primary" icon="pdf" block disabled={panelBlocked || busy || !ids.length || settingErrors.length > 0 || !pages.length} onClick={() => void doExport(false)}>
          {busy ? 'Generando…' : 'Descargar PDF a escala real'}
        </Button>
        {canShareFiles() && (
          <Button icon="share" block disabled={panelBlocked || busy || !pages.length} onClick={() => void doExport(true)}>
            Compartir o guardar en Archivos
          </Button>
        )}
        <Button variant="ghost" icon="download" disabled={panelBlocked} onClick={() => void exportSvg()}>Exportar SVG 1:1 (mm)</Button>
        <p className="tiny faint">Cada exportación queda registrada con la versión exacta de medidas y patrón. Imprime al 100 % y mide el cuadrado de 5 × 5 cm.</p>
      </div>
    </div>
  );
}

function PagePreview({ drawables, grid, withContent, excluded, toggle }: { drawables: Drawable[]; grid: ReturnType<typeof computeGrid>; withContent: Set<string>; excluded: string[]; toggle: (code: string) => void }) {
  const W = grid.cols * grid.stepX + (grid.content.w - grid.stepX);
  const H = grid.rows * grid.stepY + (grid.content.h - grid.stepY);
  const t0 = grid.tiles[0];
  return (
    <svg viewBox={`${t0.x - 5} ${t0.y - 5} ${W + 10} ${H + 10}`} style={{ width: '100%', maxHeight: 360, background: 'var(--canvas)', borderRadius: 12, border: '1px solid var(--line)' }}>
      {drawables.map((d) => d.paths.filter((p) => p.style === 'corte').map((p, i) => <path key={`${d.id}${i}`} d={cmdsToSvg(p.cmds)} fill="none" stroke="#1d2420" strokeWidth={W / 300} />))}
      {grid.tiles.map((t) => {
        const has = withContent.has(t.code);
        const ex = excluded.includes(t.code);
        return (
          <g key={t.code} onClick={() => has && toggle(t.code)} style={{ cursor: has ? 'pointer' : 'default' }}>
            <rect x={t.x} y={t.y} width={grid.content.w} height={grid.content.h} fill={!has ? 'rgba(0,0,0,0.04)' : ex ? 'rgba(180,39,58,0.12)' : 'rgba(36,88,74,0.06)'} stroke={has && !ex ? '#24584a' : '#b9bfb8'} strokeWidth={W / 400} strokeDasharray={has ? undefined : `${W / 120} ${W / 120}`} />
            <text x={t.x + grid.content.w / 2} y={t.y + grid.content.h / 2} fontSize={Math.min(grid.content.w, grid.content.h) / 5} textAnchor="middle" dominantBaseline="middle" fill={has ? (ex ? '#b4273a' : '#24584a') : '#a3aaa4'} fontWeight={700} style={{ fontFamily: 'var(--sans)' }}>
              {t.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

import { useMemo, useState } from 'react';
import { useApp } from '../../../store/app';
import type { Project } from '../../../store/types';
import { Button, Chip, Empty, Field, Notice, Select, LengthInput } from '../../../ui/components';
import { computeCutouts, cutoutDrawables, embroideryDrawables, materialSummary } from '../../studio/despiece';
import { exportPackedPdf, exportTiledPdf, arrangeForTiles } from '../../../lib/pdf/export';
import { piecesSvg } from '../../../lib/draw/svgExport';
import { saveBlob } from '../../../lib/download';
import { slugify } from '../../../lib/ids';
import { depsLines, exportRecord, freezeDeps } from '../../../store/exports';
import { formatLength } from '../../../lib/units';
import { HOOPS, planStitches, writeDst } from '../../../lib/dst';
import { cmdsToPolylines } from '../../../lib/draw/flatten';
import { navigate } from '../../../ui/router';
import { buildPattern } from '../../../lib/pattern/engine';
import { BACKING_LABEL } from '../../studio/model';
import type { Pt } from '../../../lib/geom/vec';

const polyD = (polys: Pt[][]) => polys.map((p) => 'M' + p.map((q) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(' L') + ' Z').join(' ');

export function CutoutsTab({ project }: { project: Project }) {
  const s = useApp();
  const unit = s.settings.unit;
  const [busy, setBusy] = useState(false);
  const [hoop, setHoop] = useState('130x180');
  const [stitchLen, setStitchLen] = useState<number | undefined>(2.5);
  const cutouts = useMemo(() => (project.design ? computeCutouts(project.design, s.fabrics, unit) : []), [project.design, s.fabrics, unit]);
  const embroidery = useMemo(() => (project.design ? embroideryDrawables(project.design) : []), [project.design]);
  const built = useMemo(() => (project.pattern ? buildPattern(project.pattern) : null), [project.pattern]);
  if (!project.design && !built) return <Empty icon="scissors" title="Aún no hay nada que despiezar" body="Diseña en el estudio o crea un patrón para obtener piezas, recortes y plantillas." action={<Button onClick={() => navigate(`/estudio/${project.id}`)}>Abrir el estudio</Button>} />;

  const record = async (kind: 'pdf-plantillas' | 'svg-bordado' | 'dst-bordado', blob: Blob, fileName: string, settings: unknown) => {
    const { project: frozen, deps } = freezeDeps(project, s.profiles, { design: true });
    const fileId = await s.addFile(blob, fileName);
    s.updateProject(project.id, () => ({ ...frozen, exports: [...frozen.exports, exportRecord(kind, fileId, fileName, settings, deps)] }), `Exportado: ${fileName}.`);
    await saveBlob(blob, fileName);
    return deps;
  };

  const templatesPdf = async () => {
    setBusy(true);
    try {
      const { project: frozen, deps } = freezeDeps(project, s.profiles, { design: true });
      const version = `diseño v${deps.design?.n}`;
      const ds = cutoutDrawables(cutouts, unit, version);
      const tile = { ...s.settings.tile, footer: 13 };
      const info = {
        title: `${project.name} · plantillas`,
        lines: [...depsLines(frozen, deps), 'Línea continua: corte. Discontinua: tamaño final. El margen se indica en cada plantilla.', 'Bases termoadhesivas en espejo: trázalas sobre el papel de la entretela.'],
        footer: `${project.name.slice(0, 24)} · ${version}`,
        json: { proyecto: project.id, dependencias: deps, recortes: cutouts.map((c) => ({ id: c.elementId, nombre: c.name, margen: c.allowance, tela: c.fabricName })) }
      };
      const packed = await exportPackedPdf(ds, tile, info);
      const outputs: { blob: Blob; name: string; settings: unknown }[] = [{ blob: new Blob([packed.bytes], { type: 'application/pdf' }), name: `${slugify(project.name)}-plantillas-v${deps.design?.n}.pdf`, settings: { hojas: packed.sheets, colocaciones: packed.placements } }];
      if (packed.tooBig.length) {
        // Las plantillas que no caben en una hoja salen en mosaico, a la misma escala.
        const big = ds.filter((d) => packed.tooBig.includes(d.id));
        const tiled = await exportTiledPdf(arrangeForTiles(big, tile), { settings: tile }, { ...info, title: `${project.name} · plantillas grandes` });
        outputs.push({ blob: new Blob([tiled.bytes], { type: 'application/pdf' }), name: `${slugify(project.name)}-plantillas-grandes-v${deps.design?.n}.pdf`, settings: { mosaico: tiled.pages } });
      }
      const records: ReturnType<typeof exportRecord>[] = [];
      for (const o of outputs) records.push(exportRecord('pdf-plantillas', await s.addFile(o.blob, o.name), o.name, o.settings, deps));
      s.updateProject(project.id, () => ({ ...frozen, exports: [...frozen.exports, ...records] }), `Plantillas exportadas (${packed.sheets} hojas${packed.tooBig.length ? ' y un mosaico para las grandes' : ''}).`);
      for (const o of outputs) await saveBlob(o.blob, o.name);
    } catch (e) {
      s.toast(e instanceof Error ? e.message : 'No se pudo exportar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const embroiderySvg = async () => {
    const svg = piecesSvg(embroidery, `${project.name} · dibujo de bordado`);
    await record('svg-bordado', new Blob([svg], { type: 'image/svg+xml' }), `${slugify(project.name)}-dibujo-bordado.svg`, { nota: 'Dibujo vectorial 1:1; no es un archivo de puntadas.' });
  };

  const runs = embroidery.flatMap((d) => d.paths.flatMap((p) => cmdsToPolylines(p.cmds, 0.2).map((pl) => ({ color: project.design!.elements.find((e) => `bord-${e.id}` === d.id)?.stroke?.color ?? '#000', pts: pl.closed ? [...pl.pts, pl.pts[0]] : pl.pts }))));
  const plan = runs.length && stitchLen ? planStitches(runs, stitchLen) : null;
  const hoopDef = HOOPS.find((h) => h.id === hoop)!;
  const sizeW = plan ? (plan.extents.maxX - plan.extents.minX) / 10 : 0;
  const sizeH = plan ? (plan.extents.maxY - plan.extents.minY) / 10 : 0;
  const fits = sizeW <= hoopDef.w - 10 && sizeH <= hoopDef.h - 10;
  const stitchCount = plan?.stitches.filter((x) => x.kind === 'puntada').length ?? 0;

  return (
    <div className="stack-lg">
      {built && built.pieces.length > 0 && (
        <section className="stack">
          <h2 className="section-title" style={{ margin: 0 }}>Piezas de la prenda</h2>
          <div className="group">
            {built.pieces.map((p) => (
              <div key={p.id} className="list-row">
                <span className="grow">
                  <span className="t small" style={{ display: 'block' }}>{p.name}</span>
                  <span className="s tiny">{p.cut.onFold ? `${p.cut.qty} al doblez` : `Cortar ${p.cut.qty}${p.cut.mirrorPairs ? ' en par simétrico' : ''}`} · hilo según la flecha · {p.cut.fabric}</span>
                </span>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" icon="pdf" onClick={() => navigate(`/patronaje/${project.id}`)}>Exportar el patrón en carta desde el editor</Button>
        </section>
      )}

      <section className="stack">
        <div className="spread">
          <h2 className="section-title" style={{ margin: 0 }}>Recortes de aplicaciones y collage ({cutouts.length})</h2>
          <Button variant="primary" icon="pdf" onClick={() => void templatesPdf()} disabled={busy || !cutouts.length}>{busy ? 'Generando…' : 'Plantillas en carta'}</Button>
        </div>
        {cutouts.length === 0 ? (
          <Notice>Asigna a tus elementos una técnica de recorte (aplicación, parche, collage, patchwork o vinil) para obtener sus plantillas.</Notice>
        ) : (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {cutouts.map((c) => {
              const all = [...c.cutPolys, ...c.finalPolys].flat();
              const minX = Math.min(...all.map((p) => p.x));
              const minY = Math.min(...all.map((p) => p.y));
              const maxX = Math.max(...all.map((p) => p.x));
              const maxY = Math.max(...all.map((p) => p.y));
              const pad = Math.max(maxX - minX, maxY - minY) * 0.08;
              return (
                <div key={c.id} className="panel" style={{ overflow: 'hidden' }}>
                  <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`} style={{ width: '100%', height: 150, background: 'var(--canvas)', display: 'block' }}>
                    <path d={polyD(c.cutPolys)} fill={c.color ?? '#ddd'} fillOpacity={0.35} stroke="#1d2420" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                    {c.allowance > 0 && <path d={polyD(c.finalPolys)} fill="none" stroke="#1d2420" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
                  </svg>
                  <div className="panel-pad stack" style={{ gap: 6 }}>
                    <div className="spread">
                      <strong className="small">{c.order}. {c.name}</strong>
                      <span className="measure tiny">{formatLength(c.widthMm, unit)} × {formatLength(c.heightMm, unit)}</span>
                    </div>
                    <div className="row-wrap">
                      <Chip>{c.technique}</Chip>
                      <Chip>{c.edge}</Chip>
                      <Chip tone={c.allowance ? undefined : 'off'}>Margen {formatLength(c.allowance, unit)}</Chip>
                    </div>
                    <div className="tiny muted">{c.fabricName}{c.grain ? ' · hilo marcado' : ''} · {c.view.label}{c.zoneLabel ? ` · ${c.zoneLabel}` : ''}</div>
                    {c.backing !== 'ninguna' && <div className="tiny muted">Base: {BACKING_LABEL[c.backing]}</div>}
                    <div className="tiny">{c.placement}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {cutouts.length > 0 && (
          <div className="panel panel-pad stack" style={{ gap: 6 }}>
            <strong className="small">Materiales para los recortes</strong>
            {materialSummary(cutouts, unit).map((r) => (
              <div key={r.label} className="small"><strong>{r.label}:</strong> <span className="muted">{r.detail}</span></div>
            ))}
          </div>
        )}
      </section>

      <section className="stack">
        <h2 className="section-title" style={{ margin: 0 }}>Bordado</h2>
        {embroidery.length === 0 ? (
          <p className="small muted">Marca trazos o textos con la técnica «Bordado» para obtener su dibujo.</p>
        ) : (
          <>
            <div className="row-wrap">
              <Button icon="download" onClick={() => void embroiderySvg()}>Dibujo de bordado (SVG 1:1)</Button>
            </div>
            <p className="tiny faint">El dibujo es una guía vectorial para transferir o digitalizar. No es un archivo de puntadas.</p>
            <div className="panel panel-pad stack">
              <div className="row-wrap">
                <strong className="small">Archivo de puntadas DST</strong>
                <Chip tone="warn">Experimental</Chip>
              </div>
              <Notice tone="warn">Solo genera puntada recta sobre las líneas: sin relleno, satén, compensación de tirón ni orden optimizado. Ábrelo y revísalo en tu software de bordado antes de bordar.</Notice>
              <div className="grid-2">
                <Field label="Bastidor">
                  <Select value={hoop} onChange={setHoop} options={HOOPS.map((h) => ({ value: h.id, label: h.label }))} />
                </Field>
                <Field label="Largo de puntada">
                  <LengthInput mm={stitchLen} min={1} max={6} onChange={setStitchLen} />
                </Field>
              </div>
              {plan && (
                <>
                  <svg viewBox={`${plan.extents.minX - 20} ${-plan.extents.maxY - 20} ${plan.extents.maxX - plan.extents.minX + 40} ${plan.extents.maxY - plan.extents.minY + 40}`} style={{ width: '100%', height: 180, background: 'var(--canvas)', borderRadius: 10 }}>
                    <polyline points={plan.stitches.filter((x) => x.kind !== 'color' && x.kind !== 'fin').map((x) => `${x.x},${-x.y}`).join(' ')} fill="none" stroke="#1d2420" strokeWidth={2} />
                    {plan.stitches.filter((x) => x.kind === 'puntada').map((x, i) => <circle key={i} cx={x.x} cy={-x.y} r={4} fill="#b4273a" />)}
                  </svg>
                  <div className="small">{stitchCount} puntadas · {plan.colors} colores · {formatLength(sizeW, unit)} × {formatLength(sizeH, unit)}</div>
                  {fits ? <Notice tone="ok">Cabe en el bastidor de {hoopDef.label} con 5 mm de margen.</Notice> : <Notice tone="err">No cabe en el bastidor de {hoopDef.label}. Elige uno mayor o reduce el dibujo.</Notice>}
                  <Button icon="download" disabled={!fits} onClick={() => void record('dst-bordado', new Blob([writeDst(project.name, plan)], { type: 'application/octet-stream' }), `${slugify(project.name)}-bordado.dst`, { bastidor: hoop, puntadaMm: stitchLen, puntadas: stitchCount })}>Descargar DST experimental</Button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

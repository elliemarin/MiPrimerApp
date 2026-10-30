import { pathBounds } from './fabricFit';
import { useEffect, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Field, FilePick, Notice, Segmented, Select, Sheet, TextInput, LengthInput, Chip } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import type { Project } from '../../store/types';
import { VIEW_LABEL, ViewKind } from '../../store/types';
import { DesignDoc, DesignView, DesignViewKind, DESIGN_VIEW_LABEL, Fill, newElement, ZONE_TYPE_LABEL } from './model';
import { uid } from '../../lib/ids';
import { importImageFiles } from '../../lib/image';
import { photoViewFromFile } from './StudioEditor';
import { FabricFill } from './Inspector';
import { touch } from './ops';
import { buildPattern } from '../../lib/pattern/engine';
import { pieceSeamPath } from '../../lib/pattern/outline';
import { bboxOf } from '../../lib/geom/vec';

const PATCH_SHAPES: Record<string, (w: number, h: number) => string> = {
  circulo: (w, h) => { const rx = w / 2; const ry = h / 2; return `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 Z`; },
  ovalo: (w, h) => { const rx = w / 2; const ry = h / 2; return `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 Z`; },
  rectangulo: (w, h) => `M ${-w / 2} ${-h / 2} L ${w / 2} ${-h / 2} L ${w / 2} ${h / 2} L ${-w / 2} ${h / 2} Z`,
  escudo: (w, h) => `M ${-w / 2} ${-h / 2} L ${w / 2} ${-h / 2} L ${w / 2} ${h * 0.05} C ${w / 2} ${h * 0.3} ${w * 0.2} ${h * 0.42} 0 ${h / 2} C ${-w * 0.2} ${h * 0.42} ${-w / 2} ${h * 0.3} ${-w / 2} ${h * 0.05} Z`
};

export function ViewsPanel({ doc, view, commit, setViewId, onAdd, setTool, focusZoneId }: { focusZoneId?: string; doc: DesignDoc; view: DesignView; commit: (d: DesignDoc) => void; setViewId: (id: string) => void; onAdd: () => void; setTool: (t: string) => void }) {
  const fabrics = useApp((s) => s.fabrics);
  const [zoneFill, setZoneFill] = useState(view.zones[0]?.id ?? '');
  useEffect(()=>{setZoneFill(focusZoneId && view.zones.some(z=>z.id===focusZoneId) ? focusZoneId : view.zones[0]?.id??'');},[view.id,focusZoneId]);
  const setView = (patch: Partial<DesignView>) => commit(touch({ ...doc, views: doc.views.map((v) => (v.id === view.id ? { ...v, ...patch } : v)) }));
  const fill = view.zoneFills?.[zoneFill];
  const setFill = (f: Fill | undefined) => {
    const next = { ...(view.zoneFills ?? {}) };
    if (f) next[zoneFill] = f;
    else delete next[zoneFill];
    setView({ zoneFills: next });
  };
  const patchViews = doc.views.filter((v) => v.kind === 'parche' && v.id !== view.id);
  return (
    <div className="stack-lg">
      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Vistas</h3>
        <div className="group">
          {doc.views.map((v) => (
            <button key={v.id} className="list-row" onClick={() => setViewId(v.id)} style={{ background: v.id === view.id ? 'var(--mat-soft)' : undefined }}>
              <span className="lead"><Icon name={v.source.type === 'foto' ? 'camera' : v.kind === 'parche' ? 'target' : 'hanger'} /></span>
              <span className="grow">
                <span className="t small" style={{ display: 'block' }}>{v.label}</span>
                <span className="s tiny">{v.source.type === 'foto' ? (v.photo?.mmPerPx ? 'Foto calibrada' : 'Foto sin calibrar') : v.kind === 'parche' ? 'Parche independiente' : v.source.type === 'pieza' ? 'Pieza de patrón a escala real' : v.templateScale?.basis ?? 'Plantilla'}</span>
              </span>
            </button>
          ))}
        </div>
        <Button icon="plus" onClick={onAdd}>Agregar vista</Button>
      </section>

      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Esta vista</h3>
        <div className="grid-2">
          <Field label="Nombre">
            <TextInput value={view.label} onChange={(v) => setView({ label: v })} />
          </Field>
          <Field label="Vista">
            <Select value={view.kind} onChange={(k: DesignViewKind) => setView({ kind: k })} options={Object.entries(DESIGN_VIEW_LABEL).map(([value, label]) => ({ value: value as DesignViewKind, label }))} />
          </Field>
        </div>
        {view.source.type === 'foto' && !view.photo?.mmPerPx && <Notice tone="warn">Foto sin calibrar: los tamaños son aproximados. Usa «Calibrar» con una medida conocida de la prenda.</Notice>}
        {view.source.type === 'foto' && view.photo?.mmPerPx && <Chip tone="ok">Escala: {view.photo.mmPerPx.toFixed(3)} mm por píxel</Chip>}
        <Field label="Línea de referencia" hint="Altura compartida entre vistas para comparar posiciones (p. ej., cintura u hombro).">
          <div className="row">
            <TextInput value={view.refLabel} onChange={(v) => setView({ refLabel: v })} />
            <Button size="sm" icon="flag" onClick={() => setTool('referencia')}>Fijar</Button>
          </div>
        </Field>
        <div className="row-wrap">
          {view.source.type === 'foto' && <Button size="sm" icon="target" onClick={() => setTool('calibrar')}>Calibrar foto</Button>}
          <Button size="sm" icon="mask" onClick={() => setTool('zona')}>Dibujar zona</Button>
        </div>
      </section>

      {view.zones.length > 0 && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Zonas</h3>
          <div className="group">
            {view.zones.map((z) => (
              <div key={z.id} className="list-row" style={{ minHeight: 48 }}>
                <span className="grow small">
                  <strong>{z.label}</strong> <span className="muted">· {ZONE_TYPE_LABEL[z.type]}</span>
                </span>
                {view.source.type === 'foto' && (
                  <button className="icon-btn" aria-label="Eliminar zona" onClick={() => setView({ zones: view.zones.filter((x) => x.id !== z.id) })}>
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="field-label">Probar tela en una zona de la prenda</div>
          <Select value={zoneFill} onChange={setZoneFill} options={view.zones.map((z) => ({ value: z.id, label: z.label }))} />
          <Segmented
            value={fill?.type ?? 'ninguno'}
            onChange={(t) => setFill(t === 'ninguno' ? undefined : t === 'color' ? { type: 'color', color: '#d8e2dc' } : { type: 'tela', fabricId: Object.values(fabrics)[0]?.id ?? '', rotation: 0, offsetX: 0, offsetY: 0, scale: 1 })}
            options={[{ value: 'ninguno', label: 'Original' }, { value: 'color', label: 'Color' }, ...(Object.keys(fabrics).length ? [{ value: 'tela' as const, label: 'Tela' }] : [])]}
          />
          {fill?.type === 'color' && <input type="color" value={fill.color} onChange={(e) => setFill({ type: 'color', color: e.target.value })} aria-label="Color de la zona" />}
          {fill?.type === 'tela' && <FabricFill fill={fill} bounds={view.zones.find(z=>z.id===zoneFill) ? pathBounds(view.zones.find(z=>z.id===zoneFill)!.d) : undefined} onChange={setFill} />}
        </section>
      )}

      {patchViews.length > 0 && view.kind !== 'parche' && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Colocar un parche diseñado</h3>
          {patchViews.map((pv) => (
            <Button
              key={pv.id}
              size="sm"
              icon="target"
              onClick={() =>
                commit(
                  touch({
                    ...doc,
                    elements: [...doc.elements, newElement(view.id, { kind: 'parche', name: pv.label, patchViewId: pv.id, x: (view.seams?.center ?? view.minX + view.width / 2), y: view.refY + 120, w: pv.width, h: pv.height, fill: { type: 'ninguno' }, technique: 'parche' })]
                  })
                )
              }
            >
              Colocar «{pv.label}»
            </Button>
          ))}
          <p className="tiny faint">El parche conserva su tamaño real; edítalo en su propia vista y se actualiza aquí.</p>
        </section>
      )}
      {doc.views.length > 1 && (
        <Button variant="danger" icon="trash" onClick={() => commit(touch({ ...doc, views: doc.views.filter((v) => v.id !== view.id), elements: doc.elements.filter((e) => e.viewId !== view.id) }))}>
          Eliminar esta vista
        </Button>
      )}
    </div>
  );
}

export function AddViewSheet({ project, doc, onClose, commit }: { project: Project; doc: DesignDoc; onClose: () => void; commit: (d: DesignDoc, viewId: string) => void }) {
  const addFile = useApp((s) => s.addFile);
  const updateProject = useApp((s) => s.updateProject);
  const toast = useApp((s) => s.toast);
  const [type, setType] = useState<'foto' | 'parche' | 'pieza'>('foto');
  const [kind, setKind] = useState<ViewKind>('frente');
  const [shape, setShape] = useState<'circulo' | 'rectangulo' | 'escudo' | 'ovalo'>('circulo');
  const [w, setW] = useState<number | undefined>(80);
  const [h, setH] = useState<number | undefined>(80);
  const photos = project.references.filter((r) => r.kind !== 'patron' || true);
  const [refId, setRefId] = useState(photos[0]?.id ?? '');
  const built = project.pattern ? buildPattern(project.pattern) : null;
  const [pieceId, setPieceId] = useState(built?.pieces[0]?.id ?? '');
  const add = (v: DesignView) => {
    commit(touch({ ...doc, views: [...doc.views, v] }), v.id);
    onClose();
  };
  const fromRef = async (rid: string) => {
    const r = project.references.find((x) => x.id === rid)!;
    const fileId = r.corrected?.fileId ?? r.fileId;
    const mm = r.corrected ? r.corrected.wMm / 1 : undefined;
    const v = await photoViewFromFile(fileId, r.id, VIEW_LABEL[r.view === 'sin-identificar' ? kind : r.view], (r.view === 'sin-identificar' || r.view === 'detalle' ? kind : r.view) as DesignViewKind, r.mmPerPx ?? (mm ? undefined : undefined));
    if (r.corrected) {
      const k = r.corrected.wMm / v.width;
      v.width *= k;
      v.height *= k;
      v.refY *= k;
      v.photo = { ...v.photo!, mmPerPx: r.corrected.wMm / v.photo!.pxW };
    }
    add(v);
  };
  return (
    <Sheet title="Agregar vista" onClose={onClose}>
      <div className="stack">
        <Segmented value={type} onChange={setType} options={[{ value: 'foto', label: 'Foto de la prenda' }, { value: 'parche', label: 'Parche' }, ...(built?.pieces.length ? [{ value: 'pieza' as const, label: 'Pieza del patrón' }] : [])]} />
        {type === 'foto' && (
          <>
            <Field label="Vista aproximada" hint="La app no adivina la vista: indícala tú. Puedes cambiarla después.">
              <Select value={kind} onChange={setKind} options={Object.entries(VIEW_LABEL).map(([value, label]) => ({ value: value as ViewKind, label }))} />
            </Field>
            {photos.length > 0 && (
              <Field label="Desde las referencias del proyecto">
                <div className="row">
                  <div className="grow">
                    <Select value={refId} onChange={setRefId} options={photos.map((r) => ({ value: r.id, label: `${r.name} · ${VIEW_LABEL[r.view]}` }))} />
                  </div>
                  <Button onClick={() => void fromRef(refId)} disabled={!refId}>Usar</Button>
                </div>
              </Field>
            )}
            <FilePick
              accept="image/jpeg,image/png,application/pdf"
              onFiles={async (files) => {
                try {
                  const imported = await importImageFiles(files);
                  const im = imported[0];
                  const fileId = await addFile(im.blob, im.name);
                  const ref = { id: uid('ref'), fileId, name: im.name, kind: 'foto-prenda' as const, view: kind, license: 'propia' as const, mmPerPx: im.mmPerPx };
                  updateProject(project.id, (p) => ({ ...p, references: [...p.references, ref] }), `Referencia agregada: ${im.name}.`);
                  add(await photoViewFromFile(fileId, ref.id, VIEW_LABEL[kind], (kind === 'sin-identificar' || kind === 'detalle' ? 'detalle' : kind) as DesignViewKind, im.mmPerPx));
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'No se pudo leer la imagen.', 'error');
                }
              }}
            >
              {(open) => <Button icon="camera" onClick={open}>Tomar o subir foto</Button>}
            </FilePick>
          </>
        )}
        {type === 'parche' && (
          <>
            <Field label="Forma de la base">
              <Segmented value={shape} onChange={setShape} options={[{ value: 'circulo', label: 'Círculo' }, { value: 'ovalo', label: 'Óvalo' }, { value: 'rectangulo', label: 'Rectángulo' }, { value: 'escudo', label: 'Escudo' }]} />
            </Field>
            <div className="grid-2">
              <Field label="Ancho final">
                <LengthInput mm={w} min={10} max={500} onChange={setW} />
              </Field>
              <Field label="Alto final">
                <LengthInput mm={shape === 'circulo' ? w : h} min={10} max={500} onChange={setH} />
              </Field>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                const W = w ?? 80;
                const H = shape === 'circulo' ? W : h ?? 80;
                const id = uid('vista');
                const v: DesignView = { id, kind: 'parche', label: `Parche ${doc.views.filter((x) => x.kind === 'parche').length + 1}`, source: { type: 'parche', shape }, minX: -W / 2 - 15, minY: -H / 2 - 15, width: W + 30, height: H + 30, zones: [{ id: 'base', label: 'Base del parche', type: 'base', d: PATCH_SHAPES[shape](W, H) }], refY: -H / 2, refLabel: 'Borde superior', seams: { center: 0 }, patchShape: shape };
                const base = newElement(id, { kind: shape === 'rectangulo' ? 'forma' : 'organica', shape: shape === 'rectangulo' ? { type: 'rect' } : undefined, organicId: shape === 'escudo' ? undefined : undefined, name: 'Base del parche', x: 0, y: 0, w: W, h: H, fill: { type: 'color', color: '#e8d5b5' }, technique: 'parche', edge: 'satin', allowance: 0, backing: 'desprendible' });
                if (shape !== 'rectangulo') {
                  base.kind = 'forma';
                  base.shape = { type: shape === 'escudo' ? 'rect' : 'ellipse' };
                  if (shape === 'escudo') {
                    base.kind = 'trazo';
                    base.shape = undefined;
                    base.path = { pts: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.05], [0.32, 0.32], [0, 0.5], [-0.32, 0.32], [-0.5, 0.05]], closed: true, smooth: false };
                  }
                }
                commit(touch({ ...doc, views: [...doc.views, v], elements: [...doc.elements, base] }), id);
                onClose();
              }}
            >
              Crear parche
            </Button>
            <p className="tiny faint">La base se exporta como plantilla; luego distribuye retazos encima y agrega el dibujo de bordado.</p>
          </>
        )}
        {type === 'pieza' && built && (
          <>
            <Field label="Pieza">
              <Select value={pieceId} onChange={setPieceId} options={built.pieces.map((p) => ({ value: p.id, label: p.name }))} />
            </Field>
            <Button
              variant="primary"
              onClick={() => {
                const p = built.pieces.find((x) => x.id === pieceId)!;
                const c = built.cuts.get(p.id)!;
                const b = bboxOf(c.points);
                add({ id: uid('vista'), kind: 'pieza', label: p.name, source: { type: 'pieza', pieceId: p.id }, minX: b.minX - 20, minY: b.minY - 20, width: b.maxX - b.minX + 40, height: b.maxY - b.minY + 40, zones: [{ id: `pieza-${p.id}`, label: p.name, type: 'otra', d: pieceSeamPath(p) }], refY: 0, refLabel: 'Línea superior', seams: { center: (b.minX + b.maxX) / 2 } });
              }}
            >
              Diseñar sobre la pieza
            </Button>
            <p className="tiny faint">La pieza se dibuja a escala real desde el patrón; las posiciones de las aplicaciones quedan medidas sobre ella.</p>
          </>
        )}
      </div>
    </Sheet>
  );
}

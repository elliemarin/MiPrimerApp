import type { BBox } from '../../lib/geom/vec';
import { coverFabric } from './fabricFit';
import { useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Field, LengthInput, Notice, NumberInput, Segmented, Select, TextInput } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { formatLength } from '../../lib/units';
import { BACKING_LABEL, Backing, CUT_TECHNIQUES, DesignDoc, DesignElement, DesignView, EDGE_ALLOWANCE, EDGE_LABEL, EdgeFinish, Fill, STITCH_LABEL, StitchStyle, TECHNIQUE_LABEL, Technique } from './model';
import { alignContinuity, alignElements, continuationTarget, continuityChecks, createContinuation, distribute, duplicateElements, groupElements, removeElements, reorder, techniqueDefaults, updateElements } from './ops';
import { zoneOf } from './despiece';
import { navigate } from '../../ui/router';

const SWATCHES = ['#1d2420', '#ffffff', '#c0582d', '#d9a441', '#6c8f5e', '#2f5d7c', '#8a4fa3', '#b4273a', '#e8d5b5', '#9aa79f'];

export function Inspector({ doc, view, selected, commit, setSel, setTool, projectId }: { doc: DesignDoc; view: DesignView; selected: DesignElement[]; commit: (d: DesignDoc) => void; setSel: (s: string[]) => void; setTool: (t: string) => void; projectId: string }) {
  const unit = useApp((s) => s.settings.unit);
  const fabrics = useApp((s) => s.fabrics);
  if (selected.length === 0)
    return (
      <div className="stack">
        <p className="muted small">Elige un elemento para ver y ajustar su material, técnica, tamaño, posición y zona.</p>
        <Notice>La vista de apariencia es plana: muestra telas, aplicaciones y acabados a escala, pero no simula caída, ajuste ni estiramiento del tejido.</Notice>
        <Button icon="scissors" onClick={() => navigate(`/proyectos/${projectId}/despiece`)}>Ver despiece y plantillas</Button>
      </div>
    );
  if (selected.length > 1) {
    const ids = selected.map((e) => e.id);
    return (
      <div className="stack">
        <p className="small muted">{selected.length} elementos elegidos.</p>
        <div className="field-label">Alinear</div>
        <div className="row-wrap">
          {(
            [
              ['izq', 'alignl', 'Izquierda'],
              ['centro-h', 'alignc', 'Centro'],
              ['der', 'alignr', 'Derecha'],
              ['arriba', 'alignt', 'Arriba'],
              ['centro-v', 'alignm', 'Medio'],
              ['abajo', 'alignb', 'Abajo']
            ] as const
          ).map(([k, icon, label]) => (
            <button key={k} className="icon-btn" aria-label={`Alinear ${label}`} title={label} onClick={() => commit(alignElements(doc, ids, k))}>
              <Icon name={icon} />
            </button>
          ))}
        </div>
        <div className="row-wrap">
          <Button size="sm" onClick={() => commit(distribute(doc, ids, 'h'))} disabled={selected.length < 3}>Repartir horizontal</Button>
          <Button size="sm" onClick={() => commit(distribute(doc, ids, 'v'))} disabled={selected.length < 3}>Repartir vertical</Button>
        </div>
        <div className="row-wrap">
          <Button size="sm" icon="group" onClick={() => { const r = groupElements(doc, ids, view.id); commit(r.doc); setSel([r.id]); }}>Agrupar</Button>
          <Button size="sm" icon="copy" onClick={() => { const r = duplicateElements(doc, ids); commit(r.doc); setSel(r.ids); }}>Duplicar</Button>
          <Button size="sm" variant="danger" icon="trash" onClick={() => { commit(removeElements(doc, ids)); setSel([]); }}>Eliminar</Button>
        </div>
        <TechniqueAll doc={doc} ids={ids} commit={commit} />
      </div>
    );
  }
  const el = selected[0];
  const set = (patch: Partial<DesignElement>) => commit(updateElements(doc, [el.id], (e) => ({ ...e, ...patch })));
  const zone = zoneOf(view, el);
  const cut = CUT_TECHNIQUES.includes(el.technique);
  const cont = continuationTarget(doc, view, el);
  const checks = continuityChecks(doc, el);
  const fabricList = Object.values(fabrics);
  return (
    <div className="stack-lg">
      <div className="stack">
        <Field label="Nombre">
          <TextInput value={el.name} onChange={(v) => set({ name: v })} />
        </Field>
        {el.kind === 'texto' && el.text && (
          <>
            <Field label="Texto">
              <TextInput value={el.text.content} onChange={(v) => set({ text: { ...el.text!, content: v }, w: Math.max(5, el.h * 0.62 * Math.max(1, v.length)) })} />
            </Field>
            <Segmented value={el.text.font} onChange={(f) => set({ text: { ...el.text!, font: f } })} options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'script', label: 'Caligráfica' }]} />
          </>
        )}
        <div className="row-wrap">
          <Button size="sm" icon="copy" onClick={() => { const r = duplicateElements(doc, [el.id]); commit(r.doc); setSel(r.ids); }}>Duplicar</Button>
          <Button size="sm" icon="mirror" onClick={() => set({ flipX: !el.flipX })}>Reflejar</Button>
          <Button size="sm" icon="up" onClick={() => commit(reorder(doc, el.id, 'frente'))}>Al frente</Button>
          <Button size="sm" icon={el.locked ? 'lock' : 'unlock'} onClick={() => set({ locked: !el.locked })}>{el.locked ? 'Bloqueado' : 'Bloquear'}</Button>
          <Button size="sm" variant="danger" icon="trash" onClick={() => { commit(removeElements(doc, [el.id])); setSel([]); }}>Eliminar</Button>
        </div>
      </div>

      {el.kind !== 'grupo' && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Técnica</h3>
          <Select value={el.technique} onChange={(t: Technique) => set(techniqueDefaults(t))} options={Object.entries(TECHNIQUE_LABEL).map(([value, label]) => ({ value: value as Technique, label }))} />
          {cut && (
            <>
              <Field label="Acabado del borde">
                <Select value={el.edge} onChange={(e: EdgeFinish) => set({ edge: e, allowance: EDGE_ALLOWANCE[e] })} options={Object.entries(EDGE_LABEL).filter(([k]) => k !== 'na').map(([value, label]) => ({ value: value as EdgeFinish, label }))} />
              </Field>
              <Field label="Margen para el recorte" hint="Se agrega fuera del tamaño final. Cero para bordes crudos o satén.">
                <LengthInput mm={el.allowance} min={0} max={40} onChange={(v) => v !== undefined && set({ allowance: v })} />
              </Field>
            </>
          )}
          {(cut || el.technique === 'bordado') && (
            <Field label="Base o refuerzo">
              <Select value={el.backing} onChange={(b: Backing) => set({ backing: b })} options={Object.entries(BACKING_LABEL).map(([value, label]) => ({ value: value as Backing, label }))} />
            </Field>
          )}
          <Field label="Notas de material">
            <TextInput value={el.materialNote ?? ''} onChange={(v) => set({ materialNote: v })} placeholder="Hilo, color, proveedor…" />
          </Field>
        </section>
      )}

      {el.kind !== 'imagen' && el.kind !== 'grupo' && el.kind !== 'parche' && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Material y color</h3>
          <Segmented
            value={el.fill.type}
            onChange={(t) => set({ fill: t === 'ninguno' ? { type: 'ninguno' } : t === 'color' ? { type: 'color', color: '#c9d6cf' } : { type: 'tela', fabricId: fabricList[0]?.id ?? '', rotation: 0, offsetX: 0, offsetY: 0, scale: 1 } })}
            options={[{ value: 'ninguno', label: 'Sin relleno' }, { value: 'color', label: 'Color' }, ...(fabricList.length ? [{ value: 'tela' as const, label: 'Tela' }] : [])]}
          />
          {!fabricList.length && <p className="tiny muted">Agrega fotos de tus telas en Telas y materiales para usarlas aquí.</p>}
          {el.fill.type === 'color' && <ColorRow value={el.fill.color} onChange={(c) => set({ fill: { type: 'color', color: c } })} />}
          {el.fill.type === 'tela' && <FabricFill fill={el.fill} bounds={{minX:-el.w/2,minY:-el.h/2,maxX:el.w/2,maxY:el.h/2}} onChange={(f) => set({ fill: f })} />}
          {(el.kind === 'trazo' || el.stroke) && (
            <>
              <div className="field-label">Trazo o puntada</div>
              <Segmented value={el.stroke ? 'si' : 'no'} onChange={(v) => set({ stroke: v === 'si' ? { color: '#1d2420', width: 1, style: 'recta' } : null })} options={[{ value: 'si', label: 'Con trazo' }, { value: 'no', label: 'Sin trazo' }]} />
              {el.stroke && (
                <>
                  <ColorRow value={el.stroke.color} onChange={(c) => set({ stroke: { ...el.stroke!, color: c } })} />
                  <div className="grid-2">
                    <Field label="Grosor">
                      <LengthInput mm={el.stroke.width} min={0.1} max={40} onChange={(v) => v !== undefined && set({ stroke: { ...el.stroke!, width: v } })} />
                    </Field>
                    <Field label="Tipo">
                      <Select value={el.stroke.style} onChange={(st: StitchStyle) => set({ stroke: { ...el.stroke!, style: st } })} options={Object.entries(STITCH_LABEL).map(([value, label]) => ({ value: value as StitchStyle, label }))} />
                    </Field>
                  </div>
                </>
              )}
            </>
          )}
          {el.kind !== 'trazo' && !el.stroke && (
            <Button size="sm" variant="ghost" onClick={() => set({ stroke: { color: '#1d2420', width: 0.8, style: 'pespunte' } })}>Agregar costura visible al contorno</Button>
          )}
        </section>
      )}

      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Tamaño y posición</h3>
        <div className="grid-2">
          <Field label="Ancho">
            <LengthInput mm={el.w} min={0.5} max={5000} onChange={(v) => v && set({ w: v })} />
          </Field>
          <Field label="Alto">
            <LengthInput mm={el.h} min={0.5} max={5000} onChange={(v) => v && set({ h: v })} />
          </Field>
          <Field label="Desde el centro" hint="Horizontal">
            <LengthInput mm={el.x - (view.seams?.center ?? 0)} min={-5000} max={5000} onChange={(v) => v !== undefined && set({ x: v + (view.seams?.center ?? 0) })} />
          </Field>
          <Field label={`Desde ${view.refLabel.toLowerCase()}`} hint="Vertical">
            <LengthInput mm={el.y - view.refY} min={-5000} max={5000} onChange={(v) => v !== undefined && set({ y: v + view.refY })} />
          </Field>
        </div>
        <Field label={`Rotación ${Math.round(el.rotation)}°`}>
          <input type="range" min={0} max={359} step={1} value={el.rotation} onChange={(e) => set({ rotation: Number(e.target.value) })} />
        </Field>
      </section>

      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Zona de la prenda</h3>
        <div className="row-wrap">
          <Chip tone={zone ? 'ok' : 'off'}>{zone ? zone.label : 'Fuera de las zonas'}</Chip>
          {el.zoneId && <Chip>Fijada</Chip>}
        </div>
        <Field label="Relacionar con">
          <Select value={el.zoneId ?? ''} onChange={(z) => set({ zoneId: z || undefined })} options={[{ value: '', label: 'Automática (según posición)' }, ...view.zones.map((z) => ({ value: z.id, label: z.label }))]} />
        </Field>
        <Field label="Máscara" hint="Recorta el elemento al contorno de la zona, como si no pasara de la costura.">
          <Select value={el.maskZoneId ?? ''} onChange={(z) => set({ maskZoneId: z || undefined })} options={[{ value: '', label: 'Sin máscara' }, ...view.zones.map((z) => ({ value: z.id, label: z.label }))]} />
        </Field>
        <div className="row-wrap">
          <Button size="sm" icon="crop" onClick={() => setTool('recorte')}>Recorte libre</Button>
          {el.clip && <Button size="sm" variant="ghost" onClick={() => set({ clip: undefined })}>Quitar recorte</Button>}
        </div>
      </section>

      {(cont || checks.length > 0) && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Continuidad entre vistas</h3>
          {cont && !checks.some((c) => c.view.id === cont.target.id) && (
            <>
              <Notice tone="warn">El elemento cruza el costado. Continúa en «{cont.target.label}».</Notice>
              <Button size="sm" icon="link" onClick={() => { const r = createContinuation(doc, el, cont.target, cont.x); commit(r.doc); }}>Crear continuación en {cont.target.label}</Button>
            </>
          )}
          {checks.map((c) => {
            const ok = Math.abs(c.dy) < 1 && Math.abs(c.dh) < 1;
            return (
              <div key={c.other.id} className="spread small">
                <span>{c.view.label}: {c.other.name}</span>
                <Chip tone={ok ? 'ok' : 'warn'}>{ok ? 'Alineado' : `Δ altura ${formatLength(Math.abs(c.dy), unit)}`}</Chip>
              </div>
            );
          })}
          {checks.some((c) => Math.abs(c.dy) >= 1 || Math.abs(c.dh) >= 1) && <Button size="sm" onClick={() => commit(alignContinuity(doc, el))}>Alinear las vistas con este elemento</Button>}
          <p className="tiny faint">La altura se compara respecto a la línea de {view.refLabel.toLowerCase()} de cada vista.</p>
        </section>
      )}
    </div>
  );
}

function TechniqueAll({ doc, ids, commit }: { doc: DesignDoc; ids: string[]; commit: (d: DesignDoc) => void }) {
  const [t, setT] = useState<Technique>('collage');
  return (
    <div className="stack">
      <div className="field-label">Técnica para todos</div>
      <div className="row">
        <div className="grow">
          <Select value={t} onChange={setT} options={Object.entries(TECHNIQUE_LABEL).map(([value, label]) => ({ value: value as Technique, label }))} />
        </div>
        <Button size="sm" onClick={() => commit(updateElements(doc, ids, (e) => ({ ...e, ...techniqueDefaults(t) })))}>Aplicar</Button>
      </div>
    </div>
  );
}

function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="row-wrap">
      {SWATCHES.map((c) => (
        <button key={c} aria-label={`Color ${c}`} onClick={() => onChange(c)} style={{ width: 30, height: 30, borderRadius: 999, background: c, border: value === c ? '3px solid var(--mat)' : '1px solid var(--line-strong)' }} />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Otro color" style={{ width: 36, height: 32, border: 0, background: 'none' }} />
    </div>
  );
}

export function FabricFill({ fill, onChange, bounds }: { bounds?: BBox; fill: Extract<Fill, { type: 'tela' }>; onChange: (f: Extract<Fill, { type: 'tela' }>) => void }) {
  const fabrics = useApp((s) => s.fabrics);
  const f = fabrics[fill.fabricId];
  return (
    <div className="stack">
      <Select value={fill.fabricId} onChange={(id) => onChange({ ...fill, fabricId: id })} options={Object.values(fabrics).map((x) => ({ value: x.id, label: `${x.name}${x.calibration ? '' : ' (sin calibrar)'}` }))} />
      {f && <Chip tone={f.calibration && fill.scale===1 ? 'ok' : 'warn'}>{f.calibration && fill.scale===1 ? 'Muestra calibrada: escala real' : 'Composición visual: escala aproximada'}</Chip>}
      {f && bounds && <div className="row-wrap"><Button size="sm" onClick={()=>onChange(coverFabric(fill,f,bounds))}>Ajustar imagen a esta parte</Button><Button size="sm" variant="ghost" onClick={()=>onChange({...fill,scale:1,offsetX:0,offsetY:0,rotation:0})}>Repetir muestra</Button></div>}
      <Field label={`Rotación del estampado ${Math.round(fill.rotation)}°`} hint="El hilo de la tela gira con el estampado.">
        <input type="range" min={-180} max={180} step={1} value={fill.rotation} onChange={(e) => onChange({ ...fill, rotation: Number(e.target.value) })} />
      </Field>
      <div className="grid-2">
        <Field label="Desplazar X">
          <LengthInput mm={fill.offsetX} min={-2000} max={2000} onChange={(v) => v !== undefined && onChange({ ...fill, offsetX: v })} />
        </Field>
        <Field label="Desplazar Y">
          <LengthInput mm={fill.offsetY} min={-2000} max={2000} onChange={(v) => v !== undefined && onChange({ ...fill, offsetY: v })} />
        </Field>
      </div>
      {(
        <Field label="Escala visual del estampado" hint="Ampliar cambia la vista de la tela, no las medidas del patrón.">
          <NumberInput value={fill.scale} min={0.01} max={1000} onChange={(v) => onChange({ ...fill, scale: v })} suffix="×" />
        </Field>
      )}
    </div>
  );
}

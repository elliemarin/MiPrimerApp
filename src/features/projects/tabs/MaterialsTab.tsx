import { useMemo, useState } from 'react';
import { useApp } from '../../../store/app';
import type { Project } from '../../../store/types';
import { Button, Chip, Field, Select, TextInput, Notice } from '../../../ui/components';
import { Icon } from '../../../ui/Icon';
import { buildPattern, estimateFabric } from '../../../lib/pattern/engine';
import { computeCutouts, materialSummary } from '../../studio/despiece';
import { formatLength } from '../../../lib/units';
import { uid } from '../../../lib/ids';
import { useFileUrl } from '../../../ui/components';

function Swatch({ fileId, color }: { fileId?: string; color: string }) {
  const url = useFileUrl(fileId);
  return <span className="swatch" style={{ backgroundColor: color, backgroundImage: url ? `url(${url})` : undefined }} />;
}

export function MaterialsTab({ project }: { project: Project }) {
  const s = useApp();
  const unit = s.settings.unit;
  const [label, setLabel] = useState('');
  const [qty, setQty] = useState('');
  const [matId, setMatId] = useState('');
  const built = useMemo(() => (project.pattern ? buildPattern(project.pattern) : null), [project.pattern]);
  const cutouts = useMemo(() => (project.design ? computeCutouts(project.design, s.fabrics, unit) : []), [project.design, s.fabrics, unit]);
  const fabs = project.fabricIds.map((id) => s.fabrics[id]).filter(Boolean);
  const width = fabs[0]?.widthMm ?? 1400;
  const est = built ? estimateFabric(built.pieces, built.cuts, width) : [];
  const update = (fn: (p: Project) => Project, log?: string) => s.updateProject(project.id, fn, log);
  return (
    <div className="stack-lg" style={{ maxWidth: 900 }}>
      <section className="stack">
        <h2 className="section-title" style={{ margin: 0 }}>Telas del proyecto</h2>
        {fabs.length > 0 && (
          <div className="group">
            {fabs.map((f) => {
              const need = est.find((e) => e.fabric === 'principal');
              return (
                <div key={f.id} className="list-row">
                  <Swatch fileId={f.photo?.processedFileId ?? f.photo?.originalFileId} color={f.color} />
                  <span className="grow">
                    <a href={`#/telas/${f.id}`} className="t small" style={{ display: 'block' }}>{f.name}</a>
                    <span className="s tiny">{f.composition || 'Composición sin registrar'} · {f.widthMm ? `ancho ${formatLength(f.widthMm, unit)}` : 'ancho sin registrar'} · {f.quantityMm ? `tienes ${formatLength(f.quantityMm, unit)}` : 'cantidad sin registrar'}</span>
                  </span>
                  {need && f.quantityMm !== undefined && <Chip tone={f.quantityMm >= need.lengthMm ? 'ok' : 'warn'}>{f.quantityMm >= need.lengthMm ? 'Alcanza' : 'Puede faltar'}</Chip>}
                  <button className="icon-btn" aria-label="Quitar del proyecto" onClick={() => update((p) => ({ ...p, fabricIds: p.fabricIds.filter((x) => x !== f.id) }), `Tela quitada: ${f.name}.`)}><Icon name="close" /></button>
                </div>
              );
            })}
          </div>
        )}
        <Field label="Agregar una tela de tu biblioteca">
          <Select value="" onChange={(id) => id && update((p) => ({ ...p, fabricIds: [...new Set([...p.fabricIds, id])] }), `Tela agregada: ${s.fabrics[id].name}.`)} options={[{ value: '', label: Object.keys(s.fabrics).length ? 'Elegir tela…' : 'Sin telas: agrégalas en Telas y materiales' }, ...Object.values(s.fabrics).filter((f) => !project.fabricIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))]} />
        </Field>
      </section>

      <section className="stack">
        <h2 className="section-title" style={{ margin: 0 }}>Cantidades estimadas y supuestos</h2>
        {est.length === 0 && cutouts.length === 0 && <p className="small muted">Las cantidades se calculan con el patrón y los recortes del diseño.</p>}
        {est.map((e) => (
          <div key={e.fabric} className="panel panel-pad stack" style={{ gap: 6 }}>
            <div className="spread">
              <strong>{e.fabric === 'principal' ? 'Tela principal' : e.fabric === 'forro' ? 'Forro' : e.fabric === 'punto-elastico' ? 'Punto elástico' : e.fabric}</strong>
              <span className="measure">{formatLength(e.lengthMm, unit)} de largo</span>
            </div>
            <ul className="tiny muted" style={{ margin: 0, paddingLeft: 16 }}>{e.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        ))}
        {built?.result?.materials.map((m) => (
          <div key={m.id} className="spread small"><span>{m.label}{m.note ? <span className="muted"> · {m.note}</span> : null}</span><span className="num">{m.qty}</span></div>
        ))}
        {materialSummary(cutouts, unit).map((r) => (
          <div key={r.label} className="small"><strong>{r.label}:</strong> <span className="muted">{r.detail}</span></div>
        ))}
      </section>

      <section className="stack">
        <h2 className="section-title" style={{ margin: 0 }}>Otros materiales</h2>
        {project.materialUses.length > 0 && (
          <div className="group">
            {project.materialUses.map((m) => (
              <div key={m.id} className="list-row">
                <span className="grow small"><strong>{m.label}</strong>{m.materialId && s.materials[m.materialId] ? <span className="muted"> · en inventario: {s.materials[m.materialId].quantity} {s.materials[m.materialId].unit}</span> : null}</span>
                <span className="num small">{m.qty}</span>
                <button className="icon-btn" aria-label="Quitar" onClick={() => update((p) => ({ ...p, materialUses: p.materialUses.filter((x) => x.id !== m.id) }))}><Icon name="close" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="grid-2">
          <Field label="Material">
            <Select value={matId} onChange={(id) => { setMatId(id); if (id) setLabel(s.materials[id].name); }} options={[{ value: '', label: 'Escribir uno nuevo' }, ...Object.values(s.materials).map((m) => ({ value: m.id, label: m.name }))]} />
          </Field>
          <Field label="Nombre">
            <TextInput value={label} onChange={setLabel} placeholder="Botones de 15 mm, cierre…" />
          </Field>
        </div>
        <div className="row">
          <div className="grow"><TextInput value={qty} onChange={setQty} placeholder="Cantidad (p. ej. 6 piezas, 1.2 m)" /></div>
          <Button icon="plus" onClick={() => { if (!label.trim()) return; update((p) => ({ ...p, materialUses: [...p.materialUses, { id: uid('uso'), materialId: matId || undefined, label: label.trim(), qty: qty.trim() }] }), `Material agregado: ${label.trim()}.`); setLabel(''); setQty(''); setMatId(''); }}>Agregar</Button>
        </div>
        {!Object.keys(s.materials).length && <Notice>Registra hilos, botones, cierres, elásticos, entretelas y estabilizadores en Telas y materiales para llevar inventario.</Notice>}
      </section>
    </div>
  );
}

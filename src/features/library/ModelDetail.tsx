import { useMemo, useState } from 'react';
import { findModel, RECIPIENT_LABEL, STATUS_INFO, TYPE_LABEL, TECHNIQUE_LABEL, CatalogModel, Recipient } from '../../data/catalog';
import { Button, Chip, Empty, FilePick, Notice, PageHead, Segmented, Thumb, Select, Field } from '../../ui/components';
import { FlatViewSvg, getFlat } from '../../ui/FlatArt';
import { goBack, queryParam } from '../../ui/router';
import { useApp } from '../../store/app';
import { SIZE_TABLES, SizeTable, rowsForKinds } from '../../lib/sizes/tables';
import { MEASURE_BY_KEY } from '../../lib/sizes/measurements';
import { formatLength } from '../../lib/units';
import { getGenerator } from '../../lib/pattern/generators';
import { LICENSE_LABEL, License } from '../../store/types';
import { NewProjectSheet } from '../projects/NewProjectSheet';

const DIFF = ['', 'Fácil', 'Intermedia', 'Avanzada'];
const VIEW_NAME: Record<string, string> = { frente: 'Frente', espalda: 'Espalda', 'costado-der': 'Costado der.', 'costado-izq': 'Costado izq.' };

export function tablesFor(m: CatalogModel, recipient?: Recipient): SizeTable[] {
  const gen = m.generatorId ? getGenerator(m.generatorId) : undefined;
  if ((m.flat.family === 'bolso' || m.flat.family === 'accesorio') && !gen?.requiredMeasures.length) return [];
  const recipients = recipient && m.recipients.includes(recipient) ? [recipient] : m.recipients;
  const kinds = recipients.flatMap(r => r === 'unisex' ? ['mujer', 'hombre'] : [r]);
  return SIZE_TABLES.map(t => ({ ...t, rows: rowsForKinds(t, kinds) })).filter(t => t.rows.length > 0);
}

export function ModelDetail({ id }: { id: string }) {
  const model = findModel(id);
  const para = queryParam('para');
  const recipient = model?.recipients.find(r => r === para);
  const babyCode = queryParam('talla') ?? undefined;
  const [view, setView] = useState('frente');
  const [creating, setCreating] = useState(false);
  if (!model) return <div className="page"><Empty icon="biblioteca" title="Modelo no encontrado" action={<Button onClick={() => goBack('/biblioteca')}>Volver</Button>} /></div>;
  const flat = getFlat(model.id, model.flat);
  const v = flat.views.find((x) => x.key === view) ?? flat.views[0];
  const st = model.studioOnly ? { ...STATUS_INFO[model.status], label: 'Diseño editable', text: 'Plantilla editable por zonas en el estudio. Puedes exportar recortes y bordados; no genera un patrón de confección de la prenda.' } : STATUS_INFO[model.status];
  const gen = model.generatorId ? getGenerator(model.generatorId) : undefined;

  return (
    <div className="page page-wide">
      <PageHead title={model.name} back={{ label: 'Biblioteca', onClick: () => goBack('/biblioteca') }} sub={model.description} />
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
        <div className="stack">
          <div className="art-box" style={{ aspectRatio: '1 / 1.08' }}>
            <FlatViewSvg view={v} title={`${model.name}, vista ${VIEW_NAME[v.key]}`} />
          </div>
          {flat.views.length > 1 && <Segmented value={view} onChange={setView} options={flat.views.map((x) => ({ value: x.key, label: VIEW_NAME[x.key] }))} label="Vista del dibujo técnico" />}
          <p className="tiny faint">Dibujo técnico de referencia. Izquierda y derecha se nombran desde quien viste la prenda.</p>
        </div>

        <div className="stack-lg">
          <div className="stack">
            <div className="row-wrap">
              <Chip tone={st.tone}>{st.label}</Chip>
              <Chip>{TYPE_LABEL[model.type]}</Chip>
              <Chip>{DIFF[model.difficulty]}</Chip>
            </div>
            <Notice tone={model.status === 'implementado' ? 'ok' : model.status === 'experimental' ? 'warn' : undefined}>{st.text}{gen ? ` Motor: ${gen.name}.` : model.studioOnly ? ' Se trabaja en el estudio de diseño con recortes y plantillas exportables.' : ''}</Notice>
            <Button variant="primary" icon="plus" block onClick={() => setCreating(true)}>
              {model.status === 'pendiente' ? 'Usar como inspiración en un proyecto' : 'Crear proyecto con este modelo'}
            </Button>
          </div>

          <dl className="group" style={{ margin: 0 }}>
            <InfoRow label="Para" value={model.recipients.map((r) => RECIPIENT_LABEL[r]).join(', ')} />
            <InfoRow label="Tejido" value={model.fabrics.map((x) => (x === 'plano' ? 'Plano' : 'Punto')).join(' o ')} />
            <InfoRow label="Elasticidad" value={{ ninguna: 'No necesita', baja: 'Baja', media: 'Media', alta: 'Alta' }[model.stretch]} />
            <InfoRow label="Ajuste" value={model.fits.map((f) => f[0].toUpperCase() + f.slice(1)).join(', ')} />
            <InfoRow label="Técnicas" value={model.techniques.map((t) => TECHNIQUE_LABEL[t]).join(', ')} />
          </dl>

          {model.variants.length > 0 && (
            <section>
              <h2 className="section-title">Variantes de construcción</h2>
              <div className="group">
                {model.variants.map((x) => (
                  <div key={x.name} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className="t">{x.name}</div>
                      <div className="s">{x.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title">Telas y materiales recomendados</h2>
            <div className="panel panel-pad stack" style={{ gap: 8 }}>
              <div className="row-wrap">{model.recommendedFabrics.length ? model.recommendedFabrics.map((x) => <Chip key={x}>{x}</Chip>) : <span className="muted">Según la prenda que vas a intervenir.</span>}</div>
              <div className="small muted">{model.materials.join(' · ')}</div>
            </div>
          </section>

          {gen && (
            <section>
              <h2 className="section-title">Medidas que pide el patrón</h2>
              <div className="panel panel-pad small">
                <div>
                  <strong>Necesarias:</strong> {gen.requiredMeasures.map((k) => MEASURE_BY_KEY[k].label).join(', ') || 'Ninguna (medidas del objeto)'}
                </div>
                {gen.optionalMeasures.length > 0 && (
                  <div className="muted">
                    <strong>Mejoran las comprobaciones:</strong> {gen.optionalMeasures.map((k) => MEASURE_BY_KEY[k].label).join(', ')}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <SizeTables model={model} recipient={recipient} />
      <ModelPhotos model={model} />
      {creating && <NewProjectSheet model={model} initialRecipient={recipient} initialBabySize={babyCode} onClose={() => setCreating(false)} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-row" style={{ minHeight: 48 }}>
      <dt className="muted small" style={{ width: 96, flex: 'none' }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

function SizeTables({ model, recipient }: { model: CatalogModel; recipient?: Recipient }) {
  const tables = tablesFor(model, recipient);
  const unit = useApp((s) => s.settings.unit);
  const [tid, setTid] = useState(tables[0]?.id ?? '');
  const t = tables.find((x) => x.id === tid);
  const keys = useMemo(() => {
    if (!t) return [];
    const gen = model.generatorId ? getGenerator(model.generatorId) : undefined;
    const want = gen ? [...gen.requiredMeasures, ...gen.optionalMeasures] : [];
    const all = Object.keys(t.rows[0].values);
    return all.filter((k) => !want.length || want.includes(k as never) || k === 'estatura');
  }, [t, model]);
  if (!t) return null;
  return (
    <section style={{ marginTop: 28 }}>
      <div className="spread" style={{ marginBottom: 8 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Tabla de medidas corporales</h2>
        {tables.length > 1 && <div style={{ width: 240 }}><Select value={tid} onChange={setTid} options={tables.map((x) => ({ value: x.id, label: x.name }))} /></div>}
      </div>
      <p className="small muted" style={{ marginBottom: 10 }}>{t.basis}</p>
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Talla</th>
              {t.rows[0].ageHint && <th>Edad orientativa</th>}
              {keys.map((k) => (
                <th key={k} className="n">{MEASURE_BY_KEY[k as keyof typeof MEASURE_BY_KEY].label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.code}>
                <td><strong>{r.code}</strong>{t.id === 'ref-bebe-meses' && <span className="small"> · {r.label}</span>}</td>
                {r.ageHint !== undefined && <td className="muted">{r.ageHint}</td>}
                {keys.map((k) => (
                  <td key={k} className="n">{r.values[k as keyof typeof r.values] !== undefined ? formatLength(r.values[k as keyof typeof r.values]!, unit, { suffix: false }) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny faint" style={{ marginTop: 6 }}>Valores en {unit}. Son medidas corporales: la holgura y los márgenes se agregan después y por separado.</p>
    </section>
  );
}

function ModelPhotos({ model }: { model: CatalogModel }) {
  const photos = useApp((s) => s.settings.modelPhotos?.[model.id] ?? []);
  const addFile = useApp((s) => s.addFile);
  const setSettings = useApp((s) => s.setSettings);
  const [license, setLicense] = useState<License>('propia');
  return (
    <section style={{ marginTop: 28 }}>
      <h2 className="section-title">Fotografías de referencia</h2>
      <div className="panel panel-pad stack">
        {photos.length === 0 ? (
          <p className="muted small">Este modelo aún no tiene fotografías con permiso de uso verificado. Puedes agregar fotos tuyas o con licencia, indicando su permiso.</p>
        ) : (
          <div className="cards">
            {photos.map((p) => (
              <figure key={p.fileId} style={{ margin: 0 }}>
                <Thumb fileId={p.fileId} alt={`Foto de referencia de ${model.name}`} />
                <figcaption className="tiny muted" style={{ marginTop: 4 }}>{LICENSE_LABEL[p.license]}{p.credit ? ` · ${p.credit}` : ''}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="row-wrap">
          <Field label="Permiso de uso">
            <Select value={license} onChange={setLicense} options={Object.entries(LICENSE_LABEL).map(([value, label]) => ({ value: value as License, label }))} />
          </Field>
          <FilePick accept="image/*" multiple onFiles={async (files) => {
            for (const f of files) {
              const fileId = await addFile(f, f.name);
              setSettings((s) => ({ ...s, modelPhotos: { ...(s.modelPhotos ?? {}), [model.id]: [...(s.modelPhotos?.[model.id] ?? []), { fileId, license }] } }));
            }
          }}>
            {(open) => <Button icon="camera" onClick={open} style={{ alignSelf: 'flex-end' }}>Agregar fotos</Button>}
          </FilePick>
        </div>
      </div>
    </section>
  );
}

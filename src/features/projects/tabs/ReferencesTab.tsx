import { useState } from 'react';
import { useApp } from '../../../store/app';
import { DetailState, GarmentAnalysis, GarmentKind, LICENSE_LABEL, License, Project, Reference, REFERENCE_KIND_LABEL, ReferenceKind, VIEW_LABEL, ViewKind } from '../../../store/types';
import { Button, Chip, Empty, Field, FilePick, LengthInput, Notice, Segmented, Select, Thumb, TextInput } from '../../../ui/components';
import { importImageFiles } from '../../../lib/image';
import { uid } from '../../../lib/ids';
import { PerspectiveSheet } from '../PerspectiveSheet';
import { navigate } from '../../../ui/router';
import { newPatternState } from '../../../lib/pattern/engine';
import { getGenerator } from '../../../lib/pattern/generators';
import { formatLength } from '../../../lib/units';
import { newDesign } from '../../studio/model';
import { photoViewFromFile } from '../../studio/StudioEditor';

export function ReferencesTab({ project }: { project: Project }) {
  const addFile = useApp((s) => s.addFile);
  const updateProject = useApp((s) => s.updateProject);
  const toast = useApp((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const [persp, setPersp] = useState<Reference | null>(null);
  const setRef = (id: string, patch: Partial<Reference>) => updateProject(project.id, (p) => ({ ...p, references: p.references.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const add = async (files: File[]) => {
    setBusy(true);
    try {
      const imported = await importImageFiles(files);
      const refs: Reference[] = [];
      for (const im of imported) {
        const fileId = await addFile(im.blob, im.name);
        const sourceFileId = im.source && im.page === 1 ? await addFile(im.source, im.source.name) : undefined;
        refs.push({ id: uid('ref'), fileId, sourceFileId, page: im.page, name: im.name, kind: im.source ? 'patron' : 'foto-prenda', view: 'sin-identificar', license: 'propia', mmPerPx: im.mmPerPx });
      }
      updateProject(project.id, (p) => ({ ...p, references: [...p.references, ...refs] }), `${refs.length} referencias agregadas.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo leer el archivo.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const toStudio = async (r: Reference) => {
    const fileId = r.corrected?.fileId ?? r.fileId;
    const kind = (r.view === 'sin-identificar' ? 'detalle' : r.view) as ViewKind;
    const v = await photoViewFromFile(fileId, r.id, VIEW_LABEL[r.view], kind as never, r.mmPerPx);
    if (r.corrected) {
      const k = r.corrected.wMm / v.width;
      v.width *= k;
      v.height *= k;
      v.refY *= k;
      v.photo = { ...v.photo!, mmPerPx: r.corrected.wMm / v.photo!.pxW };
    }
    updateProject(project.id, (p) => ({ ...p, design: p.design ? { ...p.design, views: [...p.design.views, v] } : newDesign([v]) }), `Vista agregada al estudio: ${r.name}.`);
    navigate(`/estudio/${project.id}`);
  };
  const garmentPhotos = project.references.filter((r) => r.kind === 'foto-prenda');
  return (
    <div className="stack-lg">
      {(project.origin === 'fotos' || garmentPhotos.length > 0) && <GarmentAnalysisPanel project={project} />}
      <section className="stack">
        <div className="spread">
          <h2 className="section-title" style={{ margin: 0 }}>Referencias ({project.references.length})</h2>
          <FilePick accept="image/jpeg,image/png,application/pdf" multiple onFiles={(f) => void add(f)}>
            {(open) => <Button icon="upload" onClick={open} disabled={busy}>{busy ? 'Leyendo…' : 'Agregar JPG, PNG o PDF'}</Button>}
          </FilePick>
        </div>
        {project.references.length === 0 ? (
          <Empty icon="image" title="Sin referencias" body="Agrega fotos de la prenda, el patrón existente, bocetos o inspiración. Se guardan los originales." />
        ) : (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {project.references.map((r) => (
              <div key={r.id} className="panel" style={{ overflow: 'hidden' }}>
                <Thumb fileId={r.corrected?.fileId ?? r.fileId} alt={r.name} className="thumb" style={{ borderRadius: 0, aspectRatio: '4 / 3', objectFit: 'contain', background: 'var(--sunken)' }} />
                <div className="panel-pad stack" style={{ gap: 8 }}>
                  <div className="small" style={{ fontWeight: 600, wordBreak: 'break-word' }}>{r.name}</div>
                  <div className="row-wrap">
                    {r.corrected ? <Chip tone="ok">Perspectiva corregida · escala física</Chip> : r.mmPerPx ? <Chip tone="ok">Escala {r.sourceFileId ? 'del PDF' : 'calibrada'}</Chip> : <Chip tone="warn">Sin escala</Chip>}
                    {r.sourceFileId && <Chip>PDF original guardado</Chip>}
                  </div>
                  <div className="grid-2">
                    <Select value={r.kind} onChange={(k: ReferenceKind) => setRef(r.id, { kind: k })} options={Object.entries(REFERENCE_KIND_LABEL).map(([value, label]) => ({ value: value as ReferenceKind, label }))} />
                    <Select value={r.view} onChange={(v: ViewKind) => setRef(r.id, { view: v })} options={Object.entries(VIEW_LABEL).map(([value, label]) => ({ value: value as ViewKind, label }))} />
                  </div>
                  <Select value={r.license} onChange={(l: License) => setRef(r.id, { license: l })} options={Object.entries(LICENSE_LABEL).map(([value, label]) => ({ value: value as License, label }))} />
                  <TextInput value={r.notes ?? ''} onChange={(v) => setRef(r.id, { notes: v })} placeholder="Notas" />
                  <div className="row-wrap">
                    <Button size="sm" icon="target" onClick={() => setPersp(r)}>Perspectiva</Button>
                    {r.kind === 'patron' ? <Button size="sm" icon="patronaje" onClick={() => navigate(`/patronaje/${project.id}`)}>Trazar</Button> : <Button size="sm" icon="estudio" onClick={() => void toStudio(r)}>Al estudio</Button>}
                    <Button size="sm" variant="ghost" onClick={() => updateProject(project.id, (p) => ({ ...p, references: p.references.filter((x) => x.id !== r.id) }), `Referencia quitada: ${r.name}.`)}>Quitar</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {persp && <PerspectiveSheet project={project} reference={persp} onClose={() => setPersp(null)} />}
    </div>
  );
}

const DETAILS: Record<GarmentKind, [string, string][]> = {
  pantalon: [['pretina', 'Pretina o jareta'], ['elastico', 'Cintura elástica'], ['bolsillos', 'Bolsillos'], ['bragueta', 'Bragueta o cierre'], ['pinzas', 'Pinzas o pliegues'], ['punos', 'Puños en el bajo'], ['forro', 'Forro']],
  falda: [['pretina', 'Pretina o jareta'], ['elastico', 'Cintura elástica'], ['frunces', 'Frunces'], ['cierre', 'Cierre'], ['forro', 'Forro'], ['bolsillos', 'Bolsillos']],
  bolsa: [['asas', 'Asas'], ['forro', 'Forro'], ['base', 'Base en caja'], ['cierre', 'Cierre'], ['bolsillos', 'Bolsillos']],
  otra: [['cuello', 'Cuello'], ['mangas', 'Mangas'], ['punos', 'Puños'], ['botones', 'Botones'], ['cierre', 'Cierre'], ['bolsillos', 'Bolsillos'], ['forro', 'Forro']]
};

const MEASURES: Record<GarmentKind, [string, string, boolean][]> = {
  pantalon: [['largo', 'Largo exterior (cintura a bajo)', true], ['cadera', 'Contorno de cadera de la prenda', true], ['tiro', 'Altura de tiro de la prenda', true], ['bajo', 'Contorno de bajo', true], ['cintura', 'Cintura con elástico relajado', false]],
  falda: [['largo', 'Largo de la falda', true], ['contorno', 'Contorno del bajo', true], ['cintura', 'Cintura con elástico relajado', false]],
  bolsa: [['ancho', 'Ancho', true], ['alto', 'Alto', true], ['fondo', 'Fondo', false]],
  otra: [['largo', 'Largo', false], ['ancho', 'Ancho', false]]
};

const PERSON: Record<GarmentKind, [string, string][]> = {
  pantalon: [],
  falda: [['cadera', 'Cadera de la persona']],
  bolsa: [],
  otra: []
};

function GarmentAnalysisPanel({ project }: { project: Project }) {
  const updateProject = useApp((s) => s.updateProject);
  const unit = useApp((s) => s.settings.unit);
  const a: GarmentAnalysis = project.analysis ?? { kind: 'pantalon', details: {}, measures: {}, person: {} };
  const set = (patch: Partial<GarmentAnalysis>) => updateProject(project.id, (p) => ({ ...p, analysis: { ...a, ...patch } }));
  const views = new Set(project.references.filter((r) => r.kind === 'foto-prenda').map((r) => r.view));
  const missingViews = (['frente', 'espalda'] as ViewKind[]).filter((v) => !views.has(v));
  const mdefs = MEASURES[a.kind];
  const missing = mdefs.filter(([k, , req]) => req && !a.measures[k]);
  const pending = DETAILS[a.kind].filter(([k]) => (a.details[k] ?? 'confirmar') === 'confirmar');
  const seen = DETAILS[a.kind].filter(([k]) => a.details[k] === 'visto');
  const genId = a.kind === 'pantalon' ? 'pantalon-cintura-elastica' : a.kind === 'falda' ? 'falda-fruncida-elastica' : a.kind === 'bolsa' ? 'bolsa-tote' : undefined;
  const gen = genId ? getGenerator(genId) : undefined;
  const personMissing = PERSON[a.kind].filter(([k]) => !a.person[k]);

  const createPattern = () => {
    if (!gen) return;
    const ctxBase = { kind: 'mujer' as const, fabric: project.fabricType, stretch: project.stretch, fit: project.fit };
    let body: Record<string, number> = {};
    const params: Record<string, number | string> = {};
    const assumptions: string[] = [];
    if (a.kind === 'pantalon') {
      // Holgura de cadera según el ajuste elegido: prenda = cuerpo × (1 + f).
      const f = { plano: { ajustado: 0.06, regular: 0.1, holgado: 0.16, oversize: 0.24 }, punto: { ajustado: 0, regular: 0.05, holgado: 0.1, oversize: 0.18 } }[project.fabricType][project.fit];
      const hipBody = a.measures.cadera / (1 + f);
      const riseEase = project.fabricType === 'punto' ? 10 : 20;
      body = { cadera: hipBody, tiro: a.measures.tiro - riseEase, entrepierna: a.measures.largo - (a.measures.tiro - riseEase), cintura: a.measures.cintura ? a.measures.cintura / 0.9 : hipBody * 0.82 };
      params.largo = a.measures.largo;
      params.bajo = a.measures.bajo;
      params.estilo = 'recto';
      params.holguraTiro = riseEase;
      assumptions.push(`Cadera corporal implícita ${formatLength(hipBody, unit)} con holgura ${Math.round(f * 100)} % para reproducir la cadera de la prenda.`);
      if (!a.measures.cintura) assumptions.push('Cintura sin medir: se supone 82 % de la cadera. Mide el elástico.');
    } else if (a.kind === 'falda') {
      body = { cadera: a.person.cadera, cintura: a.measures.cintura ? a.measures.cintura / 0.9 : a.person.cadera * 0.8 };
      params.largo = a.measures.largo;
      params.amplitud = Math.round((a.measures.contorno / a.person.cadera) * 100) / 100;
      assumptions.push(`Amplitud calculada: contorno de la prenda / cadera = ${params.amplitud}.`);
    } else if (a.kind === 'bolsa') {
      params.ancho = a.measures.ancho;
      params.alto = a.measures.alto + (a.measures.fondo ?? 0) / 2;
      params.fondo = a.measures.fondo ?? 0;
    }
    const state = newPatternState(gen.id, body, ctxBase);
    state.params = params;
    updateProject(project.id, (p) => ({ ...p, pattern: state, status: 'patronaje', notes: [...p.notes, { id: uid('nota'), createdAt: new Date().toISOString(), text: `Propuesta de patrón desde fotos y medidas de la prenda. ${assumptions.join(' ')} Comprueba con una muestra antes de cortar la tela definitiva.`, photoFileIds: [] }] }), 'Propuesta de patrón creada desde la prenda.');
    navigate(`/patronaje/${project.id}`);
  };

  return (
    <section className="panel panel-pad stack">
      <h2 style={{ fontSize: 18 }}>Análisis de la prenda</h2>
      <p className="small muted">La app no deduce medidas exactas ni piezas ocultas a partir de fotos. Indica lo que ves y mide la prenda real; lo demás queda marcado como pendiente de revisión.</p>
      <Field label="Tipo de prenda">
        <Segmented value={a.kind} onChange={(k: GarmentKind) => set({ kind: k, details: {}, measures: {} })} options={[{ value: 'pantalon', label: 'Pantalón' }, { value: 'falda', label: 'Falda' }, { value: 'bolsa', label: 'Bolsa' }, { value: 'otra', label: 'Otra' }]} />
      </Field>
      {missingViews.length > 0 && <Notice tone="warn">Faltan fotos de: {missingViews.map((v) => VIEW_LABEL[v].toLowerCase()).join(' y ')}. Lo que no se ve en las fotos queda por confirmar.</Notice>}
      <div className="field-label">Detalles de construcción</div>
      <div className="group">
        {DETAILS[a.kind].map(([k, label]) => (
          <div key={k} className="list-row" style={{ minHeight: 50, flexWrap: 'wrap' }}>
            <span className="grow small">{label}</span>
            <Segmented value={a.details[k] ?? 'confirmar'} onChange={(v: DetailState) => set({ details: { ...a.details, [k]: v } })} options={[{ value: 'visto', label: 'Se ve' }, { value: 'no', label: 'No tiene' }, { value: 'confirmar', label: 'Por confirmar' }]} />
          </div>
        ))}
      </div>
      <div className="field-label">Medidas de la prenda terminada (mídela en la prenda real)</div>
      <div className="grid-2">
        {mdefs.map(([k, label, req]) => (
          <Field key={k} label={`${label}${req ? '' : ' (opcional)'}`}>
            <LengthInput mm={a.measures[k]} onChange={(v) => { const m = { ...a.measures }; if (v === undefined) delete m[k]; else m[k] = v; set({ measures: m }); }} allowEmpty min={1} placeholder="Falta" />
          </Field>
        ))}
        {PERSON[a.kind].map(([k, label]) => (
          <Field key={k} label={label}>
            <LengthInput mm={a.person[k]} onChange={(v) => { const m = { ...a.person }; if (v === undefined) delete m[k]; else m[k] = v; set({ person: m }); }} allowEmpty min={1} placeholder="Falta" />
          </Field>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="notice ok" style={{ flexDirection: 'column', gap: 4 }}>
          <strong>Se puede usar</strong>
          <span className="small">{[...seen.map(([, l]) => l), ...mdefs.filter(([k]) => a.measures[k]).map(([, l]) => l)].join(', ') || 'Aún nada confirmado.'}</span>
        </div>
        <div className="notice warn" style={{ flexDirection: 'column', gap: 4 }}>
          <strong>Necesita revisión</strong>
          <span className="small">{[...pending.map(([, l]) => l), ...missing.map(([, l]) => `${l} (medida)`), ...personMissing.map(([, l]) => l), 'Piezas interiores: vistas, entretelas y forros no visibles'].join(', ')}.</span>
        </div>
      </div>
      {gen ? (
        <div className="stack">
          <div className="small">Patrón base compatible: <strong>{gen.name}</strong>.</div>
          <Button variant="primary" icon="patronaje" onClick={createPattern} disabled={missing.length > 0 || personMissing.length > 0}>Crear propuesta de patrón</Button>
          <p className="tiny faint">El resultado es una propuesta: reproduce las medidas de la prenda con las reglas del patrón base y debe comprobarse con una muestra de confección.</p>
        </div>
      ) : (
        <Notice>Para este tipo de prenda aún no hay un patrón base compatible. Puedes trazar el patrón sobre fotos corregidas en el editor de patronaje.</Notice>
      )}
    </section>
  );
}

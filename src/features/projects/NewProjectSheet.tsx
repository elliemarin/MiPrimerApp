import { useState } from 'react';
import { CatalogModel, CATALOG, findModel } from '../../data/catalog';
import { useApp } from '../../store/app';
import { Button, Field, FilePick, Notice, Segmented, Sheet, TextInput, Select } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { navigate } from '../../ui/router';
import { ProfileChoice, ProfilePicker, resolveProfile } from './ProfilePicker';
import { blankProject, projectFromModel, currentValues, templateScaleFor, viewsFromModel } from '../../store/projects';
import { GENERATORS } from '../../lib/pattern/generators';
import { newPatternState } from '../../lib/pattern/engine';
import { FIT_LABEL, Fit, FabricType } from '../../lib/pattern/generator';
import { ORIGIN_LABEL, ProjectOrigin, Reference, ReferenceKind, ViewKind, VIEW_LABEL } from '../../store/types';
import { uid } from '../../lib/ids';
import { newDesign } from '../studio/model';
import { importImageFiles } from '../../lib/image';

const STARTS: { origin: ProjectOrigin; icon: string; text: string }[] = [
  { origin: 'catalogo', icon: 'biblioteca', text: 'Elige un modelo y genera su patrón a medida.' },
  { origin: 'base', icon: 'patronaje', text: 'Empieza directamente con un patrón paramétrico.' },
  { origin: 'patron-imagen', icon: 'pdf', text: 'Sube la foto o el PDF de un patrón para calibrarlo y trazarlo.' },
  { origin: 'fotos', icon: 'camera', text: 'Fotografía una prenda para analizarla y elegir un patrón compatible.' },
  { origin: 'boceto', icon: 'pencil', text: 'Sube un boceto o dibujo técnico como base de diseño.' },
  { origin: 'intervencion', icon: 'scissors', text: 'Interviene una prenda que ya tienes, con fotos o una plantilla.' }
];

const INTERVENE = ['intervenir-camisa', 'intervenir-pantalon', 'camiseta-basica', 'sudadera', 'hoodie', 'falda-fruncida', 'vestido-camisero', 'chaqueta-cierre', 'bolsa-tote', 'parche-personalizado', 'cojin'];

export function NewProjectSheet({ model, onClose }: { model?: CatalogModel; onClose: () => void }) {
  const [origin, setOrigin] = useState<ProjectOrigin | null>(model ? 'catalogo' : null);
  return (
    <Sheet title={origin ? ORIGIN_LABEL[origin] : 'Nuevo proyecto'} onClose={onClose}>
      {!origin && (
        <div className="stack">
          {STARTS.map((s) => (
            <button key={s.origin} className="start-card" onClick={() => (s.origin === 'catalogo' && !model ? (onClose(), navigate('/biblioteca')) : setOrigin(s.origin))}>
              <span className="ic"><Icon name={s.icon} /></span>
              <span>
                <span className="t" style={{ display: 'block' }}>{ORIGIN_LABEL[s.origin]}</span>
                <span className="s">{s.text}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {origin === 'catalogo' && model && <FromModel model={model} onClose={onClose} />}
      {origin === 'base' && <FromBase onClose={onClose} />}
      {(origin === 'patron-imagen' || origin === 'fotos' || origin === 'boceto') && <FromUploads origin={origin} onClose={onClose} />}
      {origin === 'intervencion' && <FromIntervention onClose={onClose} />}
    </Sheet>
  );
}

function FabricFit({ fabric, setFabric, stretch, setStretch, fit, setFit }: { fabric: FabricType; setFabric: (f: FabricType) => void; stretch: number; setStretch: (n: number) => void; fit: Fit; setFit: (f: Fit) => void }) {
  return (
    <>
      <Field label="Tejido">
        <Segmented value={fabric} onChange={setFabric} options={[{ value: 'plano', label: 'Plano' }, { value: 'punto', label: 'Punto' }]} />
      </Field>
      {fabric === 'punto' && (
        <Field label={`Elasticidad horizontal: ${stretch} %`} hint="Estira 10 cm de tela y mide cuánto llega: 13 cm = 30 %.">
          <input type="range" min={0} max={100} step={5} value={stretch} onChange={(e) => setStretch(Number(e.target.value))} />
        </Field>
      )}
      <Field label="Ajuste deseado">
        <Segmented value={fit} onChange={setFit} options={(Object.keys(FIT_LABEL) as Fit[]).map((f) => ({ value: f, label: FIT_LABEL[f] }))} />
      </Field>
    </>
  );
}

function FromModel({ model, onClose }: { model: CatalogModel; onClose: () => void }) {
  const put = useApp((s) => s.put);
  const profiles = useApp((s) => s.profiles);
  const [name, setName] = useState(model.name);
  const kinds = model.recipients.flatMap((r) => (r === 'unisex' ? ['mujer', 'hombre'] : [r]));
  const needs = !!model.generatorId && model.id !== 'bolsa-tote';
  const [choice, setChoice] = useState<ProfileChoice>(Object.keys(profiles).length ? { type: 'perfil', id: Object.values(profiles)[0].id } : needs ? { type: 'tabla', tableId: kinds.some((k) => ['bebe', 'toddler', 'infantil'].includes(k)) && !kinds.includes('mujer') ? 'ref-infantil-estatura' : 'ref-mujer-busto', code: kinds.includes('mujer') || kinds.includes('hombre') ? 'M92' : 'E92' } : { type: 'ninguno' });
  const [fabric, setFabric] = useState<FabricType>(model.fabrics[0]);
  const [stretch, setStretch] = useState(model.fabrics[0] === 'punto' ? 30 : 0);
  const [fit, setFit] = useState<Fit>(model.fits.includes('regular') ? 'regular' : model.fits[0]);
  const create = () => {
    const profile = resolveProfile(choice, put, profiles);
    const p = projectFromModel(model, profile);
    p.name = name.trim() || model.name;
    p.fabricType = fabric;
    p.stretch = fabric === 'punto' ? stretch : 0;
    p.fit = fit;
    if (p.pattern) p.pattern = { ...p.pattern, context: { ...p.pattern.context, fabric, stretch: p.stretch, fit } };
    put('project', p);
    onClose();
    navigate(p.pattern ? `/patronaje/${p.id}` : `/estudio/${p.id}`);
  };
  return (
    <div className="stack">
      <Field label="Nombre del proyecto">
        <TextInput value={name} onChange={setName} />
      </Field>
      {model.id !== 'bolsa-tote' && <ProfilePicker value={choice} onChange={setChoice} allowNone={!needs} kinds={kinds} />}
      {model.generatorId && model.id !== 'bolsa-tote' && <FabricFit {...{ fabric, setFabric, stretch, setStretch, fit, setFit }} />}
      {model.status === 'pendiente' && <Notice>Este modelo es solo inspiración: el proyecto tendrá el dibujo técnico como plantilla de diseño, sin patrón generado.</Notice>}
      <Button variant="primary" block onClick={create} disabled={needs && choice.type === 'ninguno'}>
        Crear proyecto
      </Button>
    </div>
  );
}

function FromBase({ onClose }: { onClose: () => void }) {
  const put = useApp((s) => s.put);
  const profiles = useApp((s) => s.profiles);
  const [gid, setGid] = useState(GENERATORS[0].id);
  const [choice, setChoice] = useState<ProfileChoice>(Object.keys(profiles).length ? { type: 'perfil', id: Object.values(profiles)[0].id } : { type: 'tabla', tableId: 'ref-mujer-busto', code: 'M92' });
  const [fabric, setFabric] = useState<FabricType>('plano');
  const [stretch, setStretch] = useState(0);
  const [fit, setFit] = useState<Fit>('regular');
  const gen = GENERATORS.find((g) => g.id === gid)!;
  const create = () => {
    const profile = gen.requiredMeasures.length ? resolveProfile(choice, put, profiles) : undefined;
    const p = blankProject(gen.name, 'base');
    p.fabricType = fabric;
    p.stretch = fabric === 'punto' ? stretch : 0;
    p.fit = fit;
    p.pattern = newPatternState(gid, profile ? currentValues(profile) : {}, { kind: profile?.kind ?? 'mujer', fabric, stretch: p.stretch, fit });
    if (profile) {
      p.profileRef = { profileId: profile.id, versionId: profile.currentVersionId };
      p.pattern.measurementRef = { ...p.profileRef };
    }
    const model = CATALOG.find((m) => m.generatorId === gid);
    if (model) {
      p.modelId = model.id;
      p.design = newDesign(viewsFromModel(model, templateScaleFor(model, profile?.kind, profile ? currentValues(profile) : undefined)));
    }
    p.status = 'patronaje';
    put('project', p);
    onClose();
    navigate(`/patronaje/${p.id}`);
  };
  return (
    <div className="stack">
      <Field label="Patrón base">
        <div className="group">
          {GENERATORS.map((g) => (
            <button key={g.id} className="list-row" onClick={() => setGid(g.id)} aria-pressed={g.id === gid}>
              <span className="lead" style={g.id === gid ? { background: 'var(--mat)', color: 'var(--mat-ink)' } : undefined}><Icon name={g.id === gid ? 'check' : 'patronaje'} /></span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>{g.name}</span>
                <span className="s">{g.summary}</span>
              </span>
            </button>
          ))}
        </div>
      </Field>
      {gen.requiredMeasures.length > 0 && <ProfilePicker value={choice} onChange={setChoice} />}
      {gen.requiredMeasures.length > 0 && <FabricFit {...{ fabric, setFabric, stretch, setStretch, fit, setFit }} />}
      <Button variant="primary" block onClick={create}>Crear y abrir el patrón</Button>
    </div>
  );
}

function FromUploads({ origin, onClose }: { origin: 'patron-imagen' | 'fotos' | 'boceto'; onClose: () => void }) {
  const put = useApp((s) => s.put);
  const addFile = useApp((s) => s.addFile);
  const toast = useApp((s) => s.toast);
  const [name, setName] = useState(origin === 'patron-imagen' ? 'Patrón trazado' : origin === 'fotos' ? 'Prenda desde fotos' : 'Diseño desde boceto');
  const [refs, setRefs] = useState<Reference[]>([]);
  const [busy, setBusy] = useState(false);
  const kind: ReferenceKind = origin === 'patron-imagen' ? 'patron' : origin === 'fotos' ? 'foto-prenda' : 'boceto';
  const add = async (files: File[]) => {
    setBusy(true);
    try {
      const imported = await importImageFiles(files);
      const next: Reference[] = [];
      for (const im of imported) {
        const fileId = await addFile(im.blob, im.name);
        next.push({ id: uid('ref'), fileId, name: im.name, kind, view: origin === 'patron-imagen' ? 'detalle' : refs.length + next.length === 0 ? 'frente' : refs.length + next.length === 1 ? 'espalda' : 'sin-identificar', license: 'propia' });
      }
      setRefs([...refs, ...next]);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo leer el archivo.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const create = () => {
    const p = blankProject(name.trim() || ORIGIN_LABEL[origin], origin);
    p.references = refs;
    p.status = origin === 'patron-imagen' ? 'patronaje' : 'diseno';
    put('project', p);
    onClose();
    navigate(origin === 'patron-imagen' ? `/patronaje/${p.id}` : `/proyectos/${p.id}/referencias`);
  };
  return (
    <div className="stack">
      <Field label="Nombre del proyecto">
        <TextInput value={name} onChange={setName} />
      </Field>
      <FilePick accept="image/jpeg,image/png,application/pdf" multiple onFiles={add}>
        {(open) => (
          <button className="dropzone" onClick={open} disabled={busy}>
            <Icon name="upload" size={28} />
            <div style={{ fontWeight: 600, marginTop: 6 }}>{busy ? 'Leyendo archivos…' : 'Agregar JPG, PNG o PDF'}</div>
            <div className="small">Puedes subir varias referencias. Los PDF se convierten en una imagen por página.</div>
          </button>
        )}
      </FilePick>
      {refs.length > 0 && (
        <div className="group">
          {refs.map((r, i) => (
            <div key={r.id} className="list-row">
              <span className="lead"><Icon name="image" /></span>
              <span className="grow small">{r.name}</span>
              {origin !== 'patron-imagen' && (
                <div style={{ width: 170 }}>
                  <Select value={r.view} onChange={(v: ViewKind) => setRefs(refs.map((x, j) => (j === i ? { ...x, view: v } : x)))} options={Object.entries(VIEW_LABEL).map(([value, label]) => ({ value: value as ViewKind, label }))} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {origin === 'fotos' && <Notice>Después indicarás las medidas que conoces. La app separa lo que se puede inferir de lo que necesita revisión y no deduce dimensiones ocultas.</Notice>}
      <Button variant="primary" block onClick={create} disabled={!refs.length}>Crear proyecto</Button>
    </div>
  );
}

function FromIntervention({ onClose }: { onClose: () => void }) {
  const put = useApp((s) => s.put);
  const profiles = useApp((s) => s.profiles);
  const [mid, setMid] = useState(INTERVENE[0]);
  const [choice, setChoice] = useState<ProfileChoice>({ type: 'ninguno' });
  const create = () => {
    const model = findModel(mid)!;
    const profile = resolveProfile(choice, put, profiles);
    const p = blankProject(`Intervención: ${model.name.replace(/^Intervenir (una|un) /, '')}`, 'intervencion');
    p.modelId = model.id;
    p.design = newDesign(viewsFromModel(model, templateScaleFor(model, profile?.kind, profile ? currentValues(profile) : undefined)));
    if (profile) p.profileRef = { profileId: profile.id, versionId: profile.currentVersionId };
    p.status = 'diseno';
    put('project', p);
    onClose();
    navigate(`/estudio/${p.id}`);
  };
  return (
    <div className="stack">
      <Field label="Prenda a intervenir" hint="Usa la plantilla o, después, agrega fotos de tu prenda como vistas del estudio.">
        <Select value={mid} onChange={setMid} options={INTERVENE.map((id) => ({ value: id, label: findModel(id)!.name.replace(/^Intervenir (una|un) /, '').replace(/^./, (c) => c.toUpperCase()) }))} />
      </Field>
      <ProfilePicker value={choice} onChange={setChoice} allowNone />
      <Button variant="primary" block onClick={create}>Crear y abrir el estudio</Button>
    </div>
  );
}

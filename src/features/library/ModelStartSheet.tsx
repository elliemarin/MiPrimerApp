import { useMemo, useState } from 'react';
import type { CatalogModel, Recipient } from '../../data/catalog';
import { useApp } from '../../store/app';
import { Button, Field, LengthInput, Notice, Select, Sheet } from '../../ui/components';
import { quickSize, QUICK_SIZE_LABEL, type QuickSize } from '../../lib/sizes/quickSizes';
import { SIZE_TABLES, type PersonKind } from '../../lib/sizes/tables';
import { MEASURE_BY_KEY, type MeasureValues } from '../../lib/sizes/measurements';
import { getGenerator } from '../../lib/pattern/generators';
import type { Params } from '../../lib/pattern/generator';
import { blankProfile, profileFromSize } from '../../store/profiles';
import { projectFromModel } from '../../store/projects';
import { prepareSimpleProject } from '../simple/workflow';
import { navigate } from '../../ui/router';
import { formatLength } from '../../lib/units';
import { findCatalogGroup } from './groups';
import { ModelVariantPicker } from './ModelVariantPicker';

export function ModelStartSheet({ model: initialModel, intent, recipient, babySize, onClose }: { model: CatalogModel; intent: 'pattern' | 'customize'; recipient?: Recipient; babySize?: string; onClose: () => void }) {
  const app = useApp();
  const allGroup = useMemo(() => findCatalogGroup(initialModel.id), [initialModel.id]);
  const [selectedId, setSelectedId] = useState(initialModel.id);
  const gen = initialModel.generatorId ? getGenerator(initialModel.generatorId) : undefined;
  const needs = !!gen?.requiredMeasures.length;
  const recipients = recipient && initialModel.recipients.includes(recipient) ? [recipient] : (allGroup?.models ?? [initialModel]).flatMap(candidate => candidate.recipients);
  const kinds = [...new Set(recipients.flatMap(value => value === 'unisex' ? ['mujer', 'hombre'] as PersonKind[] : [value as PersonKind]))];
  const [kind, setKind] = useState<PersonKind>(() => {
    const initialKinds = (recipient ? [recipient] : initialModel.recipients).flatMap(value => value === 'unisex' ? ['mujer', 'hombre'] as PersonKind[] : [value as PersonKind]);
    return initialKinds.includes('mujer') ? 'mujer' : initialKinds[0] ?? 'mujer';
  });
  const group = useMemo(() => {
    if (!allGroup || !needs && !recipient) return allGroup;
    const person = needs ? kind : recipient!;
    const compatible = allGroup.models.filter(candidate => person !== 'otro' && candidate.recipients.includes(person) || (person === 'mujer' || person === 'hombre') && candidate.recipients.includes('unisex'));
    return { ...allGroup, models: compatible, representative: compatible.find(candidate => candidate.id === allGroup.representative.id) ?? compatible[0] };
  }, [allGroup, needs, kind, recipient]);
  const model = group?.models.find(candidate => candidate.id === selectedId) ?? group?.representative ?? initialModel;
  const directCostumeMeasures = model.collection === 'Disfraces' && !needs;
  const child = ['bebe','toddler','infantil'].includes(kind);
  const [size, setSize] = useState<QuickSize | 'custom'>('mediana');
  const [code, setCode] = useState(babySize ?? (kind === 'bebe' ? 'B0-3' : kind === 'toddler' ? 'E92' : 'E128'));
  const table = SIZE_TABLES.find(table => table.id === (kind === 'bebe' ? 'ref-bebe-meses' : 'ref-infantil-estatura'))!;
  const rows = table.rows.filter(row => row.kind === kind);
  const reference = child ? rows.find(row => row.code === code) ?? rows[0] : quickSize(kind, size === 'custom' ? 'mediana' : size).row;
  const [custom, setCustom] = useState<MeasureValues>({});
  const [objectParams, setObjectParams] = useState<Params>({});
  const objectDefaults = gen && !needs ? { ...gen.defaults({ body: {}, kind, fabric: model.fabrics[0], stretch: model.fabrics[0] === 'punto' ? 30 : 0, fit: model.fits[0] }), ...model.params, ...objectParams } : {};
  const [error, setError] = useState('');
  const missing = gen?.requiredMeasures.filter(key => !(Number.isFinite(custom[key]) && custom[key]! > 0)) ?? [];
  const create = () => {
    try {
      if (document.querySelector('.sheet input[aria-invalid="true"]')) throw new Error('Corrige las medidas marcadas antes de continuar.');
      let profile;
      if (needs) {
        if (size === 'custom') {
          if (missing.length) throw new Error('Completa las medidas indicadas para generar el patrón.');
          profile = blankProfile('Mis medidas', kind);
          profile.versions[0].values = { ...custom };
        } else profile = profileFromSize(child ? table : quickSize(kind,size).table, reference, child ? reference.label : `${QUICK_SIZE_LABEL[size]} · ${kind}`);
        app.put('profile', profile);
      }
      let project = projectFromModel(model, profile);
      if (project.pattern && !needs) project = { ...project, pattern: { ...project.pattern, params: { ...project.pattern.params, ...objectParams } } };
      if (intent === 'customize') project = prepareSimpleProject(project);
      app.put('project', project);
      onClose();
      navigate(intent === 'pattern' ? `/confeccion/${project.id}` : `/personalizar/${project.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa las medidas antes de continuar.'); }
  };
  return <Sheet title={intent === 'pattern' ? 'Tu patrón' : 'Tu diseño'} onClose={onClose} footer={<Button variant="primary" block onClick={create} disabled={needs && size === 'custom' && !!missing.length}>{intent === 'pattern' ? 'Preparar PDF' : 'Colocar extras'}</Button>}>
    <div className="stack-lg">
      <strong>{group?.name ?? model.name}</strong>
      {group && group.models.length > 1 && <ModelVariantPicker group={group} model={model} unit={app.settings.unit} onChange={next => { setSelectedId(next.id); setObjectParams({}); setError(''); }}/>}
      {needs ? <>
        <h3 className="section-title model-start-size-title">Talla corporal</h3>
        {kinds.length > 1 && <Field label="Para quién" htmlFor="simple-kind"><Select id="simple-kind" value={kind} onChange={value => { setKind(value); setCustom({}); setObjectParams({}); setError(''); }} options={kinds.map(value => ({ value, label: value === 'mujer' ? 'Mujer' : value === 'hombre' ? 'Hombre' : value === 'bebe' ? 'Bebé' : value === 'toddler' ? '1–4 años' : 'Infantil' }))} /></Field>}
        <div role="group" aria-label="Tamaño" className="row-wrap">
          {!child && (['chica','mediana','grande'] as QuickSize[]).map(value => <button key={value} className="filter-chip" aria-pressed={size === value} onClick={() => setSize(value)}>{QUICK_SIZE_LABEL[value]}</button>)}
          {child && <button className="filter-chip" aria-pressed={size !== 'custom'} onClick={() => setSize('mediana')}>Por {kind === 'bebe' ? 'meses' : 'estatura'}</button>}
          <button className="filter-chip" aria-pressed={size === 'custom'} onClick={() => setSize('custom')}>A medida</button>
        </div>
        {size !== 'custom' ? <>
          {child && <Field label={kind === 'bebe' ? 'Talla por meses' : 'Talla por estatura'} htmlFor="simple-child-size"><Select id="simple-child-size" value={reference.code} onChange={setCode} options={rows.map(row => ({ value: row.code, label: `${row.label} · ${formatLength(row.values.estatura!,app.settings.unit)}` }))} /></Field>}
          <p className="small muted">{['pecho','cintura','cadera','estatura'].filter(key => reference.values[key as keyof MeasureValues]).map(key => `${MEASURE_BY_KEY[key as keyof typeof MEASURE_BY_KEY].label}: ${formatLength(reference.values[key as keyof MeasureValues]!, app.settings.unit)}`).join(' · ')}</p>
          <p className="tiny muted">Tallas de referencia de Hilvana. Comprueba los contornos antes de cortar; también puedes indicar tus medidas.</p>
        </> : <div className="grid-2">{[...new Set([...(gen?.requiredMeasures ?? []), ...(gen?.optionalMeasures ?? [])])].map(key => <Field key={key} label={`${MEASURE_BY_KEY[key].label}${gen?.requiredMeasures.includes(key) ? '' : ' (opcional)'}`} htmlFor={`custom-${key}`} hint={MEASURE_BY_KEY[key].how}><LengthInput id={`custom-${key}`} mm={custom[key]} min={1} max={3000} onChange={value => setCustom(current => ({ ...current, [key]: value }))} /></Field>)}</div>}
      </> : <div className="stack"><p className="muted small">{directCostumeMeasures ? 'Ajusta las medidas indicadas para esta versión. Comprueba los contornos antes de cortar.' : 'Este accesorio usa las medidas del objeto indicadas en su ficha. No necesita talla corporal.'}</p>{gen?.params.some(param=>param.group==='diseno'&&param.type==='length')&&<details className="panel panel-pad"><summary>{directCostumeMeasures ? 'Ajustar medidas' : 'Ajustar medidas del objeto'}</summary><div className="grid-2" style={{marginTop:14}}>{gen.params.filter(param=>param.group==='diseno'&&param.type==='length'&&(!param.when||param.when(objectDefaults))).map(param=><Field key={param.key} label={param.label} htmlFor={`object-${param.key}`} hint={param.help}><LengthInput id={`object-${param.key}`} mm={typeof objectDefaults[param.key]==='number'?objectDefaults[param.key] as number:undefined} min={param.min??1} max={param.max??3000} onChange={value=>value!==undefined&&setObjectParams(values=>({...values,[param.key]:value}))}/></Field>)}</div></details>}</div>}
      {error && <Notice tone="err">{error}</Notice>}
      {gen?.status === 'experimental' && <p className="tiny muted">Patrón experimental: comprueba la impresión y cose una muestra.</p>}
    </div>
  </Sheet>;
}

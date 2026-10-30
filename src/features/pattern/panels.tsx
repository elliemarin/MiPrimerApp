import { useState } from 'react';
import { useApp } from '../../store/app';
import type { BuiltPattern, PatternState, RefLayer, Overlay } from '../../lib/pattern/engine';
import { acceptReview, resetOverrides, estimateFabric, autoLayout } from '../../lib/pattern/engine';
import { getGenerator } from '../../lib/pattern/generators';
import { FIT_LABEL, Fit, PARAM_GROUP_LABEL, ParamGroup, ParamDef, Params } from '../../lib/pattern/generator';
import { Button, Chip, Field, FilePick, LengthInput, Notice, NumberInput, Segmented, Select, Switch, Len } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { formatLength, formatNumber } from '../../lib/units';
import { MEASURE_BY_KEY } from '../../lib/sizes/measurements';
import { KIND_LABEL, PersonKind, SIZE_TABLES } from '../../lib/sizes/tables';
import { edgeLength } from '../../lib/pattern/outline';
import type { Piece, EdgeFinish } from '../../lib/pattern/types';
import type { Project } from '../../store/types';
import { currentValues, makeVersion, patternHash } from '../../store/projects';
import { navigate } from '../../ui/router';
import { uid } from '../../lib/ids';
import { importImageFiles } from '../../lib/image';
import { OVERLAY_COLORS } from './Overlays';

const FINISH_LABEL: Record<EdgeFinish, string> = { costura: 'Costura', dobladillo: 'Dobladillo', jareta: 'Jareta', doblez: 'Al doblez', orillo: 'Orillo', 'sin-margen': 'Sin margen' };

export function ParamsPanel({ project, state, built, commit }: { project: Project; state: PatternState; built: BuiltPattern | null; commit: (s: PatternState) => void }) {
  const profiles = useApp((s) => s.profiles);
  const updateProject = useApp((s) => s.updateProject);
  const unit = useApp((s) => s.settings.unit);
  const gen = getGenerator(state.generatorId);
  const ref = state.measurementRef;
  const prof = ref ? profiles[ref.profileId] : undefined;
  const linked = prof?.versions.find((v) => v.id === ref?.versionId);
  const current = prof?.versions.find((v) => v.id === prof.currentVersionId);
  if (!gen) return <Notice>Patrón manual: las piezas se trazan sobre referencias y se editan punto por punto. No dependen de medidas.</Notice>;
  const ctx = { body: state.body, ...state.context };
  const defaults = gen.defaults(ctx);
  const params: Params = { ...defaults, ...state.params };
  const setParam = (k: string, v: Params[string] | undefined) => {
    const next = { ...state.params };
    if (v === undefined) delete next[k];
    else next[k] = v;
    commit({ ...state, params: next });
  };
  const useVersion = (versionId: string) => {
    const v = prof!.versions.find((x) => x.id === versionId)!;
    commit({ ...state, body: { ...v.values }, measurementRef: { profileId: prof!.id, versionId }, context: { ...state.context, kind: prof!.kind } });
    updateProject(project.id, (p) => ({ ...p, profileRef: { profileId: prof!.id, versionId } }), `Patrón actualizado a medidas versión ${v.n} de ${prof!.name}.`);
  };
  const linkProfile = (id: string) => {
    const p = profiles[id];
    commit({ ...state, body: currentValues(p), measurementRef: { profileId: p.id, versionId: p.currentVersionId }, context: { ...state.context, kind: p.kind } });
    updateProject(project.id, (pp) => ({ ...pp, profileRef: { profileId: p.id, versionId: p.currentVersionId } }), `Perfil de medidas vinculado: ${p.name}.`);
  };
  const groups = (['diseno', 'holgura', 'margenes'] as ParamGroup[]).map((g) => ({ g, defs: gen.params.filter((d) => d.group === g && (!d.when || d.when(params))) }));
  return (
    <div className="stack-lg">
      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Medidas del cuerpo</h3>
        {gen.requiredMeasures.length === 0 ? (
          <p className="small muted">Este patrón usa las medidas del objeto (abajo), no del cuerpo.</p>
        ) : prof ? (
          <div className="panel panel-pad stack" style={{ gap: 8 }}>
            <div className="spread">
              <div>
                <div style={{ fontWeight: 600 }}>{prof.name}</div>
                <div className="small muted">{KIND_LABEL[prof.kind]} · versión {linked?.n ?? '?'}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/medidas/${prof.id}`)}>Editar</Button>
            </div>
            {current && linked && current.id !== linked.id && (
              <Notice tone="warn">
                Hay una versión más reciente ({current.n}).{' '}
                <button className="btn-ghost" style={{ border: 0, background: 'none', color: 'inherit', fontWeight: 700, textDecoration: 'underline', padding: 0 }} onClick={() => useVersion(current.id)}>
                  Usar versión {current.n}
                </button>
                . Los ajustes manuales quedarán marcados para revisión.
              </Notice>
            )}
          </div>
        ) : (
          <Field label="Vincular un perfil de medidas">
            <Select value="" onChange={(v) => v && linkProfile(v)} options={[{ value: '', label: 'Elegir perfil…' }, ...Object.values(profiles).map((p) => ({ value: p.id, label: p.name }))]} />
          </Field>
        )}
        {built && built.missing.length > 0 && (
          <Notice tone="err">
            Faltan medidas: {built.missing.map((k) => MEASURE_BY_KEY[k].label).join(', ')}. {prof ? <a href={`#/medidas/${prof.id}`}>Complétalas en el perfil</a> : 'Vincula un perfil.'}
          </Notice>
        )}
      </section>

      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Persona, tejido y ajuste</h3>
        <Field label="Para">
          <Select value={state.context.kind} onChange={(k: PersonKind) => commit({ ...state, context: { ...state.context, kind: k } })} options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value: value as PersonKind, label }))} />
        </Field>
        <Field label="Tejido">
          <Segmented value={state.context.fabric} onChange={(f) => commit({ ...state, context: { ...state.context, fabric: f, stretch: f === 'plano' ? 0 : state.context.stretch || 30 } })} options={[{ value: 'plano', label: 'Plano' }, { value: 'punto', label: 'Punto' }]} />
        </Field>
        {state.context.fabric === 'punto' && (
          <Field label={`Elasticidad horizontal: ${state.context.stretch} %`}>
            <input type="range" min={0} max={100} step={5} value={state.context.stretch} onChange={(e) => commit({ ...state, context: { ...state.context, stretch: Number(e.target.value) } })} />
          </Field>
        )}
        <Field label="Ajuste">
          <Segmented value={state.context.fit} onChange={(f: Fit) => commit({ ...state, context: { ...state.context, fit: f } })} options={(Object.keys(FIT_LABEL) as Fit[]).map((f) => ({ value: f, label: FIT_LABEL[f] }))} />
        </Field>
      </section>

      {groups.map(({ g, defs }) =>
        defs.length ? (
          <section key={g} className="stack">
            <h3 className="section-title" style={{ margin: 0 }}>{PARAM_GROUP_LABEL[g]}</h3>
            {defs.map((d) => (
              <ParamField key={d.key} def={d} value={params[d.key]} def0={defaults[d.key]} overridden={state.params[d.key] !== undefined} onChange={(v) => setParam(d.key, v)} />
            ))}
          </section>
        ) : null
      )}

      {built?.result && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Del cuerpo a la prenda</h3>
          <div className="panel table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Medida</th>
                  <th className="n">Cuerpo</th>
                  <th className="n">Holgura</th>
                  <th className="n">Prenda</th>
                  <th className="n">Patrón</th>
                </tr>
              </thead>
              <tbody>
                {built.result.checks.map((c) => (
                  <tr key={c.key}>
                    <td>{c.label.replace(' de la prenda terminada', '').replace(' terminado', '')}</td>
                    <td className="n">{c.body !== undefined ? formatLength(c.body, unit, { suffix: false }) : '—'}</td>
                    <td className="n">{c.ease !== undefined ? `+${formatLength(c.ease, unit, { suffix: false })}` : '—'}</td>
                    <td className="n"><span className="measure">{formatLength(c.target, unit, { suffix: false })}</span></td>
                    <td className="n">
                      {Math.abs(c.measured - c.target) <= c.tolerance ? <Icon name="check" size={16} /> : <span style={{ color: 'var(--thread)' }}>{formatLength(c.measured, unit, { suffix: false })}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tiny faint">Medidas en {unit}. La holgura se aplica una sola vez. Los márgenes de costura y dobladillos se agregan fuera de la línea de costura y no cambian la medida de la prenda terminada.</p>
        </section>
      )}
    </div>
  );
}

function ParamField({ def, value, def0, overridden, onChange }: { def: ParamDef; value: Params[string]; def0: Params[string]; overridden: boolean; onChange: (v: Params[string] | undefined) => void }) {
  const unit = useApp((s) => s.settings.unit);
  const reset = overridden ? (
    <button className="tiny" style={{ border: 0, background: 'none', color: 'var(--mat)', padding: 0, cursor: 'pointer' }} onClick={() => onChange(undefined)}>
      Usar valor sugerido{typeof def0 === 'number' && def.type === 'length' ? ` (${formatLength(def0, unit)})` : typeof def0 === 'number' ? ` (${formatNumber(def0, 2)})` : ''}
    </button>
  ) : undefined;
  if (def.type === 'choice')
    return (
      <Field label={def.label} hint={def.help}>
        <Segmented value={String(value)} onChange={(v) => onChange(v)} options={def.choices!} />
      </Field>
    );
  if (def.type === 'ratio')
    return (
      <Field label={def.label} hint={reset ?? def.help}>
        <NumberInput value={Number(value)} min={def.min} max={def.max} onChange={(v) => onChange(v)} suffix="×" />
      </Field>
    );
  return (
    <Field label={def.label} hint={reset ?? def.help}>
      <LengthInput mm={Number(value)} min={def.min} max={def.max} onChange={(v) => onChange(v)} />
    </Field>
  );
}

export function PiecePanel({ state, built, piece, commit, onSelect }: { state: PatternState; built: BuiltPattern | null; piece?: Piece; commit: (s: PatternState) => void; onSelect: (id: string) => void }) {
  const unit = useApp((s) => s.settings.unit);
  if (!built) return null;
  if (!piece)
    return (
      <div className="stack">
        <p className="muted small">Toca una pieza en el lienzo o elígela aquí.</p>
        <div className="group">
          {built.pieces.map((p) => (
            <button key={p.id} className="list-row" onClick={() => onSelect(p.id)}>
              <span className="lead"><Icon name="patronaje" /></span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>{p.name}</span>
                <span className="s">{p.source === 'manual' ? 'Pieza manual' : 'Generada'} · {p.cut.onFold ? `${p.cut.qty} al doblez` : `cortar ${p.cut.qty}`}</span>
              </span>
              <Icon name="chev" className="chev" />
            </button>
          ))}
        </div>
      </div>
    );
  const custom = state.customPieces.find((p) => p.id === piece.id);
  const lay = state.layout[piece.id] ?? { x: 0, y: 0, rot: 0, mirror: false };
  const setLay = (l: Partial<typeof lay>) => commit({ ...state, layout: { ...state.layout, [piece.id]: { ...lay, ...l } } });
  const setAllowance = (edgeId: string, mm: number) => {
    if (custom) commit({ ...state, customPieces: state.customPieces.map((p) => (p.id !== piece.id ? p : { ...p, edges: p.edges.map((e) => (e.id === edgeId ? { ...e, allowance: e.finish === 'doblez' ? 0 : mm } : e)) })) });
    else commit({ ...state, allowances: { ...state.allowances, [piece.id]: { ...(state.allowances[piece.id] ?? {}), [edgeId]: mm } } });
  };
  const updateCustom = (fn: (p: Piece) => Piece) => commit({ ...state, customPieces: state.customPieces.map((p) => (p.id === piece.id ? fn(p) : p)) });
  const noExport = state.noExport?.includes(piece.id);
  const reviewCount = built.review.filter((r) => r.pieceId === piece.id).length;
  const hasOverrides = !!state.overrides[piece.id] && Object.keys(state.overrides[piece.id]).length > 0;
  return (
    <div className="stack-lg">
      <div className="stack" style={{ gap: 6 }}>
        {custom ? (
          <Field label="Nombre">
            <input className="input" value={custom.name} onChange={(e) => updateCustom((p) => ({ ...p, name: e.target.value }))} />
          </Field>
        ) : (
          <h3 style={{ fontSize: 20 }}>{piece.name}</h3>
        )}
        <div className="row-wrap">
          <Chip>{piece.source === 'manual' ? 'Manual' : 'Generada'}</Chip>
          <Chip>{piece.cut.onFold ? `${piece.cut.qty} al doblez` : `Cortar ${piece.cut.qty}${piece.cut.mirrorPairs ? ' en par' : ''}`}</Chip>
          {noExport && <Chip tone="off">No se exporta</Chip>}
          {reviewCount > 0 && <Chip tone="warn">{reviewCount} ajustes por revisar</Chip>}
        </div>
        {piece.notes?.map((n) => <p key={n} className="small muted">{n}</p>)}
      </div>

      <div className="row-wrap">
        <Button size="sm" icon="rotate" onClick={() => setLay({ rot: (lay.rot + 90) % 360 })}>Girar 90°</Button>
        <Button size="sm" icon="mirror" onClick={() => setLay({ mirror: !lay.mirror })}>Reflejar</Button>
        <Button
          size="sm"
          icon="copy"
          onClick={() => {
            const id = uid('pieza');
            const copy: Piece = { ...JSON.parse(JSON.stringify(piece)), id, name: `${piece.name} (copia)`, source: 'manual' };
            commit({ ...state, customPieces: [...state.customPieces, copy], layout: { ...state.layout, [id]: { ...lay, x: lay.x + 60, y: lay.y + 60 } } });
            onSelect(id);
          }}
        >
          Duplicar
        </Button>
        <Button size="sm" icon={noExport ? 'eye' : 'eyeoff'} onClick={() => commit({ ...state, noExport: noExport ? state.noExport!.filter((x) => x !== piece.id) : [...(state.noExport ?? []), piece.id] })}>
          {noExport ? 'Incluir al exportar' : 'Excluir al exportar'}
        </Button>
      </div>
      {custom && (
        <div className="grid-2">
          <Field label="Cantidad a cortar">
            <NumberInput value={custom.cut.qty} min={1} max={20} step={1} onChange={(v) => updateCustom((p) => ({ ...p, cut: { ...p.cut, qty: Math.round(v) } }))} />
          </Field>
          <Field label="Tela">
            <Select value={custom.cut.fabric} onChange={(f) => updateCustom((p) => ({ ...p, cut: { ...p.cut, fabric: f } }))} options={[{ value: 'principal', label: 'Principal' }, { value: 'contraste', label: 'Contraste' }, { value: 'forro', label: 'Forro' }, { value: 'entretela', label: 'Entretela' }, { value: 'punto-elastico', label: 'Punto elástico' }]} />
          </Field>
        </div>
      )}

      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Bordes</h3>
        <div className="group">
          {piece.edges.map((e) => (
            <div key={e.id} className="list-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
              <div className="spread" style={{ width: '100%' }}>
                <span className="t small">{e.label}</span>
                <span className="measure">{formatLength(edgeLength(piece, e), unit, { decimals: unit === 'cm' ? 2 : 3 })}</span>
              </div>
              <div className="row" style={{ width: '100%' }}>
                <div className="grow">
                  {e.finish === 'doblez' ? (
                    <span className="small muted">Al doblez: sin margen</span>
                  ) : (
                    <LengthInput mm={e.allowance} min={0} max={120} onChange={(v) => v !== undefined && setAllowance(e.id, v)} />
                  )}
                </div>
                {custom ? (
                  <div style={{ width: 140 }}>
                    <Select value={e.finish} onChange={(f: EdgeFinish) => updateCustom((p) => ({ ...p, edges: p.edges.map((x) => (x.id === e.id ? { ...x, finish: f, allowance: f === 'doblez' ? 0 : x.allowance } : x)) }))} options={Object.entries(FINISH_LABEL).map(([value, label]) => ({ value: value as EdgeFinish, label }))} />
                  </div>
                ) : (
                  <Chip>{FINISH_LABEL[e.finish]}</Chip>
                )}
              </div>
              {custom && (
                <button
                  className="tiny"
                  style={{ border: 0, background: 'none', color: 'var(--mat)', padding: 0, cursor: 'pointer' }}
                  onClick={() =>
                    updateCustom((p) => ({
                      ...p,
                      edges: p.edges.map((x) => {
                        if (x.id !== e.id) return x;
                        if (x.kind === 'cubic') return { ...x, kind: 'line', c1: undefined, c2: undefined };
                        const a = p.nodes.find((n) => n.id === x.from)!;
                        const b = p.nodes.find((n) => n.id === x.to)!;
                        return { ...x, kind: 'cubic', c1: { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 }, c2: { x: a.x + (2 * (b.x - a.x)) / 3, y: a.y + (2 * (b.y - a.y)) / 3 } };
                      })
                    }))
                  }
                >
                  {e.kind === 'cubic' ? 'Convertir en recta' : 'Convertir en curva'}
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="tiny faint">Longitudes medidas sobre la línea de costura. El margen de cada borde se aplica una sola vez.</p>
      </section>

      {hasOverrides && !custom && (
        <Button variant="danger" icon="undo" onClick={() => commit(resetOverrides(state, piece.id))}>
          Quitar ajustes manuales de esta pieza
        </Button>
      )}
      {custom && (
        <Button variant="danger" icon="trash" onClick={() => commit({ ...state, customPieces: state.customPieces.filter((p) => p.id !== piece.id) })}>
          Eliminar pieza manual
        </Button>
      )}
    </div>
  );
}

export function ReviewPanel({ project, state, built, commit, onShowSeam }: { project: Project; state: PatternState; built: BuiltPattern | null; commit: (s: PatternState) => void; onShowSeam: (a: { pieceId: string; edgeId: string }[], b: { pieceId: string; edgeId: string }[]) => void }) {
  const unit = useApp((s) => s.settings.unit);
  const updateProject = useApp((s) => s.updateProject);
  const [fabricW, setFabricW] = useState<number | undefined>(1400);
  const [label, setLabel] = useState('');
  if (!built) return null;
  const errors = built.issues.filter((i) => i.level === 'error');
  const warns = built.issues.filter((i) => i.level === 'aviso');
  const oks = built.issues.filter((i) => i.level === 'ok');
  const est = fabricW ? estimateFabric(built.pieces.filter((p) => !state.hidden.includes(p.id)), built.cuts, fabricW) : [];
  const last = project.patternVersions[project.patternVersions.length - 1];
  const dirty = !last || last.hash !== patternHash(state);
  const saveVersion = () => {
    updateProject(project.id, (p) => ({ ...p, patternVersions: [...p.patternVersions, makeVersion(p.patternVersions, state, label.trim() || `Versión ${(last?.n ?? 0) + 1}`)] }), 'Versión del patrón guardada.');
    setLabel('');
  };
  return (
    <div className="stack-lg">
      {errors.length === 0 ? (
        <Notice tone="ok">Geometría verificada: contornos cerrados, sin cruces, márgenes uniformes y costuras que corresponden.</Notice>
      ) : (
        <Notice tone="err">Hay {errors.length} {errors.length === 1 ? 'problema' : 'problemas'} que corregir antes de exportar.</Notice>
      )}
      {[...errors, ...warns].length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          {[...errors, ...warns].map((i, k) => (
            <Notice key={k} tone={i.level === 'error' ? 'err' : 'warn'}>{i.message}</Notice>
          ))}
        </div>
      )}
      {built.review.length > 0 && (
        <div className="row-wrap">
          <Button size="sm" variant="primary" onClick={() => commit(acceptReview(state, built.generated))}>Aceptar ajustes manuales</Button>
          <Button size="sm" variant="danger" onClick={() => commit(resetOverrides(state))}>Descartar ajustes</Button>
        </div>
      )}
      {oks.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {oks.map((i, k) => (
            <div key={k} className="row small" style={{ color: 'var(--mat)', alignItems: 'flex-start' }}>
              <Icon name="check" size={18} /> <span style={{ color: 'var(--ink-2)' }}>{i.message}</span>
            </div>
          ))}
        </div>
      )}
      {built.seamResults.length > 0 && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Correspondencia de costuras</h3>
          <div className="group">
            {built.seamResults.map((r) => (
              <button key={r.relation.id} className="list-row" style={{ alignItems: 'flex-start' }} onClick={() => onShowSeam(r.relation.a.flatMap((s) => s.edgeIds.map((e) => ({ pieceId: s.pieceId, edgeId: e }))), r.relation.b.flatMap((s) => s.edgeIds.map((e) => ({ pieceId: s.pieceId, edgeId: e }))))}>
                <span style={{ color: r.ok ? 'var(--mat)' : 'var(--thread)', marginTop: 2 }}><Icon name={r.ok ? 'ok' : 'warn'} size={20} /></span>
                <span className="grow">
                  <span className="t small" style={{ display: 'block' }}>{r.relation.label}</span>
                  <span className="s num">
                    {formatLength(r.lengthA, unit)} · {formatLength(r.lengthB, unit)} · {r.relation.kind === 'igual' ? `Δ ${formatLength(Math.abs(r.lengthA - r.lengthB), unit, { decimals: unit === 'cm' ? 2 : 3 })}` : `relación ${r.ratio.toFixed(2)} (${r.relation.ratioMin}–${r.relation.ratioMax})`}
                  </span>
                </span>
                <span className="small" style={{ color: 'var(--mat)' }}>Ver</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {built.result && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Supuestos del patrón</h3>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
            {built.result.assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>
      )}

      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Consumo estimado de tela</h3>
        <Field label="Ancho de la tela">
          <LengthInput mm={fabricW} min={300} max={3200} onChange={setFabricW} />
        </Field>
        {est.map((e) => (
          <div key={e.fabric} className="panel panel-pad stack" style={{ gap: 6 }}>
            <div className="spread">
              <strong>{{ principal: 'Tela principal', contraste: 'Contraste', forro: 'Forro', entretela: 'Entretela', 'punto-elastico': 'Punto elástico' }[e.fabric as 'principal']}</strong>
              <span className="measure"><Len mm={e.lengthMm} /></span>
            </div>
            <ul className="tiny muted" style={{ margin: 0, paddingLeft: 16 }}>
              {e.assumptions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        ))}
        {built.result?.materials.map((m) => (
          <div key={m.id} className="spread small">
            <span>{m.label}</span>
            <span className="num muted">{m.qty}</span>
          </div>
        ))}
      </section>

      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Versiones</h3>
        {last?.approved && dirty && <Notice tone="warn">La versión {last.n} está aprobada. Guardar crea una versión nueva; la aprobada no se reemplaza.</Notice>}
        <div className="row">
          <input className="input grow" placeholder={`Nombre (p. ej. «Muestra 1 ajustada»)`} value={label} onChange={(e) => setLabel(e.target.value)} />
          <Button variant="primary" onClick={saveVersion} disabled={!dirty}>Guardar versión</Button>
        </div>
        <p className="tiny faint">{dirty ? 'Hay cambios desde la última versión guardada.' : `Coincide con la versión ${last?.n}.`} Compara, aprueba o restaura en la pestaña Versiones del proyecto.</p>
      </section>
      {built.pieces.length > 0 && (
        <Button size="sm" variant="ghost" icon="grid" onClick={() => commit({ ...state, layout: autoLayout(built.pieces, built.cuts, 1500, 40) })}>
          Reacomodar piezas en el lienzo
        </Button>
      )}
    </div>
  );
}

export function LayersPanel({ project, state, commit, showAllowance, setShowAllowance, onCalibrate }: { project: Project; state: PatternState; commit: (s: PatternState) => void; showAllowance: boolean; setShowAllowance: (v: boolean) => void; onCalibrate: (layerId: string) => void }) {
  const addFile = useApp((s) => s.addFile);
  const updateProject = useApp((s) => s.updateProject);
  const toast = useApp((s) => s.toast);
  const layers = state.refLayers ?? [];
  const imgRefs = project.references;
  const addLayerFromRef = async (refId: string) => {
    const r = project.references.find((x) => x.id === refId)!;
    const fileId = r.corrected?.fileId ?? r.fileId;
    const { getFile } = await import('../../lib/db');
    const { loadBitmap } = await import('../../lib/image');
    const f = await getFile(fileId);
    if (!f) return;
    const img = await loadBitmap(f.blob);
    const mmPerPx = r.corrected ? r.corrected.wMm / img.naturalWidth : r.mmPerPx ?? 0.5;
    const layer: RefLayer = {
      id: uid('capa'),
      refId,
      fileId,
      name: r.name,
      x: 0,
      y: 0,
      rotation: 0,
      mmPerPx,
      pxW: img.naturalWidth,
      pxH: img.naturalHeight,
      opacity: 0.6,
      visible: true,
      locked: false,
      calibrated: !!(r.corrected || r.mmPerPx),
      scaleNote: r.corrected ? 'Perspectiva corregida con medidas conocidas' : r.mmPerPx ? (r.sourceFileId ? 'Escala tomada del PDF: verifica que el original esté a 1:1' : 'Escala calibrada') : 'Sin calibrar: usa Calibrar con una distancia conocida'
    };
    commit({ ...state, refLayers: [...layers, layer] });
  };
  const setLayer = (id: string, patch: Partial<RefLayer>) => commit({ ...state, refLayers: layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const overlays = state.overlays ?? [];
  const otherVersions = project.patternVersions;
  const gen = getGenerator(state.generatorId);
  const tableRef = state.measurementRef ? useApp.getState().profiles[state.measurementRef.profileId]?.versions.find((v) => v.id === state.measurementRef!.versionId)?.source : undefined;
  const tableId = tableRef && tableRef.type === 'tabla' ? tableRef.tableId : state.context.kind === 'hombre' ? 'ref-hombre-pecho' : state.context.kind === 'mujer' || state.context.kind === 'otro' ? 'ref-mujer-busto' : 'ref-infantil-estatura';
  const table = SIZE_TABLES.find((t) => t.id === tableId)!;
  const addOverlay = (o: Overlay) => commit({ ...state, overlays: [...overlays, o] });
  return (
    <div className="stack-lg">
      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Vista</h3>
        <Switch label="Mostrar margen y línea de corte" checked={showAllowance} onChange={setShowAllowance} />
      </section>
      <section className="stack">
        <h3 className="section-title" style={{ margin: 0 }}>Imágenes de referencia</h3>
        {layers.length === 0 && <p className="small muted">Coloca una foto o PDF de un patrón bajo las piezas para calibrarlo y trazarlo.</p>}
        {layers.map((l) => (
          <div key={l.id} className="panel panel-pad stack" style={{ gap: 8 }}>
            <div className="spread">
              <strong className="small">{l.name}</strong>
              <div className="row" style={{ gap: 0 }}>
                <button className="icon-btn" aria-label={l.visible ? 'Ocultar' : 'Mostrar'} onClick={() => setLayer(l.id, { visible: !l.visible })}><Icon name={l.visible ? 'eye' : 'eyeoff'} /></button>
                <button className="icon-btn" aria-label="Quitar capa" onClick={() => commit({ ...state, refLayers: layers.filter((x) => x.id !== l.id) })}><Icon name="trash" /></button>
              </div>
            </div>
            <Chip tone={l.calibrated ? 'ok' : 'warn'}>{l.calibrated ? 'Escala física' : 'Sin calibrar'}</Chip>
            <span className="tiny muted">{l.scaleNote}</span>
            <Field label={`Opacidad ${Math.round(l.opacity * 100)} %`}>
              <input type="range" min={0.1} max={1} step={0.05} value={l.opacity} onChange={(e) => setLayer(l.id, { opacity: Number(e.target.value) })} />
            </Field>
            <Field label={`Rotación ${Math.round(l.rotation)}°`}>
              <input type="range" min={-180} max={180} step={0.5} value={l.rotation} onChange={(e) => setLayer(l.id, { rotation: Number(e.target.value) })} />
            </Field>
            <Button size="sm" icon="target" onClick={() => onCalibrate(l.id)}>Calibrar con una distancia conocida</Button>
          </div>
        ))}
        {imgRefs.length > 0 && (
          <Field label="Agregar desde las referencias del proyecto">
            <Select value="" onChange={(id) => id && void addLayerFromRef(id)} options={[{ value: '', label: 'Elegir referencia…' }, ...imgRefs.map((r) => ({ value: r.id, label: r.name }))]} />
          </Field>
        )}
        <FilePick
          accept="image/jpeg,image/png,application/pdf"
          onFiles={async (files) => {
            try {
              const imported = await importImageFiles(files);
              for (const im of imported) {
                const fileId = await addFile(im.blob, im.name);
                const sourceFileId = im.source ? await addFile(im.source, im.source.name) : undefined;
                const ref = { id: uid('ref'), fileId, sourceFileId, page: im.page, name: im.name, kind: 'patron' as const, view: 'detalle' as const, license: 'propia' as const, mmPerPx: im.mmPerPx };
                updateProject(project.id, (p) => ({ ...p, references: [...p.references, ref] }), `Referencia agregada: ${im.name}.`);
                const layer: RefLayer = { id: uid('capa'), refId: ref.id, fileId, name: im.name, x: 0, y: 0, rotation: 0, mmPerPx: im.mmPerPx ?? 0.5, pxW: im.width, pxH: im.height, opacity: 0.6, visible: true, locked: false, calibrated: !!im.mmPerPx, scaleNote: im.mmPerPx ? 'Escala tomada del PDF: verifica que el original esté a 1:1' : 'Sin calibrar: usa Calibrar con una distancia conocida' };
                state = { ...state, refLayers: [...(state.refLayers ?? []), layer] };
              }
              commit(state);
            } catch (e) {
              toast(e instanceof Error ? e.message : 'No se pudo leer el archivo.', 'error');
            }
          }}
        >
          {(open) => <Button icon="upload" onClick={open}>Subir imagen o PDF</Button>}
        </FilePick>
        <p className="tiny faint">Para fotos con perspectiva, corrígela primero en Proyecto → Referencias indicando el tamaño real de un rectángulo visible.</p>
      </section>

      {gen && (
        <section className="stack">
          <h3 className="section-title" style={{ margin: 0 }}>Comparar contornos</h3>
          <p className="small muted">Superpone otras tallas (anidado) o versiones guardadas para ver qué cambia.</p>
          {overlays.map((o, i) => (
            <div key={o.id} className="spread small">
              <span className="row" style={{ gap: 8 }}>
                <span style={{ width: 18, height: 3, background: OVERLAY_COLORS[i % OVERLAY_COLORS.length], display: 'inline-block' }} /> {o.label}
              </span>
              <button className="icon-btn" aria-label="Quitar" onClick={() => commit({ ...state, overlays: overlays.filter((x) => x.id !== o.id) })}><Icon name="close" /></button>
            </div>
          ))}
          {gen.requiredMeasures.length > 0 && (
            <Field label={`Talla de ${table.name.toLowerCase()}`}>
              <Select value="" onChange={(code) => code && addOverlay({ id: uid('sup'), type: 'talla', tableId: table.id, code, label: `Talla ${code}` })} options={[{ value: '', label: 'Agregar talla…' }, ...table.rows.map((r) => ({ value: r.code, label: r.code }))]} />
            </Field>
          )}
          {otherVersions.length > 0 && (
            <Field label="Versión guardada">
              <Select value="" onChange={(id) => { const v = otherVersions.find((x) => x.id === id); if (v) addOverlay({ id: uid('sup'), type: 'version', versionId: v.id, label: `Versión ${v.n}` }); }} options={[{ value: '', label: 'Agregar versión…' }, ...otherVersions.map((v) => ({ value: v.id, label: `Versión ${v.n} · ${v.label}` }))]} />
            </Field>
          )}
        </section>
      )}
    </div>
  );
}

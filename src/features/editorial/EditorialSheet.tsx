import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Field, Notice, Sheet, TextInput } from '../../ui/components';
import { saveBlob } from '../../lib/download';
import { buildEditorialBrief } from './prompt';
import { buildEditorialAssets } from './evidence';
import { buildEditorialPackage, editorialSourceKey } from './package';
import { canShareFiles, CHATGPT_URL, copyPrompt, shareEditorial } from './handoff';
import { physicalViewsNeedRefresh } from '../simple/workflow';
import './editorial.css';

type Prepared = {
  key: string;
  brief: ReturnType<typeof buildEditorialBrief>;
  assets: Awaited<ReturnType<typeof buildEditorialAssets>>['assets'];
  warnings: string[];
  package: Awaited<ReturnType<typeof buildEditorialPackage>>;
  urls: string[];
};

export function EditorialSheet({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const projects = useApp(state => state.projects);
  const fabrics = useApp(state => state.fabrics);
  const initial = useRef(projects[projectId]?.editorial);
  const [selected, setSelected] = useState<string[]>(() => [...new Set([projectId, ...(initial.current?.projectIds ?? []).filter(id => !!projects[id] && !projects[id].archived)])].slice(0, 6));
  const [title, setTitle] = useState(initial.current?.title ?? 'Mi look');
  const [mood, setMood] = useState(initial.current?.mood ?? '');
  const [lookNumber, setLookNumber] = useState(initial.current?.lookNumber ?? 1);
  const [prepared, setPrepared] = useState<Prepared>();
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState(false);
  const controller = useRef<AbortController>();
  const prompt = useRef<HTMLTextAreaElement>(null);
  const selectedProjects = useMemo(() => selected.map(id => projects[id]).filter(Boolean), [selected, projects]);
  const settings = { title, mood, lookNumber };
  const key = editorialSourceKey(selectedProjects, fabrics, settings);
  const stale = !!prepared && prepared.key !== key;
  const ready = !!prepared && !stale && !busy;
  const shareable = ready && canShareFiles(prepared.package.imageFiles);
  const alternatives = Object.values(projects).filter(project => !project.archived && project.id !== projectId && !!project.design?.views.length)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => prepared?.urls.forEach(url => URL.revokeObjectURL(url)), [prepared]);
  useEffect(() => { if (manual) { prompt.current?.focus(); prompt.current?.select(); } }, [manual]);

  const prepare = async () => {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setMessage(''); setManual(false); setProgress('Reuniendo tu diseño…');
    try {
      const source = useApp.getState();
      const snapshot = structuredClone(selected.map(id => source.projects[id]).filter(Boolean));
      const samples = structuredClone(source.fabrics);
      if (snapshot.some(project => physicalViewsNeedRefresh(project))) throw new Error('Cambió la talla o la base. Abre Extras y revisa las piezas antes de preparar la lámina.');
      const sourceKey = editorialSourceKey(snapshot, samples, settings);
      const brief = buildEditorialBrief({ projects: snapshot, fabrics: samples, ...settings });
      const references = await buildEditorialAssets({ projects: snapshot, fabrics: samples, title: brief.title }, {
        signal: abort.signal, onProgress: progress => { if (!abort.signal.aborted) setProgress(`${progress.completed}/${progress.total} · ${progress.label}`); }
      });
      if (abort.signal.aborted) return;
      setProgress('Preparando imágenes y texto…');
      const pack = await buildEditorialPackage(brief, references.assets);
      if (abort.signal.aborted) return;
      const savedSettings = { styleId: brief.styleId, title, mood, lookNumber, projectIds: selected };
      useApp.getState().updateProject(projectId, project => ({ ...project, editorial: savedSettings }));
      setPrepared({ key: sourceKey, brief, assets: references.assets, warnings: references.warnings, package: pack,
        urls: references.assets.map(asset => URL.createObjectURL(asset.blob)) });
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudieron preparar las referencias. Vuelve a intentarlo.');
    } finally { if (controller.current === abort) { setBusy(false); setProgress(''); } }
  };
  const copy = () => {
    if (!ready || !prepared) return;
    // Keep the native clipboard call in this click's activation window.
    void copyPrompt(prepared.brief.prompt).then(result => {
      setMessage(result.status === 'copied' ? 'Prompt copiado. Pégalo en ChatGPT junto con las imágenes.' : result.message ?? 'Selecciona el texto y usa Copiar.');
      setManual(result.status === 'manual');
    });
  };
  const share = () => {
    if (!ready || !prepared) return;
    setSharing(true); setMessage('');
    // Files are already built: no rendering/download before navigator.share.
    void shareEditorial({ files: prepared.package.imageFiles, prompt: prepared.brief.prompt, title: prepared.brief.title }).then(result => {
      if (result.status === 'shared') setMessage('Referencias entregadas a la app elegida. Revisa que estén las imágenes y el prompt antes de enviar.');
      else if (result.status === 'cancelled') setMessage('Compartir cancelado. Tus referencias siguen listas.');
      else setMessage(result.message);
    }).finally(() => setSharing(false));
  };
  return <Sheet title="Lámina con ChatGPT" wide onClose={onClose} footer={
    ready && prepared ? <div className="editorial-footer">
      {shareable && <Button variant="primary" disabled={sharing} onClick={share}>{sharing ? 'Compartiendo…' : 'Compartir…'}</Button>}
      <Button variant={shareable ? 'secondary' : 'primary'} disabled={sharing} onClick={() => void saveBlob(prepared.package.blob, prepared.package.filename)}>Descargar paquete</Button>
    </div> : <Button block variant="primary" disabled={busy || !selectedProjects.length} onClick={() => void prepare()}>{busy ? 'Preparando…' : stale ? 'Actualizar referencias' : 'Preparar referencias'}</Button>
  }>
    <div className="stack-lg editorial-sheet">
      <p className="muted">Prepara las imágenes y un prompt con el mismo estilo editorial para generar tu lámina en tu cuenta de ChatGPT.</p>
      <div className="editorial-style"><span className="editorial-style-look">LOOK {String(lookNumber).padStart(2, '0')}</span><div><strong>Estilo Hilvana</strong><p>Papel marfil, figura de frente y espalda, prendas, paleta de color y detalles textiles.</p></div></div>
      <details className="editorial-settings" open={!prepared}>
        <summary>Tu look · {selectedProjects.length} {selectedProjects.length === 1 ? 'prenda o accesorio' : 'prendas y accesorios'}</summary>
        <div className="stack-lg" style={{ marginTop: 16 }}>
          <div className="editorial-name-fields"><Field label="Nombre de la lámina" htmlFor="editorial-title"><TextInput id="editorial-title" value={title} onChange={setTitle} maxLength={100} disabled={busy}/></Field>
            <Field label="Número" htmlFor="editorial-number"><input id="editorial-number" className="input" type="number" min="1" max="99" value={lookNumber} disabled={busy} onChange={event => setLookNumber(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}/></Field></div>
          <Field label="Ambiente o idea (opcional)" htmlFor="editorial-mood"><TextInput id="editorial-mood" value={mood} onChange={setMood} maxLength={160} placeholder="Urbano, prendas amplias, colores cálidos…" disabled={busy}/></Field>
          <div className="editorial-current"><strong>Prenda principal</strong><span>{projects[projectId]?.name ?? 'Proyecto no disponible'}</span></div>
          {alternatives.length > 0 && <details><summary>Añadir otras prendas al look</summary><div className="editorial-projects">{alternatives.map(project => <label key={project.id}><input type="checkbox" checked={selected.includes(project.id)} disabled={busy || !selected.includes(project.id) && selected.length >= 6} onChange={event => setSelected(ids => event.target.checked ? [...ids, project.id] : ids.filter(id => id !== project.id))}/><span>{project.name}</span></label>)}</div><p className="tiny muted">Puedes combinar hasta seis proyectos. Solo se incluyen los que elijas.</p></details>}
        </div>
      </details>
      {busy && <p className="small" role="status">{progress}</p>}
      {error && <Notice tone="err">{error}</Notice>}
      {stale && <Notice tone="warn">Tu diseño o la selección cambió. Actualiza las referencias antes de compartirlas.</Notice>}
      {prepared && <>
        <div className="editorial-preview-heading"><strong>{prepared.assets.length} imágenes de referencia</strong><span className="tiny muted">Prendas, telas, colores y patrones</span></div>
        <div className={`editorial-assets${stale ? ' is-stale' : ''}`}>{prepared.assets.map((asset, index) => <figure key={asset.id}>
          <a href={prepared.urls[index]} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar ${asset.label}`}><img src={prepared.urls[index]} alt={asset.label}/></a>
          <figcaption><span>{asset.label}</span><Button size="sm" disabled={!ready} onClick={() => void saveBlob(asset.blob, asset.name)}>Descargar imagen {index + 1}</Button></figcaption>
        </figure>)}</div>
        {prepared.warnings.length > 0 && <details><summary>Revisar referencias · {prepared.warnings.length}</summary><ul className="editorial-warnings">{prepared.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
        <section className="stack editorial-send">
          <h3 className="section-title">Llévalo a ChatGPT</h3>
          <p className="small muted">{shareable ? 'Pulsa Compartir y elige ChatGPT si aparece. Revisa que lleguen las imágenes y el texto; después envía.' : 'Descarga las imágenes, adjúntalas en ChatGPT y pega el prompt. Después envía para generar la lámina.'}</p>
          <div className="row-wrap"><Button disabled={!ready || sharing} onClick={copy}>Copiar prompt</Button><a className={`btn${!ready ? ' editorial-disabled' : ''}`} href={ready ? CHATGPT_URL : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!ready}>Abrir ChatGPT</a></div>
          <p className="tiny muted">El paquete ZIP guarda todas las imágenes y el texto. Si compartes y la app no recibe el prompt, cópialo desde aquí.</p>
          <details open={manual}><summary>Ver prompt completo</summary><textarea ref={prompt} aria-label="Prompt de la lámina" className="input editorial-prompt" readOnly value={prepared.brief.prompt}/></details>
          {message && <p className="small" role="status">{message}</p>}
        </section>
        <p className="tiny muted">El estilo se mantiene en el prompt; cada imagen puede variar. Para cortar y coser utiliza el PDF de confección de Hilvana.</p>
      </>}
    </div>
  </Sheet>;
}

import { DesignDoc, DesignElement, DesignView, TECHNIQUE_LABEL } from './model';
import { Icon } from '../../ui/Icon';
import { moveToIndex, reorder, updateElements, ungroup, viewElements } from './ops';
import { Empty } from '../../ui/components';

export function LayersPanel({ doc, view, sel, setSel, commit }: { doc: DesignDoc; view: DesignView; sel: string[]; setSel: (s: string[]) => void; commit: (d: DesignDoc) => void }) {
  const els = viewElements(doc, view.id);
  const top = els.filter((e) => !e.parentId).slice().reverse();
  if (!els.length) return <Empty icon="layers" title="Sin elementos" body="Agrega formas, figuras, trazos, texto o imágenes con las herramientas." />;
  const row = (e: DesignElement, depth: number) => {
    const idx = els.findIndex((x) => x.id === e.id);
    return (
      <div key={e.id} className="list-row" style={{ minHeight: 50, paddingLeft: 10 + depth * 18, background: sel.includes(e.id) ? 'var(--mat-soft)' : undefined }}>
        <button className="grow" style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, minWidth: 0 }} onClick={() => setSel([e.id])}>
          <span className="t small" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {idx + 1}. {e.name}
          </span>
          <span className="tiny muted">{e.kind === 'grupo' ? 'Grupo' : TECHNIQUE_LABEL[e.technique]}</span>
        </button>
        <button className="icon-btn" aria-label="Subir" onClick={() => commit(reorder(doc, e.id, 'arriba'))}><Icon name="up" /></button>
        <button className="icon-btn" aria-label="Bajar" onClick={() => commit(reorder(doc, e.id, 'abajo'))}><Icon name="downarrow" /></button>
        <button className="icon-btn" aria-label={e.hidden ? 'Mostrar' : 'Ocultar'} onClick={() => commit(updateElements(doc, [e.id, ...doc.elements.filter((x) => x.parentId === e.id).map((x) => x.id)], (x) => ({ ...x, hidden: !e.hidden })))}><Icon name={e.hidden ? 'eyeoff' : 'eye'} /></button>
        <button className="icon-btn" aria-label={e.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => commit(updateElements(doc, [e.id], (x) => ({ ...x, locked: !x.locked })))}><Icon name={e.locked ? 'lock' : 'unlock'} /></button>
        {e.kind === 'grupo' && <button className="icon-btn" aria-label="Desagrupar" onClick={() => commit(ungroup(doc, e.id))}><Icon name="ungroup" /></button>}
      </div>
    );
  };
  return (
    <div className="stack">
      <p className="small muted">Arriba está lo que queda encima. El número es el orden de superposición que usará la guía (1 = abajo).</p>
      <div className="group">
        {top.map((e) => (
          <div key={e.id}>
            {row(e, 0)}
            {e.kind === 'grupo' && els.filter((x) => x.parentId === e.id).slice().reverse().map((c) => row(c, 1))}
          </div>
        ))}
      </div>
      {sel.length === 1 && (
        <div className="row-wrap">
          <button className="btn btn-sm" onClick={() => commit(moveToIndex(doc, sel[0], 999))}>Traer al frente</button>
          <button className="btn btn-sm" onClick={() => commit(moveToIndex(doc, sel[0], 0))}>Enviar al fondo</button>
        </div>
      )}
    </div>
  );
}

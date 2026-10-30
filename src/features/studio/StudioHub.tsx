import { useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Empty, PageHead } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { NewProjectSheet } from '../projects/NewProjectSheet';
import { findModel } from '../../data/catalog';
import { FlatArt } from '../../ui/FlatArt';

export function StudioHub() {
  const projects = useApp((s) => Object.values(s.projects).filter((p) => !p.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  const [creating, setCreating] = useState(false);
  const withDesign = projects.filter((p) => p.design);
  const without = projects.filter((p) => !p.design);
  return (
    <div className="page">
      <PageHead title="Estudio" sub="Diseña sobre fotos, dibujos técnicos o piezas: telas, collage, aplicaciones, bordado y acabados por zonas." actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Nuevo</Button>} />
      {withDesign.length === 0 ? (
        <Empty icon="estudio" title="Empieza a diseñar" body="Interviene una prenda que ya tienes, diseña un parche o crea un collage sobre un modelo del catálogo." action={<Button variant="primary" onClick={() => setCreating(true)}>Nuevo diseño</Button>} />
      ) : (
        <div className="cards">
          {withDesign.map((p) => {
            const m = p.modelId ? findModel(p.modelId) : undefined;
            return (
              <a key={p.id} className="card" href={`#/estudio/${p.id}`}>
                <div className="art">{m ? <FlatArt id={m.id} spec={m.flat} /> : <Icon name="estudio" size={48} />}</div>
                <div className="meta">
                  <span className="name">{p.name}</span>
                  <span className="sub">{p.design!.elements.length} elementos · {p.design!.views.length} vistas</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
      {without.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <h2 className="section-title">Proyectos sin diseño</h2>
          <div className="group">
            {without.map((p) => (
              <a key={p.id} className="list-row" href={`#/estudio/${p.id}`}>
                <span className="lead"><Icon name="estudio" /></span>
                <span className="grow t">{p.name}</span>
                <span className="small" style={{ color: 'var(--mat)' }}>Abrir estudio</span>
              </a>
            ))}
          </div>
        </section>
      )}
      {creating && <NewProjectSheet onClose={() => setCreating(false)} />}
    </div>
  );
}

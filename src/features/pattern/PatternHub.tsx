import { useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Empty, PageHead } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { GENERATORS, getGenerator } from '../../lib/pattern/generators';
import { NewProjectSheet } from '../projects/NewProjectSheet';

export function PatternHub() {
  const projects = useApp((s) => Object.values(s.projects).filter((p) => p.pattern && !p.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  const [creating, setCreating] = useState(false);
  return (
    <div className="page">
      <PageHead title="Patronaje" sub="Patrones paramétricos que se regeneran con las medidas, con costuras verificadas y exportación a escala real." actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Nuevo</Button>} />
      {projects.length > 0 && (
        <section style={{ marginBottom: 26 }}>
          <h2 className="section-title">Tus patrones</h2>
          <div className="group">
            {projects.map((p) => (
              <a key={p.id} className="list-row" href={`#/patronaje/${p.id}`}>
                <span className="lead"><Icon name="patronaje" /></span>
                <span className="grow">
                  <span className="t" style={{ display: 'block' }}>{p.name}</span>
                  <span className="s">{getGenerator(p.pattern!.generatorId)?.name ?? 'Patrón manual'} · {p.patternVersions.length ? `${p.patternVersions.length} versiones` : 'sin versiones guardadas'}</span>
                </span>
                <Icon name="chev" className="chev" />
              </a>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="section-title">Patrones base disponibles</h2>
        <div className="group">
          {GENERATORS.map((g) => (
            <button key={g.id} className="list-row" onClick={() => setCreating(true)}>
              <span className="lead"><Icon name="sparkle" /></span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>{g.name}</span>
                <span className="s">{g.summary}</span>
              </span>
              <span className="chip ok">Implementado</span>
            </button>
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 10 }}>Los demás modelos del catálogo están marcados como inspiración hasta que su motor de construcción se implemente y verifique.</p>
      </section>
      {projects.length === 0 && <Empty icon="patronaje" title="Aún no tienes patrones" body="Crea uno desde un patrón base, un modelo del catálogo o traza un patrón existente." />}
      {creating && <NewProjectSheet onClose={() => setCreating(false)} />}
    </div>
  );
}

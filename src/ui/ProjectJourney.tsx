import './projectJourney.css';

export type JourneyStep = 'base' | 'personalizar' | 'estudio' | 'pdf';

/** Recorrido editable: cada paso conserva el mismo proyecto. */
export function ProjectJourney({ projectId, step }: { projectId: string; step: JourneyStep }) {
  const steps: { key: JourneyStep; label: string; detail: string; path: string }[] = [
    { key: 'base', label: 'Base', detail: 'Revisar base y medidas', path: `/proyectos/${projectId}/medidas` },
    { key: 'personalizar', label: 'Personalizar', detail: 'Añadir bolsillos y complementos', path: `/personalizar/${projectId}` },
    { key: 'estudio', label: 'Estudio', detail: 'Elegir telas, colores y bordados', path: `/estudio/${projectId}` },
    { key: 'pdf', label: 'PDF', detail: 'Revisar y generar el PDF de confección', path: `/confeccion/${projectId}` }
  ];
  return <nav className="project-journey" aria-label="Pasos del diseño">
    <ol>{steps.map((s, i) => <li key={s.key}>
      <a href={`#${s.path}`} aria-current={s.key === step ? 'step' : undefined} title={s.detail}>
        <span className="journey-number" aria-hidden="true">{i + 1}</span>
        <span>{s.label}</span><span className="sr-only">: {s.detail}</span>
      </a>
    </li>)}</ol>
  </nav>;
}

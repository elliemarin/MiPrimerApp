import { useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Empty, PageHead } from '../../ui/components';
import { ProjectJourney } from '../../ui/ProjectJourney';
import { navigate } from '../../ui/router';
import { SewingPackSheet } from './SewingPackSheet';

export function SewingPackPage({ projectId }: { projectId: string }) {
  const project = useApp(s => s.projects[projectId]);
  const [open, setOpen] = useState(true);
  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/proyectos')}>Ver proyectos</Button>} /></div>;
  return <div className="page">
    <ProjectJourney projectId={projectId} step="pdf" />
    <PageHead title="Del diseño a la costura" sub={project.name} />
    <p className="muted" style={{ maxWidth: '58ch', marginBottom: 20 }}>Reúne los patrones de la base, los complementos y los recortes del estudio con sus medidas, materiales y pasos de montaje.</p>
    <div className="row-wrap">
      <Button variant="primary" icon="pdf" onClick={() => setOpen(true)}>Revisar y generar PDF</Button>
      <Button onClick={() => navigate(`/estudio/${projectId}`)}>Volver al estudio</Button>
      <Button variant="ghost" onClick={() => navigate(`/proyectos/${projectId}/exportaciones`)}>Ver mis exportaciones</Button>
    </div>
    {open && <SewingPackSheet projectId={projectId} onClose={() => setOpen(false)} />}
  </div>;
}

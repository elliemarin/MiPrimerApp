import { lazy, Suspense, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Empty, PageHead, Sheet } from '../../ui/components';
import { ProjectJourney } from '../../ui/ProjectJourney';
import { navigate } from '../../ui/router';
import { SewingPackSheet } from './SewingPackSheet';
const EditorialSheet = lazy(() => import('../editorial/EditorialSheet').then(module => ({ default: module.EditorialSheet })));

export function SewingPackPage({ projectId }: { projectId: string }) {
  const project = useApp(s => s.projects[projectId]);
  const [open, setOpen] = useState(true);
  const [editorial,setEditorial] = useState(false);
  if (!project) return <div className="page"><Empty icon="proyectos" title="Proyecto no encontrado" action={<Button onClick={() => navigate('/proyectos')}>Ver proyectos</Button>} /></div>;
  return <div className="page">
    <ProjectJourney projectId={projectId} step="pdf" />
    <PageHead title="Del diseño a la costura" sub={project.name} />
    <p className="muted" style={{ maxWidth: '58ch', marginBottom: 20 }}>Reúne los patrones de la base, los complementos y los recortes del estudio con sus medidas, materiales y pasos de montaje.</p>
    <div className="row-wrap">
      <Button variant="primary" icon="pdf" onClick={() => setOpen(true)}>Revisar y generar PDF</Button>
      <Button onClick={()=>setEditorial(true)}>Preparar lámina</Button>
      <Button onClick={() => navigate(`/${project.design?.simpleWorkflow?'acabados':'estudio'}/${projectId}`)}>Volver al diseño</Button>
      <Button variant="ghost" onClick={() => navigate(`/proyectos/${projectId}/exportaciones`)}>Ver mis exportaciones</Button>
    </div>
    {open && <SewingPackSheet projectId={projectId} onClose={() => setOpen(false)} onPrepareEditorial={()=>{setOpen(false);setEditorial(true);}}/>}
    {editorial&&<Suspense fallback={<Sheet title="Lámina con ChatGPT" onClose={()=>setEditorial(false)}><p role="status">Abriendo las referencias…</p></Sheet>}><EditorialSheet projectId={projectId} onClose={()=>setEditorial(false)}/></Suspense>}
  </div>;
}

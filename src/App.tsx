import { lazy, Suspense, useEffect } from 'react';
import { useApp } from './store/app';
import { useRoute, navigate } from './ui/router';
import { Icon } from './ui/Icon';
import { SaveIndicator, Toasts } from './ui/components';
import { LibraryPage } from './features/library/LibraryPage';
import { ModelDetail } from './features/library/ModelDetail';
import { ProjectsPage } from './features/projects/ProjectsPage';
const ProjectDetail = lazy(() => import('./features/projects/ProjectDetail').then((m) => ({ default: m.ProjectDetail })));
import { ProfilesPage } from './features/profiles/ProfilesPage';
const ProfileDetail = lazy(() => import('./features/profiles/ProfileDetail').then((m) => ({ default: m.ProfileDetail })));
import { PatternHub } from './features/pattern/PatternHub';
const PatternEditor = lazy(() => import('./features/pattern/PatternEditor').then((m) => ({ default: m.PatternEditor })));
import { StudioHub } from './features/studio/StudioHub';
const StudioEditor = lazy(() => import('./features/studio/StudioEditor').then((m) => ({ default: m.StudioEditor })));
const CustomizePage = lazy(() => import('./features/customize/CustomizePage').then((m) => ({ default: m.CustomizePage })));
const SewingPackPage = lazy(() => import('./features/projects/SewingPackPage').then((m) => ({ default: m.SewingPackPage })));
import { FabricsPage } from './features/fabrics/FabricsPage';
const FabricDetail = lazy(() => import('./features/fabrics/FabricDetail').then((m) => ({ default: m.FabricDetail })));
const HelpPage = lazy(() => import('./features/help/HelpPage').then((m) => ({ default: m.HelpPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
import { MorePage } from './features/settings/MorePage';
import { useSync } from './lib/sync/useSync';

const NAV = [
  { key: 'proyectos', label: 'Proyectos', icon: 'proyectos' },
  { key: 'biblioteca', label: 'Biblioteca', icon: 'biblioteca' },
  { key: 'patronaje', label: 'Patronaje', icon: 'patronaje' },
  { key: 'estudio', label: 'Estudio', icon: 'estudio' },
  { key: 'telas', label: 'Telas y materiales', icon: 'telas' },
  { key: 'medidas', label: 'Perfiles de medidas', icon: 'medidas' },
  { key: 'ayuda', label: 'Ayuda', icon: 'ayuda' }
];

const TABS = ['proyectos', 'biblioteca', 'patronaje', 'estudio'];

export function App() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  const loadError = useApp((s) => s.loadError);
  const theme = useApp((s) => s.settings.theme);
  const route = useRoute();
  useSync();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!theme || theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const s = useApp.getState();
      if (Object.keys(s.dirty).length) {
        void s.saveNow();
        e.preventDefault();
      }
    };
    const hide = () => {
      if (document.visibilityState === 'hidden') void useApp.getState().saveNow();
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  if (!ready) return <div className="page" aria-busy="true" />;

  const [section = 'proyectos', a, b] = route;
  const active = ['ajustes', 'mas'].includes(section) ? 'mas' : ['personalizar', 'confeccion'].includes(section) ? 'proyectos' : section;
  let content: JSX.Element;
  switch (section) {
    case 'biblioteca':
      content = a ? <ModelDetail id={a} /> : <LibraryPage />;
      break;
    case 'patronaje':
      content = a ? <PatternEditor projectId={a} /> : <PatternHub />;
      break;
    case 'estudio':
      content = a ? <StudioEditor projectId={a} /> : <StudioHub />;
      break;
    case 'personalizar':
      content = a ? <CustomizePage projectId={a} /> : <LibraryPage />;
      break;
    case 'confeccion':
      content = a ? <SewingPackPage projectId={a} /> : <ProjectsPage />;
      break;
    case 'telas':
      content = a ? <FabricDetail id={a} /> : <FabricsPage />;
      break;
    case 'medidas':
      content = a ? <ProfileDetail id={a} /> : <ProfilesPage />;
      break;
    case 'ayuda':
      content = <HelpPage topic={a} />;
      break;
    case 'ajustes':
      content = <SettingsPage />;
      break;
    case 'mas':
      content = <MorePage />;
      break;
    case 'proyectos':
    default:
      content = a ? <ProjectDetail id={a} tab={b} /> : <ProjectsPage />;
  }

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Secciones">
        <div className="brand">
          Hilvana
          <small>Diseña, patrona y confecciona</small>
        </div>
        {NAV.map((n) => (
          <a key={n.key} href={`#/${n.key}`} aria-current={section === n.key ? 'page' : undefined}>
            <Icon name={n.icon} /> {n.label}
          </a>
        ))}
        <a href="#/ajustes" aria-current={section === 'ajustes' ? 'page' : undefined}>
          <Icon name="settings" /> Ajustes y cuenta
        </a>
        <div className="side-foot">
          <SaveIndicator />
        </div>
      </nav>
      <main className="main">
        {loadError && (
          <div className="notice err" style={{ margin: 12 }}>
            No se pudo abrir el almacenamiento local: {loadError}. Tus cambios no se guardarán en este navegador.
          </div>
        )}
        <Suspense fallback={<div className="page" aria-busy="true"><p className="muted">Cargando…</p></div>}>{content}</Suspense>
      </main>
      <nav className="tabbar" aria-label="Secciones principales">
        {TABS.map((k) => {
          const n = NAV.find((x) => x.key === k)!;
          return (
            <button key={k} aria-current={active === k ? 'page' : undefined} onClick={() => navigate(`/${k}`)}>
              <Icon name={n.icon} />
              {n.label}
            </button>
          );
        })}
        <button aria-current={!TABS.includes(active) ? 'page' : undefined} onClick={() => navigate('/mas')}>
          <Icon name="mas" />
          Más
        </button>
      </nav>
      <Toasts />
    </div>
  );
}

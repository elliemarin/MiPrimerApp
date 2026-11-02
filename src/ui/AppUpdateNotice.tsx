import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { appUpdates } from '../lib/appUpdates';
import { useApp } from '../store/app';
import { Button } from './components';
import './appUpdateNotice.css';

/** A release must not delete lazy chunks while an older app is still open. */
export function AppUpdateNotice() {
  const { available } = useSyncExternalStore(appUpdates.subscribe, appUpdates.getSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notice = useRef<HTMLElement>(null);
  // The coordinator outlives StrictMode's effect replay; subscriptions do not.
  useEffect(() => { appUpdates.start(); }, []);
  useLayoutEffect(() => {
    if (!busy) return;
    // The notice lives outside #root so the rest of the app can be made inert
    // briefly. This also blocks keyboard edits during IndexedDB/worker waits.
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    // Editors also listen on window: inert alone does not block their shortcuts.
    const blockShortcuts = (event: KeyboardEvent) => { event.preventDefault(); event.stopImmediatePropagation(); };
    window.addEventListener('keydown', blockShortcuts, true);
    return () => {
      if (root) root.inert = wasInert;
      window.removeEventListener('keydown', blockShortcuts, true);
    };
  }, [busy]);
  useLayoutEffect(() => {
    if (!available || !notice.current) return;
    const element = notice.current;
    document.documentElement.dataset.appUpdate = 'available';
    const measure = () => document.documentElement.style.setProperty('--app-update-offset', `${Math.ceil(element.getBoundingClientRect().height)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--app-update-offset');
      delete document.documentElement.dataset.appUpdate;
    };
  }, [available]);

  const update = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await appUpdates.apply(() => useApp.getState().saveNow(), () => window.location.reload());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar. Puedes seguir trabajando.');
      setBusy(false);
    }
  };

  if (!available) return null;
  return createPortal(<>
    <aside ref={notice} className="app-update-notice" aria-label="Nueva versión disponible" aria-busy={busy}>
      <span aria-live="polite">{error || 'Hay mejoras listas. Termina o cancela el formulario actual antes de actualizar.'}</span>
      <Button size="sm" onClick={update} disabled={busy}>{busy ? 'Guardando…' : 'Guardar y actualizar'}</Button>
    </aside>
    {busy && <div className="app-update-progress" role="status">Guardando y preparando la actualización…</div>}
  </>, document.body);
}

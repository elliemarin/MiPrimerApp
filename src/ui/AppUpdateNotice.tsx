import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useApp } from '../store/app';
import { Button } from './components';
import './appUpdateNotice.css';

let waiting = false;
let registered = false;
let activate: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners = new Set<(available: boolean) => void>();

/** A release must not delete lazy chunks while an older app is still open. */
export function AppUpdateNotice() {
  const [available, setAvailable] = useState(waiting);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    listeners.add(setAvailable);
    if (!registered && 'serviceWorker' in navigator) {
      registered = true;
      activate = registerSW({
        immediate: true,
        onNeedRefresh() {
          waiting = true;
          listeners.forEach(listener => listener(true));
        }
      });
    }
    return () => { listeners.delete(setAvailable); };
  }, []);

  const update = async () => {
    if (busy || !activate) return;
    setBusy(true); setError('');
    const reload = () => window.location.reload();
    try {
      // Drafts are persisted before the explicitly requested worker activation.
      const saved = await useApp.getState().saveNow();
      if (!saved) throw new Error('No se pudo guardar tu diseño. Reintenta antes de actualizar.');
      // Workbox does not mark every controlling event as isUpdate (for example
      // a second release during the very first session). This listener is only
      // installed after the person's explicit action and successful save.
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
      await activate(true);
    } catch (cause) {
      navigator.serviceWorker.removeEventListener('controllerchange', reload);
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar. Puedes seguir trabajando.');
      setBusy(false);
    }
  };

  if (!available) return null;
  return <aside className="app-update-notice" aria-label="Nueva versión disponible">
    <span>{error || 'Hay mejoras disponibles. Puedes actualizar cuando termines este paso.'}</span>
    <Button size="sm" onClick={update} disabled={busy}>{busy ? 'Guardando…' : 'Guardar y actualizar'}</Button>
  </aside>;
}

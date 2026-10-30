import { useEffect } from 'react';
import { useApp } from '../../store/app';
import { pullAll, pushOutbox, useSyncStatus } from './engine';

/** Activa la sincronización si hay una cuenta configurada. */
export function useSync() {
  const configured = useApp((s) => !!s.settings.sync?.token);
  const ready = useApp((s) => s.ready);
  useEffect(() => {
    if (!configured || !ready) {
      useSyncStatus.setState({ state: 'inactivo' });
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const kick = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void pushOutbox(), 1500);
    };
    void pullAll()
      .then(() => pushOutbox())
      .catch((e) => useSyncStatus.setState({ state: 'error', message: e instanceof Error ? e.message : String(e) }));
    window.addEventListener('hilvana:outbox', kick);
    window.addEventListener('online', kick);
    const interval = setInterval(() => void pushOutbox(), 60000);
    return () => {
      window.removeEventListener('hilvana:outbox', kick);
      window.removeEventListener('online', kick);
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [configured, ready]);
}

import { useApp } from '../store/app';

/** Persist the whole import/selection batch before claiming that a fabric is saved. */
export async function saveFabricSamples(): Promise<boolean> {
  const saved = await useApp.getState().saveNow();
  if (!saved) useApp.getState().toast(
    'La tela sigue pendiente de guardado. Conserva esta pestaña abierta y reintenta.',
    'error', { label: 'Reintentar', run: () => { void saveFabricSamples(); } }
  );
  return saved;
}

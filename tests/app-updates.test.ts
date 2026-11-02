import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppUpdates, UPDATE_CHECK_INTERVAL_MS, UPDATE_CHECK_THROTTLE_MS } from '../src/lib/appUpdates';

class Worker extends EventTarget {
  state: ServiceWorkerState = 'installed';
  postMessage = vi.fn();
}
class Registration extends EventTarget {
  waiting: Worker | null = null;
  installing: Worker | null = null;
  update = vi.fn(async () => this);
}
class Workers extends EventTarget {
  controller: ServiceWorker | null = {} as ServiceWorker;
}

const cleanup: Array<() => void> = [];
function setup(options: { waiting?: boolean; supported?: boolean; online?: boolean } = {}) {
  const registration = new Registration();
  const worker = new Worker();
  if (options.waiting) registration.waiting = worker;
  const workers = new Workers();
  const windowEvents = new EventTarget();
  const documentEvents = new EventTarget();
  const connectivity = { online: options.online ?? true, visible: true };
  const register = vi.fn(async () => registration as unknown as ServiceWorkerRegistration);
  const updates = createAppUpdates({
    supported: options.supported ?? true, register, windowEvents, documentEvents,
    serviceWorkers: workers, online: () => connectivity.online, visible: () => connectivity.visible
  });
  cleanup.push(updates.dispose);
  return { updates, register, registration, worker, workers, windowEvents, documentEvents, connectivity };
}
async function settle() { await vi.advanceTimersByTimeAsync(0); }

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); });

describe('entrega de actualizaciones con aprobación explícita', () => {
  it('registra una sola vez aunque StrictMode repita el montaje y detecta un worker ya esperando', async () => {
    const h = setup({ waiting: true });
    const render = vi.fn();
    const unsubscribe = h.updates.subscribe(render);
    h.updates.start(); unsubscribe(); h.updates.start();
    await settle();
    expect(h.register).toHaveBeenCalledTimes(1);
    expect(h.updates.getSnapshot()).toEqual({ status: 'available', available: true });
    expect(h.worker.postMessage).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it.each(['focus', 'online', 'visibilitychange'])('descubre una publicación al regresar por %s sin perder el evento durante el límite', async event => {
    const h = setup();
    h.updates.start(); await settle();
    h.registration.update.mockImplementation(async () => {
      h.registration.waiting = h.worker;
      return h.registration;
    });
    const target = event === 'visibilitychange' ? h.documentEvents : h.windowEvents;
    target.dispatchEvent(new Event(event));
    target.dispatchEvent(new Event(event));
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_THROTTLE_MS - 1);
    expect(h.registration.update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.registration.update).toHaveBeenCalledTimes(2);
    expect(h.updates.getSnapshot().available).toBe(true);
    expect(h.worker.postMessage).not.toHaveBeenCalled();
  });

  it('comprueba cada cinco minutos, pero no descarga con la aplicación oculta', async () => {
    const h = setup();
    h.updates.start(); await settle();
    h.connectivity.visible = false;
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
    expect(h.registration.update).toHaveBeenCalledTimes(1);
    h.connectivity.visible = true;
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
    expect(h.registration.update).toHaveBeenCalledTimes(2);
  });

  it('la búsqueda manual ignora el límite y comparte la solicitud si aún está en curso', async () => {
    const h = setup();
    h.updates.start(); await settle();
    let finish!: () => void;
    h.registration.update.mockImplementation(() => new Promise(resolve => {
      finish = () => resolve(h.registration);
    }));
    const first = h.updates.check(true);
    await settle();
    const second = h.updates.check(true);
    expect(h.updates.getSnapshot().status).toBe('checking');
    finish(); await Promise.all([first, second]);
    expect(h.registration.update).toHaveBeenCalledTimes(2);
    expect(h.updates.getSnapshot().status).toBe('current');
  });

  it('comunica la desconexión sin rechazos pendientes y vuelve a comprobar al reconectar', async () => {
    const h = setup({ online: false });
    h.updates.start(); await settle();
    await expect(h.updates.check(true)).resolves.toBeUndefined();
    expect(h.updates.getSnapshot().status).toBe('offline');
    expect(h.registration.update).not.toHaveBeenCalled();
    h.connectivity.online = true;
    h.windowEvents.dispatchEvent(new Event('online'));
    await settle();
    expect(h.updates.getSnapshot().status).toBe('current');
  });

  it('tolera fallos de red incluso cuando navigator.onLine dice conectado', async () => {
    const h = setup();
    h.updates.start(); await settle();
    h.registration.update.mockRejectedValueOnce(new Error('NetworkError'));
    await expect(h.updates.check(true)).resolves.toBeUndefined();
    expect(h.updates.getSnapshot().status).toBe('error');
    await h.updates.check(true);
    expect(h.updates.getSnapshot().status).toBe('current');
  });

  it('permite reintentar el registro si la instalación inicial falló', async () => {
    const h = setup();
    h.register.mockRejectedValueOnce(new Error('NetworkError'));
    h.updates.start(); await settle();
    expect(h.register).toHaveBeenCalledTimes(1);
    expect(h.updates.getSnapshot().status).toBe('error');
    await h.updates.check(true);
    expect(h.register).toHaveBeenCalledTimes(2);
    expect(h.updates.getSnapshot().status).toBe('current');
  });

  it('muestra descarga hasta que termina la instalación y después ofrece actualizar', async () => {
    const h = setup();
    h.updates.start(); await settle();
    h.worker.state = 'installing';
    h.registration.installing = h.worker;
    h.registration.dispatchEvent(new Event('updatefound'));
    expect(h.updates.getSnapshot()).toEqual({ status: 'downloading', available: false });
    h.registration.waiting = h.worker;
    h.registration.installing = null;
    h.worker.state = 'installed';
    h.worker.dispatchEvent(new Event('statechange'));
    expect(h.updates.getSnapshot()).toEqual({ status: 'available', available: true });
    expect(h.worker.postMessage).not.toHaveBeenCalled();
  });

  it('mantiene disponible una versión descargada aunque después no haya conexión', async () => {
    const h = setup({ waiting: true });
    h.updates.start(); await settle();
    h.connectivity.online = false;
    await h.updates.check(true);
    expect(h.updates.getSnapshot()).toEqual({ status: 'available', available: true });
  });

  it('no activa ni recarga cuando falla el guardado, y permite reintentar', async () => {
    const h = setup({ waiting: true });
    h.updates.start(); await settle();
    const reload = vi.fn();
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    await expect(h.updates.apply(save, reload)).rejects.toThrow('No se pudo guardar');
    expect(h.worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    const accepted = h.updates.apply(save, reload);
    await settle();
    expect(h.worker.postMessage).toHaveBeenCalledTimes(1);
    expect(h.worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled();
    h.workers.dispatchEvent(new Event('controllerchange'));
    await accepted;
    expect(save).toHaveBeenCalledTimes(3);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('espera el guardado completo antes de activar y vuelve a guardar antes de recargar', async () => {
    const h = setup({ waiting: true });
    h.updates.start(); await settle();
    let saved!: (value: boolean) => void;
    const save = vi.fn().mockImplementationOnce(() => new Promise<boolean>(resolve => { saved = resolve; })).mockResolvedValue(true);
    const reload = vi.fn();
    const accepted = h.updates.apply(save, reload);
    await settle();
    expect(h.worker.postMessage).not.toHaveBeenCalled();
    saved(true); await settle();
    expect(h.worker.postMessage).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    h.workers.dispatchEvent(new Event('controllerchange'));
    await accepted;
    expect(save).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('no recarga si falla la última barrera de guardado después de activar', async () => {
    const h = setup({ waiting: true });
    h.updates.start(); await settle();
    const reload = vi.fn();
    const save = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(true);
    const accepted = h.updates.apply(save, reload);
    const rejected = expect(accepted).rejects.toThrow('No se pudo terminar de guardar');
    await settle();
    h.registration.waiting = null;
    h.workers.dispatchEvent(new Event('controllerchange'));
    await rejected;
    expect(reload).not.toHaveBeenCalled();
    await h.updates.apply(save, reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('una activación desde otra pestaña solo avisa; esta página guarda antes de aceptar la recarga', async () => {
    const h = setup();
    h.updates.start(); await settle();
    const reload = vi.fn();
    const save = vi.fn().mockResolvedValue(true);
    h.workers.dispatchEvent(new Event('controllerchange'));
    expect(h.updates.getSnapshot().available).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(h.worker.postMessage).not.toHaveBeenCalled();
    await h.updates.apply(save, reload);
    expect(save).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('libera el intento tras un worker que no activa, sin recargar más tarde por ese intento', async () => {
    const h = setup({ waiting: true });
    h.updates.start(); await settle();
    const reload = vi.fn();
    const accepted = h.updates.apply(async () => true, reload);
    const rejected = expect(accepted).rejects.toThrow('tardó demasiado');
    await vi.advanceTimersByTimeAsync(20_000);
    await rejected;
    h.workers.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });

  it('no ofrece actualizar durante la primera instalación ni en un navegador incompatible', async () => {
    const h = setup();
    h.workers.controller = null;
    // Build a fresh coordinator with no controller at its initial snapshot.
    const first = createAppUpdates({ supported: true, register: h.register, windowEvents: h.windowEvents,
      documentEvents: h.documentEvents, serviceWorkers: h.workers, online: () => true, visible: () => true });
    cleanup.push(first.dispose);
    h.registration.waiting = h.worker;
    first.start(); await settle();
    expect(first.getSnapshot().available).toBe(false);
    h.registration.waiting = null;
    h.workers.dispatchEvent(new Event('controllerchange'));
    expect(first.getSnapshot().available).toBe(false);
    const unsupported = setup({ supported: false });
    unsupported.updates.start(); await unsupported.updates.check(true);
    expect(unsupported.register).not.toHaveBeenCalled();
    expect(unsupported.updates.getSnapshot().status).toBe('unsupported');
  });

  it('retira suscriptores, eventos y comprobaciones programadas al disponer el coordinador', async () => {
    const h = setup();
    h.updates.start(); await settle();
    h.windowEvents.dispatchEvent(new Event('focus'));
    h.updates.dispose();
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS * 2);
    h.windowEvents.dispatchEvent(new Event('online'));
    await settle();
    expect(h.registration.update).toHaveBeenCalledTimes(1);
  });
});

/** Update discovery never activates a worker or reloads an unfinished form. */
export const UPDATE_CHECK_THROTTLE_MS = 30_000;
export const UPDATE_CHECK_INTERVAL_MS = 5 * 60_000;

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'current' | 'available' | 'offline' | 'error' | 'unsupported';
export interface UpdateSnapshot { available: boolean; status: UpdateStatus }

export interface UpdateEnvironment {
  supported: boolean;
  register: () => Promise<ServiceWorkerRegistration>;
  windowEvents: EventTarget;
  documentEvents: EventTarget;
  serviceWorkers?: Pick<ServiceWorkerContainer, 'controller' | 'addEventListener' | 'removeEventListener'>;
  online: () => boolean;
  visible: () => boolean;
}

export const UPDATE_STATUS_TEXT: Record<UpdateStatus, string> = {
  idle: 'Busca mejoras de la aplicación cuando quieras.',
  checking: 'Buscando actualizaciones…',
  downloading: 'Descargando la nueva versión. Puedes seguir trabajando.',
  current: 'Tienes la versión más reciente disponible.',
  available: 'Hay una nueva versión lista. Termina el paso actual y usa «Guardar y actualizar» en el aviso superior.',
  offline: 'Sin conexión. Puedes seguir trabajando y buscar actualizaciones al reconectarte.',
  error: 'No se pudo comprobar la versión. Puedes seguir trabajando e intentarlo de nuevo.',
  unsupported: 'La búsqueda de actualizaciones está disponible en la app publicada con un navegador compatible.'
};

/** Injectable browser boundary keeps lifecycle, throttling and save gating testable. */
export function createAppUpdates(env: UpdateEnvironment) {
  let snapshot: UpdateSnapshot = { available: false, status: env.supported ? 'idle' : 'unsupported' };
  const subscribers = new Set<() => void>();
  let started = false;
  let disposed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let registrationReady: Promise<void> | undefined;
  let checking: Promise<void> | undefined;
  let lastCheck = -Infinity;
  let deferred: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let hadController = Boolean(env.serviceWorkers?.controller);
  let reloadRequired = false;
  let applying = false;
  const workerListeners = new Map<ServiceWorker, () => void>();

  function publish(status: UpdateStatus, available = snapshot.available) {
    if (disposed || (status === snapshot.status && available === snapshot.available)) return;
    snapshot = { status, available };
    subscribers.forEach(listener => listener());
  }

  function inspectRegistration() {
    if (hasWaitingUpdate() || reloadRequired) publish('available', true);
    else if (registration?.installing) publish('downloading');
  }

  function hasWaitingUpdate() {
    // The very first installation can briefly be `waiting` too. It has no
    // previous active worker and must finish normally without an update prompt.
    return Boolean(registration?.waiting && (hadController || registration.active));
  }

  function watchInstalling() {
    const worker = registration?.installing;
    if (!worker || workerListeners.has(worker)) return;
    const stateChanged = () => {
      inspectRegistration();
      if (worker.state === 'redundant') publish(snapshot.available ? 'available' : 'error');
      // First installation is not an update requiring the person's approval.
      if (worker.state === 'activated' && !snapshot.available) publish('current');
      if (worker.state === 'activated' || worker.state === 'redundant') {
        worker.removeEventListener('statechange', stateChanged);
        workerListeners.delete(worker);
      }
    };
    workerListeners.set(worker, stateChanged);
    worker.addEventListener('statechange', stateChanged);
    inspectRegistration();
  }

  const controllerChanged = () => {
    // Another tab may have accepted the update. This tab still asks the person
    // to finish their current form and save before reloading its own page.
    if (hadController) { reloadRequired = true; publish('available', true); }
    hadController = true;
  };

  async function register() {
    try {
      const next = await env.register();
      if (disposed) return;
      registration = next;
      registration.addEventListener('updatefound', watchInstalling);
      inspectRegistration();
      watchInstalling();
    } catch {
      publish(env.online() ? 'error' : 'offline');
    }
  }

  function start() {
    if (started || disposed || !env.supported) return;
    started = true;
    env.windowEvents.addEventListener('focus', resume);
    env.windowEvents.addEventListener('online', resume);
    env.documentEvents.addEventListener('visibilitychange', resume);
    env.serviceWorkers?.addEventListener('controllerchange', controllerChanged);
    interval = setInterval(resume, UPDATE_CHECK_INTERVAL_MS);
    registrationReady = register();
    void registrationReady.then(() => { if (registration) void check(); });
  }

  function resume() {
    if (env.visible()) void check();
  }

  async function check(manual = false): Promise<void> {
    if (disposed || !env.supported) return;
    if (!started) start();
    inspectRegistration();
    if (!env.online()) { publish(snapshot.available ? 'available' : 'offline'); return; }
    if (!manual && !env.visible()) return;
    if (checking) return checking;
    const remaining = UPDATE_CHECK_THROTTLE_MS - (Date.now() - lastCheck);
    if (!manual && remaining > 0) {
      // A quick return from the background must not lose the only resume event.
      deferred ??= setTimeout(() => { deferred = undefined; void check(); }, remaining);
      return;
    }
    if (deferred) { clearTimeout(deferred); deferred = undefined; }
    lastCheck = Date.now();
    publish('checking');
    checking = (async () => {
      await registrationReady;
      if (disposed) return;
      if (!registration) {
        registrationReady = register();
        await registrationReady;
      }
      if (disposed) return;
      if (!registration) { publish(env.online() ? 'error' : 'offline'); return; }
      try {
        await registration.update();
        if (disposed) return;
        watchInstalling();
        if (hasWaitingUpdate() || reloadRequired) publish('available', true);
        else publish(registration.installing ? 'downloading' : 'current');
      } catch {
        publish(snapshot.available ? 'available' : env.online() ? 'error' : 'offline');
      }
    })();
    try { await checking; } finally { checking = undefined; }
  }

  async function apply(save: () => Promise<boolean>, reload: () => void): Promise<void> {
    if (applying) return;
    if (!snapshot.available) throw new Error('Todavía no hay una actualización lista. Inténtalo de nuevo en Ajustes.');
    applying = true;
    const finish = async () => {
      // The controller may take time to change. Flush any queued store work
      // again before leaving this page, while the UI keeps editing blocked.
      if (!await save()) throw new Error('No se pudo terminar de guardar tu diseño. Reintenta antes de actualizar.');
      reload();
    };
    try {
      if (!await save()) throw new Error('No se pudo guardar tu diseño. Reintenta antes de actualizar.');
      const worker = registration?.waiting;
      if (!worker) {
        if (reloadRequired) { await finish(); return; }
        throw new Error('La actualización ya no está lista. Vuelve a buscarla en Ajustes.');
      }
      const serviceWorkers = env.serviceWorkers;
      if (!serviceWorkers) throw new Error('No se pudo activar la actualización. Inténtalo de nuevo.');
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeout);
          serviceWorkers.removeEventListener('controllerchange', activated);
        };
        const activated = () => { cleanup(); void finish().then(resolve, reject); };
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('La actualización tardó demasiado. Puedes seguir trabajando e intentarlo de nuevo.'));
        }, 20_000);
        serviceWorkers.addEventListener('controllerchange', activated, { once: true });
        try { worker.postMessage({ type: 'SKIP_WAITING' }); }
        catch (error) { cleanup(); reject(error); }
      });
    } finally { applying = false; }
  }

  return {
    start, check, apply,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { subscribers.add(listener); return () => { subscribers.delete(listener); }; },
    dispose() {
      disposed = true;
      clearTimeout(deferred);
      clearInterval(interval);
      env.windowEvents.removeEventListener('focus', resume);
      env.windowEvents.removeEventListener('online', resume);
      env.documentEvents.removeEventListener('visibilitychange', resume);
      env.serviceWorkers?.removeEventListener('controllerchange', controllerChanged);
      registration?.removeEventListener('updatefound', watchInstalling);
      workerListeners.forEach((listener, worker) => worker.removeEventListener('statechange', listener));
      subscribers.clear();
    }
  };
}

const browser = typeof window !== 'undefined';
export const appUpdates = createAppUpdates({
  supported: browser && import.meta.env.PROD && 'serviceWorker' in navigator,
  register: () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`),
  windowEvents: browser ? window : new EventTarget(),
  documentEvents: browser ? document : new EventTarget(),
  serviceWorkers: browser && 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  online: () => typeof navigator === 'undefined' || navigator.onLine,
  visible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
});

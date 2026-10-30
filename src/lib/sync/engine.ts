import { create } from 'zustand';
import { useApp, referencedFileIds } from '../../store/app';
import { getFile, getOutbox, putFile, removeOutbox, putOutbox, OutboxItem } from '../db';
import { GitHubStore, GitHubError, entityPath, filePath, fileMetaPath, kindFromPath, b64encode, textToB64 } from './github';
import type { Settings, StoredFile } from '../../store/types';
import { nowIso, uid } from '../ids';

export type SyncState = 'inactivo' | 'sincronizando' | 'al-dia' | 'pendiente' | 'sin-conexion' | 'error';

export const useSyncStatus = create<{ state: SyncState; message?: string; pending: number; lastSync?: string }>(() => ({ state: 'inactivo', pending: 0 }));

function store(settings: Settings): GitHubStore | null {
  const s = settings.sync;
  if (!s?.token || !s.owner || !s.repo) return null;
  return new GitHubStore({ owner: s.owner, repo: s.repo, branch: s.branch || 'main', token: s.token });
}

function setShas(fn: (shas: Record<string, string>) => Record<string, string>) {
  useApp.getState().setSettings((st) => (st.sync ? { ...st, sync: { ...st.sync, shas: fn(st.sync.shas ?? {}) } } : st));
}

let running = false;

/** Envía los cambios pendientes (cola persistente). */
export async function pushOutbox(): Promise<void> {
  const app = useApp.getState();
  const gh = store(app.settings);
  if (!gh || running) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    useSyncStatus.setState({ state: 'sin-conexion', pending: (await getOutbox()).length });
    return;
  }
  running = true;
  useSyncStatus.setState({ state: 'sincronizando' });
  try {
    const items = await getOutbox();
    const done: string[] = [];
    for (const it of items) {
      try {
        await pushItem(gh, it);
        done.push(it.key);
      } catch (e) {
        await putOutbox([{ ...it, attempts: it.attempts + 1, lastError: e instanceof Error ? e.message : String(e) }]);
        if (e instanceof GitHubError && (e.status === 401 || e.status === 403)) throw e;
        if (!(e instanceof GitHubError)) throw e; // sin conexión: se reintenta después
      }
    }
    await removeOutbox(done);
    const left = (await getOutbox()).length;
    useSyncStatus.setState({ state: left ? 'pendiente' : 'al-dia', pending: left, message: undefined, lastSync: nowIso() });
  } catch (e) {
    const offline = !(e instanceof GitHubError);
    useSyncStatus.setState({ state: offline ? 'sin-conexion' : 'error', message: e instanceof Error ? e.message : String(e), pending: (await getOutbox()).length });
  } finally {
    running = false;
  }
}

async function pushItem(gh: GitHubStore, it: OutboxItem) {
  const app = useApp.getState();
  const shas = app.settings.sync?.shas ?? {};
  if (it.kind === 'delete') {
    const [kind, id] = it.id.split(':') as ['project', string];
    const path = entityPath(kind, id);
    const sha = shas[path];
    if (sha) await gh.remove(path, sha, `Eliminar ${kind} ${id}`);
    setShas((s) => {
      const n = { ...s };
      delete n[path];
      return n;
    });
    return;
  }
  if (it.kind === 'file') {
    if (shas[filePath(it.id)]) return;
    const f = await getFile(it.id);
    if (!f) return;
    const sha = await gh.put(filePath(f.id), b64encode(new Uint8Array(await f.blob.arrayBuffer())), undefined, `Archivo ${f.name}`);
    const metaSha = await gh.put(fileMetaPath(f.id), textToB64(JSON.stringify({ id: f.id, name: f.name, type: f.type, size: f.size, createdAt: f.createdAt })), undefined, `Datos de ${f.name}`);
    setShas((s) => ({ ...s, [filePath(f.id)]: sha, [fileMetaPath(f.id)]: metaSha }));
    return;
  }
  const kind = it.kind as 'project' | 'profile' | 'fabric' | 'material';
  const coll = { project: app.projects, profile: app.profiles, fabric: app.fabrics, material: app.materials }[kind] as Record<string, { updatedAt: string }>;
  const value = coll[it.id];
  if (!value) return;
  const path = entityPath(kind, it.id);
  try {
    const sha = await gh.put(path, textToB64(JSON.stringify(value)), shas[path], `Guardar ${kind} ${it.id}`);
    setShas((s) => ({ ...s, [path]: sha }));
  } catch (e) {
    // 409/422: el archivo cambió en otro dispositivo. Se resuelve en la próxima descarga.
    if (e instanceof GitHubError && (e.status === 409 || e.status === 422)) {
      await pullAll();
      const again = useApp.getState().settings.sync?.shas?.[path];
      const sha = await gh.put(path, textToB64(JSON.stringify(({ project: useApp.getState().projects, profile: useApp.getState().profiles, fabric: useApp.getState().fabrics, material: useApp.getState().materials }[kind] as Record<string, unknown>)[it.id])), again, `Guardar ${kind} ${it.id}`);
      setShas((s) => ({ ...s, [path]: sha }));
    } else throw e;
  }
}

/**
 * Descarga lo que cambió en el repositorio. Gana la versión más reciente; si un
 * proyecto cambió en ambos lados, se conserva la local como copia «(conflicto)».
 */
export async function pullAll(): Promise<{ updated: number; conflicts: number }> {
  const app = useApp.getState();
  const gh = store(app.settings);
  if (!gh) return { updated: 0, conflicts: 0 };
  const remote = await gh.tree();
  const shas = app.settings.sync?.shas ?? {};
  const lastSync = app.settings.sync?.lastSync;
  let updated = 0;
  let conflicts = 0;
  for (const [path, sha] of Object.entries(remote)) {
    if (shas[path] === sha) continue;
    const k = kindFromPath(path);
    if (!k) continue;
    const value = JSON.parse(new TextDecoder().decode(await gh.blob(sha))) as { id: string; updatedAt: string; name?: string };
    const s = useApp.getState();
    const coll = { project: s.projects, profile: s.profiles, fabric: s.fabrics, material: s.materials }[k.kind] as Record<string, { updatedAt: string }>;
    const local = coll[k.id];
    const localDirty = !!local && (!lastSync || local.updatedAt > lastSync) && shas[path] !== undefined;
    if (!local || local.updatedAt <= value.updatedAt) {
      if (local && localDirty && k.kind === 'project' && local.updatedAt !== value.updatedAt) {
        s.put('project', { ...(local as never as import('../../store/types').Project), id: uid('proy'), name: `${(local as never as { name: string }).name} (conflicto)` });
        conflicts++;
      }
      s.put(k.kind, value as never);
      updated++;
    }
    setShas((x) => ({ ...x, [path]: sha }));
  }
  // Archivos referenciados que faltan en este dispositivo.
  const st = useApp.getState();
  const needed = new Set(referencedFileIds(st));
  for (const id of needed) {
    if (await getFile(id)) continue;
    const fsha = remote[filePath(id)];
    const msha = remote[fileMetaPath(id)];
    if (!fsha || !msha) continue;
    const meta = JSON.parse(new TextDecoder().decode(await gh.blob(msha))) as Omit<StoredFile, 'blob'>;
    const bytes = await gh.blob(fsha);
    await putFile({ ...meta, blob: new Blob([bytes], { type: meta.type }) });
    setShas((x) => ({ ...x, [filePath(id)]: fsha, [fileMetaPath(id)]: msha }));
  }
  useApp.getState().setSettings((x) => (x.sync ? { ...x, sync: { ...x.sync, lastSync: nowIso() } } : x));
  await useApp.getState().saveNow();
  return { updated, conflicts };
}

/** Encola todo lo local para la primera sincronización. */
export async function enqueueEverything(): Promise<number> {
  const s = useApp.getState();
  const items: OutboxItem[] = [];
  const t = nowIso();
  for (const id of Object.keys(s.projects)) items.push({ key: `project:${id}`, kind: 'project', id, queuedAt: t, attempts: 0 });
  for (const id of Object.keys(s.profiles)) items.push({ key: `profile:${id}`, kind: 'profile', id, queuedAt: t, attempts: 0 });
  for (const id of Object.keys(s.fabrics)) items.push({ key: `fabric:${id}`, kind: 'fabric', id, queuedAt: t, attempts: 0 });
  for (const id of Object.keys(s.materials)) items.push({ key: `material:${id}`, kind: 'material', id, queuedAt: t, attempts: 0 });
  for (const id of new Set(referencedFileIds(s))) items.push({ key: `file:${id}`, kind: 'file', id, queuedAt: t, attempts: 0 });
  await putOutbox(items);
  return items.length;
}

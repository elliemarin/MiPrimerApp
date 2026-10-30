import { openDB, IDBPDatabase } from 'idb';
import type { Fabric, Material, Profile, Project, Settings, StoredFile } from '../store/types';

export interface OutboxItem {
  key: string; // `${kind}:${id}`
  kind: 'project' | 'profile' | 'fabric' | 'material' | 'file' | 'delete';
  id: string;
  path?: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

const DB_NAME = 'hilvana';
const DB_VERSION = 1;

let dbp: Promise<IDBPDatabase> | null = null;

export function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        for (const s of ['projects', 'profiles', 'fabrics', 'materials', 'files']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
        if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'key' });
      }
    });
  }
  return dbp;
}

export interface Snapshot {
  projects: Project[];
  profiles: Profile[];
  fabrics: Fabric[];
  materials: Material[];
  settings?: Settings;
}

export async function loadAll(): Promise<Snapshot> {
  const d = await db();
  const [projects, profiles, fabrics, materials, settings] = await Promise.all([
    d.getAll('projects'),
    d.getAll('profiles'),
    d.getAll('fabrics'),
    d.getAll('materials'),
    d.get('meta', 'settings')
  ]);
  return { projects, profiles, fabrics, materials, settings };
}

export interface WriteBatch {
  put: { store: 'projects' | 'profiles' | 'fabrics' | 'materials'; value: unknown }[];
  del: { store: 'projects' | 'profiles' | 'fabrics' | 'materials' | 'files'; id: string }[];
  settings?: Settings;
  outbox?: OutboxItem[];
}

/** Escribe un lote en una sola transacción. Resuelve solo cuando la transacción termina. */
export async function writeBatch(b: WriteBatch): Promise<void> {
  const d = await db();
  const tx = d.transaction(['projects', 'profiles', 'fabrics', 'materials', 'files', 'meta', 'outbox'], 'readwrite');
  for (const p of b.put) tx.objectStore(p.store).put(p.value);
  for (const x of b.del) tx.objectStore(x.store).delete(x.id);
  if (b.settings) tx.objectStore('meta').put(b.settings, 'settings');
  for (const o of b.outbox ?? []) tx.objectStore('outbox').put(o);
  await tx.done;
}

export async function putFile(f: StoredFile): Promise<void> {
  const d = await db();
  const tx = d.transaction('files', 'readwrite');
  tx.store.put(f);
  await tx.done;
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  const d = await db();
  return d.get('files', id);
}

export async function deleteFiles(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const d = await db();
  const tx = d.transaction('files', 'readwrite');
  for (const id of ids) tx.store.delete(id);
  await tx.done;
}

export async function allFileIds(): Promise<string[]> {
  const d = await db();
  return (await d.getAllKeys('files')) as string[];
}

export async function getOutbox(): Promise<OutboxItem[]> {
  const d = await db();
  return d.getAll('outbox');
}

export async function removeOutbox(keys: string[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('outbox', 'readwrite');
  for (const k of keys) tx.store.delete(k);
  await tx.done;
}

export async function putOutbox(items: OutboxItem[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('outbox', 'readwrite');
  for (const o of items) tx.store.put(o);
  await tx.done;
}

export async function wipeAll(): Promise<void> {
  const d = await db();
  const names = ['projects', 'profiles', 'fabrics', 'materials', 'files', 'meta', 'outbox'];
  const tx = d.transaction(names, 'readwrite');
  for (const n of names) tx.objectStore(n).clear();
  await tx.done;
}

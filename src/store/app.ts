import { create } from 'zustand';
import { allFileIds, deleteFiles, loadAll, putFile, putOutbox, wipeAll, writeBatch, OutboxItem } from '../lib/db';
import { nowIso, uid } from '../lib/ids';
import type { EntityKind, Fabric, Material, Profile, Project, Settings, StoredFile } from './types';

export type SaveStatus = 'inicial' | 'pendiente' | 'guardando' | 'guardado' | 'error';

const STORE_OF: Record<EntityKind, 'projects' | 'profiles' | 'fabrics' | 'materials'> = {
  project: 'projects',
  profile: 'profiles',
  fabric: 'fabrics',
  material: 'materials'
};

export const DEFAULT_SETTINGS: Settings = {
  unit: 'cm',
  tile: { margin: 8, overlap: 12, orientation: 'vertical' }
};

interface Toast {
  id: string;
  text: string;
  tone: 'info' | 'ok' | 'error';
  action?: { label: string; run: () => void };
}

interface AppState {
  ready: boolean;
  loadError?: string;
  projects: Record<string, Project>;
  profiles: Record<string, Profile>;
  fabrics: Record<string, Fabric>;
  materials: Record<string, Material>;
  settings: Settings;
  /** Claves con cambios sin guardar → contador de revisión. */
  dirty: Record<string, number>;
  deletions: { store: 'projects' | 'profiles' | 'fabrics' | 'materials'; id: string }[];
  saveStatus: SaveStatus;
  savedAt?: string;
  saveError?: string;
  toasts: Toast[];
  init(): Promise<void>;
  put(kind: EntityKind, value: Project | Profile | Fabric | Material): void;
  updateProject(id: string, fn: (p: Project) => Project, logText?: string): void;
  updateProfile(id: string, fn: (p: Profile) => Profile): void;
  updateFabric(id: string, fn: (p: Fabric) => Fabric): void;
  remove(kind: EntityKind, id: string): void;
  setSettings(fn: (s: Settings) => Settings): void;
  saveNow(): Promise<boolean>;
  addFile(blob: Blob, name: string): Promise<string>;
  collectGarbage(): Promise<number>;
  wipe(): Promise<void>;
  toast(text: string, tone?: Toast['tone'], action?: Toast['action']): void;
  dismissToast(id: string): void;
}

let rev = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let saving: Promise<boolean> | null = null;
let initializing: Promise<void> | null = null;

function scheduleSave(get: () => AppState) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void get().saveNow();
  }, 900);
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  projects: {},
  profiles: {},
  fabrics: {},
  materials: {},
  settings: DEFAULT_SETTINGS,
  dirty: {},
  deletions: [],
  saveStatus: 'inicial',
  toasts: [],

  async init() {
    if (initializing) return initializing;
    const before = get();
    initializing = (async () => {
      try {
        const snap = await loadAll();
        set(current => {
          const idx = <T extends { id: string }>(kind: EntityKind, xs: T[], live: Record<string, T>, initial: Record<string, T>) => {
            const values = Object.fromEntries(xs.map(value => [value.id, value]));
            // A delayed hydration must not replace edits or deletions made
            // since it started, even if those edits have already autosaved.
            const ids = new Set([...Object.keys(initial), ...Object.keys(live)]);
            const pending = { ...before.dirty, ...current.dirty };
            for (const key of Object.keys(pending)) {
              if (key.startsWith(`${kind}:`)) ids.add(key.slice(kind.length + 1));
              if (key.startsWith(`del:${kind}:`)) ids.add(key.slice(kind.length + 5));
            }
            for (const id of ids) {
              if (live[id] !== initial[id] || pending[`${kind}:${id}`] || pending[`del:${kind}:${id}`]) {
                if (live[id]) values[id] = live[id]; else delete values[id];
              }
            }
            return values;
          };
          return {
            ready: true, loadError: undefined,
            projects: idx('project', snap.projects, current.projects, before.projects),
            profiles: idx('profile', snap.profiles, current.profiles, before.profiles),
            fabrics: idx('fabric', snap.fabrics, current.fabrics, before.fabrics),
            materials: idx('material', snap.materials, current.materials, before.materials),
            settings: current.settings !== before.settings || before.dirty.settings || current.dirty.settings ? current.settings : { ...DEFAULT_SETTINGS, ...(snap.settings ?? {}) },
            saveStatus: current.saveStatus === 'guardando' ? 'guardando' : Object.keys(current.dirty).length ? 'pendiente' : 'guardado'
          };
        });
        if (navigator.storage?.persist) void navigator.storage.persist();
      } catch (e) {
        set({ ready: true, loadError: e instanceof Error ? e.message : String(e), saveStatus: 'error', saveError: 'No se pudo abrir el almacenamiento del navegador.' });
      }
    })();
    try { await initializing; } finally { initializing = null; }
  },

  put(kind, value) {
    const store = STORE_OF[kind];
    const v = { ...value, updatedAt: nowIso() };
    set((s) => ({
      [store]: { ...(s[store] as Record<string, unknown>), [v.id]: v },
      dirty: { ...s.dirty, [`${kind}:${v.id}`]: ++rev },
      saveStatus: 'pendiente'
    }) as Partial<AppState>);
    scheduleSave(get);
  },

  updateProject(id, fn, logText) {
    const p = get().projects[id];
    if (!p) return;
    let next = fn(p);
    if (logText) next = { ...next, changeLog: [...next.changeLog, { at: nowIso(), text: logText }].slice(-300) };
    get().put('project', next);
  },
  updateProfile(id, fn) {
    const p = get().profiles[id];
    if (p) get().put('profile', fn(p));
  },
  updateFabric(id, fn) {
    const p = get().fabrics[id];
    if (p) get().put('fabric', fn(p));
  },

  remove(kind, id) {
    const store = STORE_OF[kind];
    set((s) => {
      const copy = { ...(s[store] as Record<string, unknown>) };
      delete copy[id];
      const dirty = { ...s.dirty };
      delete dirty[`${kind}:${id}`];
      dirty[`del:${kind}:${id}`] = ++rev;
      return { [store]: copy, dirty, deletions: [...s.deletions, { store, id }], saveStatus: 'pendiente' } as Partial<AppState>;
    });
    scheduleSave(get);
  },

  setSettings(fn) {
    set((s) => ({ settings: fn(s.settings), dirty: { ...s.dirty, settings: ++rev }, saveStatus: 'pendiente' }));
    scheduleSave(get);
  },

  async saveNow() {
    if (saving) {
      await saving;
    }
    const run = async (): Promise<boolean> => {
      const s = get();
      const keys = Object.entries(s.dirty);
      if (!keys.length) {
        set({ saveStatus: 'guardado', savedAt: s.savedAt ?? nowIso() });
        return true;
      }
      set({ saveStatus: 'guardando' });
      const batch: Parameters<typeof writeBatch>[0] = { put: [], del: [], outbox: [] };
      const sync = !!s.settings.sync?.token;
      for (const [key] of keys) {
        if (key === 'settings') {
          batch.settings = s.settings;
          continue;
        }
        const [a, b, c] = key.split(':');
        if (a === 'del') {
          batch.del.push({ store: STORE_OF[b as EntityKind], id: c });
          if (sync) batch.outbox!.push({ key: `delete:${b}:${c}`, kind: 'delete', id: `${b}:${c}`, queuedAt: nowIso(), attempts: 0 });
          continue;
        }
        const kind = a as EntityKind;
        const store = STORE_OF[kind];
        const value = (s[store] as Record<string, unknown>)[b];
        if (value) {
          batch.put.push({ store, value });
          if (sync) batch.outbox!.push({ key: `${kind}:${b}`, kind, id: b, queuedAt: nowIso(), attempts: 0 } as OutboxItem);
        }
      }
      try {
        await writeBatch(batch);
        // Solo se limpian las claves que no cambiaron durante el guardado.
        set((cur) => {
          const dirty = { ...cur.dirty };
          for (const [k, r] of keys) if (dirty[k] === r) delete dirty[k];
          const pending = Object.keys(dirty).length > 0;
          return { dirty, saveStatus: pending ? 'pendiente' : 'guardado', savedAt: nowIso(), saveError: undefined, deletions: [] };
        });
        if (Object.keys(get().dirty).length) scheduleSave(get);
        if (sync) window.dispatchEvent(new CustomEvent('hilvana:outbox'));
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        set({ saveStatus: 'error', saveError: /quota/i.test(msg) ? 'No hay espacio suficiente en el dispositivo.' : `No se pudo guardar: ${msg}` });
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => void get().saveNow(), 15000);
        return false;
      }
    };
    saving = run();
    const ok = await saving;
    saving = null;
    return ok;
  },

  async addFile(blob, name) {
    const f: StoredFile = { id: uid('arch'), name, type: blob.type || 'application/octet-stream', size: blob.size, createdAt: nowIso(), blob };
    await putFile(f);
    if (get().settings.sync?.token) {
      await putOutbox([{ key: `file:${f.id}`, kind: 'file', id: f.id, queuedAt: nowIso(), attempts: 0 }]);
      window.dispatchEvent(new CustomEvent('hilvana:outbox'));
    }
    return f.id;
  },

  async collectGarbage() {
    const s = get();
    const used = new Set<string>(referencedFileIds(s));
    const all = await allFileIds();
    const orphan = all.filter((id) => !used.has(id));
    await deleteFiles(orphan);
    return orphan.length;
  },

  async wipe() {
    await wipeAll();
    set({ projects: {}, profiles: {}, fabrics: {}, materials: {}, settings: DEFAULT_SETTINGS, dirty: {}, saveStatus: 'guardado', savedAt: nowIso() });
  },

  toast(text, tone = 'info', action) {
    const id = uid('t');
    set((s) => ({ toasts: [...s.toasts, { id, text, tone, action }] }));
    setTimeout(() => get().dismissToast(id), action ? 7000 : 3800);
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }
}));

/** Todos los archivos referenciados por los datos. */
export function referencedFileIds(s: Pick<AppState, 'projects' | 'fabrics'>): string[] {
  const out: string[] = [];
  for (const p of Object.values(s.projects)) {
    for (const r of p.references) {
      out.push(r.fileId);
      if (r.corrected) out.push(r.corrected.fileId);
    }
    for (const n of p.notes) out.push(...n.photoFileIds);
    for (const e of p.exports) out.push(e.fileId);
    const docs = [p.design, ...p.designVersions.map((v) => v.data)];
    for (const d of docs) if (d) for (const el of d.elements) if (el.image) out.push(el.image.fileId);
    for (const d of docs) if (d) for (const v of d.views) if (v.source.type === 'foto') out.push(v.source.fileId);
  }
  for (const f of Object.values(s.fabrics)) {
    if (f.photo) {
      out.push(f.photo.originalFileId);
      if (f.photo.processedFileId) out.push(f.photo.processedFileId);
    }
  }
  return out;
}

export const APP_VERSION = '0.2.0';

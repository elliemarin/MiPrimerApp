import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '../src/lib/db';
const mocks = vi.hoisted(() => ({ loadAll: vi.fn() }));
vi.mock('../src/lib/db', () => ({ loadAll: mocks.loadAll, writeBatch: vi.fn(), allFileIds: vi.fn(), deleteFiles: vi.fn(), putFile: vi.fn(), putOutbox: vi.fn(), wipeAll: vi.fn() }));
import { DEFAULT_SETTINGS, useApp } from '../src/store/app';
import { blankProject } from '../src/store/projects';

const snapshot = (): Snapshot => ({ projects: [], profiles: [], fabrics: [], materials: [] });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

describe('hidratación y navegación sin perder el proyecto recién creado', () => {
  beforeEach(() => {
    vi.useFakeTimers(); mocks.loadAll.mockReset();
    useApp.setState({ ready: false, projects: {}, profiles: {}, fabrics: {}, materials: {}, settings: DEFAULT_SETTINGS, dirty: {}, deletions: [], saveStatus: 'inicial', loadError: undefined });
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it('comparte la lectura en curso cuando React monta dos veces', async () => {
    const pending = deferred<Snapshot>(); mocks.loadAll.mockReturnValue(pending.promise);
    const first = useApp.getState().init(); const second = useApp.getState().init();
    expect(mocks.loadAll).toHaveBeenCalledTimes(1);
    const project = blankProject('Proyecto de prueba', 'base');
    pending.resolve({ ...snapshot(), projects: [project] });
    await Promise.all([first, second]);
    expect(useApp.getState().ready).toBe(true);
    expect(useApp.getState().projects[project.id]).toEqual(project);
  });

  it('conserva creación, cambios, borrado y ajustes ocurridos durante una lectura lenta', async () => {
    const edited = blankProject('Nombre anterior', 'base'), deleted = blankProject('Eliminar', 'base');
    useApp.setState({ projects: { [edited.id]: edited, [deleted.id]: deleted } });
    const pending = deferred<Snapshot>(); mocks.loadAll.mockReturnValue(pending.promise);
    const loading = useApp.getState().init();
    useApp.getState().updateProject(edited.id, current => ({ ...current, name: 'Nombre nuevo' }));
    useApp.getState().remove('project', deleted.id);
    const added = blankProject('Nueva intervención', 'base'); useApp.getState().put('project', added);
    useApp.getState().setSettings(settings => ({ ...settings, unit: 'in' }));
    pending.resolve({ ...snapshot(), projects: [edited, deleted], settings: DEFAULT_SETTINGS });
    await loading;
    const state = useApp.getState();
    expect(state.projects[edited.id].name).toBe('Nombre nuevo');
    expect(state.projects[deleted.id]).toBeUndefined();
    expect(state.projects[added.id].name).toBe('Nueva intervención');
    expect(state.settings.unit).toBe('in');
    expect(state.saveStatus).toBe('pendiente');
    expect(Object.keys(state.dirty)).toHaveLength(4);
  });

  it('no restaura datos antiguos aunque los cambios se hayan guardado mientras llegaba la lectura', async () => {
    const edited = blankProject('Anterior', 'base'), deleted = blankProject('Borrado', 'base');
    useApp.setState({ projects: { [edited.id]: edited, [deleted.id]: deleted } });
    const pending = deferred<Snapshot>(); mocks.loadAll.mockReturnValue(pending.promise);
    const loading = useApp.getState().init();
    useApp.getState().updateProject(edited.id, current => ({ ...current, name: 'Actualizado' }));
    useApp.getState().remove('project', deleted.id);
    const added = blankProject('Creado', 'base'); useApp.getState().put('project', added);
    useApp.getState().setSettings(settings => ({ ...settings, unit: 'in' }));
    expect(await useApp.getState().saveNow()).toBe(true);
    expect(useApp.getState().dirty).toEqual({});
    pending.resolve({ ...snapshot(), projects: [edited, deleted], settings: DEFAULT_SETTINGS });
    await loading;
    const state = useApp.getState();
    expect(state.projects[edited.id].name).toBe('Actualizado');
    expect(state.projects[deleted.id]).toBeUndefined();
    expect(state.projects[added.id].name).toBe('Creado');
    expect(state.settings.unit).toBe('in');
    expect(state.saveStatus).toBe('guardado');
  });
});

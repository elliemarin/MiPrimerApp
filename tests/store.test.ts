import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Entorno mínimo de navegador para el almacén.
beforeAll(() => {
  const g = globalThis as unknown as { window: EventTarget };
  if (!g.window) g.window = new EventTarget();
});

import { useApp } from '../src/store/app';
import { loadAll, getFile } from '../src/lib/db';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { findTable, findSize } from '../src/lib/sizes/tables';
import { exportProjectZip, importProjectZip } from '../src/lib/zip';
import { newElement } from '../src/features/studio/model';
import { pullAll, pushOutbox } from '../src/lib/sync/engine';
import { buildPattern } from '../src/lib/pattern/engine';
import { computeCutouts } from '../src/features/studio/despiece';
import { techniqueDefaults } from '../src/features/studio/ops';

function makeProject() {
  const table = findTable('ref-infantil-estatura')!;
  const prof = profileFromSize(table, findSize(table.id, 'E92')!);
  const p = projectFromModel(findModel('pantalon-bebe-panal')!, prof);
  return { prof, p };
}

describe('guardado', () => {
  beforeEach(async () => {
    await useApp.getState().init();
    await useApp.getState().wipe();
  });

  it('confirma el guardado solo tras escribir y recupera todo al recargar', async () => {
    const s = useApp.getState();
    const { prof, p } = makeProject();
    s.put('profile', prof);
    s.put('project', p);
    expect(useApp.getState().saveStatus).toBe('pendiente');
    const ok = await useApp.getState().saveNow();
    expect(ok).toBe(true);
    expect(useApp.getState().saveStatus).toBe('guardado');
    const snap = await loadAll();
    const back = snap.projects.find((x) => x.id === p.id)!;
    expect(back.pattern?.generatorId).toBe('pantalon-cintura-elastica');
    expect(back.design?.views.length).toBe(4);
    expect(snap.profiles[0].versions[0].values.cadera).toBe(550);
  });

  it('el patrón del proyecto de bebé se genera sin errores', () => {
    const { p } = makeProject();
    const b = buildPattern(p.pattern!);
    expect(b.issues.filter((i) => i.level === 'error')).toHaveLength(0);
    expect(b.pieces.map((x) => x.id)).toContain('puno');
  });
});

describe('ZIP del proyecto', () => {
  beforeEach(async () => {
    await useApp.getState().init();
    await useApp.getState().wipe();
  });

  it('exporta y vuelve a importar el proyecto completo con sus archivos', async () => {
    const s = useApp.getState();
    const { prof, p } = makeProject();
    const fileId = await s.addFile(new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' }), 'avance.png');
    p.notes.push({ id: 'n1', createdAt: new Date().toISOString(), text: 'Primera muestra', photoFileIds: [fileId] });
    const view = p.design!.views[0];
    p.design!.elements.push(newElement(view.id, { kind: 'organica', organicId: 'hongo', name: 'Hongo', x: 0, y: 200, w: 60, h: 60, ...techniqueDefaults('aplicacion') }));
    s.put('profile', prof);
    s.put('project', p);
    await useApp.getState().saveNow();
    const blob = await exportProjectZip(useApp.getState().projects[p.id]);
    expect(blob.size).toBeGreaterThan(5000);
    await useApp.getState().wipe();
    expect(await getFile(fileId)).toBeUndefined();
    const file = new File([await blob.arrayBuffer()], 'proyecto.zip', { type: 'application/zip' });
    const id = await importProjectZip(file);
    const back = useApp.getState().projects[id];
    expect(back.name).toBe(p.name);
    expect(back.design!.elements).toHaveLength(1);
    expect(useApp.getState().profiles[prof.id].versions[0].values.cadera).toBe(550);
    const f = await getFile(fileId);
    expect(f?.size).toBe(7);
    const cut = computeCutouts(back.design!, {}, 'cm');
    expect(cut).toHaveLength(1);
    expect(cut[0].allowance).toBe(6);
  });
});

describe('sincronización con repositorio privado (API simulada)', () => {
  const repo = new Map<string, { sha: string; content: string }>();
  let n = 0;
  const fakeFetch = async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (init?.method === 'GET' || !init?.method) {
      if (path === '/repos/ana/datos') return json(200, { private: true, full_name: 'ana/datos' });
      if (path.startsWith('/repos/ana/datos/git/trees/')) {
        if (!repo.size) return json(409, { message: 'Git Repository is empty.' });
        return json(200, { tree: [...repo.entries()].map(([p, v]) => ({ path: p, sha: v.sha, type: 'blob' })) });
      }
      const m = /git\/blobs\/(.+)$/.exec(path);
      if (m) {
        const e = [...repo.values()].find((v) => v.sha === m[1]);
        return e ? json(200, { content: e.content }) : json(404, { message: 'Not Found' });
      }
    }
    const c = /^\/repos\/ana\/datos\/contents\/(.+)$/.exec(path);
    if (c) {
      const body = JSON.parse(String(init!.body));
      const cur = repo.get(c[1]);
      if (init!.method === 'PUT') {
        if (cur && cur.sha !== body.sha) return json(409, { message: 'sha does not match' });
        const sha = `s${++n}`;
        repo.set(c[1], { sha, content: body.content });
        return json(cur ? 200 : 201, { content: { sha } });
      }
      if (init!.method === 'DELETE') {
        repo.delete(c[1]);
        return json(200, {});
      }
    }
    return json(404, { message: 'Not Found' });
  };

  it('sube los proyectos y los recupera en otro dispositivo', async () => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fakeFetch as unknown as typeof fetch;
    await useApp.getState().init();
    await useApp.getState().wipe();
    const s = useApp.getState();
    s.setSettings((x) => ({ ...x, sync: { owner: 'ana', repo: 'datos', branch: 'main', token: 't', shas: {} } }));
    const { prof, p } = makeProject();
    s.put('profile', prof);
    s.put('project', p);
    await useApp.getState().saveNow();
    await pushOutbox();
    expect([...repo.keys()]).toContain(`hilvana/proyectos/${p.id}.json`);
    // «Otro dispositivo»: datos locales vacíos y la misma cuenta.
    await useApp.getState().wipe();
    useApp.getState().setSettings((x) => ({ ...x, sync: { owner: 'ana', repo: 'datos', branch: 'main', token: 't', shas: {} } }));
    const r = await pullAll();
    expect(r.updated).toBeGreaterThanOrEqual(2);
    expect(useApp.getState().projects[p.id].name).toBe(p.name);
    expect(useApp.getState().profiles[prof.id]).toBeTruthy();
  });
});

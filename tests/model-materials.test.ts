import { describe, expect, it } from 'vitest';
import { buildFlat } from '../src/data/flats';
import { CATALOG, findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { profileFromSize } from '../src/store/profiles';
import { quickSize } from '../src/lib/sizes/quickSizes';
import { prepareSimpleProject } from '../src/features/simple/workflow';
import { modelMaterials } from '../src/features/simple/modelMaterials';
import type { Fill } from '../src/features/studio/model';
import type { Project } from '../src/store/types';
import { COSTUME_CATALOG } from '../src/data/costumeCatalog';

const blue: Fill = { type: 'color', color: '#3366AA' };
const red: Fill = { type: 'color', color: '#B4273A' };
const photo: Fill = { type: 'tela', fabricId: 'foto-propia', rotation: 27, scale: .74, offsetX: 13, offsetY: 31 };
const size = quickSize('mujer', 'mediana');

function source(id: string) {
  const model = findModel(id)!;
  const project = prepareSimpleProject(projectFromModel(model, profileFromSize(size.table, size.row)));
  return { model, project, flat: buildFlat(model.id, model.flat) };
}

function paint(project: Project, piece: RegExp, fill: Fill): Project {
  let found = false;
  const views = project.design!.views.map(view => {
    if (view.source.type !== 'pieza' || !piece.test(view.source.pieceId)) return view;
    found = true;
    return { ...view, zoneFills: Object.fromEntries(view.zones.map(zone => [zone.id, fill])) };
  });
  expect(found, `Falta una pieza física que corresponda a ${piece}`).toBe(true);
  return { ...project, design: { ...project.design!, views } };
}

describe('materiales reales en la composición del figurín', () => {
  it('distingue delantero y espalda y conserva la foto y sus ajustes de las mangas', () => {
    const model = CATALOG.find(model => model.generatorId === 'sudadera-capucha-holgada' && model.params?.capucha === 'si')!;
    const original = source(model.id);
    let project = paint(original.project, /delanter/, blue);
    project = paint(project, /espalda/, red);
    project = paint(project, /manga/, photo);
    const snapshot = JSON.stringify(project);
    for (const side of ['frente', 'espalda']) {
      const view = original.flat.views.find(view => view.key === side)!;
      const result = modelMaterials(project, view);
      for (const zone of view.zones.filter(zone => zone.type === (side === 'frente' ? 'delantero' : 'espalda'))) {
        expect(result.fills[zone.id]).toEqual(side === 'frente' ? blue : red);
      }
      const sleeves = view.zones.filter(zone => zone.type === 'manga');
      expect(sleeves.length).toBeGreaterThan(0);
      for (const sleeve of sleeves) expect(result.fills[sleeve.id]).toEqual(photo);
    }
    expect(JSON.stringify(project)).toBe(snapshot);
  });

  it('la jareta integrada de una falda toma el material de su propia cara', () => {
    const original = source('falda-fruncida');
    let project = paint(original.project, /^delantera$/, blue);
    project = paint(project, /^trasera$/, red);
    for (const side of ['frente', 'espalda']) {
      const view = original.flat.views.find(view => view.key === side)!;
      const result = modelMaterials(project, view);
      const expected = side === 'frente' ? blue : red;
      expect(result.fills[view.zones.find(zone => zone.type === (side === 'frente' ? 'delantero' : 'espalda'))!.id]).toEqual(expected);
      expect(result.fills.pretina).toEqual(expected);
    }
  });

  it('el peto y la falda de un jumper conservan materiales distintos', () => {
    const original = source('jumper-peto-midi');
    let project = paint(original.project, /peto/, photo);
    project = paint(project, /falda/, blue);
    const view = original.flat.views.find(view => view.key === 'frente')!;
    const result = modelMaterials(project, view);
    expect(result.fills.peto).toEqual(photo);
    for (const zone of view.zones.filter(zone => zone.id.includes('falda'))) expect(result.fills[zone.id]).toEqual(blue);
  });

  it('el cuerpo de un bolso muestra su tela sin confundir un bolsillo dibujado con un extra añadido', () => {
    const original = source('bolsa-tote');
    const physical = original.project.design!.views.find(view => view.source.type === 'pieza' && view.source.pieceId === 'exterior')!;
    expect(physical).toBeDefined();
    const project = paint(original.project, /^exterior$/, photo);
    const view = original.flat.views[0];
    const result = modelMaterials(project, view);
    const body = view.zones.find(zone => zone.type === 'delantero')!;
    expect(result.fills[body.id]).toEqual(photo);
    for (const pocket of view.zones.filter(zone => zone.type === 'bolsillo')) expect(result.fills[pocket.id]).toBeUndefined();
  });

  it('no inventa un único material cuando una pieza tiene paneles diferentes', () => {
    const original = source('falda-fruncida');
    const project: Project = { ...original.project, design: { ...original.project.design!, views: original.project.design!.views.map(view =>
      view.source.type === 'pieza' && view.source.pieceId === 'delantera' ? { ...view,
        zones: [{ ...view.zones[0], id: 'panel-a' }, { ...view.zones[0], id: 'panel-b' }],
        zoneFills: { 'panel-a': blue, 'panel-b': red }
      } : view) } };
    const view = original.flat.views.find(view => view.key === 'frente')!;
    const result = modelMaterials(project, view);
    expect(result.omittedPanels).toBe(true);
    for (const zone of view.zones) expect(result.fills[zone.id]).toBeUndefined();
  });

  it('conserva las caras, fotos y ajustes de los disfraces sin vestirlos con el refuerzo o la diadema comprada', () => {
    const mappings: Record<string, Record<string, string>> = {
      'capa-semicircular': { delantero: 'exterior', espalda: 'exterior' },
      'corona-textil': { base: 'exterior', reverso: 'reverso' },
      'sombrero-mago': { copa: 'cono', ala: 'ala' },
      'orejas-diadema': { 'oreja-izquierda': 'frente', 'oreja-derecha': 'frente' }
    };
    for(const [generator, expected] of Object.entries(mappings)) {
      const model=COSTUME_CATALOG.find(model=>model.generatorId===generator)!;
      let project=prepareSimpleProject(projectFromModel(model));
      for(const view of project.design!.views) if(view.source.type==='pieza') project=paint(project,new RegExp(`^${view.source.pieceId}$`),red);
      for(const piece of new Set(Object.values(expected))) project=paint(project,new RegExp(`^${piece}$`),piece==='reverso'||piece==='ala'?blue:photo);
      const snapshot=JSON.stringify(project);
      for(const flat of buildFlat(model.id,model.flat).views) {
        const result=modelMaterials(project,flat);
        for(const [zone,piece] of Object.entries(expected)) if(flat.zones.some(item=>item.id===zone)) expect(result.fills[zone],`${generator}/${zone}`).toEqual(piece==='reverso'||piece==='ala'?blue:photo);
        expect(result.fills['diadema-referencia']).toBeUndefined();
        expect(Object.values(result.fills)).not.toContainEqual(red);
      }
      expect(JSON.stringify(project)).toBe(snapshot);
    }
  });
});

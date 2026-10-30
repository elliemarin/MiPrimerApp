import type { FlatView } from '../../data/flats';
import type { Project } from '../../store/types';
import type { DesignView, Fill, Zone } from '../studio/model';

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// These assembled objects have explicit face/lining roles. Matching a generic
// "base" by its label could pick interfacing or the reverse face instead.
const COSTUME_SURFACES: Record<string, Record<string, string>> = {
  'capa-semicircular': { delantero: 'exterior', espalda: 'exterior' },
  'corona-textil': { base: 'exterior', reverso: 'reverso' },
  'sombrero-mago': { copa: 'cono', ala: 'ala' },
  'orejas-diadema': { 'oreja-izquierda': 'frente', 'oreja-derecha': 'frente' }
};

function pieceScore(view: DesignView, zone: Zone, back: boolean): number {
  if (view.source.type !== 'pieza' || view.source.pieceId.startsWith('componente-')) return -1;
  const id = normalized(view.source.pieceId), label = normalized(view.label), value = `${id} ${label}`;
  const front = /delant|frente/.test(value), rear = /espalda|traser/.test(value);
  if ((front && back) || (rear && !back)) return -1;
  const exact = id === zone.id ? 100 : 0;
  if (zone.type === 'manga') return /manga/.test(value) ? 80 + exact : -1;
  if (zone.type === 'capucha') return /capucha/.test(value) ? 80 + exact : -1;
  if (zone.type === 'puno') return /puno/.test(value) ? 85 : /manga/.test(value) ? 50 : -1;
  if (zone.type === 'pretina') return /pretina|cintur|jareta/.test(value) ? 85 : -1;
  if (zone.id.startsWith('tirante')) return /tirante/.test(value) ? 90 : -1;
  if (/asa|correa/.test(zone.id)) return /asa|correa/.test(value) ? 90 : -1;
  if (zone.id === 'peto') return /peto/.test(value) ? 90 : -1;
  if (/falda/.test(zone.id)) return /falda/.test(value) ? 85 + exact : -1;
  if (zone.type === 'pierna') return /pierna|delanter|traser/.test(value) ? 65 + exact : -1;
  if (zone.type === 'cuello') return /cuello|bies/.test(value) ? 80 : -1;
  if (zone.type === 'bolsillo') return -1; // Illustrated stock pockets are not added project components.
  if (zone.type === 'espalda') return rear && !/falda|peto/.test(value) ? 70 + exact : /exterior|principal|cuerpo/.test(value) ? 60 : -1;
  if (zone.type === 'delantero') return front && !/falda|peto/.test(value) ? 70 + exact : /exterior|principal|cuerpo/.test(value) ? 60 : -1;
  if (zone.type === 'base') return /cuerpo|delanter|traser|espalda|principal|panel/.test(value) ? 50 + exact : -1;
  return exact || -1;
}

/** Match whole-piece materials only. Panel compositions stay in the physical view. */
export function modelMaterials(project: Project, flat: FlatView): { fills: Record<string, Fill>; omittedPanels: boolean } {
  const doc = project.design;
  if (!doc) return { fills: {}, omittedPanels: false };
  const back = flat.key === 'espalda';
  const original = doc.views.find(view => view.source.type === 'plantilla' && view.source.view === flat.key);
  const fills: Record<string, Fill> = { ...original?.zoneFills };
  let omittedPanels = false;
  const costume = COSTUME_SURFACES[project.pattern?.generatorId ?? ''];
  for (const zone of flat.zones) {
    const ranked = (part: Zone) => doc.views.map(view => ({ view, score: pieceScore(view, part, back) })).filter(item => item.score > 0).sort((a,b) => b.score - a.score)[0]?.view;
    let physical = costume ? doc.views.find(view => view.source.type === 'pieza' && view.source.pieceId === costume[zone.id]) : ranked(zone);
    if (costume && !costume[zone.id]) continue; // Purchased headband is a reference, not a generated fabric piece.
    if (!physical && ['pretina','cuello','puno','canesu'].includes(zone.type)) {
      // A casing/hem/bound neckline can be part of a main piece. It inherits
      // that piece's material only when no separately cut trim exists.
      const main = zone.type==='puno' ? flat.zones.find(part=>part.type==='manga')
        : flat.zones.find(part=>/falda/.test(part.id))
        ?? flat.zones.find(part=>part.type==='pierna')
        ?? flat.zones.find(part=>part.type===(back?'espalda':'delantero'))
        ?? flat.zones.find(part=>part.type==='base');
      if(main) physical=ranked(main);
    }
    if (!physical) continue;
    const values = physical.zones.map(part => physical.zoneFills?.[part.id]).filter((fill): fill is Fill => !!fill && fill.type !== 'ninguno');
    if (!values.length) continue;
    if (values.length !== physical.zones.length || values.some(fill => JSON.stringify(fill) !== JSON.stringify(values[0]))) {
      delete fills[zone.id]; omittedPanels = true; continue;
    }
    fills[zone.id] = values[0];
  }
  return { fills, omittedPanels };
}

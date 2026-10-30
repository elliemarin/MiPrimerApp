import type { CatalogModel, GarmentType, Recipient, Technique } from '../../data/catalog';
import { TYPE_LABEL } from '../../data/catalog';

export type Availability = 'todos' | 'patron' | 'estudio' | 'inspiracion';
export type Filters = {
  q: string;
  recipient: Recipient | 'todos';
  type: GarmentType | 'todos';
  onlyAvailable: boolean;
  availability?: Availability;
  subcategory?: string;
  difficulty: number;
  fabric: 'todos' | 'plano' | 'punto';
  stretch: 'todos' | 'ninguna' | 'baja' | 'media' | 'alta';
  fit: 'todos' | 'ajustado' | 'regular' | 'holgado' | 'oversize';
  technique: Technique | 'todas';
  size: 'todas' | 'infantil' | 'adulto';
};
export const INITIAL_FILTERS: Filters = { q: '', recipient: 'todos', type: 'todos', onlyAvailable: false, availability: 'todos', subcategory: 'todas', difficulty: 0, fabric: 'todos', stretch: 'todos', fit: 'todos', technique: 'todas', size: 'todas' };
export const normalizeSearch = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Every search token may match a natural-language synonym, without changing categories. */
const synonyms: Record<string, string[]> = {
  chaquetas: ['chaqueta','chamarra','jacket'], chamarras: ['chaqueta','chamarra','jacket'], jackets: ['chaqueta','chamarra','jacket'],
  chaqueta: ['chaqueta', 'chamarra', 'jacket'], chamarra: ['chaqueta', 'chamarra', 'jacket'], jacket: ['chaqueta', 'chamarra', 'jacket'],
  jumpper: ['jumper', 'peto', 'enterizo', 'mono', 'sueter'], jumppers: ['jumper', 'peto', 'enterizo', 'mono', 'sueter'],
  jumper: ['jumper', 'peto', 'enterizo', 'mono', 'sueter'], jumpers: ['jumper', 'peto', 'enterizo', 'mono', 'sueter'], jumpsuit: ['enterizo', 'mono'],
  mezclilla: ['mezclilla', 'denim'], denim: ['mezclilla', 'denim'],
  holgado: ['holgado', 'oversize', 'amplio'], holgados: ['holgado', 'oversize', 'amplio'],
  hoodie: ['hoodie', 'capucha'], bolso: ['bolso', 'bolsa'],
  bebe: ['bebe', 'baby'], scrunchie: ['scrunchie', 'dona'], laptop: ['laptop', 'portatil'],
};
export function modelHasPattern(m: CatalogModel): boolean { return !!m.generatorId && !m.studioOnly && m.status !== 'pendiente'; }
export function modelAvailability(m: CatalogModel): Availability { return modelHasPattern(m) ? 'patron' : m.studioOnly ? 'estudio' : 'inspiracion'; }
export function matches(m: CatalogModel, f: Filters): boolean {
  if (f.q.trim()) {
    const hay = normalizeSearch(`${m.name} ${m.sub} ${m.description} ${TYPE_LABEL[m.type]} ${m.recommendedFabrics.join(' ')} ${m.recipients.join(' ')} ${m.fits.join(' ')} ${m.variants.map(v=>`${v.name} ${v.text}`).join(' ')}`);
    if (!normalizeSearch(f.q).split(/\s+/).every(w => (synonyms[w] ?? [w]).some(term=>hay.includes(term)))) return false;
  }
  if (f.recipient !== 'todos' && !m.recipients.includes(f.recipient)) return false;
  if (f.type !== 'todos' && m.type !== f.type) return false;
  if (f.subcategory && f.subcategory !== 'todas' && m.sub !== f.subcategory) return false;
  if (f.onlyAvailable && m.status === 'pendiente') return false;
  if (f.availability && f.availability !== 'todos' && modelAvailability(m) !== f.availability) return false;
  if (f.difficulty && m.difficulty !== f.difficulty) return false;
  if (f.fabric !== 'todos' && !m.fabrics.includes(f.fabric)) return false;
  if (f.stretch !== 'todos' && m.stretch !== f.stretch) return false;
  if (f.fit !== 'todos' && !m.fits.includes(f.fit)) return false;
  if (f.technique !== 'todas' && !m.techniques.includes(f.technique)) return false;
  if (f.size === 'infantil' && !m.recipients.some(r=>['bebe','toddler','infantil'].includes(r))) return false;
  if (f.size === 'adulto' && !m.recipients.some(r=>['mujer','hombre','unisex'].includes(r))) return false;
  return true;
}

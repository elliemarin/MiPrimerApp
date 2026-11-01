import type { CatalogModel, Technique } from './catalog';
import type { CatalogFamily } from './catalogTaxonomy';
import { ADULT_DRESS_STYLES } from '../lib/pattern/generators/dressStyles';

/** One card per construction. The size is chosen after selecting a style. */
export const DRESS_STYLE_CATALOG: CatalogModel[] = ADULT_DRESS_STYLES.map(style => {
  const id = `vestido-adulto-${style.id}`;
  const techniques: Technique[] = ['costura-recta', 'dobladillo', 'botones'];
  if (style.tiers && style.cut !== 'paneles' || style.sleeve === 'volante') techniques.push('frunces');
  if (style.cut === 'paneles') techniques.push('collage');
  return {
    id, name: style.name, type: 'faldas-vestidos', sub: 'Vestidos', family: 'vestido', recipients: ['mujer'],
    difficulty: style.buttons || style.tiers > 1 ? 3 : 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado', 'oversize'], techniques,
    status: 'experimental', generatorId: 'vestido-estilos-adulto',
    params: { estilo: style.id, largo: Math.round(1640 * style.length * 10) / 10, holgura: style.wide ? 360 : 140 },
    flat: { family: 'vestido', dressStyle: style.id },
    description: `${style.description} Patrón adulto holgado desde medidas reales, con piezas e instrucciones de cada unión. Requiere muestra de prueba.`,
    variants: [{ name: 'Tallas y medidas', text: 'Elige chica, mediana, grande o tus medidas. Ajusta el largo total dentro del mismo diseño.' },
      { name: 'Corte holgado', text: 'Sin pinzas de busto ni entalle de cintura. La holgura se añade una sola vez al mayor contorno del cuerpo.' }],
    recommendedFabrics: ['Viscosa', 'Lino ligero', 'Algodón de caída suave', 'Chambray'],
    materials: ['Bies', style.buttons ? 'Botones para frente completo' : 'Un botón para abertura trasera', 'Hilo'],
    collection: 'Vestidos',
    searchTerms: ['vestido', 'vestidos', style.name, style.neck === 'pico' ? 'escote v pico' : style.neck, style.cut, style.sleeve === 'sin' ? 'sin mangas' : `manga ${style.sleeve}`, style.buttons ? 'abotonado botones camisero' : 'holgado', ...(style.cut === 'paneles' ? ['patchwork', 'collage', 'colorblock'] : []), ...(style.cut === 'imperio' || style.tiers > 1 ? ['boho'] : []), ...(style.neck === 'cuadrado' ? ['tirantes anchos', 'cuadrado'] : [])],
    designGroup: { id, name: style.name, preferred: true }
  };
});
export const DRESS_STYLE_FAMILIES: Readonly<Record<string, CatalogFamily>> = Object.fromEntries(DRESS_STYLE_CATALOG.map(model => [model.designGroup!.id, 'vestido']));

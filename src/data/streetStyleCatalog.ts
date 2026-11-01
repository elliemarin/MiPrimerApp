import type { CatalogModel, Technique } from './catalog';
import type { CatalogFamily } from './catalogTaxonomy';
import { STREET_STYLES, isHoodieStyle } from '../lib/pattern/generators/streetStyles';

/** One card per construction. Measurements always remain inside the card. */
export const STREET_STYLE_CATALOG: CatalogModel[] = STREET_STYLES.map(([style, name, description]) => {
  const hoodie = isHoodieStyle(style), zip = hoodie && style.includes('cierre'), panel = /diagonal|bandas|canesu|panel-central|patchwork|western|costura-frontal|pantalon-rodilla/.test(style);
  const pocket = /canguro|carpintero|cargo-slim/.test(style), frill = /peplum|paperbag/.test(style), cuff = style === 'hoodie-globo';
  const techniques: Technique[] = [hoodie ? 'tejido-punto' : 'costura-recta', 'dobladillo', ...(!hoodie && style !== 'pantalon-paperbag' || zip ? ['cierre' as const] : []), ...(pocket ? ['bolsillos' as const] : []), ...(panel ? ['collage' as const] : []), ...(frill ? ['frunces' as const] : []), ...(cuff ? ['puno' as const] : []), ...(style === 'pantalon-paperbag' ? ['jareta' as const] : [])];
  return {
    id: `street-${style}`, name, designGroup: { id: `street-${style}`, name, preferred: true },
    type: hoodie ? 'abrigo' : 'inferiores', sub: hoodie ? 'Hoodies por construcción' : 'Pantalones por estilo',
    recipients: ['mujer', 'hombre', 'unisex'], difficulty: hoodie && !zip && !panel ? 2 : 3,
    fabrics: hoodie ? ['punto'] : ['plano'], stretch: hoodie || style === 'pantalon-cargo-slim' ? 'media' : 'ninguna',
    fits: style === 'pantalon-cargo-slim' ? ['ajustado', 'regular'] : ['holgado'], techniques,
    status: 'experimental', generatorId: `street-${style}`, params: {},
    flat: { family: hoodie ? 'top' : 'pantalon', street: style },
    description: `${description} Patrón paramétrico desde tus medidas, con piezas, márgenes, comprobaciones e instrucciones. Requiere una muestra de ajuste antes de cortar la tela definitiva.`,
    recommendedFabrics: hoodie ? ['Felpa de algodón estable', 'French terry', 'Punto interlock'] : style === 'pantalon-cargo-slim' ? ['Sarga con elastano', 'Mezclilla con al menos 15 % de elasticidad horizontal'] : /palazzo|culotte|paperbag/.test(style) ? ['Lino de peso medio', 'Gabardina fluida', 'Sarga ligera'] : ['Mezclilla', 'Gabardina', 'Sarga'],
    materials: ['Hilo adecuado al tejido', ...(zip ? ['Cierre separable ajustado al largo de centro delantero', 'Entretela de punto'] : []), ...(!hoodie && style !== 'pantalon-paperbag' ? ['Cierre de bragueta', 'Botón', 'Entretela para pretina'] : []), ...(style === 'pantalon-paperbag' ? ['Elástico para cintura'] : []), ...(cuff ? ['Rib para puños'] : []), ...(panel ? ['Telas de contraste con comportamiento compatible'] : [])],
    variants: [{ name: 'Medidas personales', text: 'Elige chica, mediana o grande como referencia, o introduce tus medidas. El estilo conserva su construcción al cambiar la talla.' }],
    collection: hoodie ? 'Hoodies' : 'Pantalones de autor',
    searchTerms: [hoodie ? 'hoodie sudadera con capucha hoddie' : 'pantalon pantalones', name, style.replace(/-/g, ' '), ...(style === 'pantalon-setentas' ? ['setenta', '70s', 'retro', 'campana', 'flare'] : []), ...(style === 'pantalon-western' ? ['vaquero western costados paneles denim'] : []), ...(style === 'pantalon-bootcut' ? ['bootcut botas vaquero'] : []), ...(style === 'hoodie-globo' ? ['abullonada manga globo'] : []), ...(style === 'hoodie-peplum' ? ['volante olan peplum'] : [])]
  };
});

export const STREET_STYLE_FAMILIES: Record<string, CatalogFamily> = Object.fromEntries(STREET_STYLES.map(([style]) => [`street-${style}`, isHoodieStyle(style) ? 'hoodie' : 'pantalon']));

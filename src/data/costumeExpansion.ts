import type { CatalogModel } from './catalog';
import type { FlatSpec } from './flats';
import { COSTUME_RECIPES } from '../lib/pattern/generators/costumeExpansion';

export const COSTUME_EXPANSION_FAMILY_LABELS = {
  tabardo: 'Tabardos de disfraz', alas: 'Alas de disfraz', cola: 'Colas de disfraz',
  'diadema-disfraz': 'Diademas de personaje', 'cuello-disfraz': 'Cuellos de disfraz',
  'puno-disfraz': 'Puños de disfraz', polaina: 'Polainas', 'peto-disfraz': 'Pecheras de disfraz',
  'conjunto-disfraz': 'Conjuntos de disfraz'
} as const;
export const COSTUME_EXPANSION_FAMILIES: Record<string,string> = Object.fromEntries(COSTUME_RECIPES.map(recipe=>[`disfraz-${recipe.id}`,recipe.family]));

/** One card per actual construction. Changing dimensions never adds a card. */
export const COSTUME_EXPANSION_CATALOG: CatalogModel[] = COSTUME_RECIPES.map(recipe=>({
  id:`disfraz-${recipe.id}`, name:recipe.name, collection:'Disfraces',
  sub:recipe.kind==='kit'?'Conjuntos de personaje':recipe.kind==='alas'?'Alas textiles':recipe.kind==='cola'?'Colas y criaturas':'Vestuario y accesorios de personaje',
  type:recipe.kind==='tabardo'?'superiores':recipe.kind==='chaleco'?'abrigo':recipe.kind==='falda'?'faldas-vestidos':'accesorios',
  recipients:['infantil','mujer','hombre','unisex'], difficulty:recipe.kind==='kit'||recipe.style==='unicornio'?3:2,
  fabrics:['plano'], stretch:'ninguna', fits:['regular'], techniques:['costura-recta','forro',...(recipe.style==='frunce'?['frunces' as const]:[]),...(['espacial','pirata'].includes(recipe.style)?['bolsillos' as const]:[])],
  status:'experimental', generatorId:`cosplay-${recipe.id}`,
  params:{ancho:recipe.width,largo:recipe.height,...recipe.circumference?{contorno:recipe.circumference}:{},margen:5},
  flat:{family:'accesorio',accessory:'rectangulo',costume:recipe.id} as FlatSpec,
  description:`${recipe.description} Patrón original paramétrico: incluye las piezas de corte, márgenes, cantidades, materiales y pasos de montaje. Pendiente de prueba de confección física.`,
  designGroup:{id:`disfraz-${recipe.id}`,name:recipe.name},
  variantLabel:'Medidas de referencia editables; comprueba el ajuste sobre la persona',
  variants:[{name:'Medidas y acabados',text:'Elige este diseño y ajusta sus medidas reales. Intervén el conjunto, elige telas por pieza y coloca bordados; las piezas complementarias se imprimen por separado.'}],
  recommendedFabrics:['Algodón de tejido plano','Popelina','Sarga ligera'],
  materials:['Tela exterior estable','Tela de reverso','Hilo',...(['alas','diadema','peto'].includes(recipe.kind)?['Refuerzo textil flexible']:[]),...(recipe.circumference?['Velcro suave']:[])],
  searchTerms:['disfraz','disfraces','cosplay','teatro','carnaval','halloween',recipe.kind,recipe.style,...recipe.id.split('-')]
}));

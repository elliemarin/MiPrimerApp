import type { CatalogModel } from './catalog';

/** Browsing metadata only. Every member keeps its original recipe and stable ID. */
export interface CatalogDesignGroup { id: string; name: string; preferred?: boolean }

const group = (id: string, name: string): CatalogDesignGroup => ({ id: `tipo-${id}`, name });

// Object names describe different uses; these explicit aliases share one design.
const sleeveTypes: Record<string, [string, string]> = {
  lector: ['lector', 'Funda para lector electrónico'], 'libro-bolsillo': ['libro', 'Funda para libro o agenda'],
  libreta: ['cuaderno', 'Funda para cuadernos'], 'cuaderno-a5': ['cuaderno', 'Funda para cuadernos'], 'cuaderno-a4': ['cuaderno', 'Funda para cuadernos'],
  agenda: ['libro', 'Funda para libro o agenda'], tableta: ['tableta', 'Funda para tableta'], 'tableta-mini': ['tableta', 'Funda para tableta'],
  portatil: ['portatil', 'Funda para portátil'], 'portatil-grande': ['portatil', 'Funda para portátil'],
  telefono: ['telefono', 'Funda para teléfono'], 'telefono-grande': ['telefono', 'Funda para teléfono'],
  lentes: ['lentes', 'Funda para lentes'], consola: ['consola', 'Funda para consola portátil'],
  tarjetas: ['tarjetas', 'Funda para tarjetas y notas'], pasaporte: ['pasaporte', 'Funda para pasaporte'],
  patrones: ['patrones', 'Funda para patrones'], bastidor: ['bastidor', 'Funda para bastidor'],
  cables: ['cables', 'Funda para cables'], muestrario: ['muestrario', 'Funda para muestrario textil']
};
export function sleeveDesignGroup(use: string): CatalogDesignGroup {
  const descriptor = sleeveTypes[use];
  return descriptor ? group(`funda-${descriptor[0]}`, descriptor[1]) : group(`funda-${use}`, 'Funda con solapa');
}
const legacySleeves: Record<string, string> = { 'funda-laptop-13': 'portatil', 'funda-laptop-15': 'portatil', 'funda-tablet': 'tableta', 'funda-telefono': 'telefono', 'funda-libro': 'libro-bolsillo', 'funda-lentes': 'lentes', 'funda-lector': 'lector', 'funda-consola': 'consola' };

const rectangleTypes: Record<string, [string, string]> = {
  mesa: ['individual', 'Mantel individual reversible'], 'mesa-amplio': ['individual', 'Mantel individual reversible'], desayuno: ['individual', 'Mantel individual reversible'],
  bandeja: ['bandeja', 'Tapete para bandeja'], posavasos: ['posavasos', 'Posavasos textil'], taza: ['taza', 'Tapete para taza'], plato: ['plato', 'Tapete para plato'],
  centro: ['centro', 'Centro de mesa'], camino: ['camino', 'Camino de mesa'], 'camino-largo': ['camino', 'Camino de mesa'],
  servilleta: ['servilleta', 'Servilleta reversible'], 'servilleta-grande': ['servilleta', 'Servilleta reversible'], maquina: ['maquina', 'Tapete para máquina de coser'],
  raton: ['raton', 'Tapete para ratón'], escritorio: ['escritorio', 'Protector textil de escritorio'], marcapaginas: ['marcapaginas', 'Marcapáginas textil'],
  muestrario: ['muestrario', 'Base para muestrario'], cuadro: ['cuadro', 'Panel decorativo textil']
};
export function rectangleDesignGroup(use: string): CatalogDesignGroup {
  const descriptor = rectangleTypes[use];
  return descriptor ? group(`textil-${descriptor[0]}`, descriptor[1]) : group(`textil-${use}`, 'Textil reversible');
}
const legacyRectangles: Record<string, string> = { 'individual-reversible': 'mesa', 'posavasos-textil': 'posavasos', 'servilleta-reversible': 'servilleta', 'marcapaginas-textil': 'marcapaginas', 'tapete-maquina': 'maquina' };

/** Explicit construction boundaries, independent of wording or dimension labels.
 * Unrecognised designs remain individual; panel layouts are always separate. */
export function withDesignGroup(model: CatalogModel): CatalogModel {
  if (model.designGroup || !model.generatorId || model.panelPreset) return model;
  let designGroup: CatalogDesignGroup | undefined;
  const p = model.params ?? {};
  switch (model.generatorId) {
    case 'pantalon-cintura-elastica':
      if (model.id === 'short-elastico' || model.type === 'pijamas') break;
      designGroup = p.estilo === 'jogger' ? group('jogger', 'Jogger con cintura elástica') : p.estilo === 'ancho' ? group('pantalon-amplio', 'Pantalón amplio con cintura elástica') : group('pantalon-recto', 'Pantalón recto con cintura elástica');
      break;
    case 'falda-fruncida-elastica': designGroup = group('falda-fruncida', 'Falda fruncida con cintura elástica'); break;
    case 'chaqueta-hombro-caido':
      designGroup = p.manga === 'no' ? group('chaleco-abierto', 'Chaleco abierto') : model.flat.top?.style === 'cardigan' ? group('cardigan-abierto', 'Cárdigan abierto') : group('chaqueta-hombro-caido', 'Chaqueta de hombro caído'); break;
    case 'top-hombro-caido': designGroup = p.manga === 'no' ? group('top-cuadrado-sin-mangas', 'Top de escote cuadrado sin mangas') : group('top-cuadrado', 'Top de escote cuadrado'); break;
    case 'poncho-rectangular': designGroup = p.aperturaFrente === 'si' ? group('ruana', 'Ruana abierta') : group('poncho', 'Poncho rectangular'); break;
    case 'jumper-peto-falda': designGroup = group('jumper-falda', 'Jumper con peto y falda'); break;
    case 'sudadera-capucha-holgada':
      designGroup = p.capucha === 'si' ? group('hoodie', 'Hoodie holgada') : group('sudadera', 'Sudadera sin capucha');
      if (p.largo === 660 && p.largoManga === 540 && p.holgura === 260) designGroup.preferred = true;
      break;
    case 'bolsa-tote': designGroup = group('bolsa-tote', 'Bolsa tote con asas'); break;
    case 'bolsa-jareta': designGroup = group('bolsa-jareta', 'Bolsa con jareta'); break;
    case 'estuche-plano': designGroup = group('estuche-cierre', 'Estuche plano con cierre'); break;
    case 'funda-solapa': if (legacySleeves[model.id]) designGroup = sleeveDesignGroup(legacySleeves[model.id]); break;
    case 'textil-doble-cara': if (legacyRectangles[model.id]) designGroup = rectangleDesignGroup(legacyRectangles[model.id]); break;
    case 'cojin-sobre': designGroup = group('cojin', 'Funda de cojín o almohada'); break;
    case 'funda-bebida': designGroup = group('funda-bebida', 'Funda para bebidas'); break;
    case 'dona-cabello': designGroup = group('dona-cabello', 'Dona para cabello'); break;
    case 'bandana-reversible': designGroup = group('bandana', 'Bandana reversible'); break;
    case 'delantal-peto': designGroup = group('delantal', 'Delantal con peto y bolsillo'); break;
    case 'banda-lazo': if (!['cinturon-tela', 'pulsera-tela', 'lazo-regalo'].includes(model.id)) designGroup = group('banda-cabello', 'Banda o lazo para cabello'); break;
    case 'banderin-jareta': designGroup = group('banderin', 'Banderín triangular'); break;
    case 'antifaz-forrado': designGroup = group('antifaz', 'Antifaz forrado'); break;
  }
  return designGroup ? { ...model, designGroup } : model;
}

import type { CatalogModel } from './catalog';
import type { CatalogDesignGroup } from './catalogGrouping';
import type { CatalogFamily } from './catalogTaxonomy';

interface StyleIdentity extends CatalogDesignGroup { family: CatalogFamily }

/** A separate card is warranted by a different cut, assembly or set of pieces.
 * Body sizes, dimensions, sleeve lengths, materials and colours remain options
 * within a design. Recipe IDs and parameters are never rewritten here, so old
 * links and saved projects still resolve to the exact same pattern. */
export const CATALOG_STYLE_IDENTITIES: Readonly<Record<string, StyleIdentity>> = {
  'conjunto-verano': { id: 'tipo-conjunto-bebe', name: 'Conjunto de pelele y sombrero', family: 'conjunto' },
  'conjunto-invierno': { id: 'tipo-conjunto-overol-gorro', name: 'Conjunto de overol y gorro con orejas', family: 'conjunto' },
  'conjunto-recien-nacido': { id: 'tipo-conjunto-ajuar', name: 'Ajuar de bonete, patucos y babero', family: 'conjunto' },
  'conjunto-vestido': { id: 'tipo-conjunto-vestido-cubrepanal', name: 'Conjunto de vestido y cubrepañal con olanes', family: 'conjunto' },
  'conjunto-pelele-diadema': { id: 'tipo-conjunto-pelele-diadema', name: 'Conjunto de pelele con volantes y diadema', family: 'conjunto' },
  'conjunto-campesino': { id: 'tipo-conjunto-campesino', name: 'Conjunto de blusa campesina y short abullonado', family: 'conjunto' },
  'conjunto-rayas': { id: 'tipo-conjunto-blusa-bombacho', name: 'Conjunto de blusa con botones y bombacho', family: 'conjunto' },
  'conjunto-trapecio': { id: 'tipo-conjunto-trapecio', name: 'Conjunto de blusa trapecio y cubrepañal', family: 'conjunto' },
  'conjunto-vichy': { id: 'tipo-conjunto-volante-capri', name: 'Conjunto de blusa con volante y pantalón capri', family: 'conjunto' },
  'cubrepanal-bebe': { id: 'tipo-cubrepanal', name: 'Cubrepañal liso', family: 'cubrepanal' },
  'cubrepanal-olanes': { id: 'tipo-cubrepanal-olanes', name: 'Cubrepañal con tres olanes', family: 'cubrepanal' },
  'cubrepanal-tirantes': { id: 'tipo-cubrepanal-tirantes', name: 'Cubrepañal con tirantes cruzados', family: 'cubrepanal' },
  'vestido-trapecio': { id: 'tipo-vestido-trapecio', name: 'Vestido trapecio sin mangas', family: 'vestido' },
  'vestido-trapecio-volantes': { id: 'tipo-vestido-trapecio-mariposa', name: 'Vestido trapecio con volantes de mariposa', family: 'vestido' },
  'falda-circular': { id: 'tipo-falda-circular', name: 'Falda de círculo completo', family: 'falda' },
  'falda-medio-circulo': { id: 'tipo-falda-medio-circulo', name: 'Falda de medio círculo', family: 'falda' },
  'chaleco-borrego': { id: 'tipo-chaleco-infantil', name: 'Chaleco infantil forrado con escote en pico', family: 'chaleco' },
  'chaleco-ribeteado': { id: 'tipo-chaleco-ribeteado', name: 'Chaleco infantil abierto y ribeteado', family: 'chaleco' },
  'mono-pichi-bolsillos': { id: 'tipo-mono-tirantes', name: 'Mono pichi con tirantes y bolsillos', family: 'mono' },
  'mono-pico-volantes': { id: 'tipo-mono-pico-volantes', name: 'Mono de escote en pico con volantes', family: 'mono' },
  'blusa-trapecio': { id: 'tipo-blusa-trapecio', name: 'Blusa trapecio sin mangas', family: 'top' },
  'blusa-trapecio-volante': { id: 'tipo-blusa-trapecio-volante', name: 'Blusa trapecio con volante en el bajo', family: 'top' },
  'delantal-pichi': { id: 'tipo-delantal-pichi', name: 'Delantal pichi con volantes y bolsillo', family: 'delantal' },
  'delantal-pichi-liso': { id: 'tipo-delantal-pichi-liso', name: 'Delantal pichi liso', family: 'delantal' },
  'bonete-volante': { id: 'tipo-bonete-volante', name: 'Bonete con volante de tela', family: 'gorro' },
  'bonete-volante-doble': { id: 'tipo-bonete-volante-doble', name: 'Bonete con volante doble', family: 'gorro' },
  'bonete-encaje': { id: 'tipo-bonete-encaje', name: 'Bonete con puntilla de encaje', family: 'gorro' },
  'gorro-orejas-oso': { id: 'tipo-gorro-orejas', name: 'Gorro con orejas de oso', family: 'gorro' },
  'gorro-orejas-gato': { id: 'tipo-gorro-gato', name: 'Gorro con orejas de gato', family: 'gorro' },
  'gorro-orejas-conejo': { id: 'tipo-gorro-conejo', name: 'Gorro con orejas de conejo', family: 'gorro' },
  'gorro-orejeras-gato': { id: 'tipo-gorro-orejeras', name: 'Gorro con orejeras y orejas de gato', family: 'gorro' },
  'gorro-orejeras-oso': { id: 'tipo-gorro-orejeras-oso', name: 'Gorro con orejeras y orejas de oso', family: 'gorro' }
};

export const STYLE_IDENTITY_FAMILIES: Readonly<Record<string, CatalogFamily>> = Object.fromEntries(
  Object.values(CATALOG_STYLE_IDENTITIES).map(style => [style.id, style.family])
);

export function withStyleIdentity(model: CatalogModel): CatalogModel {
  const style = CATALOG_STYLE_IDENTITIES[model.id];
  if (!style) return model;
  return { ...model, designGroup: { id: style.id, name: style.name, preferred: true } };
}

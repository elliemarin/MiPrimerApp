import type { CatalogImageSource } from './catalogImages';

/** Original AI product photographs generated for the November 2026 style expansion.
 * Illustrative only: pattern dimensions and construction always come from geometry.
 * Keep row-major ordering stable; see docs/IMAGENES_ESTILOS.md for source and prompts. */
export const STYLE_CATALOG_IMAGE_SHEETS: Readonly<Record<string, readonly string[]>> = {
  "estilos-hoodies-01": [
    "street-hoodie-cierre",
    "street-hoodie-chaleco",
    "street-hoodie-canguro",
    "street-hoodie-globo",
    "street-hoodie-peplum",
    "street-hoodie-diagonal",
    "street-hoodie-bandas",
    "street-hoodie-canesu",
    "street-hoodie-panel-central"
  ],
  "estilos-street-02": [
    "street-hoodie-patchwork",
    "street-hoodie-chaleco-cierre",
    "street-hoodie-poncho",
    "street-pantalon-bootcut",
    "street-pantalon-setentas",
    "street-pantalon-palazzo",
    "street-pantalon-culotte",
    "street-pantalon-paperbag",
    "street-pantalon-carpintero"
  ],
  "estilos-street-03": [
    "street-pantalon-cargo-slim",
    "street-pantalon-western",
    "street-pantalon-patchwork",
    "street-pantalon-rodilla",
    "street-pantalon-costura-frontal",
    "street-pantalon-doble-rodilla",
    "tipo-gorro-gato",
    "tipo-gorro-conejo",
    "tipo-gorro-orejeras-oso"
  ],
  "estilos-vestidos-01": [
    "vestido-adulto-trapecio-redondo",
    "vestido-adulto-trapecio-pico",
    "vestido-adulto-recto-barco",
    "vestido-adulto-tunica-kimono",
    "vestido-adulto-caftan",
    "vestido-adulto-trapecio-mariposa",
    "vestido-adulto-imperio",
    "vestido-adulto-imperio-mariposa",
    "vestido-adulto-cintura-fruncida"
  ],
  "estilos-vestidos-02": [
    "vestido-adulto-cintura-manga",
    "vestido-adulto-talle-bajo",
    "vestido-adulto-dos-pisos",
    "vestido-adulto-tres-pisos",
    "vestido-adulto-imperio-boho",
    "vestido-adulto-camisero-recto",
    "vestido-adulto-camisero-fruncido",
    "vestido-adulto-camisero-trapecio",
    "vestido-adulto-paneles-horizontal"
  ],
  "estilos-vestidos-03": [
    "vestido-adulto-canesu-fruncido",
    "vestido-adulto-tirante-ancho-trapecio",
    "vestido-adulto-tirante-ancho-fruncido",
    "vestido-adulto-tirante-ancho-escalonado",
    "vestido-adulto-pichi-cuadrado",
    "vestido-adulto-volanton",
    "vestido-adulto-kimono-volante",
    "vestido-adulto-caftan-pico",
    "vestido-adulto-manga-campana"
  ],
  "estilos-bebe-01": [
    "bebe-body-sin-mangas",
    "bebe-body-mariposa",
    "bebe-body-falda",
    "bebe-body-canesu",
    "bebe-cardigan-cruzado",
    "bebe-cardigan-pico",
    "bebe-blusa-peplum",
    "bebe-camisa-globo",
    "bebe-peto-canesu"
  ],
  "estilos-bebe-02": [
    "bebe-peto-falda",
    "bebe-peto-cargo",
    "bebe-pantalon-rodilleras",
    "bebe-pantalon-panel-lateral",
    "bebe-pantalon-punos-extensibles",
    "bebe-babero-mangas",
    "bebe-poncho-bano",
    "bebe-bolero-redondo",
    "bebe-bonete-visera"
  ],
  "estilos-infantil-01": [
    "tipo-conjunto-overol-gorro",
    "tipo-conjunto-ajuar",
    "tipo-conjunto-vestido-cubrepanal",
    "tipo-conjunto-pelele-diadema",
    "tipo-conjunto-campesino",
    "tipo-conjunto-blusa-bombacho",
    "tipo-conjunto-trapecio",
    "tipo-conjunto-volante-capri",
    "tipo-cubrepanal-olanes"
  ],
  "estilos-infantil-02": [
    "tipo-cubrepanal-tirantes",
    "tipo-vestido-trapecio-mariposa",
    "tipo-falda-medio-circulo",
    "tipo-chaleco-ribeteado",
    "tipo-mono-pico-volantes",
    "tipo-blusa-trapecio-volante",
    "tipo-delantal-pichi-liso",
    "tipo-bonete-volante-doble",
    "tipo-bonete-encaje"
  ]
};

export const STYLE_CATALOG_IMAGES: Readonly<Record<string, CatalogImageSource>> = Object.fromEntries(
  Object.entries(STYLE_CATALOG_IMAGE_SHEETS).flatMap(([sheet, ids]) => ids.map((id, cell) => [id, { sheet, cell }]))
);

/** Reviewed visual bounds, without editing or resampling the generated source.
 * Unequal row heights prevent a hood, strap or hem appearing in its neighbour. */
export const STYLE_CATALOG_IMAGE_BOUNDS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  "estilos-hoodies-01/0": [
    0,
    0,
    418,
    408
  ],
  "estilos-hoodies-01/1": [
    418,
    0,
    410,
    408
  ],
  "estilos-hoodies-01/2": [
    828,
    0,
    426,
    408
  ],
  "estilos-hoodies-01/3": [
    0,
    408,
    418,
    400
  ],
  "estilos-hoodies-01/4": [
    418,
    408,
    410,
    400
  ],
  "estilos-hoodies-01/5": [
    828,
    408,
    426,
    400
  ],
  "estilos-hoodies-01/6": [
    0,
    808,
    418,
    446
  ],
  "estilos-hoodies-01/7": [
    418,
    808,
    410,
    446
  ],
  "estilos-hoodies-01/8": [
    828,
    808,
    426,
    446
  ],
  "estilos-street-02/0": [
    0,
    0,
    418,
    390
  ],
  "estilos-street-02/1": [
    418,
    0,
    418,
    390
  ],
  "estilos-street-02/2": [
    836,
    0,
    418,
    390
  ],
  "estilos-street-02/3": [
    0,
    390,
    418,
    418
  ],
  "estilos-street-02/4": [
    418,
    390,
    418,
    418
  ],
  "estilos-street-02/5": [
    836,
    390,
    418,
    418
  ],
  "estilos-street-02/6": [
    0,
    808,
    418,
    446
  ],
  "estilos-street-02/7": [
    418,
    808,
    418,
    446
  ],
  "estilos-street-02/8": [
    836,
    808,
    418,
    446
  ],
  "estilos-street-03/0": [
    0,
    0,
    418,
    418
  ],
  "estilos-street-03/1": [
    418,
    0,
    418,
    418
  ],
  "estilos-street-03/2": [
    836,
    0,
    418,
    418
  ],
  "estilos-street-03/3": [
    0,
    418,
    418,
    418
  ],
  "estilos-street-03/4": [
    418,
    418,
    418,
    418
  ],
  "estilos-street-03/5": [
    836,
    418,
    418,
    418
  ],
  "estilos-street-03/6": [
    0,
    836,
    418,
    418
  ],
  "estilos-street-03/7": [
    418,
    836,
    418,
    418
  ],
  "estilos-street-03/8": [
    836,
    836,
    418,
    418
  ],
  "estilos-vestidos-01/0": [
    0,
    0,
    418,
    418
  ],
  "estilos-vestidos-01/1": [
    418,
    0,
    418,
    418
  ],
  "estilos-vestidos-01/2": [
    836,
    0,
    418,
    418
  ],
  "estilos-vestidos-01/3": [
    0,
    418,
    418,
    418
  ],
  "estilos-vestidos-01/4": [
    418,
    418,
    418,
    418
  ],
  "estilos-vestidos-01/5": [
    836,
    418,
    418,
    418
  ],
  "estilos-vestidos-01/6": [
    0,
    836,
    418,
    418
  ],
  "estilos-vestidos-01/7": [
    418,
    836,
    418,
    418
  ],
  "estilos-vestidos-01/8": [
    836,
    836,
    418,
    418
  ],
  "estilos-vestidos-02/0": [
    0,
    0,
    418,
    418
  ],
  "estilos-vestidos-02/1": [
    418,
    0,
    418,
    418
  ],
  "estilos-vestidos-02/2": [
    836,
    0,
    418,
    418
  ],
  "estilos-vestidos-02/3": [
    0,
    418,
    418,
    418
  ],
  "estilos-vestidos-02/4": [
    418,
    418,
    418,
    418
  ],
  "estilos-vestidos-02/5": [
    836,
    418,
    418,
    418
  ],
  "estilos-vestidos-02/6": [
    0,
    836,
    418,
    418
  ],
  "estilos-vestidos-02/7": [
    418,
    836,
    418,
    418
  ],
  "estilos-vestidos-02/8": [
    836,
    836,
    418,
    418
  ],
  "estilos-vestidos-03/0": [
    0,
    0,
    418,
    407
  ],
  "estilos-vestidos-03/1": [
    418,
    0,
    418,
    407
  ],
  "estilos-vestidos-03/2": [
    836,
    0,
    418,
    407
  ],
  "estilos-vestidos-03/3": [
    0,
    407,
    418,
    401
  ],
  "estilos-vestidos-03/4": [
    418,
    407,
    418,
    401
  ],
  "estilos-vestidos-03/5": [
    836,
    407,
    418,
    401
  ],
  "estilos-vestidos-03/6": [
    0,
    808,
    418,
    446
  ],
  "estilos-vestidos-03/7": [
    418,
    808,
    418,
    446
  ],
  "estilos-vestidos-03/8": [
    836,
    808,
    418,
    446
  ],
  "estilos-bebe-01/0": [
    0,
    0,
    418,
    410
  ],
  "estilos-bebe-01/1": [
    418,
    0,
    418,
    410
  ],
  "estilos-bebe-01/2": [
    836,
    0,
    418,
    410
  ],
  "estilos-bebe-01/3": [
    0,
    410,
    418,
    395
  ],
  "estilos-bebe-01/4": [
    418,
    410,
    418,
    395
  ],
  "estilos-bebe-01/5": [
    836,
    410,
    418,
    395
  ],
  "estilos-bebe-01/6": [
    0,
    805,
    418,
    449
  ],
  "estilos-bebe-01/7": [
    418,
    805,
    418,
    449
  ],
  "estilos-bebe-01/8": [
    836,
    805,
    418,
    449
  ],
  "estilos-bebe-02/0": [
    0,
    0,
    418,
    418
  ],
  "estilos-bebe-02/1": [
    418,
    0,
    418,
    418
  ],
  "estilos-bebe-02/2": [
    836,
    0,
    418,
    418
  ],
  "estilos-bebe-02/3": [
    0,
    418,
    418,
    406
  ],
  "estilos-bebe-02/4": [
    418,
    418,
    418,
    406
  ],
  "estilos-bebe-02/5": [
    836,
    418,
    418,
    406
  ],
  "estilos-bebe-02/6": [
    0,
    824,
    418,
    430
  ],
  "estilos-bebe-02/7": [
    418,
    824,
    418,
    430
  ],
  "estilos-bebe-02/8": [
    836,
    824,
    418,
    430
  ],
  "estilos-infantil-01/0": [
    0,
    0,
    418,
    418
  ],
  "estilos-infantil-01/1": [
    418,
    0,
    418,
    418
  ],
  "estilos-infantil-01/2": [
    836,
    0,
    418,
    418
  ],
  "estilos-infantil-01/3": [
    0,
    418,
    418,
    418
  ],
  "estilos-infantil-01/4": [
    418,
    418,
    418,
    418
  ],
  "estilos-infantil-01/5": [
    836,
    418,
    418,
    418
  ],
  "estilos-infantil-01/6": [
    0,
    836,
    418,
    418
  ],
  "estilos-infantil-01/7": [
    418,
    836,
    418,
    418
  ],
  "estilos-infantil-01/8": [
    836,
    836,
    418,
    418
  ],
  "estilos-infantil-02/0": [
    0,
    0,
    418,
    410
  ],
  "estilos-infantil-02/1": [
    418,
    0,
    418,
    410
  ],
  "estilos-infantil-02/2": [
    836,
    0,
    418,
    410
  ],
  "estilos-infantil-02/3": [
    0,
    410,
    418,
    395
  ],
  "estilos-infantil-02/4": [
    418,
    410,
    418,
    395
  ],
  "estilos-infantil-02/5": [
    836,
    410,
    418,
    395
  ],
  "estilos-infantil-02/6": [
    0,
    805,
    418,
    449
  ],
  "estilos-infantil-02/7": [
    418,
    805,
    418,
    449
  ],
  "estilos-infantil-02/8": [
    836,
    805,
    418,
    449
  ]
};

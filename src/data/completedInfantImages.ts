import type { CatalogImageSource } from './catalogImages';

/** Original AI product illustrations replacing thirty-seven legacy vector cells.
 * Recipe descriptors preserve the exact atlas order, including infant variants.
 * Old-source aliases retain recipient and recipe selection precedence.
 * Illustrative only: geometry and physical validation remain independent.
 * See docs/IMAGENES_INFANTILES_COMPLETADAS.md for prompts and visual audit. */
export const COMPLETED_INFANT_SHEETS: Readonly<Record<string, readonly string[]>> = {
  "realistas-infantil-01": [
    "vestido-trapecio",
    "vestido-tirantes",
    "cubrepanal-bebe",
    "bonete-bebe",
    "patucos-bebe",
    "saco-dormir-bebe",
    "toalla-capucha",
    "babero-bandana",
    "barrel-bebe"
  ],
  "realistas-infantil-02": [
    "baggy-bebe",
    "pelele-tirantes",
    "overol-bebe",
    "gorro-orejas-oso",
    "conjunto-verano",
    "chaleco-borrego",
    "chaqueta-polar-cierre",
    "chaqueta-acolchada-reversible",
    "chaqueta-capucha-botones"
  ],
  "realistas-infantil-03": [
    "sudadera-canguro-infantil",
    "blusa-campesina",
    "blusa-campesina-larga",
    "blusa-botones-infantil",
    "pantalon-bombacho-infantil",
    "barrel-infantil",
    "vestido-jareta",
    "pelele-volantes",
    "diadema-lazo"
  ],
  "realistas-infantil-04": [
    "gorro-duende",
    "gorro-duende-fieltro",
    "gorro-orejeras-gato",
    "sombrero-pescador-lazo",
    "bonete-volante",
    "delantal-pichi",
    "mono-pichi-bolsillos",
    "peto-infantil-largo",
    "blusa-trapecio"
  ],
  "realistas-infantil-05": [
    "pantalon-capri-infantil",
    "sombrero-pescador-bebe"
  ]
};

export const COMPLETED_INFANT_SOURCE_MAP: Readonly<Record<string, CatalogImageSource>> = {
  "ninas-01/5": {
    "sheet": "realistas-infantil-01",
    "cell": 0
  },
  "ninas-01/1": {
    "sheet": "realistas-infantil-01",
    "cell": 1
  },
  "bebe-02/6": {
    "sheet": "realistas-infantil-01",
    "cell": 2
  },
  "bebe-02/1": {
    "sheet": "realistas-infantil-01",
    "cell": 3
  },
  "bebe-02/2": {
    "sheet": "realistas-infantil-01",
    "cell": 4
  },
  "bebe-02/3": {
    "sheet": "realistas-infantil-01",
    "cell": 5
  },
  "bebe-02/4": {
    "sheet": "realistas-infantil-01",
    "cell": 6
  },
  "bebe-02/5": {
    "sheet": "realistas-infantil-01",
    "cell": 7
  },
  "tendencia-02/7": {
    "sheet": "realistas-infantil-01",
    "cell": 8
  },
  "tendencia-03/7": {
    "sheet": "realistas-infantil-02",
    "cell": 0
  },
  "tendencia-02/3": {
    "sheet": "realistas-infantil-02",
    "cell": 1
  },
  "tendencia-02/8": {
    "sheet": "realistas-infantil-02",
    "cell": 2
  },
  "tendencia-02/4": {
    "sheet": "realistas-infantil-02",
    "cell": 3
  },
  "tendencia-02/6": {
    "sheet": "realistas-infantil-02",
    "cell": 4
  },
  "infantil-01/0": {
    "sheet": "realistas-infantil-02",
    "cell": 5
  },
  "infantil-01/1": {
    "sheet": "realistas-infantil-02",
    "cell": 6
  },
  "infantil-01/2": {
    "sheet": "realistas-infantil-02",
    "cell": 7
  },
  "infantil-01/3": {
    "sheet": "realistas-infantil-02",
    "cell": 8
  },
  "infantil-01/4": {
    "sheet": "realistas-infantil-03",
    "cell": 0
  },
  "infantil-01/5": {
    "sheet": "realistas-infantil-03",
    "cell": 1
  },
  "infantil-02/5": {
    "sheet": "realistas-infantil-03",
    "cell": 2
  },
  "infantil-01/6": {
    "sheet": "realistas-infantil-03",
    "cell": 3
  },
  "infantil-01/7": {
    "sheet": "realistas-infantil-03",
    "cell": 4
  },
  "infantil-02/6": {
    "sheet": "realistas-infantil-03",
    "cell": 5
  },
  "infantil-01/8": {
    "sheet": "realistas-infantil-03",
    "cell": 6
  },
  "infantil-02/0": {
    "sheet": "realistas-infantil-03",
    "cell": 7
  },
  "infantil-02/1": {
    "sheet": "realistas-infantil-03",
    "cell": 8
  },
  "infantil-02/2": {
    "sheet": "realistas-infantil-04",
    "cell": 0
  },
  "infantil-03/1": {
    "sheet": "realistas-infantil-04",
    "cell": 1
  },
  "infantil-02/3": {
    "sheet": "realistas-infantil-04",
    "cell": 2
  },
  "infantil-02/8": {
    "sheet": "realistas-infantil-04",
    "cell": 3
  },
  "infantil-04/0": {
    "sheet": "realistas-infantil-04",
    "cell": 4
  },
  "infantil-04/1": {
    "sheet": "realistas-infantil-04",
    "cell": 5
  },
  "infantil-04/2": {
    "sheet": "realistas-infantil-04",
    "cell": 6
  },
  "infantil-04/3": {
    "sheet": "realistas-infantil-04",
    "cell": 7
  },
  "infantil-04/4": {
    "sheet": "realistas-infantil-04",
    "cell": 8
  },
  "infantil-04/5": {
    "sheet": "realistas-infantil-05",
    "cell": 0
  },
  "ninas-01/0": {
    "sheet": "realistas-infantil-01",
    "cell": 0
  },
  "bebe-02/0": {
    "sheet": "realistas-infantil-01",
    "cell": 2
  }
};

/** The baby bucket has a snap chin tab; the adult bucket photo has no tab. */
export const COMPLETED_INFANT_RECIPE_MAP: Readonly<Record<string, CatalogImageSource>> = {
  "sombrero-pescador-bebe": {
    "sheet": "realistas-infantil-05",
    "cell": 1
  }
};

/** Pixel bounds on 1254 × 1254 atlases. Keep entire straps, hems and chin tabs. */
export const COMPLETED_INFANT_BOUNDS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  "realistas-infantil-01/0": [
    0,
    0,
    418,
    405
  ],
  "realistas-infantil-01/1": [
    418,
    0,
    418,
    405
  ],
  "realistas-infantil-01/2": [
    836,
    0,
    418,
    405
  ],
  "realistas-infantil-01/3": [
    0,
    405,
    418,
    400
  ],
  "realistas-infantil-01/4": [
    418,
    405,
    418,
    400
  ],
  "realistas-infantil-01/5": [
    836,
    405,
    418,
    400
  ],
  "realistas-infantil-01/6": [
    0,
    805,
    418,
    449
  ],
  "realistas-infantil-01/7": [
    418,
    805,
    418,
    449
  ],
  "realistas-infantil-01/8": [
    836,
    805,
    418,
    449
  ],
  "realistas-infantil-02/0": [
    0,
    0,
    418,
    415
  ],
  "realistas-infantil-02/1": [
    418,
    0,
    418,
    415
  ],
  "realistas-infantil-02/2": [
    836,
    0,
    418,
    415
  ],
  "realistas-infantil-02/3": [
    0,
    415,
    418,
    395
  ],
  "realistas-infantil-02/4": [
    418,
    415,
    418,
    395
  ],
  "realistas-infantil-02/5": [
    836,
    415,
    418,
    395
  ],
  "realistas-infantil-02/6": [
    0,
    810,
    418,
    444
  ],
  "realistas-infantil-02/7": [
    418,
    810,
    418,
    444
  ],
  "realistas-infantil-02/8": [
    836,
    810,
    418,
    444
  ],
  "realistas-infantil-03/0": [
    0,
    0,
    418,
    410
  ],
  "realistas-infantil-03/1": [
    418,
    0,
    418,
    410
  ],
  "realistas-infantil-03/2": [
    836,
    0,
    418,
    410
  ],
  "realistas-infantil-03/3": [
    0,
    410,
    418,
    400
  ],
  "realistas-infantil-03/4": [
    418,
    410,
    418,
    400
  ],
  "realistas-infantil-03/5": [
    836,
    410,
    418,
    400
  ],
  "realistas-infantil-03/6": [
    0,
    810,
    418,
    444
  ],
  "realistas-infantil-03/7": [
    418,
    810,
    418,
    444
  ],
  "realistas-infantil-03/8": [
    836,
    810,
    418,
    444
  ],
  "realistas-infantil-04/0": [
    0,
    0,
    418,
    395
  ],
  "realistas-infantil-04/1": [
    418,
    0,
    418,
    395
  ],
  "realistas-infantil-04/2": [
    836,
    0,
    418,
    395
  ],
  "realistas-infantil-04/3": [
    0,
    395,
    418,
    377
  ],
  "realistas-infantil-04/4": [
    418,
    395,
    418,
    377
  ],
  "realistas-infantil-04/5": [
    836,
    395,
    418,
    377
  ],
  "realistas-infantil-04/6": [
    0,
    772,
    418,
    482
  ],
  "realistas-infantil-04/7": [
    418,
    772,
    418,
    482
  ],
  "realistas-infantil-04/8": [
    836,
    772,
    418,
    482
  ],
  "realistas-infantil-05/0": [
    0,
    0,
    418,
    450
  ],
  "realistas-infantil-05/1": [
    418,
    0,
    418,
    450
  ]
};

import type { CatalogImageSource } from './catalogImages';

/** Original AI product illustrations replacing nineteen legacy vector cells.
 * Descriptors identify recipes, including separate cropped / long-sleeve variants.
 * Resolve by old source to retain recipient and recipe selection precedence.
 * Geometry and physical pattern validation remain independent of these images.
 * See docs/IMAGENES_TENDENCIAS_COMPLETADAS.md for prompts and visual audit. */
export const COMPLETED_ADULT_SHEETS: Readonly<Record<string, readonly string[]>> = {
  "realistas-tendencias-01": [
    "jeans-recto",
    "pantalon-pitillo",
    "jeans-mom",
    "pantalon-acampanado",
    "jeans-ancho",
    "pantalon-baggy",
    "pantalon-barrel",
    "pantalon-cargo"
  ],
  "realistas-tendencias-02": [
    "bomber-clasica",
    "bomber-corta",
    "sobrecamisa-leñadora",
    "sobrecamisa-corta",
    "camiseta-oversize",
    "camiseta-oversize-larga",
    "chaqueta-trabajo"
  ],
  "realistas-tendencias-03": [
    "falda-circular",
    "falda-tul",
    "falda-olanes",
    "sombrero-pescador"
  ]
};

export const COMPLETED_ADULT_SOURCE_MAP: Readonly<Record<string, CatalogImageSource>> = {
  "tendencia-01/0": {
    "sheet": "realistas-tendencias-01",
    "cell": 0
  },
  "tendencia-01/1": {
    "sheet": "realistas-tendencias-01",
    "cell": 1
  },
  "tendencia-01/2": {
    "sheet": "realistas-tendencias-01",
    "cell": 2
  },
  "tendencia-01/3": {
    "sheet": "realistas-tendencias-01",
    "cell": 3
  },
  "tendencia-01/4": {
    "sheet": "realistas-tendencias-01",
    "cell": 4
  },
  "tendencia-01/5": {
    "sheet": "realistas-tendencias-01",
    "cell": 5
  },
  "tendencia-01/6": {
    "sheet": "realistas-tendencias-01",
    "cell": 6
  },
  "tendencia-01/7": {
    "sheet": "realistas-tendencias-01",
    "cell": 7
  },
  "tendencia-02/2": {
    "sheet": "realistas-tendencias-02",
    "cell": 0
  },
  "tendencia-03/1": {
    "sheet": "realistas-tendencias-02",
    "cell": 1
  },
  "tendencia-02/0": {
    "sheet": "realistas-tendencias-02",
    "cell": 2
  },
  "tendencia-03/0": {
    "sheet": "realistas-tendencias-02",
    "cell": 3
  },
  "tendencia-01/8": {
    "sheet": "realistas-tendencias-02",
    "cell": 4
  },
  "tendencia-03/2": {
    "sheet": "realistas-tendencias-02",
    "cell": 5
  },
  "tendencia-02/1": {
    "sheet": "realistas-tendencias-02",
    "cell": 6
  },
  "ninas-01/4": {
    "sheet": "realistas-tendencias-03",
    "cell": 0
  },
  "ninas-01/2": {
    "sheet": "realistas-tendencias-03",
    "cell": 1
  },
  "ninas-01/3": {
    "sheet": "realistas-tendencias-03",
    "cell": 2
  },
  "tendencia-02/5": {
    "sheet": "realistas-tendencias-03",
    "cell": 3
  }
};

/** Pixel bounds on 1254 × 1254 atlases, inspected to keep every garment whole. */
export const COMPLETED_ADULT_BOUNDS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  "realistas-tendencias-01/0": [
    0,
    0,
    418,
    418
  ],
  "realistas-tendencias-01/1": [
    418,
    0,
    418,
    418
  ],
  "realistas-tendencias-01/2": [
    836,
    0,
    418,
    418
  ],
  "realistas-tendencias-01/3": [
    0,
    418,
    418,
    418
  ],
  "realistas-tendencias-01/4": [
    418,
    418,
    418,
    418
  ],
  "realistas-tendencias-01/5": [
    836,
    418,
    418,
    418
  ],
  "realistas-tendencias-01/6": [
    0,
    836,
    418,
    418
  ],
  "realistas-tendencias-01/7": [
    418,
    836,
    418,
    418
  ],
  "realistas-tendencias-02/0": [
    0,
    0,
    426,
    418
  ],
  "realistas-tendencias-02/1": [
    426,
    0,
    410,
    418
  ],
  "realistas-tendencias-02/2": [
    836,
    0,
    418,
    418
  ],
  "realistas-tendencias-02/3": [
    0,
    418,
    430,
    382
  ],
  "realistas-tendencias-02/4": [
    430,
    418,
    406,
    382
  ],
  "realistas-tendencias-02/5": [
    836,
    418,
    418,
    382
  ],
  "realistas-tendencias-02/6": [
    0,
    800,
    438,
    454
  ],
  "realistas-tendencias-03/0": [
    0,
    0,
    418,
    418
  ],
  "realistas-tendencias-03/1": [
    418,
    0,
    418,
    418
  ],
  "realistas-tendencias-03/2": [
    836,
    0,
    418,
    418
  ],
  "realistas-tendencias-03/3": [
    0,
    418,
    418,
    418
  ]
};

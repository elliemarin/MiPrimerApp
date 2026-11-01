import type { CatalogImageSource } from './catalogImages';

/** Original AI-generated product illustrations for 33 inspiration-only designs.
 * Their images do not change pattern availability, dimensions, or certification.
 * See docs/IMAGENES_INSPIRACION_A.md for prompts, sources and visual review. */
export const INSPIRATION_A_SHEETS: Readonly<Record<string, readonly string[]>> = {
  "realistas-inspiracion-a-01": [
    "pantalon-palazzo",
    "pantalon-pinzas",
    "overol",
    "falda-recta",
    "falda-a",
    "falda-tableada",
    "vestido-camisero",
    "camiseta-basica",
    "camiseta-larga"
  ],
  "realistas-inspiracion-a-02": [
    "camisa-clasica",
    "blusa-v",
    "sudadera",
    "hoodie",
    "chaleco",
    "chaqueta-cierre",
    "abrigo",
    "pijama-camisa",
    "mameluco"
  ],
  "realistas-inspiracion-a-03": [
    "neceser",
    "bandolera",
    "intervenir-camisa",
    "intervenir-pantalon",
    "remiendo-rodilla",
    "acortar-bajo",
    "parche-personalizado",
    "collage-montanas",
    "cazadora-mezclilla"
  ],
  "realistas-inspiracion-a-04": [
    "cazadora-denim-corta",
    "gabardina-cruzada",
    "trench-corto",
    "chaqueta-acolchada",
    "chaleco-acolchado",
    "abrigo-acolchado-largo"
  ]
};

export const INSPIRATION_A_IMAGES: Readonly<Record<string, CatalogImageSource>> = Object.fromEntries(
  Object.entries(INSPIRATION_A_SHEETS).flatMap(([sheet, ids]) => ids.map((id, cell) => [id, { sheet, cell }]))
);

/** Individually reviewed row bounds preserve hems, straps, sleeves and hoods. */
export const INSPIRATION_A_BOUNDS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  "realistas-inspiracion-a-01/0": [
    0,
    0,
    418,
    442
  ],
  "realistas-inspiracion-a-01/1": [
    418,
    0,
    418,
    442
  ],
  "realistas-inspiracion-a-01/2": [
    836,
    0,
    418,
    442
  ],
  "realistas-inspiracion-a-01/3": [
    0,
    442,
    418,
    362
  ],
  "realistas-inspiracion-a-01/4": [
    418,
    442,
    418,
    362
  ],
  "realistas-inspiracion-a-01/5": [
    836,
    442,
    418,
    362
  ],
  "realistas-inspiracion-a-01/6": [
    0,
    804,
    418,
    450
  ],
  "realistas-inspiracion-a-01/7": [
    418,
    804,
    418,
    450
  ],
  "realistas-inspiracion-a-01/8": [
    836,
    804,
    418,
    450
  ],
  "realistas-inspiracion-a-02/0": [
    0,
    0,
    418,
    390
  ],
  "realistas-inspiracion-a-02/1": [
    418,
    0,
    418,
    390
  ],
  "realistas-inspiracion-a-02/2": [
    836,
    0,
    418,
    390
  ],
  "realistas-inspiracion-a-02/3": [
    0,
    390,
    418,
    391
  ],
  "realistas-inspiracion-a-02/4": [
    418,
    390,
    418,
    391
  ],
  "realistas-inspiracion-a-02/5": [
    836,
    390,
    418,
    391
  ],
  "realistas-inspiracion-a-02/6": [
    0,
    781,
    418,
    473
  ],
  "realistas-inspiracion-a-02/7": [
    418,
    781,
    418,
    473
  ],
  "realistas-inspiracion-a-02/8": [
    848,
    781,
    406,
    473
  ],
  "realistas-inspiracion-a-03/0": [
    0,
    0,
    418,
    386
  ],
  "realistas-inspiracion-a-03/1": [
    418,
    0,
    418,
    386
  ],
  "realistas-inspiracion-a-03/2": [
    836,
    0,
    418,
    386
  ],
  "realistas-inspiracion-a-03/3": [
    0,
    386,
    418,
    427
  ],
  "realistas-inspiracion-a-03/4": [
    418,
    386,
    418,
    427
  ],
  "realistas-inspiracion-a-03/5": [
    836,
    386,
    418,
    427
  ],
  "realistas-inspiracion-a-03/6": [
    0,
    813,
    418,
    441
  ],
  "realistas-inspiracion-a-03/7": [
    418,
    813,
    418,
    441
  ],
  "realistas-inspiracion-a-03/8": [
    836,
    813,
    418,
    441
  ],
  "realistas-inspiracion-a-04/0": [
    0,
    0,
    418,
    418
  ],
  "realistas-inspiracion-a-04/1": [
    418,
    0,
    418,
    418
  ],
  "realistas-inspiracion-a-04/2": [
    836,
    0,
    418,
    418
  ],
  "realistas-inspiracion-a-04/3": [
    0,
    418,
    418,
    418
  ],
  "realistas-inspiracion-a-04/4": [
    418,
    418,
    418,
    418
  ],
  "realistas-inspiracion-a-04/5": [
    836,
    418,
    418,
    418
  ]
};

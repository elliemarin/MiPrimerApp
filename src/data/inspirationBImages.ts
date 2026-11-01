import type { CatalogImageSource } from './catalogImages';

/** Original AI illustrations for existing inspiration-only designs.
 * Photography is illustrative and never makes a pending pattern available.
 * Source prompts and reviewed mappings: docs/IMAGENES_INSPIRACION_B.md. */
export const INSPIRATION_B_SHEETS: Readonly<Record<string, readonly string[]>> = {
  "realistas-inspiracion-b-01": [
    "chaqueta-biker",
    "chaqueta-safari",
    "chaqueta-varsity",
    "anorak-canguro",
    "parka-capucha",
    "bolero-corto",
    "capa-circular",
    "capa-capucha",
    "poncho-capucha-inspiracion"
  ],
  "realistas-inspiracion-b-02": [
    "mono-camisero",
    "mono-mecanico",
    "mono-palazzo",
    "mono-cruzado",
    "playsuit-camisero",
    "mono-baggy",
    "peto-bermuda",
    "peto-palazzo",
    "sueter-oversize"
  ],
  "realistas-inspiracion-b-03": [
    "sueter-tortuga",
    "sueter-corto",
    "chaleco-punto-v",
    "tunica-suelta",
    "camisa-boxy",
    "organizador-pared",
    "corbata-clasica",
    "pajarita",
    "mitones-polar"
  ],
  "realistas-inspiracion-b-04": [
    "pantuflas",
    "portacubiertos-enrollable",
    "organizador-agujas",
    "funda-silla",
    "cesto-ropa",
    "cesto-pan"
  ]
};

export const INSPIRATION_B_IMAGES: Readonly<Record<string, CatalogImageSource>> = Object.fromEntries(
  Object.entries(INSPIRATION_B_SHEETS).flatMap(([sheet, ids]) => ids.map((id, cell) => [id, { sheet, cell }]))
);

/** Visual cell boundaries reviewed on the original 1254 × 1254 images.
 * Row/column offsets preserve complete garments and exclude neighbouring items. */
export const INSPIRATION_B_BOUNDS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  "realistas-inspiracion-b-01/0": [0, 0, 418, 382],
  "realistas-inspiracion-b-01/1": [418, 0, 418, 382],
  "realistas-inspiracion-b-01/2": [836, 0, 418, 382],
  "realistas-inspiracion-b-01/3": [0, 382, 418, 400],
  "realistas-inspiracion-b-01/4": [418, 382, 418, 400],
  "realistas-inspiracion-b-01/5": [836, 382, 418, 400],
  "realistas-inspiracion-b-01/6": [0, 782, 418, 472],
  "realistas-inspiracion-b-01/7": [418, 782, 418, 472],
  "realistas-inspiracion-b-01/8": [836, 782, 418, 472],
  "realistas-inspiracion-b-02/0": [0, 0, 418, 416],
  "realistas-inspiracion-b-02/1": [418, 0, 418, 416],
  "realistas-inspiracion-b-02/2": [836, 0, 418, 416],
  "realistas-inspiracion-b-02/3": [0, 416, 418, 414],
  "realistas-inspiracion-b-02/4": [418, 416, 418, 414],
  "realistas-inspiracion-b-02/5": [836, 416, 418, 414],
  "realistas-inspiracion-b-02/6": [0, 830, 418, 424],
  "realistas-inspiracion-b-02/7": [418, 830, 418, 424],
  "realistas-inspiracion-b-02/8": [836, 830, 418, 424],
  "realistas-inspiracion-b-03/0": [0, 0, 410, 406],
  "realistas-inspiracion-b-03/1": [410, 0, 437, 406],
  "realistas-inspiracion-b-03/2": [847, 0, 407, 406],
  "realistas-inspiracion-b-03/3": [0, 406, 410, 413],
  "realistas-inspiracion-b-03/4": [410, 406, 437, 413],
  "realistas-inspiracion-b-03/5": [847, 406, 407, 413],
  "realistas-inspiracion-b-03/6": [0, 819, 410, 435],
  "realistas-inspiracion-b-03/7": [410, 819, 437, 435],
  "realistas-inspiracion-b-03/8": [847, 819, 407, 435],
  "realistas-inspiracion-b-04/0": [0, 0, 418, 420],
  "realistas-inspiracion-b-04/1": [418, 0, 418, 420],
  "realistas-inspiracion-b-04/2": [836, 0, 418, 420],
  "realistas-inspiracion-b-04/3": [0, 420, 418, 434],
  "realistas-inspiracion-b-04/4": [418, 420, 418, 434],
  "realistas-inspiracion-b-04/5": [836, 420, 418, 434]
};

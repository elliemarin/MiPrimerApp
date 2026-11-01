# Diseños infantiles digitalizados desde fotos

> Dos lotes: 16 imágenes en el primero y 8 en el segundo (al final de la primera tabla).

Entrega de Claude del 2026-11-01. La usuaria envió 16 imágenes de diseños de
niños y bebés con su patrón y pidió «digitalizarlos y estandarizarlos para poder
cambiar de talla». Todo es **experimental**: nada se ha impreso ni cosido.

## Cómo se digitalizó (léelo antes de añadir más)

1. **No se copian imágenes, marcas ni medidas.** Varias referencias eran
   imágenes generadas por IA con medidas imposibles (ver la tabla). Copiar sus
   números daría prendas que no sirven y no se podrían cambiar de talla.
2. Se identificó la **construcción** de cada diseño (piezas, cierres, acabados,
   detalles) y se trazó como **generador paramétrico** desde las medidas
   corporales de las tablas de Hilvana (`ref-bebe-meses`, `ref-infantil-estatura`).
   Así cada patrón cambia de talla solo.
3. Las medidas coherentes de las referencias se usaron **solo como comprobación**
   (por ejemplo, la chaqueta acolchada daba 64 cm de pecho, 36 cm de largo y 33 cm
   de manga para 3–4 años; el patrón calcula valores parecidos).
4. **Seguridad infantil por encima de la foto:** sin cordones en capucha ni
   cuello, sin cintas para atar bajo la barbilla ni en los hombros. Los lazos son
   decorativos y van cosidos fijos; los cierres son broches, botones o lengüetas
   cortas con broche.

## Qué se hizo con cada imagen

| # | Referencia | Resultado en Hilvana | Notas |
| --- | --- | --- | --- |
| 1 | Chaleco de borreguito con cerezas (2T) | `chaleco-borrego` (generador `chaleco-infantil`) y variante `chaleco-ribeteado` | Sus piezas sumaban ≥ 90 cm de pecho para una talla de 54 cm. Lazo decorativo + broches en vez de cintas. Cerezas: aplique en Bordados (no hay forma de cereza aún). |
| 2–3 | Chaqueta polar con nubes / flores (6 m–10 a) | `chaqueta-polar-cierre` (`chaqueta-cierre-infantil`) | Delantero de 36 cm ×2 para 4–5 años y largos de «96/86 cm»: incoherentes. Cuello alto, cierre separable, banda y puños; nubes y flores en Bordados. |
| 4 | Chaqueta acolchada floral con patrón a mano | `chaqueta-acolchada-reversible` (`chaqueta-acolchada-infantil`) | Medidas coherentes: usadas como comprobación. Ribete en contraste, bolsillos, broches y puño vuelto. |
| 5 | Chaqueta con capucha combinada (12–18 m) | `chaqueta-capucha-botones` (`chaqueta-capucha-infantil`) | Capucha forrada, vistas en contraste en delantero, bajo y puños; colores por pieza en Telas y colores. |
| 6 | Sudadera de bebé con bolsillo canguro (12–18 m) | `sudadera-canguro-infantil` | **Sin cordón** (la foto lo tenía). 60 cm de pecho y 36 cm de largo de la referencia ≈ lo que calcula el patrón. Escote resuelto para pasar la cabeza. |
| 7 | Pantalón barrel infantil (2–10 a) | `barrel-infantil` (generador `pantalon-mezclilla`, opción nueva `bolsillos: frontales`) | Cintura elástica, bolsillos delanteros inclinados y traseros. |
| 8 | Bombacho vintage con tirantes cruzados | `cubrepanal-tirantes` (opción nueva `tirantes: cruzados` del cubrepañal) | Tabla de tallas sin sentido (cintura 10–22 cm). Tirantes desmontables con dos ojales por extremo. |
| 9 | Gorro duende y patucos de fieltro | `gorro-duende`, `gorro-duende-fieltro` (generador `gorro-duende`); patucos ya existían | La cinta bajo la barbilla se cambió por lengüeta con broche. |
| 10 | Gorro con orejas de gato y cintas | `gorro-orejeras-gato`, `gorro-orejeras-oso` (`gorro-orejeras`) | Pieza única con cintas → dos laterales con costura central, forro, orejeras y lengüeta con broche. |
| 11 | Sombrero pescador con lazo | `sombrero-pescador-lazo` (opción nueva `lazo` del sombrero) | Banda de «17,5 cm» incompatible con una copa de 55 cm de contorno. |
| 12 | Vestido con lazo y bombacho (12–18 m) | `vestido-jareta` (`vestido-jareta-infantil`) y `conjunto-vestido` | Tirantes continuos de ribete en vez de cintas al hombro. |
| 13 | Pelele con volantes, tirantes con lazos y diadema | `pelele-volantes`, `diadema-lazo` y `conjunto-pelele-diadema` | Broches en entrepierna y espalda; lazos cosidos. Aviso: diadema solo con supervisión. |
| 14 | Conjunto de vichy: blusa abullonada y short | `blusa-campesina`, `blusa-campesina-larga` (`blusa-campesina-infantil`) y `conjunto-campesino` | El short es el pantalón elástico con estilo nuevo `bombacho` y volantito. |
| 15 | Conjunto de rayas: blusa con botones y pantalón | `blusa-botones-infantil`, `pantalon-bombacho-infantil` y `conjunto-rayas` | El panda es un aplique (pendiente como forma). |
| 16 | Bombacho rosa con lazo | Ya existía (`cubrepanal-bebe`); ahora con opción `lazo` | — |

## Segundo lote (8 imágenes)

| # | Referencia | Resultado en Hilvana | Notas |
| --- | --- | --- | --- |
| 1 | Bonetes con volante y puntilla (variación C) | `bonete-volante`, `bonete-volante-doble`, `bonete-encaje` (generador `bonete-volante`) | Dos laterales y pieza central resueltos para que la unión mida igual; volante de tela, doble o puntilla. Las cintas se cambiaron por lengüeta con broche. El pájaro y las bellotas son apliques. |
| 2 | Chaleco de borreguito con lazo (2T) | Ya existía: `chaleco-borrego` | Misma referencia de IA que en el primer lote (delantero de 30 cm para 54 cm de pecho). |
| 3 | Delantal «para pequeños ayudantes» | `delantal-pichi`, `delantal-pichi-liso` (`delantal-pichi-infantil`) | Una sola pieza al doblez que pasa por los hombros; el escote cuadrado está en el doblez (sin agujeros sueltos). Cintas de 30 cm como máximo, solo en la cintura. |
| 4 | Mono con bolsillos y tirantes atados (3–4 a) | `mono-pichi-bolsillos` (`mono-tirantes-infantil`, forma `pichi`) | Tirantes abotonados con dos posiciones en vez de lazos al hombro. |
| 5 | Conjunto de blusa sin mangas y bombacho de rayas | `blusa-trapecio` (`blusa-trapecio-infantil`) y `conjunto-trapecio` | Usa el trapecio infantil existente con largo de blusa; el bombacho es el cubrepañal. No se usa el nombre comercial. |
| 6 | Mono de vichy con hombros atados y volantes | `mono-pico-volantes` (forma `pico`, bajo `volante`) | Hombros con botón y ojal; los lazos son decorativos y cosidos. |
| 7 | Blusa con volante y pantalón ancho de vichy | `blusa-trapecio-volante`, `pantalon-capri-infantil` y `conjunto-vichy` | La tabla de la foto daba 30–38 cm de «pecho» (medio contorno) y cinturas de 20–24 cm; no se copiaron. El pantalón usa la opción nueva `corte: capri`. |
| 8 | Peto largo con bolsillo y botones laterales (3 años) | `peto-infantil-largo` (forma `peto`, largo, vuelta) | Tirantes cruzados con ojales y aberturas laterales abotonadas. |

Opciones nuevas de este lote: `corte` en el pantalón elástico (`completo`, `capri`,
`bermuda`, `short`; los cortes cortos no llevan línea de rodilla), conjuntos
`trapecio` y `vichy`. Generadores en `src/lib/pattern/generators/kidsBatch2.ts`;
láminas `infantil-04` e `infantil-05`.

## Archivos

- `src/lib/pattern/generators/kidsBlocks.ts`: bloques compartidos — cuerpo
  (delantero/espalda con cruce, pico, hombro caído, vuelo), manga montada cuya
  copa se resuelve a la sisa, capucha de dos piezas, bandas dobladas, lazo
  decorativo y vista que sigue el escote (`frontFacing`, `splitCubic`).
- `kidsOuterwear.ts`: chaleco, chaqueta con cierre, acolchada, con capucha y
  sudadera canguro. `kidsTops.ts`: blusa campesina, blusa con botones, vestido
  con jaretas, pelele de volantes, diadema. `kidsHats.ts`: gorro duende y gorro
  con orejeras.
- Opciones nuevas en generadores existentes: `pants.ts` (estilo `bombacho`,
  `volantito`), `babyPlus.ts` (cubrepañal `tirantes`, `lazo`), `babyMore.ts`
  (sombrero `lazo`; conjuntos `vestido`, `pelele-diadema`, `campesino`, `rayas`;
  `bubbleShortDefaults`), `jeans.ts` (bolsillos `frontales`).
- `src/data/digitizedKidsCatalog.ts`: 24 recetas; colección nueva **Infantil**
  (acceso en la biblioteca) más Bebé y Niña.
- `src/data/kidsFlats.ts`: dibujos desde piezas reales del vestido, pelele,
  blusas, gorros, diadema, sombrero con lazo, cubrepañal con tirantes y conjuntos;
  enlaces zona → pieza. Los abrigos, la sudadera y los pantalones usan los dibujos
  genéricos (sus zonas ya se enlazan por nombre de pieza).
- Láminas `public/catalog-images/infantil-01/02/03.webp` (vectoriales, no IA):
  `npx vite-node scripts/render-kids-sheets.ts infantil-01 infantil-02 infantil-03`.
- `tests/digitized-kids.test.ts`: todas las tallas y variantes, rechazo de tallas
  adultas, paso de cabeza, copa = sisa, sin cordones, opciones nuevas y conjuntos.

## Reglas de construcción

- Cuerpo infantil: cuarto de pecho = (pecho + holgura) / 4; escote = cuello/6;
  sisa = 45 % del talle + 1,5 cm × escala (+ extra en abrigos). La curva baja de
  la sisa llega a la axila con un tirador largo: uno corto doblaba el margen.
- El escote de espalda poco profundo entra oblicuo al hombro (como en la
  sudadera clásica) para que el margen sea uniforme.
- Sudadera canguro: el escote (delantero + espalda) × (1 + 0,75 × elasticidad)
  debe pasar cabeza + 2 cm; se ensancha y se baja a la vez.
- Blusa campesina: el escote plano pasa cabeza + 8 cm × escala; el canal del elástico es
  una tira al bies (una jareta doblada en una curva cerrada cruzaba el corte).
- Short abullonado de bebé: largo = tiro con holgura y pañal + entrepierna mínima
  (5 cm o 28 % de la entrepierna); más corto no igualaba las entrepiernas.

## Pendiente

- Coser muestras (empezar por sudadera canguro, chaleco forrado, pelele y
  gorro con orejeras) antes de quitar «experimental».
- Añadir formas de aplique «cerezas» y «panda» a la biblioteca de Bordados.
- Comprobar la caída de la capucha y el bolsillo canguro en tallas de bebé.

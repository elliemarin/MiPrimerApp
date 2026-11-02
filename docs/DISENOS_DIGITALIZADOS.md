# Diseños infantiles digitalizados desde fotos

> Cuatro lotes: 16 y 8 imágenes infantiles, 11 de tendencias y 9 de hombre y lencería.

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
| 1 | Chaleco de borreguito con cerezas (2T) | `chaleco-borrego` (generador `chaleco-infantil`) y variante `chaleco-ribeteado` | Sus piezas sumaban ≥ 90 cm de pecho para una talla de 54 cm. Lazo decorativo + broches en vez de cintas. Cerezas: figura `cerezas` ya disponible en Bordados, como guía de transferencia. |
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
| 15 | Conjunto de rayas: blusa con botones y pantalón | `blusa-botones-infantil`, `pantalon-bombacho-infantil` y `conjunto-rayas` | Figura `panda-amigo` ya disponible en Bordados, con sus partes y colores. |
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

## Tercer lote (11 imágenes, tendencias)

| # | Referencia | Resultado en Hilvana | Notas |
| --- | --- | --- | --- |
| 1 | Pantalón barrel con cintura elástica y rayas | `barrel-elastico` (grupo `pantalon-barrel`) | Jeans con `cintura: elastica` y bolsillos inclinados. |
| 2 | Palazzo con pretina y botones laterales | `palazzo-botones-laterales` (grupo propio) | Opción nueva `cintura: pretina`: cadera moldeada, pinzas calculadas desde el contorno real, abertura lateral con vista, cartera y botones. |
| 3 | Palazzo ancho con cordón y rayas | `palazzo-elastico` (grupo `tipo-pantalon-amplio`) | Cordón solo en tallas de adulto. |
| 4 | Pantalón con volante y alforzas | `pantalon-volante` | El largo descuenta el volante y suma la tela de las alforzas. |
| 5 | Pantalón ancho oversize con pinzas | `pantalon-palazzo` (antes inspiración) y `pantalon-pinzas` | Opción nueva `pinzas` en jeans; la pretina queda embebida. |
| 6–7 | Jeans anchos crema y ciruela | Ya existía `jeans-ancho` | — |
| 8 | Chaqueta ranglan con cuello alto | `chaqueta-ranglan` | Manga en dos piezas; el reparto trasero del bíceps se resuelve para que el bajo brazo mida igual. |
| 9 | Shacket con cuello de tira y bolsillos grandes | `sobrecamisa-cuello-tira` | Opciones `cuelloTipo: tira` y `bolsillos: grandes`. |
| 10 | Sudadera de media cremallera en bloques | `sudadera-bloques`, `sudadera-media-cremallera-lisa` | Las piezas de la referencia medían 43 y 64 cm de alto, sin coherencia. |
| 11 | Buzo corto murciélago con capucha | `buzo-murcielago` | Necesita punto; banda de rib sin cordón en niños. |

## Cuarto lote (9 imágenes, hombre y lencería)

| # | Referencia | Resultado en Hilvana | Notas |
| --- | --- | --- | --- |
| 1 | Buzo corto con capucha y manga murciélago (talle 40/M) | `buzo-murcielago` (tercer lote) | Mismas piezas: delantero y espalda al doblez, recortes con manga, capucha forrada, fondos de bolsillo y puños de rib. |
| 2 | Jogger oversize de felpa (XL) | `jogger-oversize-felpa` (grupo `tipo-jogger`) | Cadera de 136 cm para XL ≈ +25 cm de holgura; el puño de 60 cm era más ancho que el bajo de 56 cm. |
| 3 | Cazadora de mezclilla clásica (talla 50) | `cazadora-mezclilla`, `cazadora-denim-corta` (antes inspiraciones) | Medidas coherentes (pecho 100 cm), usadas como comprobación. Manga de una pieza en vez de dos. |
| 4 | Chaqueta verde de cuello alto y cuatro bolsillos | `chaqueta-campo` y `chaqueta-safari` (antes inspiración) | Imagen de IA: puño de 5 cm de ancho y copa de 12 cm, imposibles. |
| 5 | Pantalón cargo de hombre | `cargo-recto` (grupo `pantalon-cargo`) | Imagen de IA: largo exterior de 82 cm menor que la entrepierna de 81 + tiro de 28. |
| 6 | Pantalón baggy de hombre | `baggy-felpa` (grupo `tipo-pantalon-amplio`) | Elástico por talla de la referencia solo como comprobación. |
| 7–9 | Culotte de encaje (tallas S, M y M–L) | `culotte-encaje`, `culotte-punto-picot` | Las tres eran el mismo patrón. Se cortan con un 15 % menos de cadera (encaje del 30 %); refuerzo de algodón añadido. |

Generadores en `adultBatch.ts` y `menBatch.ts`; tarjetas en
`src/data/digitizedAdultCatalog.ts`; lámina dibujada `lote-adultos-01` para los
diseños que aún no tienen foto IA; pruebas en `tests/digitized-adults.test.ts`.

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
- Comprobar la caída de la capucha y el bolsillo canguro en tallas de bebé.

## Continuación y revisión del lote (Codex, 2026-11-01)

La revisión parte de `1db95f4`, la última entrega de Claude guardada en GitHub.
Ese commit y sus cuatro entregas anteriores estaban publicados; no había una
rama, un PR ni una nota de código interrumpido. La referencia recuperable es el
segundo lote de ocho diseños. No se tuvo acceso a cambios que solo pudieran
existir en una sesión de Claude sin guardar.

Se comprobó que `cerezas` y `panda-amigo` ya existían en la biblioteca. La nota
que pedía añadirlos estaba desactualizada. Se prueban buscándolos en Bordados,
colocándolos en las dos caras del delantal y exportando sus guías; siguen siendo
figuras de transferencia, no archivos de puntadas automáticamente digitalizados.

La revisión del recorrido encontró estos problemas de integración:

- **Bonetes:** la búsqueda «bonete» solo admitía la tarjeta antigua. Ahora incluye
  los nuevos modelos con volante; «puntilla» y «encaje» corresponden a su variante
  real. Los overoles infantiles y la diadema con lazo también participan en sus
  búsquedas, aunque utilicen dibujos propios desde las piezas del patrón.
- **Delantal de una pieza:** la vista frontal y la trasera usaban toda la pieza
  física. Ahora se separan por la línea del hombro. Mover hacia abajo en Espalda
  recorre la pieza física hacia su bajo trasero; el arte conserva su orientación
  legible. El PDF describe la orientación de transferencia que corresponde.
- **Monos y petos:** los enlaces de las copias izquierda/derecha estaban
  intercambiados respecto de sus dibujos. Se alinean sus posiciones y detalles
  con la pieza física, incluidos los bolsillos, botones y bordados.

- **Blusa con volante:** el largo de referencia incluye cuerpo y volante. La
  fórmula anterior imponía un mínimo al cuerpo y luego añadía el volante,
  cambiando el largo solicitado sin avisar. Ahora una combinación incompatible
  produce un error con el mínimo necesario, y el control de largo verifica la
  suma real de ambas piezas sin márgenes.
- **Proyectos ya guardados:** las posiciones se validan también contra la cara
  visible, no solo contra el contorno completo del patrón. Un bordado o bolsillo
  guardado sobre la otra mitad del delantal debe recolocarse antes de exportar.
  Las posiciones originales no se trasladan automáticamente. También se debe
  revisar el largo de una blusa antigua si su combinación con el volante queda
  fuera de los límites constructivos.

Los patrones continúan como experimentales. Las comprobaciones digitales de
posición, medidas y PDF no sustituyen imprimir y coser muestras. Tampoco se da
por verificado el proyector físico ni Safari en un iPhone real.


### Verificación de la continuación

- Base de Claude: 3,031 pruebas/70 archivos y compilación correctas.
- Resultado: 3,054 pruebas/73 archivos, TypeScript y build para Pages correctos.
- `tests/kids-batch2-placement.test.ts`: regiones físicas del delantal en varias
  tallas, centros de monos/petos, orientación de letras/logos y guía PDF.
- `tests/kids-legacy-placement.test.ts`: bloqueo de posiciones antiguas en cara
  incorrecta, proyectos sin metadatos y grupos ocultos.
- `tests/trapeze-top-length.test.ts`: largo físico con/sin volante, todas las
  tallas infantiles, distintos márgenes y sisas, parámetros y conjuntos.
- `tests/browser/digitized_kids_handoff_smoke.py`: recorrido móvil, variantes,
  materiales, motivos, arrastre, guardar/reabrir y PDF; capturas revisadas.
- `tests/browser/production_kids_handoff_smoke.py`: comprobación del build con
  prefijo `/MiPrimerApp/` sin importar módulos de desarrollo; consulta IndexedDB
  y compara posiciones guardadas con el manifiesto PDF.

Recorridos digitales comprobados en las tallas de referencia de la prueba:

| Diseño | PDF carta | Plantillas |
| --- | ---: | ---: |
| Bonete de volante doble | 16 páginas | 7 |
| Delantal pichi, cerezas delante y panda atrás | 41 páginas | 6 |
| Mono de pico con volantes | 19 páginas | 7 |
| Peto infantil largo | 21 páginas | 5 |
| Blusa trapecio con volante | 16 páginas | 6 |
| Conjunto vichy | 21 páginas | 8 |

Todos los controles digitales del PDF miden **50.0 y 100.0 mm**. Los PDF ya
exportados siguen en el historial; después de revisar ubicaciones o medidas,
genera un PDF nuevo para trabajar con la corrección.

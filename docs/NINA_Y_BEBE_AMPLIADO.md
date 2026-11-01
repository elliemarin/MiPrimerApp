# Colección Niña y ampliación de Bebé

Entrega de Claude del 2026-11-01. Respuesta a «Agrega más patrones para bebé, no
veo nada de niña. Más variedad». Todo es **experimental**: nada se ha impreso ni
cosido todavía. No cambies el estado a `implementado` sin una muestra física.

## Qué hay

| Tarjeta (grupo) | Recetas (ids del catálogo) | Generador | Para |
| --- | --- | --- | --- |
| Vestido trapecio | `vestido-trapecio`, `vestido-trapecio-volantes` | `vestido-trapecio-infantil` | bebé, 1–4, niña |
| Vestido de tirantes | `vestido-tirantes` | `vestido-tirantes-fruncido` | 1–4, niña |
| Falda de tul (tutú) | `falda-tul` | `falda-tul-elastica` | bebé, 1–4, niña, mujer |
| Falda de tres olanes | `falda-olanes` | `falda-olanes-escalonada` | 1–4, niña, mujer |
| Falda circular | `falda-circular` (antes inspiración), `falda-medio-circulo` | `falda-circular-elastica` | 1–4, niña, mujer |
| Cubrepañal / bombacho | `cubrepanal-bebe`, `cubrepanal-olanes` | `cubrepanal-bebe` | bebé, 1–4 |
| Bonete con lengüeta | `bonete-bebe` | `bonete-bebe` | bebé, 1–4 |
| Patucos de bebé | `patucos-bebe` | `patucos-bebe` | bebé, 1–4 |
| Saco de dormir | `saco-dormir-bebe` | `saco-dormir-bebe` | bebé, 1–4 |
| Toalla con capucha | `toalla-capucha` | `toalla-capucha` | bebé, 1–4, niña |
| Babero bandana | `babero-bandana` | `babero-bandana` | bebé, 1–4 |

El filtro **Bebé** pasó de 7 a 15 diseños con patrón. El nuevo acceso **Niña**
(`LibraryPage.tsx`) muestra la colección `Niña` más los vestidos, faldas y petos
infantiles que ya existían (sin disfraces), con el destinatario «Niñas y niños».

## Archivos

- `src/lib/pattern/generators/kidsShared.ts`: piezas desde nodos y bordes,
  arcos cúbicos exactos, tiras al bies, relaciones de costura y bisección.
- `src/lib/pattern/generators/girls.ts`: vestidos y faldas.
- `src/lib/pattern/generators/babyPlus.ts`: prendas y accesorios de bebé.
- `src/data/kidsCatalog.ts`: tarjetas, variantes, grupos, colección y
  `withKidsPatterns` (convierte la inspiración `falda-circular` sin cambiar su id).
- `src/data/kidsFlats.ts`: dibujos técnicos dibujados desde las piezas reales
  (E116 para niña, B0-3 para bebé) y `KIDS_SURFACE_PIECES`, que enlaza cada zona
  del dibujo con su pieza física; `fold: true` despliega una pieza cortada al
  doblez en dos mitades en la vista armada (`assembled.ts`).
- `scripts/render-kids-sheets.ts` → `public/catalog-images/ninas-01.webp` y
  `bebe-02.webp`. Son **ilustraciones vectoriales** (no IA) dibujadas desde el
  dibujo técnico con textura y sombra; la ficha lo dice así
  (`catalogImageCaption`). Las celdas extra (5–6) muestran la variante exacta.
- `tests/kids-collection.test.ts`: todas las tallas y variantes, rechazo de
  tallas adultas, seguridad del saco, pretinas que pasan por la cadera, olanes,
  bonete, patucos y enlaces de zonas.

## Reglas de construcción que no deben romperse

- Las medidas de bebé se toman sobre pañal. No se escalan bloques adultos: los
  patrones infantiles devuelven error con una talla adulta.
- Holgura una sola vez; los bordes ribeteados al bies no llevan margen.
- **Vestido trapecio:** la abertura de espalda se calcula para que pase la
  cabeza (escote + 2 × abertura ≥ cabeza + 2 cm). El volante es un semicírculo
  cuyo canto interior mide exactamente el tramo superior de la sisa (piquete a
  piquete). La sisa llega horizontal a la axila: con un costado muy acampanado,
  una llegada perpendicular hundía la curva bajo la axila y doblaba el corte.
- **Vestido de tirantes:** sin cierre; el cuerpo mide el mayor contorno entre
  pecho y cadera + holgura y se viste por los pies. Tirantes abotonados con dos
  ojales, sin cordones al cuello.
- **Faldas:** la pretina o la cintura de la falda mide cadera + holgura; el
  elástico la ajusta. Círculo completo o medio: radio recalculado desde el
  contorno, cada pieza es un cuarto al doblez.
- **Cubrepañal:** espalda 2,5 cm más profunda; piernas con bies que hace de
  canal (un dobladillo en curva cóncava no se puede doblar sin tirar). Los olanes
  se colocan sobre el asiento y miden 1,8 × el ancho real de la espalda en su línea.
- **Bonete:** sin cintas para atar; lengüeta con broche. El contorno de la pieza
  trasera se resuelve por bisección para medir lo mismo que la banda.
- **Patucos:** empeine y talonera cubren exactamente la punta y el talón de la
  suela (resueltos por bisección).
- **Saco de dormir:** escote cerrado ≤ cabeza − 4 cm y ≥ cuello + 3 cm; cada
  sisa ≤ cabeza − 6 cm. Sin mangas ni capucha. Son comprobaciones del patrón, no
  una certificación de seguridad.

## Cambio en el motor

`src/lib/pattern/offset.ts → setEnd`: al prolongar un margen sobre la tangente
del borde vecino, el extremo original **se conserva** y se añade el punto
prolongado. Antes se movía el extremo; en un borde sin margen ese extremo es la
esquina de costura y quedaba fuera del corte en hombros muy cortos (recién
nacido). Las 2,899 pruebas previas siguieron pasando.

## Pendiente

1. Imprimir al 100 % y coser muestras de cada diseño, empezando por cubrepañal,
   falda de tul y vestido trapecio; registrar ajustes antes de quitar
   «experimental».
2. Probar el saco de dormir con un bebé real y una tabla de grosor (TOG); no
   promoverlo sin esa prueba.
3. Fotos o ilustraciones de producto con IA para las dos láminas nuevas, si se
   quiere el mismo estilo fotográfico del resto (mantener ids y celdas).
4. Posibles siguientes: mameluco (sigue como inspiración), leggings infantiles,
   blusa campesina con elástico, manta de apego con esquinas redondeadas.

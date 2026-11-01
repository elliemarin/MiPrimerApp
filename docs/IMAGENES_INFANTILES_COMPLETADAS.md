# Imágenes infantiles completadas — noviembre de 2026

Fecha: 2026-11-01. Este lote sustituye 37 celdas vectoriales heredadas por fotografías ilustrativas originales generadas con IA y añade una vista propia del sombrero pescador de bebé con lengüeta de broche: **38 imágenes en cinco láminas**.

Se conserva el lenguaje visual de `estilos-bebe-01.webp` y `estilos-vestidos-01.webp`: producto completo, fondo marfil, luz suave, telas visibles y tonos sobrios. No se tocaron generadores, medidas, tallas, filtros, PDF ni estados de validación. Estas imágenes orientan sobre la apariencia; **no prueban que una prenda se haya confeccionado o que un patrón esté validado físicamente**.

## Integración

- Archivo: `src/data/completedInfantImages.ts`.
- `COMPLETED_INFANT_SHEETS` documenta el orden de recetas dentro de cada lámina.
- `COMPLETED_INFANT_SOURCE_MAP` remapea la fuente anterior (`sheet/cell`) y mantiene las recetas que compartían esa celda. Las dos fuentes legacy de grupo `ninas-01/0` y `bebe-02/0` son alias de `ninas-01/5` y `bebe-02/6`; no duplican fotografías.
- `COMPLETED_INFANT_RECIPE_MAP` da al ID `sombrero-pescador-bebe` su propia imagen con broche. El bucket adulto y el bucket con lazo siguen separados.
- `COMPLETED_INFANT_BOUNDS` describe recortes visuales sobre la imagen original de 1254 × 1254. Se revisaron por filas para incluir tirantes, puntas, ruedos, asas y lengüetas completos; el capri usa 450 píxeles de alto.
- La quinta lámina solo ocupa las celdas 0 y 1. Las siete restantes están vacías y no se asignan.

Las variantes conservan imágenes propias: barrel bebé, baggy bebé, overol largo bebé, campesina de manga larga, barrel infantil, pixie de fieltro, bucket con lazo y bucket bebé con broche.

## Inventario visual

Celdas numeradas desde cero, en orden de lectura.

| Lámina / celda | Receta de referencia | Fuente vectorial anterior |
|---|---|---|
| realistas-infantil-01 / 0 | `vestido-trapecio` | `ninas-01/5` |
| realistas-infantil-01 / 1 | `vestido-tirantes` | `ninas-01/1` |
| realistas-infantil-01 / 2 | `cubrepanal-bebe` | `bebe-02/6` |
| realistas-infantil-01 / 3 | `bonete-bebe` | `bebe-02/1` |
| realistas-infantil-01 / 4 | `patucos-bebe` | `bebe-02/2` |
| realistas-infantil-01 / 5 | `saco-dormir-bebe` | `bebe-02/3` |
| realistas-infantil-01 / 6 | `toalla-capucha` | `bebe-02/4` |
| realistas-infantil-01 / 7 | `babero-bandana` | `bebe-02/5` |
| realistas-infantil-01 / 8 | `barrel-bebe` | `tendencia-02/7` |
| realistas-infantil-02 / 0 | `baggy-bebe` | `tendencia-03/7` |
| realistas-infantil-02 / 1 | `pelele-tirantes` | `tendencia-02/3` |
| realistas-infantil-02 / 2 | `overol-bebe` | `tendencia-02/8` |
| realistas-infantil-02 / 3 | `gorro-orejas-oso` | `tendencia-02/4` |
| realistas-infantil-02 / 4 | `conjunto-verano` | `tendencia-02/6` |
| realistas-infantil-02 / 5 | `chaleco-borrego` | `infantil-01/0` |
| realistas-infantil-02 / 6 | `chaqueta-polar-cierre` | `infantil-01/1` |
| realistas-infantil-02 / 7 | `chaqueta-acolchada-reversible` | `infantil-01/2` |
| realistas-infantil-02 / 8 | `chaqueta-capucha-botones` | `infantil-01/3` |
| realistas-infantil-03 / 0 | `sudadera-canguro-infantil` | `infantil-01/4` |
| realistas-infantil-03 / 1 | `blusa-campesina` | `infantil-01/5` |
| realistas-infantil-03 / 2 | `blusa-campesina-larga` | `infantil-02/5` |
| realistas-infantil-03 / 3 | `blusa-botones-infantil` | `infantil-01/6` |
| realistas-infantil-03 / 4 | `pantalon-bombacho-infantil` | `infantil-01/7` |
| realistas-infantil-03 / 5 | `barrel-infantil` | `infantil-02/6` |
| realistas-infantil-03 / 6 | `vestido-jareta` | `infantil-01/8` |
| realistas-infantil-03 / 7 | `pelele-volantes` | `infantil-02/0` |
| realistas-infantil-03 / 8 | `diadema-lazo` | `infantil-02/1` |
| realistas-infantil-04 / 0 | `gorro-duende` | `infantil-02/2` |
| realistas-infantil-04 / 1 | `gorro-duende-fieltro` | `infantil-03/1` |
| realistas-infantil-04 / 2 | `gorro-orejeras-gato` | `infantil-02/3` |
| realistas-infantil-04 / 3 | `sombrero-pescador-lazo` | `infantil-02/8` |
| realistas-infantil-04 / 4 | `bonete-volante` | `infantil-04/0` |
| realistas-infantil-04 / 5 | `delantal-pichi` | `infantil-04/1` |
| realistas-infantil-04 / 6 | `mono-pichi-bolsillos` | `infantil-04/2` |
| realistas-infantil-04 / 7 | `peto-infantil-largo` | `infantil-04/3` |
| realistas-infantil-04 / 8 | `blusa-trapecio` | `infantil-04/4` |
| realistas-infantil-05 / 0 | `pantalon-capri-infantil` | `infantil-04/5` |
| realistas-infantil-05 / 1 | `sombrero-pescador-bebe` | Antes compartía `tendencia-02/5`; ahora override por receta |

## Archivos y procedencia

Todas las imágenes se generaron usando la herramienta `image_gen.imagegen`. No se descargaron imágenes de autores ni se convirtieron dibujos en supuestas fotografías. Los PNG originales se guardaron en `/workspace/generated_images/` durante la sesión; solo los WebP optimizados forman parte del repositorio.

| Archivo | Dimensiones | Bytes | SHA-256 |
|---|---|---:|---|
| `realistas-infantil-01.webp` | 1254 × 1254 | 126488 | `a4b900371c468340c20aea7b489eb8b50450e14ff3a860b7509a2b2b688913e3` |
| `realistas-infantil-02.webp` | 1254 × 1254 | 132870 | `7d230d47a52d8451c40fe74a2f7372121e7725556f807dc1ce8edd77d466c505` |
| `realistas-infantil-03.webp` | 1254 × 1254 | 135176 | `2b48b75259bce45c08389c1a4208736cc2cbacd811241c27d22e4177cbdb80bc` |
| `realistas-infantil-04.webp` | 1254 × 1254 | 90396 | `3a68b6b93bf446afc01b381035b7fc6461c79ddaa08cac0fb3f0e15feb921a70` |
| `realistas-infantil-05.webp` | 1254 × 1254 | 24270 | `c4c98bf59fec61cdf7c07a74c088e5d14c2f8dc3b4e3e093a073510db32e50e2` |

Total: **509 200 bytes**. Conversión de formato, sin dibujar ni reemplazar partes mediante código:

```sh
ffmpeg -i ORIGINAL.png -c:v libwebp -quality 82 -compression_level 6 DESTINO.webp
```

PNG finales:

- Lámina 1: `exec-6a84ee60-9d40-413e-a214-1188691b4d1c.png`.
- Lámina 2: `exec-13a03b13-0eeb-4f83-91a7-ba376a6617f8.png`.
- Lámina 3: `exec-85eb9535-bc96-47a7-838f-620646e07066.png`.
- Lámina 4: `exec-3901078f-1dbe-413e-849a-87a8bf4ae7d2.png`.
- Lámina 5: `exec-81b36722-27c8-4c61-88dc-05c9d613213f.png`.

## Revisión de construcción

Se cotejaron los parámetros y descripciones de las recetas incluidas. El objetivo es que las fotos no anuncien piezas o acabados ausentes en el patrón:

- Los pantalones barrel de bebé e infantil tienen bajos simples sin elástico. Los bombachos sí tienen jareta elástica en los tobillos. Los baggy bebé muestran frente liso; sus bolsillos son traseros.
- Se conservaron versiones de manga corta/larga y pelele corto/overol largo.
- Los bonetes, pixies y gorros con orejeras muestran lengüeta de broche; no se inventaron cordones para atar. La capucha infantil no lleva cordón.
- Los chalecos, chaquetas y petos conservan sus cierres indicados: broches, botones o cremallera según receta, sin intercambiarlos.
- El mono corto lleva un botón funcional por tirante; los ojales permiten las posiciones de ajuste. El peto largo lleva un botón por abertura lateral.
- La chaqueta polar no tiene bolsillos; la acolchada y la de capucha sí tienen bolsillos de parche.
- La toalla se muestra abierta y completa con capucha triangular, y los patucos como un par dentro de una sola celda.
- Los lazos, olanes y bolsillos solo se incluyeron cuando constaban en la receta. El conjunto de verano contiene exactamente pelele y sombrero.

Correcciones tras la primera revisión:

1. La primera versión de la lámina 01 (`exec-c2591fec-20bd-4248-bc6c-e46e64720b56.png`) añadió elástico en los tobillos del barrel. Se pidió una edición, pero se descartó por textura artificial de la tela; se volvió a generar la lámina completa con la prohibición explícita. El archivo final tiene bajos simples.
2. La primera versión de la lámina 04 (`exec-3a080d44-12c3-4526-b937-dc53b1e585dd.png`) agregó botones redundantes en tirantes y laterales. Se corrigió mediante IA conservando las posiciones del resto de prendas.
3. Se definieron bounds por las filas reales de cada lámina, en vez de dar por hecho que todos los objetos cabían en una retícula matemática de 418 px. Esto evita cortar los tirantes del peto y el bajo del capri.

## Prompts reproducibles

Los prompts se conservan en inglés para repetir exactamente el criterio de generación. Numeración visual 1–9; el código usa celdas 0–8.

### Lámina 1: generación inicial

```text
Create a professional premium sewing-pattern catalogue product photography contact sheet. Square canvas 1254 x 1254 pixels, invisible exact 3 by 3 grid of nine equally sized 418-pixel square cells, row-major reading order. The SAME clean seamless warm ivory studio backdrop in all cells, no grid lines, no panels, no labels, no numbers, no text, no letters, no watermark, no logos. Real PHOTOGRAPHS of carefully sewn miniature garments, NOT drawings, NOT SVG, NOT illustrations, NOT 3D renders. Real fabric weave, natural soft folds, tactile textiles, realistic seams, restrained soft side lighting and subtle shadows. Each entire object centered inside its own cell, maximum object dimension 75 percent of cell, at least 12 percent breathing room to each edge. Separate objects never touch or cross cells. Clothing is front-view flat lay with dimensional natural volume, empty and unworn. Hats and shoes slightly three-quarter so construction is legible. No people, models, mannequins, hands, hangers, props, styling accessories or background fabrics. Tasteful muted sage, dusty rose, denim, oatmeal, terracotta palette. Construction precision is vital: do not add any seams, pockets, zippers, buttons, ribbons, bows, embroidery or cuff bands unless explicitly listed. Adult-looking details should not be invented on baby clothing.
CELL 1 TOP LEFT: Baby/toddler sleeveless A-line trapeze dress in dusty rose cotton poplin. Single uninterrupted flare from armhole to above-knee hem, round neckline and narrow matching bias binding at neck and armholes. NO waist seam, NO waist gathering, NO pockets. Small back neck button unseen from front.
CELL 2 TOP MIDDLE: Toddler sage green cotton sundress with lined straight fitted bodice and distinct gathered full skirt waist seam. Two substantial plain shoulder straps attached front and buttoned only at BACK, hence front has no buttons. No pocket, ruffle, bow or zipper.
CELL 3 TOP RIGHT: Baby diaper cover bloomer in muted mustard cotton. Elastic gathered waist and two elastic gathered leg openings, deep diaper seat. Plain unruffled smooth body, no straps, no frills, no bow.
CELL 4 MIDDLE LEFT: Baby bonnet in oatmeal cotton. Traditional deep curved back crown and broad face band, smooth face opening, lined interior, CLOSED short integrated fabric tab underneath chin fastened with one snap. Absolutely no dangling tie ribbons or cords, no ruffle, no bow.
CELL 5 MIDDLE MIDDLE: Pair of tiny soft sage baby booties. Each has separate fabric rounded upper toe, soft sole and elasticized back heel cuff. Simple sewn cotton construction, no laces, no ties, no buttons. Show the pair together wholly in this single cell.
CELL 6 MIDDLE RIGHT: Sleeveless baby sleeping sack in pale peach cotton, front nylon zipper clearly centered from high round neckline almost to the round bottom, large continuous rounded bag shape, armholes near top. Lined and bias bound, no sleeves, no legs, no hood, no straps, no buttons, no pockets.
CELL 7 BOTTOM LEFT: A single seafoam terry baby bath towel laid completely open in a SQUARE, gently rounded corners, bound edges and a triangular hood stitched OVER the top-left corner. Show the complete square within its cell; do not roll or fold towel, no ears.
CELL 8 BOTTOM MIDDLE: Baby bandana bib in dusty blue cotton, triangular pointed bib shape, two short broad neck tabs meeting with one snap at the back. Absorbent backing visible only as fine edge. No cords, no decorative ribbon, no appliques.
CELL 9 BOTTOM RIGHT: Baby barrel-leg trousers in soft washed mid-blue denim, elastic gathered waistband, generous diaper rise, legs bow outward at knee and taper strongly at ankle with simple hem. FRONT view with completely plain front, because the two patch pockets are on BACK only. No front pockets, no fly, no buttons, no belt loops, no cuff bands.
```

### Lámina 2: generación inicial

```text
Create a professional premium sewing-pattern catalogue product photography contact sheet. Square canvas 1254 x 1254 pixels, invisible exact 3 by 3 grid of nine equally sized 418-pixel square cells, row-major reading order. The SAME clean seamless warm ivory studio backdrop in all cells, no grid lines, no panels, no labels, no numbers, no text, no letters, no watermark, no logos. Real PHOTOGRAPHS of carefully sewn miniature garments, NOT drawings, NOT SVG, NOT illustrations, NOT 3D renders. Real fabric weave, natural soft folds, tactile textiles, realistic seams, restrained soft side lighting and subtle shadows. Each entire object centered inside its own cell, maximum object dimension 75 percent of cell, at least 12 percent breathing room to each edge. Separate objects never touch or cross cells. Clothing is front-view flat lay with dimensional natural volume, empty and unworn. Hats and shoes slightly three-quarter so construction is legible. No people, models, mannequins, hands, hangers, props, styling accessories or background fabrics. Tasteful muted sage, dusty rose, denim, oatmeal, terracotta palette. Construction precision is vital: do not add any seams, pockets, zippers, buttons, ribbons, bows, embroidery or cuff bands unless explicitly listed. Adult-looking details should not be invented on baby clothing.
CELL 1 TOP LEFT: Baby baggy trousers in warm terracotta cotton twill, elastic gathered waistband, generous diaper rise, loose wide full-length legs with straight simple hems. Front view plain without visible pockets (patch pockets exist on back only). No drawcord, no buttons, no fly, no rib cuffs.
CELL 2 TOP MIDDLE: Short baby romper overall in dusty rose linen, central high plain bib, broad straps that cross only on the unseen back and fasten in front with two snaps. Very short loose legs with narrow bound leg openings and visible functional crotch snap tape. No pockets, no ruffles, no waist bows.
CELL 3 TOP RIGHT: Long baby overalls in oatmeal cotton, plain central high bib and broad straps that fasten in front with two snaps. Straight full-length legs and functional snap opening along inside legs from ankle to ankle. No pockets, no denim hardware, no belt loops.
CELL 4 MIDDLE LEFT: Baby bear-ear beanie in caramel cotton jersey, simple smooth two-piece crown, folded jersey brim, two small round teddy bear ears symmetrically sewn to upper crown. No face, no eyes, no nose, no knit cable texture.
CELL 5 MIDDLE MIDDLE: Coordinated TWO-PIECE summer set for baby: plain soft sage short bib romper with broad cross-back straps and snaps at front and crotch, plus matching tiny classic bucket sun hat above and beside it. Two pieces only, neatly arranged together with breathing room in one cell. No other clothes, no hanger, no pockets or decorative additions.
CELL 6 MIDDLE RIGHT: Toddler sleeveless sherpa fleece vest in cream with V neckline, cotton lining, front row of small snaps, and ONE SMALL fixed decorative sage fabric bow at the left upper chest. Plain lower edge, no pockets, no hood, no embroidery.
CELL 7 BOTTOM LEFT: Toddler soft sage polar-fleece jacket with stand-up high collar, center separating zipper, simple soft band at bottom hem and gathered cuffs. Front fully closed. No hood, no pockets, no buttons, no applique.
CELL 8 BOTTOM MIDDLE: Toddler reversible quilted jacket, dusty rose small-scale diamond quilt texture, round collarless neckline, contrasting oatmeal bias binding at neck, placket, hem. Small center snaps and two lower square patch pockets. Turned-up cuffs show oatmeal reverse. No hood, no conventional collar.
CELL 9 BOTTOM RIGHT: Toddler ochre cotton jacket with lined hood, center front buttons, two lower patch pockets, cream-and-ochre gingham lining peeking at hood edge, turned cuffs and hem facing. No zipper, no drawstrings.
```

### Lámina 3: generación inicial

```text
Create a professional premium sewing-pattern catalogue product photography contact sheet. Square canvas 1254 x 1254 pixels, invisible exact 3 by 3 grid of nine equally sized 418-pixel square cells, row-major reading order. The SAME clean seamless warm ivory studio backdrop in all cells, no grid lines, no panels, no labels, no numbers, no text, no letters, no watermark, no logos. Real PHOTOGRAPHS of carefully sewn children's garments, NOT drawings, NOT SVG, NOT illustrations, NOT 3D renders. Real fabric weave, natural soft folds, tactile textiles, realistic seams, restrained soft side lighting and subtle shadows. Each entire object centered inside its own cell, maximum object dimension 75 percent of cell, at least 12 percent breathing room to each edge. Separate objects never touch or cross cells. Clothing is front-view flat lay with dimensional natural volume, empty and unworn. Hats slightly three-quarter so construction is legible. No people, models, mannequins, hands, hangers, props, styling accessories or background fabrics. Tasteful muted sage, dusty rose, denim, oatmeal, terracotta palette. Construction precision is vital: do not add any seams, pockets, zippers, buttons, ribbons, bows, embroidery or cuff bands unless explicitly listed. Do not invent adult-looking details on baby clothing.
CELL 1 TOP LEFT: Toddler dusty blue cotton jersey pullover hoodie, set-in long sleeves, hood without drawstrings, ONE kangaroo pouch pocket in front, rib hem and rib cuffs. No zipper, no buttons, no graphic.
CELL 2 TOP MIDDLE: Toddler dusty rose cotton peasant blouse, elastic gathered wide round neckline, short puffed raglan sleeves with elastic sleeve ends, separate gathered ruffle along bottom hem. No buttons, no lace, no embroidery.
CELL 3 TOP RIGHT: Same toddler peasant blouse silhouette but LONG puffed raglan sleeves, sage cotton, elastic gathered wide round neckline and elastic wrists, separate gathered bottom hem ruffle. No buttons, no lace.
CELL 4 MIDDLE LEFT: Toddler sleeveless blouse in oatmeal linen, straight silhouette, round bound neck and bound armholes, full center front placket with five small buttons. Straight plain hem, no pockets, no ruffles.
CELL 5 MIDDLE MIDDLE: Toddler loose bloomer full-length trousers in terracotta cotton, elastic gathered waist and elastic gathered ankle hems, voluminous legs. No pockets, no fly, no ties, no rib knit cuffs.
CELL 6 MIDDLE RIGHT: Children's barrel-leg trousers in washed mid-blue denim with elastic gathered waist, curving legs wide at knee and narrowing to plain ankle hems. Two visible front patch pockets with diagonal slant openings; back patch pockets unseen. No fly, no button, no belt loops, NO elastic ankles or cuff bands.
CELL 7 BOTTOM LEFT: Toddler A-line sundress in muted golden yellow cotton with elastic gathered straight top edge, narrow shoulder straps formed by continuation of matching armhole bias binding, one small FIXED decorative bow centered just below neckline. No adjustable tie straps or long ribbons. The dress flares uninterrupted to knee without waist seam, no pockets.
CELL 8 BOTTOM MIDDLE: Baby ruffle romper in dusty pink cotton: bodice has short flutter ruffle sleeves, decorative narrow shoulder straps with small sewn-fixed bows, bloomer shorts lower half with elastic leg openings, crotch snap closure, back snaps unseen. No pockets, no belts or long dangling ribbons.
CELL 9 BOTTOM RIGHT: A single baby's sage stretch cotton fabric headband: soft broad continuous closed band forming an oval and a large fixed fabric bow sewn over the center front seam. Band visible behind bow, no mannequin head.
```

### Lámina 4: generación inicial

```text
Create a professional premium sewing-pattern catalogue product photography contact sheet. Square canvas 1254 x 1254 pixels, invisible exact 3 by 3 grid of nine equally sized 418-pixel square cells, row-major reading order. The SAME clean seamless warm ivory studio backdrop in all cells, no grid lines, no panels, no labels, no numbers, no text, no letters, no watermark, no logos. Real PHOTOGRAPHS of carefully sewn children's garments, NOT drawings, NOT SVG, NOT illustrations, NOT 3D renders. Real fabric weave, natural soft folds, tactile textiles, realistic seams, restrained soft side lighting and subtle shadows. Each entire object centered inside its own cell, maximum object dimension 75 percent of cell, at least 12 percent breathing room to each edge. Separate objects never touch or cross cells. Clothing is front-view flat lay with dimensional natural volume, empty and unworn. Hats slightly three-quarter so construction is legible. No people, models, mannequins, hands, hangers, props, styling accessories or background fabrics. Tasteful muted sage, dusty rose, denim, oatmeal, terracotta palette. Construction precision is vital: do not add any seams, pockets, zippers, buttons, ribbons, bows, embroidery or cuff bands unless explicitly listed. Do not invent adult-looking details on baby clothing.
CELL 1 TOP LEFT: Baby pixie bonnet in sage cotton lined oatmeal, medieval-inspired two-piece snug hood shape with one short point at BACK of crown, curved open face. Short integrated fabric chin tab with snap, closed below chin. Side-three-quarter view makes rear point clear. No hanging tie strings, no pompoms, no ears, no brim.
CELL 2 TOP MIDDLE: Baby pixie bonnet of muted rust FELT, same pointed-back two-piece shape, unlined, visible neat decorative blanket stitching around fabric edges. Integrated short felt chin tab closes by one snap. Side-three-quarter view. No ribbons, no ears, no brim, no pompoms.
CELL 3 TOP RIGHT: Baby earflap hat in dusty blue cotton, lined pale grey, two crown sides, two small triangular CAT ears on top, earflaps extend below ears and connect beneath chin with short snap tab. No face, no whiskers, no long hanging ties, no pompoms, no knitted cable pattern.
CELL 4 MIDDLE LEFT: Child's dusty rose cotton bucket sun hat, round crown, softly downward sloping brim and ONE fixed decorative bow sewn to one side of crown. No chin strap, no laces, no ribbon tails.
CELL 5 MIDDLE MIDDLE: Baby oatmeal cotton bonnet with two side panels and center head panel, broad gathered doubled-fabric ruffle framing face opening, lined interior. Short fabric chin tab closes with a snap beneath chin. No dangling ribbons, no bow, no appliques.
CELL 6 MIDDLE RIGHT: Toddler sage cotton one-piece pinafore apron: square neckline, wide over-shoulder sections with small shoulder ruffles, A-line apron body with ONE large centered front patch pocket, a separate modest ruffle along bottom hem, two short simple waist ties visible to sides. It is an apron, no sleeves, no buttons, no zipper, no separate gathered waist seam.
CELL 7 BOTTOM LEFT: Child's warm terracotta linen short romper/playsuit, straight horizontal upper chest edge, two wide plain shoulder straps with front buttons (two adjustment positions), two lower patch pockets, loose SHORT legs with plain folded straight hems, crotch snaps. No central bib pocket, no bow, no ruffle, no elastic legs.
CELL 8 BOTTOM MIDDLE: Child's soft washed denim long overalls, high central bib with one rectangular bib pocket, broad straps cross only at back and button front, side button openings, two lower patch pockets, full-length straight legs with turned-up cuffs. No zipper, no distressing, no belt.
CELL 9 BOTTOM RIGHT: Toddler dusty rose cotton sleeveless trapeze BLOUSE, round neckline and bound armholes, loose A-line silhouette with hip-length straight hem, plain continuous front. Tiny back neck button unseen. No front button placket, no ruffles, no pockets, no waist seam.
```

### Lámina 5: generación inicial

```text
Create a professional premium sewing-pattern catalogue product photography contact sheet. Square canvas 1254 x 1254 pixels, invisible exact 3 by 3 grid of nine equally sized 418-pixel square cells, row-major reading order. The SAME clean seamless warm ivory studio backdrop in all cells, no grid lines, no panels, no labels, no numbers, no text, no letters, no watermark, no logos. Real PHOTOGRAPHS of carefully sewn children's garments, NOT drawings, NOT SVG, NOT illustrations, NOT 3D renders. Real fabric weave, natural soft folds, tactile textiles, realistic seams, restrained soft side lighting and subtle shadows. Each entire object centered inside its own cell, maximum object dimension 75 percent of cell, at least 12 percent breathing room to each edge. Separate objects never touch or cross cells. Clothing is front-view flat lay with dimensional natural volume, empty and unworn. Hats slightly three-quarter so construction is legible. No people, models, mannequins, hands, hangers, props, styling accessories or background fabrics. Tasteful muted sage, dusty rose, denim, oatmeal, terracotta palette. Construction precision is vital: do not add any seams, pockets, zippers, buttons, ribbons, bows, embroidery or cuff bands unless explicitly listed. Do not invent adult-looking details on baby clothing.
ONLY TWO cells contain products; seven cells are entirely blank ivory. Strictly preserve the invisible 3x3 grid and individual cell scale, do not enlarge the two objects to fill sheet.
CELL 1 TOP LEFT (x0..418,y0..418): Children's sage cotton wide-leg capri trousers. Elastic gathered waistband, broad straight legs ending at mid-calf, simple straight folded hems. Front view with no pockets, no fly, no buttons, no belt loops, no ties, no cuff bands.
CELL 2 TOP MIDDLE (x418..836,y0..418): Baby reversible bucket sun hat in dusty blue cotton, rounded crown, soft downward brim, pale oatmeal interior, a SHORT broad fabric chin tab that fastens beneath chin with one snap. Slight three-quarter side view shows clearly this attached snap tab without showing a head. No long strings, no bows, no ears, no pompoms, no ties.
CELL 3 TOP RIGHT and ALL SIX lower cells: EMPTY uniformly warm ivory backdrop without objects or letters.
```

### Lámina 01: regeneración final con bajos corregidos

```text
Create a professional premium sewing-pattern catalogue product photography contact sheet. Square canvas 1254 x 1254 pixels, invisible exact 3 by 3 grid of nine equally sized 418-pixel square cells, row-major reading order. The SAME clean seamless warm ivory studio backdrop in all cells, no grid lines, no panels, no labels, no numbers, no text, no letters, no watermark, no logos. Real PHOTOGRAPHS of carefully sewn miniature garments, NOT drawings, NOT SVG, NOT illustrations, NOT 3D renders. Real fabric weave, natural soft folds, tactile textiles, realistic seams, restrained soft side lighting and subtle shadows. Each entire object centered inside its own cell, maximum object dimension 75 percent of cell, at least 12 percent breathing room to each edge. Separate objects never touch or cross cells. Clothing is front-view flat lay with dimensional natural volume, empty and unworn. Hats and shoes slightly three-quarter so construction is legible. No people, models, mannequins, hands, hangers, props, styling accessories or background fabrics. Tasteful muted sage, dusty rose, denim, oatmeal, terracotta palette. Construction precision is vital: do not add any seams, pockets, zippers, buttons, ribbons, bows, embroidery or cuff bands unless explicitly listed. Adult-looking details should not be invented on baby clothing.
CELL 1 TOP LEFT: Baby/toddler sleeveless A-line trapeze dress in dusty rose cotton poplin. Single uninterrupted flare from armhole to above-knee hem, round neckline and narrow matching bias binding at neck and armholes. NO waist seam, NO waist gathering, NO pockets. Small back neck button unseen from front.
CELL 2 TOP MIDDLE: Toddler sage green cotton sundress with lined straight fitted bodice and distinct gathered full skirt waist seam. Two substantial plain shoulder straps attached front and buttoned only at BACK, hence front has no buttons. No pocket, ruffle, bow or zipper.
CELL 3 TOP RIGHT: Baby diaper cover bloomer in muted mustard cotton. Elastic gathered waist and two elastic gathered leg openings, deep diaper seat. Plain unruffled smooth body, no straps, no frills, no bow.
CELL 4 MIDDLE LEFT: Baby bonnet in oatmeal cotton. Traditional deep curved back crown and broad face band, smooth face opening, lined interior, CLOSED short integrated fabric tab underneath chin fastened with one snap. Absolutely no dangling tie ribbons or cords, no ruffle, no bow.
CELL 5 MIDDLE MIDDLE: Pair of tiny soft sage baby booties. Each has separate fabric rounded upper toe, soft sole and elasticized back heel cuff. Simple sewn cotton construction, no laces, no ties, no buttons. Show the pair together wholly in this single cell.
CELL 6 MIDDLE RIGHT: Sleeveless baby sleeping sack in pale peach cotton, front nylon zipper clearly centered from high round neckline almost to the round bottom, large continuous rounded bag shape, armholes near top. Lined and bias bound, no sleeves, no legs, no hood, no straps, no buttons, no pockets.
CELL 7 BOTTOM LEFT: A single seafoam terry baby bath towel laid completely open in a SQUARE, gently rounded corners, bound edges and a triangular hood stitched OVER the top-left corner. Show the complete square within its cell; do not roll or fold towel, no ears.
CELL 8 BOTTOM MIDDLE: Baby bandana bib in dusty blue cotton, triangular pointed bib shape, two short broad neck tabs meeting with one snap at the back. Absorbent backing visible only as fine edge. No cords, no decorative ribbon, no appliques.
CELL 9 BOTTOM RIGHT: Baby barrel-leg trousers in soft washed mid-blue denim, elastic gathered waistband, generous diaper rise, legs bow outward at knee and taper strongly at ankle with simple hem. FRONT view with completely plain front, because the two patch pockets are on BACK only. The ankles are NOT elasticized: both leg ends have clean plain topstitched narrow hems. The legs taper by cut, never by gathers. NO elastic ankle cuffs, NO cuff bands, NO rib. No front pockets, no fly, no buttons, no belt loops. Only waistband is gathered.
All garments are made from plain smooth fabrics with natural realistic fiber texture only. No embossed swirling patterns, no paisley, no marbling. Photographic natural cotton, linen, terry, denim. Read carefully: the bottom-right barrel trousers MUST have smooth non-gathered ankle hems.
```

### Lámina 04: edición de botones aplicada al PNG inicial

```text
Make a precise localized correction to the attached 1254x1254 3-by-3 photographic catalogue sheet, preserving the excellent photograph quality and all garment shapes, colors, fabric weave and positions. Only alter the BOTTOM LEFT terracotta short playsuit and BOTTOM MIDDLE denim long overalls. On the terracotta playsuit, show just TWO front shoulder-strap buttons TOTAL, one button per strap at the upper-chest joining point; remove the additional higher button on each strap. The straps adjust by second buttonholes, not additional buttons. On the denim overalls, each side waist opening has exactly ONE side button instead of the current two, and the front shoulder straps still have one button each. Do not alter any of the other seven products; no new seams, no additional closures, no new pockets, no text or props. Keep identical seamless ivory background, whole garments and natural photographed fabric textures.
```

## Verificación y límites

Se inspeccionaron las cinco láminas y sus 38 productos, dimensiones, peso, correspondencias de fuente y límites de recorte. La integración central, las pruebas del catálogo y la revisión de las tarjetas en navegador se ejecutan junto con los demás lotes de esta entrega; su resultado queda en `ESTADO_DEL_PROYECTO.md`. La costura física, el ajuste real de talla y la simulación sobre un cuerpo siguen siendo verificaciones independientes de estas fotografías ilustrativas.

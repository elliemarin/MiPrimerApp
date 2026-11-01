# Fotografías de transformaciones A — 2026-11-01

Nueve propuestas, cada una con dos fotografías ilustrativas originales de IA: prenda base a la izquierda y transformación a la derecha. Son **18 imágenes en tres láminas**. Se conservan la misma pose, color base, iluminación y escala dentro de cada par para que el cambio sea fácil de reconocer.

Estas imágenes se generaron con `image_gen.imagegen`. No representan muestras cosidas, no validan el ajuste y no proporcionan coordenadas ni dimensiones al motor de patronaje. Las medidas siguen siendo las que introduce la persona al medir su prenda.

## Correspondencia

`src/data/transformationPhotosA.ts` exporta `TRANSFORMATION_A_SHEETS` y `TRANSFORMATION_A_PHOTOS`. Cada fuente tiene `sheet`, `before` y `after`; los dos recortes de una fila tienen el mismo tamaño para conservar la escala de comparación.

| Lámina / fila | ID | Cambio mostrado |
| --- | --- | --- |
| a-01 / 1 | `vaquero-costados` | Dos paneles rectangulares western en la zona recta de las piernas, bajo bolsillos y por encima de los bajos. |
| a-01 / 2 | `pantalon-banda-deportiva` | Dos franjas rectangulares claras, con tela negra antes y después de cada ventana; se conserva la silueta. |
| a-01 / 3 | `pantalon-campana-70` | Dos cuñas triangulares estampadas en las costuras exteriores para ampliar los bajos. |
| a-02 / 1 | `pantalon-bootcut` | Dos cuñas discretas en la parte inferior exterior de las piernas. |
| a-02 / 2 | `pantalon-cargo` | Dos bolsillos rectangulares con fuelle y entrada superior abierta, sin tapa. |
| a-02 / 3 | `pantalon-herramienta` | Una trabilla corta de lona junto al bolsillo; no añade herramienta ni otros bolsillos. |
| a-03 / 1 | `pantalon-rodilleras` | Dos parches rectangulares de contraste a la altura de las rodillas. |
| a-03 / 2 | `pantalon-bajo-contraste` | Bandas azules añadidas a ambos bajos; el resultado es más largo que la prenda base. |
| a-03 / 3 | `hoodie-bolsillo-xl` | Un bolsillo frontal rectangular con entrada superior horizontal; no es un canguro de entradas laterales. |

## Archivos y origen

| WebP | Bytes | SHA-256 |
| --- | ---: | --- |
| `realistas-transformar-a-01.webp` | 96606 | `932d7b650fbe23ff5c300718d17301c0789bde63791aef859e097670f8bcbe03` |
| `realistas-transformar-a-02.webp` | 68276 | `4688ee4f68ce97e7d7f33626c1c16a2a6f7c07fc3a5ab278f4ba7e38a105167e` |
| `realistas-transformar-a-03.webp` | 72612 | `6a3000cc169eb7485dcbbfc0bd8e9dc0b70bd375e94b412c34fe5042e0e9fbbb` |

Todas las láminas miden 1254 × 1254 px; total **237,494 bytes**. Conversión de formato con `ffmpeg -c:v libwebp -quality 82 -compression_level 6`. Las correcciones de contenido se realizaron con IA, sin dibujar ni sustituir píxeles mediante código.

PNG originales finales de esta sesión, en `/workspace/generated_images/`:

- a-01: `exec-23f2a5e6-0e4d-486a-a922-df1cb57885cd.png` (original previo: `exec-e4c97a29-142b-44e0-8b7c-f56b9e2e82f2.png`).
- a-02: `exec-73ffc62c-0c79-4edc-9c72-f1bd8a1b0bd0.png`.
- a-03: `exec-05d48f0a-386c-4a2e-ba7c-b35e34627260.png` (original previo: `exec-0a816f74-d01e-4ea8-ac4f-790dbe58d03c.png`).

Solo los WebP optimizados forman parte del repositorio.

## Revisión visual

Se comprobaron los nueve pares contra la descripción y los parámetros de `transformations.ts`. Las prendas aparecen completas. Los paneles western y las franjas no tocan la cintura ni cambian el contorno de la prenda. Cargo conserva sus dos fuelles abiertos; el bolsillo XL es una única pieza frontal de entrada superior. Las cuñas terminan en el bajo y el par de bandas muestra un aumento real de longitud.

Dos correcciones importantes: la primera franja deportiva llegaba demasiado cerca de la cintura y se acortó a una ventana entre cadera y bajo; el primer par de bandas conservaba el mismo largo total y se corrigió la prenda base para mostrar la extensión. Se excluyeron los separadores blancos de a-01 mediante metadatos de recorte, sin alterar la fotografía. Los límites de fila se revisaron para conservar bajos y capuchas completos.

## Prompts de generación

### a-01

```text
Create a square 1254 by 1254 premium photorealistic sewing makeover product photography contact sheet for Hilvana. EXACTLY TWO columns and THREE equal-height rows, six complete garments total. Each ROW is a matched BEFORE and AFTER pair: LEFT is the original garment, RIGHT is the exact same garment with ONLY the specified sewn alteration. Identical base fabric, color, wear, shape, scale, styling, camera and lighting across each pair; align waistlines. Whole garments fully contained in their own 627 by 418 cell, with clear empty margins and space between rows. Center each garment in its cell. Rich realistic cloth texture, visible stitchwork, tangible fabric, soft natural volume, warm ivory seamless background, softly diffused studio daylight, subtle contact shadows. Fashion e-commerce flat-lay photography from above, no people, mannequins, hands, hangers, labels, logos, text, words, numbers, arrows, borders or props. This is real-looking textile photography, not drawing or technical diagram. Only the modifications explicitly requested. TOP ROW: Before on left, classic straight-leg mid-blue washed denim jeans, regular five-pocket construction, button and fly, laid flat with legs slightly apart. After on right, identical jeans with TWO narrow long rectangular warm ochre western-print woven fabric panels replacing the outer leg zones. Each panel is a RECTANGULAR inset window entirely surrounded by denim: begins BELOW the hip pockets on the straight upper thigh and ends ABOVE the hem, with a horizontal top and horizontal bottom. Both panels are visibly attached with neat sewing, western geometric weave in ochre, cream and brown. Do NOT touch waistband, hips, pockets, crotch or leg outline; no widening, no triangles, no full-length panels from waist to ankle. MIDDLE ROW: Before on left, charcoal-black plain straight athletic trousers with elastic waistband, no ankle cuffs and no drawcord. After right, identical trousers with TWO narrow cream rectangular side-stripe inset windows in the straight outer legs, starting below hips and ending slightly above hem, keeping exactly the same outer silhouette and width. Show the contrast side strips clearly from the frontal flat-lay. BOTTOM ROW: Before left, straight blue denim jeans with five pockets and plain straight lower legs. After right, identical jeans altered to seventies bell bottoms by inserting ONE visibly triangular warm rust-and-cream floral fabric godet at EACH OUTER lower-leg seam: narrow pointed tops start below knee, broad bases meet the hem and visibly widen both bottom openings. Exactly two floral triangular inserts, no additional patches or change to upper jeans. Each pair is recognizable as the same original garment.
```

Corrección:

```text
Edit this exact photorealistic 2-column, 3-row contact sheet. Preserve every garment, both columns, three rows, canvas1254x1254, all poses, scale, textures, lighting and background. Modify ONLY the cream stripes of the black pants in the MIDDLE RIGHT cell: these must be inset RECTANGULAR WINDOWS entirely surrounded by black fabric. Start each cream stripe clearly BELOW the hip pocket level, about one quarter down the leg from waistband, with a straight horizontal top; stop each stripe about 3cm ABOVE the lower hem, also with a straight horizontal bottom. Restore original black fabric above and below each stripe, preserving all hip pockets. Both upper hips must remain completely black. Keep the black pant silhouette, width and length exactly unchanged. Do not alter top western jeans or bottom floral flares, or any left-side garment. No new text, labels, logos, decoration, seams or pockets.
```

### a-02

```text
Create a square 1254 by 1254 premium photorealistic sewing makeover product photography contact sheet for Hilvana. EXACTLY TWO columns and THREE equal-height rows, six complete garments total. Each ROW is a matched BEFORE and AFTER pair: LEFT is the original garment, RIGHT is the exact same garment with ONLY the specified sewn alteration. Identical base fabric, color, wear, shape, scale, styling, camera and lighting across each pair; align waistlines. Whole garments fully contained in their own 627 by 418 cell, with clear empty margins and space between rows. Center each garment in its cell. Rich realistic cloth texture, visible stitchwork, tangible fabric, soft natural volume, warm ivory seamless background, softly diffused studio daylight, subtle contact shadows. Fashion e-commerce flat-lay photography from above, no people, mannequins, hands, hangers, labels, logos, text, words, numbers, arrows, borders or props. This is real-looking textile photography, not drawing or technical diagram. Only the modifications explicitly requested. TOP ROW: Before left, warm sand straight-leg twill trousers with waistband, front button and fly, two slanted front pockets. After right, identical trousers with one small taupe twill triangular gusset sewn into EACH outer lower-leg seam, narrow point beginning below calf and wide base at hem, creating a subtle bootcut flare, not a dramatic bell. Exactly two visible narrow triangular inserts, same unmodified upper trousers. MIDDLE ROW: Before left, olive straight-leg cotton ripstop trousers with button/fly, two hip pockets and completely plain thighs. After right, identical olive trousers plus exactly TWO large rectangular open-top bellows cargo pockets, one on each outer thigh, in a slightly deeper olive fabric. Show deep folded side/bottom gussets and visible open upper pocket mouths. These pockets have NO flaps, NO lids, NO snaps and NO zippers. Do not change waist or lower legs. BOTTOM ROW: Before left, dark indigo straight work jeans with ordinary front pockets and belt loops, garment laid with one outer hip slightly angled visibly, empty beside the pocket. After right, EXACT same dark indigo jeans plus just ONE short rust canvas fabric utility loop attached beside one hip pocket: sewn at its two ends and curving into a small open loop. Clearly visible loop, no metal hardware, no tool hanging from it and no extra pockets. Keep the same leg shape, pose and scale before and after. Entire garments stay inside their cells.
```

### a-03

```text
Create a square 1254 by 1254 premium photorealistic sewing makeover product photography contact sheet for Hilvana. EXACTLY TWO columns and THREE equal-height rows, six complete garments total. Each ROW is a matched BEFORE and AFTER pair: LEFT is the original garment, RIGHT is the exact same garment with ONLY the specified sewn alteration. Identical base fabric, color, wear, shape, scale, styling, camera and lighting across each pair; align waistlines. Whole garments fully contained in their own 627 by 418 cell, with clear empty margins and space between rows. Center each garment in its cell. Rich realistic cloth texture, visible stitchwork, tangible fabric, soft natural volume, warm ivory seamless background, softly diffused studio daylight, subtle contact shadows. Fashion e-commerce flat-lay photography from above, no people, mannequins, hands, hangers, labels, logos, text, words, numbers, arrows, borders or props. This is real-looking textile photography, not drawing or technical diagram. Only the modifications explicitly requested. TOP ROW: Before left, faded blue straight jeans with ordinary pockets and entirely plain knees. After right, identical jeans plus exactly TWO softly textured rust-brown RECTANGULAR knee patches, one at each knee, neatly edge stitched, almost square but slightly taller than wide with subtle rounded corners, no other changes. MIDDLE ROW: Before left, oatmeal beige straight linen trousers, elastic waistband, simple hems and no drawstrings. After right, identical trousers LENGTHENED at BOTH bottom openings by a broad muted slate-blue straight fabric extension band, clearly sewn on as one double-fabric band around EACH hem. Align both waistlines, preserve the entire original beige leg length, and make the after trousers visibly longer by the added blue bands. No rib-knit cuffs, no gathered ankles, no rolled hems; openings remain straight. BOTTOM ROW: Before left, dusty sage plain long-sleeve pullover hoodie with hood, rib wrist cuffs and lower rib band, no drawstrings, plain front with NO pocket. After right, EXACT same hoodie plus ONE large warm cream rectangular front patch pocket, wider than tall, sewn onto lower torso with a clearly visible straight horizontal OPEN TOP edge. The pocket is approximately 30cm wide and 21cm tall, with gently squared corners, and leaves space above the hoodie hem band. Absolutely NO diagonal side openings and no kangaroo hand-pouch shape; this is a large simple top-entry rectangular patch pocket. No added zipper, flap, button or embroidery. Identical pose and base garments within each before-after pair.
```

Corrección:

```text
Edit this exact photorealistic 2-column,3-row contact sheet. Preserve all six garments, cloth texture, lighting, pose, color and 1254x1254 canvas. Correct ONLY the MIDDLE LEFT beige linen pants: SHORTEN BOTH beige legs by approximately seventy pixels (about the height of the blue band visible in the MIDDLE RIGHT pants), while keeping their waistband, rise, pockets, thigh width, leg angles and top position absolutely fixed. Give the shortened beige legs neat plain hems. The shortened left hems should now align horizontally with the TOP EDGE of the blue extension bands in the middle-right pants. Restore the ivory background below the new shortened left hems. This makes the after/right pants visibly longer than before/left by adding the blue bands; their beige sections have the same physical length. Do NOT alter the MIDDLE RIGHT trousers at all. Keep the jeans with knee patches and both hoodies completely untouched, including the rectangular top-entry pocket. No new words, logos, props or labels.
```

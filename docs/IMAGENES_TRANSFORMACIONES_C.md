# Transformaciones realistas — lote C

Fecha: 2026-11-01. Nueve ideas y dieciocho fotografías ilustrativas originales generadas con `image_gen.imagegen`: chaquetas, vestidos y faldas.

Cada fila compara una prenda base a la izquierda con su intervención a la derecha. Se conservan la tela base, el color, el ángulo y el encuadre para leer el cambio. Las fotos son orientativas; no suministran escala, medidas ni geometría al PDF, ni acreditan una muestra confeccionada.

## Correspondencia

| Lámina | Fila | Idea | Intervención visible |
| --- | ---: | --- | --- |
| c-01 | 0 | `chaqueta-cargo` | Dos bolsillos de fuelle abiertos, sin tapa |
| c-01 | 1 | `chaqueta-espalda` | Parche rectangular con estampado botánico, vista trasera |
| c-01 | 2 | `chaqueta-bolsillo-tapa` | Dos bolsillos planos con tapa y broche |
| c-02 | 0 | `vestido-volante` | Volante marfil añadido bajo el vestido rosa |
| c-02 | 1 | `vestido-bolsillos` | Dos bolsillos rectangulares visibles |
| c-02 | 2 | `vestido-banda` | Banda lisa de contraste que prolonga el bajo |
| c-03 | 0 | `falda-godets` | Cuatro cuñas estampadas que abren el bajo |
| c-03 | 1 | `falda-volante` | Volante fruncido que prolonga el bajo |
| c-03 | 2 | `falda-bolsillo-tapa` | Dos bolsillos planos con tapa y broche |

Los IDs y recortes viven en `src/data/transformationPhotosC.ts`. `TRANSFORMATION_C_SHEETS` enumera tres ideas por lámina; `TRANSFORMATION_C_PHOTOS` conserva un recorte `before` y otro `after` por idea.

## Archivos y procedencia

Las tres imágenes miden 1254 × 1254 px, con dos columnas y tres filas. Conversión de formato con `ffmpeg -c:v libwebp -quality 82 -compression_level 6`; no se dibujaron ni retocaron contenidos mediante código.

| Archivo | Bytes | SHA-256 |
| --- | ---: | --- |
| `realistas-transformar-c-01.webp` | 150184 | `8386ed15d7cdf62e16549492ffc9c40e1e5247eb1fbd4700d13cd3c6a9fdec67` |
| `realistas-transformar-c-02.webp` | 65248 | `1db707562b1af8f6e2e637847b5499e65529f68ba22bfb7afd416ea51accfa0d` |
| `realistas-transformar-c-03.webp` | 96518 | `aae9e6a9a656ee2a5c2f87091bfe90483d48cda03e8ef28456a911d5e95e54b0` |

Total: **311950 bytes**. PNG originales finales en el directorio temporal `/workspace/generated_images/` de la sesión:

- C-01: `exec-05b4e413-0bbe-4566-8403-eb0458e2d1f7.png`.
- C-02: `exec-4e620b8a-88af-4fae-80fb-1d77fccc08be.png`; primera generación: `exec-3dff300c-c5f0-494e-807a-e3efec23992e.png`.
- C-03: `exec-e122282e-57a4-4c14-bcbc-c7c7d8c010b2.png`; primera generación: `exec-11391454-3531-4311-9115-af8adad9dd6c.png`.

## Revisión visual

- Prendas enteras, con cuello, mangas y bajos dentro del recorte. C-01 y C-03 usan columnas 0/627/1254 px. C-02 se centra sobre las prendas reales: antes x=120, después x=620, ambos de 520 px de ancho. Sus centros de encuadre son x=380/880; esto evita que el vestido salte lateralmente al alternar.
- Límites verticales revisados: C-01 0/401/803/1254; C-02 0/411/814/1254; C-03 0/400/809/1254. Ambos lados de cada par tienen el mismo tamaño de recorte.
- El primer cargo muestra fuelles y boca abierta; las tapas pertenecen solo a la tercera chaqueta.
- La espalda de mezclilla usa un aplique rectangular, sin añadir formas sueltas fuera de él.
- Se corrigieron con IA los vestidos y la falda de volante: el antes conserva un bajo más corto para que el después muestre una prolongación visible. No se representa el volante como sustitución de una franja existente.
- La falda inicial salió con cinco cuñas; se regeneró hasta mostrar cuatro inserciones separadas y una silueta de bajo más amplia.
- Colores, textura y caída son referencias estéticas. La prenda usada y las medidas que introduzca la persona determinan el resultado de confección.
- Los 18 recortes se decodificaron en Chromium y se revisaron en tres capturas de pares de 300 px por lado: prendas completas, cambios legibles y sin vecinos. Evidencia temporal: `/tmp/hilvana-transform-c-crops/`.

## Prompts originales

### C-01 — chaquetas

```text
Create a beautiful photorealistic sewing-upcycling catalog contact sheet, SQUARE 1254 by 1254 pixels. EXACTLY TWO COLUMNS and THREE EQUAL ROWS, six separate garment photographs, with NO text, no labels, no arrows, no dividing lines, no logos, no people, mannequins, hangers, hands or props. Warm ivory seamless background #F7F3E9, soft diffused studio daylight, gentle realistic shadows, rich visible fabric texture and precise sewing details. This is premium real clothing product photography, not a drawing or diagram. Each full garment is completely inside its 627-wide by 418-high cell, with at least 28px empty margin around it, and nothing crossing cell boundaries. Center each garment, sleeves naturally angled down when present, camera overhead straight-on. Each ROW is a BEFORE/AFTER pair of the EXACT SAME garment: left BEFORE, right AFTER. The pair must have identical BASE COLOR, fabric, shape, scale, camera view, sleeve pose, button placement and lighting; only the described addition changes. Keep before and after garments at the SAME SCALE, not re-scaled to fill their cell. Do not add unspecified decorations, pockets or seams. The modifications should be desirable, tasteful, professionally sewn and clearly visible. Follow this exact row-by-row order: TOP ROW: Both are the same olive-green cotton twill chore jacket, front view, pointed collar, full front buttons, long straight sleeves and no chest pockets. TOP LEFT before has plain smooth lower fronts with NO pockets. TOP RIGHT after adds EXACTLY TWO ochre canvas rectangular BELLOWS patch pockets, one on each lower front. Each pocket has a visibly sewn 4cm side-and-bottom gusset that gives real depth and an OPEN STRAIGHT TOP; ABSOLUTELY NO FLAPS, no lids, no snaps on these two pockets. MIDDLE ROW: Both are the same medium-blue denim jacket seen FROM THE BACK, collar at top, sleeves gently down, normal horizontal back yoke. MIDDLE LEFT before has a plain blue denim back. MIDDLE RIGHT after adds ONE large vertical RECTANGULAR fabric appliqué patch centered below the yoke, with straight sides and square corners, stitched all around. The patch fabric has a beautiful botanical folk print in ochre, rust and sage with tiny mushrooms and wildflowers, and is a SINGLE rectangle, no cutout leaves outside the rectangle. BOTTOM ROW: Both are the same cream cotton twill button-front utility jacket, front view, pointed collar, plain long sleeves, no upper pockets. BOTTOM LEFT before has smooth plain fronts. BOTTOM RIGHT after adds EXACTLY TWO navy rectangular FLAT patch pockets on the lower front with rectangular top FLAPS and one small brass snap per flap. The pockets lie flat with NO accordion gussets. Entire jackets and sleeves fit completely inside their own cells.
```

### C-02 — vestidos

```text
Create a beautiful photorealistic sewing-upcycling catalog contact sheet, SQUARE 1254 by 1254 pixels. EXACTLY TWO COLUMNS and THREE EQUAL ROWS, six separate garment photographs, with NO text, no labels, no arrows, no dividing lines, no logos, no people, mannequins, hangers, hands or props. Warm ivory seamless background #F7F3E9, soft diffused studio daylight, gentle realistic shadows, rich visible fabric texture and precise sewing details. This is premium real clothing product photography, not a drawing or diagram. Each full garment is completely inside its 627-wide by 418-high cell, with at least 28px empty margin around it, and nothing crossing cell boundaries. Center each garment, sleeves naturally angled down when present, camera overhead straight-on. Each ROW is a BEFORE/AFTER pair of the EXACT SAME garment: left BEFORE, right AFTER. The pair must have identical BASE COLOR, fabric, shape, scale, camera view, sleeve pose, button placement and lighting; only the described addition changes. Keep before and after garments at the SAME SCALE, not re-scaled to fill their cell. Do not add unspecified decorations, pockets or seams. The modifications should be desirable, tasteful, professionally sewn and clearly visible. Follow this exact row-by-row order: TOP ROW: Both are the SAME dusty-rose linen sleeveless knee-length shift dress, round neckline, broad shoulder straps, gentle A-line shape, no waist seam, no pockets. TOP LEFT before ends with a plain straight hem. TOP RIGHT after adds one deep ivory cotton GATHERED RUFFLE around the entire bottom hem, visibly sewn below the existing rose hem and making the dress longer by the height of the ruffle. The rose dress ABOVE the new ruffle is exactly the same length as in the before photograph. MIDDLE ROW: Both are the SAME sage green linen short-sleeved relaxed shift dress, round neckline, uninterrupted body with no waist seam or buttons. MIDDLE LEFT before is plain and pocket-free. MIDDLE RIGHT after adds EXACTLY TWO cream rectangular FLAT PATCH POCKETS with square corners, open straight tops and visible edge stitching, symmetrically on the lower front at hand height. No flaps or gussets; keep the same hem length. BOTTOM ROW: Both are the SAME navy-blue sleeveless straight tunic dress, simple round neck and smooth body, square shoulder straps, a straight clean hem, no pockets. BOTTOM LEFT before ends with its original navy hem. BOTTOM RIGHT after adds ONE plain sand-colored DOUBLE-FABRIC HEM BAND, straight and smooth, sewn around the entire bottom edge, making the dress longer. The band has no pleats, no gathers, no ruffles; the navy body above it is identical in length to the before dress. Keep both dresses in each row at exactly the same physical scale, and leave sufficient room under the BEFORE hem for the added AFTER extension.
```

Corrección con la imagen original como referencia:

```text
Edit this existing square two-column three-row garment catalog photograph with surgical precision. Preserve the entire layout, colors, studio background, lighting, fabric texture and FOUR other garments exactly. Fix only these TWO BEFORE garments on the LEFT: (1) TOP LEFT dusty-rose sleeveless dress must be SHORTER. Keep its neckline, shoulders and upper body at exactly the same pixels. Its NEW plain rose hem must finish at the SAME HEIGHT as the seam where the rose body meets the ivory ruffle in the TOP RIGHT dress, approximately y=300. Remove the lower rose section below that height and replace it with the existing ivory background; make a natural clean sewn hem at that new height. This BEFORE dress should now be a short dress, while the unchanged AFTER dress has the same rose body plus its added ruffle. (2) BOTTOM LEFT navy dress must also be SHORTER. Keep neckline, shoulders and upper body identical. Its NEW plain navy hem must finish at the same height as the seam where the navy body meets the sand band in the BOTTOM RIGHT dress, approximately y=1147. Remove only the extra navy material below that line, show ivory background below and a beautiful clean sewn navy hem. Do NOT shorten, resize or change either RIGHT-column dress. Do NOT change the sage green dresses in the middle row. This is a before/after comparison: the before bodies must match the after bodies above their newly added hem extensions. Do not rescale whole garments; keep fabric and garment widths aligned.
```

### C-03 — faldas

```text
Create a beautiful photorealistic sewing-upcycling catalog contact sheet, SQUARE 1254 by 1254 pixels. EXACTLY TWO COLUMNS and THREE EQUAL ROWS, six separate garment photographs, with NO text, no labels, no arrows, no dividing lines, no logos, no people, mannequins, hangers, hands or props. Warm ivory seamless background #F7F3E9, soft diffused studio daylight, gentle realistic shadows, rich visible fabric texture and precise sewing details. This is premium real clothing product photography, not a drawing or diagram. Each full garment is completely inside its 627-wide by 418-high cell, with at least 28px empty margin around it, and nothing crossing cell boundaries. Center each garment, sleeves naturally angled down when present, camera overhead straight-on. Each ROW is a BEFORE/AFTER pair of the EXACT SAME garment: left BEFORE, right AFTER. The pair must have identical BASE COLOR, fabric, shape, scale, camera view, sleeve pose, button placement and lighting; only the described addition changes. Keep before and after garments at the SAME SCALE, not re-scaled to fill their cell. Do not add unspecified decorations, pockets or seams. The modifications should be desirable, tasteful, professionally sewn and clearly visible. Follow this exact row-by-row order: TOP ROW: Both are the SAME blue denim knee-length skirt with a smooth fitted high waist, plain waistband, simple regular seams, no pockets and no belt. TOP LEFT before is a plain slightly A-line denim skirt with modest hem width. TOP RIGHT after has FOUR real triangular ivory floral-print GODET INSERTS sewn into four slits from the bottom hem, pointed tips upwards, increasing the hem circumference and giving a visibly fuller, swaying flared silhouette. They are sewn-in wedges that SPREAD the denim panels, not flat patches painted onto the original skirt. Arrange the skirt gently fanned so all FOUR ivory floral wedges are visible and separated by blue denim panels. Waist and upper half stay exactly the same as before, and overall finished hem height stays the same. MIDDLE ROW: Both are the SAME terracotta linen knee-length A-line skirt, simple waistband, plain fabric and no pockets. MIDDLE LEFT before has its plain original hem. MIDDLE RIGHT after adds ONE deep gathered dusty-rose linen RUFFLE attached continuously around the bottom edge, making the skirt visibly longer, while the original terracotta body above stays the same length and physical scale. BOTTOM ROW: Both are the SAME dark charcoal cotton-twill straight knee-length skirt, plain waistband and smooth unadorned front. BOTTOM LEFT before has no pockets. BOTTOM RIGHT after adds EXACTLY TWO sage green rectangular FLAT patch pockets symmetrically below the waist, each with a neat rectangular top FLAP and one small silver snap centered on it. No bellows gussets. Same skirt length and shape before and after. Each garment stays fully in its own cell with clear empty margins.
```

Corrección con la imagen original como referencia:

```text
Edit this existing two-column three-row skirt catalog photograph precisely, retaining its 1254x1254 canvas, lighting, garment colors, textures and all positions. Two corrections only. (1) MIDDLE LEFT terracotta skirt is the BEFORE image for the ruffle extension. Shorten ONLY this skirt's bottom section so its clean plain hem is at y=644 approximately, exactly the same height as the seam where the terracotta body meets the pink ruffle on the unchanged MIDDLE RIGHT skirt. Keep waistband and upper skirt unmoved, same physical scale and width as the terracotta body on the right. Replace removed bottom cloth with the seamless ivory background. This allows the added pink ruffle on the right to make it visibly longer. (2) TOP RIGHT denim skirt must contain EXACTLY FOUR separate ivory floral-print triangular godet inserts, not five. Arrange four evenly spaced ivory wedges with pointed upper tips and broad bases at the hem, separated by blue denim panels. They should visibly open the skirt into a fuller flared silhouette. Preserve the original waistband and upper denim section, and same overall hem height. Keep the other FOUR skirts unchanged, including the plain denim BEFORE at top left and both charcoal skirts at bottom. No text, no marks, no extra modifications.
```

# Imágenes de transformaciones B — 2026-11-01

Nueve transformaciones de hoodies y camisas, con **18 fotografías ilustrativas de IA en tres pares por lámina**. Se conserva fondo marfil, luz suave y textura realista del catálogo. Cada fila muestra la misma prenda antes (izquierda) y después (derecha), con una modificación identificable. Son ejemplos visuales; no simulan la prenda real del usuario ni proporcionan escala o medidas al motor.

## Archivos y correspondencia

Registro: `src/data/transformationPhotosB.ts`, con `TRANSFORMATION_B_SHEETS` y `TRANSFORMATION_B_PHOTOS`. Todas las imágenes se generaron mediante `image_gen.imagegen`; los WebP locales son conversiones de formato, sin dibujar ni manipular partes con código.

| Lámina | Fila 1 | Fila 2 | Fila 3 |
| --- | --- | --- | --- |
| `realistas-transformar-b-01` | `hoodie-portacelular` | `hoodie-punos` | `hoodie-bajo-doble` |
| `realistas-transformar-b-02` | `hoodie-parche-espalda` | `camisa-bolsillo-contraste` | `camisa-manga-volante` |
| `realistas-transformar-b-03` | `camisa-bajo-volante` | `camisa-coderas` | `camisa-aberturas-laterales` |

| Archivo WebP | Bytes | SHA-256 | PNG final en `/workspace/generated_images/` |
| --- | ---: | --- | --- |
| `realistas-transformar-b-01.webp` | 52750 | `cfeba7437382c4017e647b7a285f47e0e27c51521077c29cb6e1bdd103f562ee` | `exec-5da0e006-b23b-4cfd-881b-a4a91575d190.png` |
| `realistas-transformar-b-02.webp` | 75944 | `4973fd8db75488b897b89a235dace735173397cee6ceddc77238302150aad6c4` | `exec-d9169e78-5985-4bad-9933-ccffb533b0b9.png` |
| `realistas-transformar-b-03.webp` | 65364 | `0083a9ab38132fadad0b0a4609913cfad76273f9cb4c66db6fa90cc5243b849e` | `exec-a1314d34-629b-45ec-8d18-b9ebc6c0d366.png` |

Dimensiones: 1254 × 1254 px. Total: **194,058 bytes**. Conversión con `ffmpeg -c:v libwebp -quality 82 -compression_level 6`; los originales PNG permanecen en el entorno de trabajo y no forman parte del repositorio.

## Revisión visual y construcción

- Portacelular: bolsillo alto rectangular con tapa y broche, sin celular simulado.
- Puños: ambos puños nuevos de canalé contrastante; torso, capucha y bajo conservados.
- Banda de hoodie: el cuerpo azul tiene el mismo largo antes y después; la banda ocre se añade debajo y alarga la prenda. Se corrigió una primera generación que reemplazaba parte del cuerpo.
- Parche de hoodie: vista trasera en ambos lados, parche estampado rectangular debajo de la capucha, sin alterar el cuerpo.
- Bolsillo de camisa: parche rectangular de entrada superior, sin tapa ni broche.
- Volantes de manga: la manga rosa mantiene su largo base; la tela crema añade longitud en los dos extremos. Se corrigieron los largos de la comparación inicial.
- Volante de bajo: ambos cuerpos azules y botonaduras terminan a la misma altura; el volante rosado se añade por debajo y deja abertura frontal. Se eliminó una prolongación ficticia de la tapeta entre los volantes.
- Coderas: vista trasera, dos parches rectangulares de esquinas suavizadas, sin parche central.
- Cuñas laterales: dos triángulos de contraste desde el bajo, debajo de la sisa; pecho y botonadura sin cambios.

Los recortes nominales de 627 × 418 px se ajustaron por fila para conservar cuello, bajo y mangas completos: B01 usa divisiones Y `0/412/830/1254`, B02 `0/410/828/1254` y B03 `0/410/812/1254`. Ambas columnas usan divisiones X `0/627/1254`. Los recortes son metadatos de presentación y no cambian los archivos de imagen ni el patrón.

Se decodificaron los 18 recortes WebP en Chromium y se revisaron las tres capturas comparativas: prendas completas, sin vecinos y con el añadido visible. Evidencia de la sesión: `/tmp/hilvana-transform-b-review/01.png`, `02.png` y `03.png`. La integración y las pruebas de la pantalla completa corresponden a la validación global de la entrega.

## Prompts exactos

### B01: generación inicial

```text
Create a square 1254x1254 photorealistic garment product photography contact sheet for a premium sewing app. EXACTLY SIX complete garments arranged in a precise invisible TWO-COLUMN by THREE-ROW grid. Each row is a BEFORE AND AFTER PAIR: LEFT garment before modification, RIGHT garment is the same garment after the one specified sewing change. Within each pair preserve exactly the original base fabric, color, garment proportions, lighting, camera, pose and folds; only the named alteration changes. Warm ivory seamless background #F5F1E7, beautifully tangible fabric texture, softly diffused studio daylight, subtle realistic shadows. Front overhead flat lay with gentle natural volume, no person, body, mannequin, hanger, text, logo, label, borders, arrows or props. Keep every whole garment including sleeves and hems fully inside its own 627px-wide by 418px-high grid cell, centered with generous breathing room; no object or shadow crossing cell boundaries. Do not add other decorations. Rich yet quiet editorial craftsmanship, convincing real cloth photography, never a drawing. TOP ROW pair: a plain dusty sage green pullover hoodie, long sleeves, simple plain hem and no pockets. On LEFT the chest is completely plain. On RIGHT add ONE tall narrow rust-brown canvas smartphone patch pocket on the left chest (viewer's right), with straight rectangular bottom corners, rectangular foldover flap and ONE visible small metal snap; pocket about phone size and no phone inside. Everything else identical. MIDDLE ROW pair: a plain dusty lilac pullover hoodie, plain straight hem, no pockets. On LEFT the two long sleeve ends have plain unadorned hems. On RIGHT add narrow CREAM rib knit cuffs at BOTH wrists, gathered subtly into the ribbing, exactly two new cuffs and no other ribbing changes; the rest of hoodie identical. BOTTOM ROW pair: a plain muted indigo pullover hoodie, long sleeves, plain hem, no pockets. On LEFT torso ends in an ordinary straight hem. On RIGHT add a broad OCHRE smooth double-fabric extension band below the full bottom hem, approximately 9cm deep and the same circumference as the body; it visibly lengthens the torso, NO gathered or elastic waistband and no side panels. Cuffs, hood and body remain indigo. All six garments complete.
```

### B02: generación inicial

```text
Create a square 1254x1254 photorealistic garment product photography contact sheet for a premium sewing app. EXACTLY SIX complete garments arranged in a precise invisible TWO-COLUMN by THREE-ROW grid. Each row is a BEFORE AND AFTER PAIR: LEFT garment before modification, RIGHT garment is the same garment after the one specified sewing change. Within each pair preserve exactly the original base fabric, color, garment proportions, lighting, camera, pose and folds; only the named alteration changes. Warm ivory seamless background #F5F1E7, beautifully tangible fabric texture, softly diffused studio daylight, subtle realistic shadows. Front overhead flat lay with gentle natural volume, no person, body, mannequin, hanger, text, logo, label, borders, arrows or props. Keep every whole garment including sleeves and hems fully inside its own 627px-wide by 418px-high grid cell, centered with generous breathing room; no object or shadow crossing cell boundaries. Do not add other decorations. Rich yet quiet editorial craftsmanship, convincing real cloth photography, never a drawing. TOP ROW pair: BACK VIEW of a plain charcoal-grey pullover hoodie with the hood resting at the top, long sleeves, plain hem. LEFT has completely plain back. RIGHT has one large RECTANGULAR terracotta and cream printed cotton patch sewn centrally on back below the hood, rectangular straight corners, subtle botanical block print, visible neat perimeter stitching; it is an APPLIED patch, no body seams or cutouts. Same hoodie and rear pose. MIDDLE ROW pair: FRONT VIEW of a pale ivory cotton long-sleeve button-up shirt with pointed collar and ordinary cuffs, plain chest and straight hem. LEFT has no pocket. RIGHT adds ONE muted blue chambray rectangular patch pocket on left chest (viewer's right), open horizontal TOP entry, no flap, no snap and no pointed lower corners. Shirt otherwise identical. BOTTOM ROW pair: FRONT VIEW of a dusty rose button-up shirt with small pointed collar and plain three-quarter length sleeves. LEFT has straight open sleeve hems and plain straight shirt hem. RIGHT adds TWO ivory cotton gathered ruffles, one at the end of each sleeve, about 9cm deep, with visible gathered attachment and gentle frill; no ruffle on neck or lower shirt hem. Preserve all other details. All six garments fit inside separate cells.
```

### B03: generación inicial

```text
Create a square 1254x1254 photorealistic garment product photography contact sheet for a premium sewing app. EXACTLY SIX complete garments arranged in a precise invisible TWO-COLUMN by THREE-ROW grid. Each row is a BEFORE AND AFTER PAIR: LEFT garment before modification, RIGHT garment is the same garment after the one specified sewing change. Within each pair preserve exactly the original base fabric, color, garment proportions, lighting, camera, pose and folds; only the named alteration changes. Warm ivory seamless background #F5F1E7, beautifully tangible fabric texture, softly diffused studio daylight, subtle realistic shadows. Front overhead flat lay with gentle natural volume, no person, body, mannequin, hanger, text, logo, label, borders, arrows or props. Keep every whole garment including sleeves and hems fully inside its own 627px-wide by 418px-high grid cell, centered with generous breathing room; no object or shadow crossing cell boundaries. Do not add other decorations. Rich yet quiet editorial craftsmanship, convincing real cloth photography, never a drawing. TOP ROW pair: FRONT VIEW of a pale blue cotton button-up long-sleeve shirt with pointed collar, ordinary cuffs, no pockets, straight horizontal lower hem. LEFT has its usual plain hem. RIGHT adds a dusty rose gathered cotton ruffle about 16cm deep around the lower hem, interrupted and OPEN at the center front button placket; show two distinct frill ends either side of the vertical opening, never a continuous closed ring crossing the buttons. Body and sleeves remain blue. MIDDLE ROW pair: BACK VIEW of a tan cotton long-sleeve shirt with sleeves angled down and spread sufficiently to show both elbows. LEFT sleeves are completely plain. RIGHT adds TWO dark olive RECTANGULAR elbow patches with straight slightly softened corners (not oval), one at the elbow on each sleeve, subtle perimeter stitching; NO central back patch or other changes. BACK view of same garment both times. BOTTOM ROW pair: FRONT VIEW of a muted navy cotton button-up long-sleeve shirt, straight side seams, plain hem, ordinary pointed collar and cuffs. LEFT remains unchanged and relatively straight. RIGHT adds TWO small cream TRIANGULAR fabric wedge inserts at the two bottom SIDE seams: pointed tip starts well below armpit, wide triangular bases end at the lower hem, visibly widening only the lower side hem. Keep chest, button placket and sleeves NAVY unchanged; never a full-height side stripe, no chest panel or ruffle. Same shirt and pose. All whole garments centered.
```

### B01: corrección intermedia de la banda

```text
Edit this exact six-garment, two-column by three-row photographic contact sheet. Keep the entire TOP ROW and MIDDLE ROW unchanged. Correct ONLY the BOTTOM ROW pair of indigo hoodies so the right image truly demonstrates ADDING length, not replacing the lower blue body. In the bottom row, place BOTH identical indigo hoodie hoods at the same y position, about 875 pixels. Make their ORIGINAL BLUE BODY and sleeve lengths IDENTICAL and slightly shorter than currently drawn so they fit: the full plain indigo hoodie on the LEFT must end at approximately y=1155 with its original plain hem, and its sleeves must end near y=1150. On the RIGHT, the exact same indigo torso must also end at approximately y=1155, with identical torso shape, sleeves, folds and hood; THEN attach a smooth OCHRE fabric band BELOW this blue hem, extending the right garment down to y=1230. Thus the right garment is visibly about 75 pixels LONGER overall than the left, with exactly the same blue body remaining above the extension. The ochre band has no gathering, no elastic and no rib knit texture, it continues the original body width. Both blue portions must have the same length and same photo scale. Preserve cream background, premium photoreal cloth, three rows and two columns, all other garments untouched, 1254x1254 canvas, no words or arrows.
```

### B01: corrección final

```text
Make ONE very precise edit to this six-garment before/after photography contact sheet. EVERYTHING except the torso lower hem of the BOTTOM LEFT indigo hoodie must remain unchanged. The bottom-right hoodie already has a blue torso ending around y=1140, then an ochre extension. Shorten ONLY the bottom-left hoodie's BLUE TORSO by about 45 pixels: move its straight bottom hem upward to y=1140, aligned at the SAME horizontal level as the blue-to-ochre attachment seam on the bottom-right hoodie. Preserve the bottom-left hood, shoulders, sleeves, cuffs, wrinkles, fabric and width exactly; only raise the torso hem, making this a cropped plain hoodie before adding a band. Its sleeves may hang below its shorter torso, naturally. The right hoodie stays exactly as shown and is now visibly longer because its ochre band is added to the same-length blue torso. No other changes anywhere. Photorealistic, 1254x1254.
```

### B02: corrección final

```text
Edit ONLY the BOTTOM LEFT dusty rose shirt's two sleeve HEMS in this six-garment before/after photographic contact sheet. Keep the other FIVE garments completely unchanged. In the bottom-left plain shirt, shorten its two rose sleeve ends so that the amount of ROSE sleeve fabric is IDENTICAL to the rose sleeve portions of the bottom-right shirt (which has cream frills). End each plain rose sleeve at the exact same location and angle as the rose-to-cream gathered joining seam on the corresponding sleeve of the bottom-right shirt, and finish each shortened plain sleeve with a small simple turned hem. Thus the BEFORE shirt on the left has shorter plain sleeves, while the AFTER shirt on the right has the very SAME original rose sleeves PLUS cream ruffles extending their ends. Keep the bottom-left shirt collar, torso, lower hem, buttons, fabric, scale and pose unchanged. Do not touch the top or middle rows. No text, no diagrams, maintain premium realistic photography, 1254x1254.
```

### B03: corrección final

```text
Precisely correct ONLY the TOP ROW blue-shirt before/after pair in this six-garment photo sheet. Keep all four garments in the middle and bottom rows unchanged. The added pink lower ruffle should EXTEND a shirt, not replace fabric. TOP LEFT: keep the blue shirt's collar, sleeves, cuffs, width, scale and pose, but make its BLUE TORSO shorter with a straight simple hem ending at approximately y=280. Its button placket must also end at this same y=280 hem, remove the buttons below that point. This is now a boxy cropped blue shirt with long sleeves. TOP RIGHT: make the blue torso and placket end at exactly the SAME y=280 as the left cropped shirt, preserving the exact same torso shape, buttons, sleeve lengths and pose. Attach the existing rose gathered ruffle BELOW that original blue hem, starting at y=280 and extending down to y=380. The ruffle must be two open ends at center front, with a small gap of ivory background between them below the blue button placket. Crucially, remove the long blue vertical placket strip currently running down between the pink ruffles: the original blue placket stops at the joining seam, it does not extend through the ruffle. Right garment is thus clearly 100px longer than left, with identical original BLUE bodies. Everything else remains precisely unchanged, photoreal cloth, 1254x1254, no text.
```

# Imágenes de inspiración A — 2026-11-01

33 imágenes originales generadas con `image_gen__imagegen` para diseños de inspiración que todavía no tenían una portada realista: prendas base, intervenciones textiles y abrigos. Se conserva la dirección visual de las láminas `estilos-vestidos-01.webp` y `prendas-01.webp`: fondo marfil, producto completo, luz suave y textura textil visible.

Estas imágenes son **ilustraciones generadas por IA**, no fotografías de muestras confeccionadas. No certifican el ajuste ni convierten un diseño pendiente en un patrón disponible. El módulo solo aporta portadas; no modifica catálogo, motores, geometría, tallas ni estados. Los colores, telas y detalles decorativos son ejemplos visuales.

## Archivos y mapa

`src/data/inspirationAImages.ts` contiene `INSPIRATION_A_SHEETS` (lámina → IDs por celda), `INSPIRATION_A_IMAGES` (ID → origen) y `INSPIRATION_A_BOUNDS` (recortes visuales de cada celda). Los 33 IDs son únicos y conservan el orden de la auditoría.

Los cuatro recursos miden **1254 × 1254 px**, son WebP calidad 82 y pesan menos de 200,000 bytes cada uno. Peso total: **475,810 bytes**.

| Lámina | Bytes | PNG original | SHA-256 del WebP |
| --- | ---: | --- | --- |
| realistas-inspiracion-a-01.webp | 86,926 | exec-53b7e3e9-7451-462d-b924-b1a726d70e63.png | `8d582d9e87b9c992392970d0660b6236ffcf9dd2f3efe936956c30b10ddb78e0` |
| realistas-inspiracion-a-02.webp | 117,434 | exec-614bb281-3b5c-4b64-b8cf-b9907a64c2ff.png | `3536f3d1f50ba14298dfa394e905caa3731bed8b5f65d998b7fd34fab7a9f49c` |
| realistas-inspiracion-a-03.webp | 199,884 | exec-cbbc90cf-7f05-4bfc-86df-5bbb72eece13.png | `ac8c7b0e347ba25ec5726bd2ca6581bb0dd178312c9284e6635670a1b9855420` |
| realistas-inspiracion-a-04.webp | 71,566 | exec-3fb80b3e-30a3-47d6-be13-f705ff98b002.png | `42d7b4e803142ed241bac678c08c3b6d9aa10225e64ce3a1ccbc7fb5ee10e8ac` |

Los PNG originales se conservan en `/workspace/generated_images/` durante esta sesión. La app solo necesita los WebP finales incluidos en GitHub. Conversión de formato, sin redibujar ni alterar creativamente las imágenes:

```sh
ffmpeg -i ORIGINAL.png -c:v libwebp -quality 82 -compression_level 6 DESTINO.webp
```

## Revisión visual

Se revisaron las 33 celdas en sus cuatro láminas, contrastando la descripción y `flat` de cada diseño con la imagen resultante. Se verificaron prendas completas, capuchas, mangas, tirantes, dobladillos, correa de bandolera, cierres y ausencia de textos. Se comprobó que el remiendo se identifica en la rodilla, que el collage muestra montañas y hongos, y que los tres acolchados se distinguen como chaqueta, chaleco y abrigo largo con capucha. El vestido con ID histórico `vestido-camisero` representa su especificación actual: cuello redondo, manga corta y falda fruncida unida en cintura; no se interpretó el ID como camisa con botones.

No fue necesario regenerar construcciones. La revisión sí ajustó los límites de las filas en los metadatos para respetar la posición real de las prendas generadas:

| Lámina | Límites verticales en px |
| --- | --- |
| a-01 | 0, 442, 804, 1254 |
| a-02 | 0, 390, 781, 1254 |
| a-03 | 0, 386, 813, 1254 |
| a-04 | 0, 418, 836, 1254 |

Las columnas usan 0, 418, 836 y 1254 px. La celda a-02/8 (mameluco) empieza en x=848 y mide 406 px de ancho para excluir la sombra de la manga vecina sin cortar la prenda. La última lámina contiene seis artículos; las tres celdas inferiores están vacías. Los recortes no intervienen en la escala de los patrones ni en los PDF.

Las comprobaciones de integración y visualización de tarjetas se realizan junto con el registro central de imágenes; esta entrega mantiene separada la procedencia de sus cuatro láminas.

## Prompts y orden de celdas

### realistas-inspiracion-a-01

Orden de izquierda a derecha y de arriba abajo (celdas desde 0):

1. `pantalon-palazzo` — celda 0
2. `pantalon-pinzas` — celda 1
3. `overol` — celda 2
4. `falda-recta` — celda 3
5. `falda-a` — celda 4
6. `falda-tableada` — celda 5
7. `vestido-camisero` — celda 6
8. `camiseta-basica` — celda 7
9. `camiseta-larga` — celda 8

Prompt exacto:

```text
Create a photorealistic premium sewing-catalog contact sheet, square 1254 x 1254 pixels, exactly three equal columns and three equal rows with invisible boundaries. Each cell is 418 x 418. All products must be COMPLETE and centered safely inside their cell, leaving at least 24 pixels of ivory blank margin on all four edges. Pure warm ivory seamless background (#F4F1E7), consistent soft natural studio shadows, tactile realistic fabric weave and stitches, refined muted colors. Photograph from directly above as carefully arranged flat-lay or invisible support, with natural dimensional fabric drape but NO visible person, body, mannequin, hanger, accessories, tools, logos, text, numbers, labels, borders or dividers. Every product is distinct and isolated; never cross cell boundaries. Not drawings, not vector illustrations, not 3D render style. Include exactly the following products in reading order, left to right, top to bottom. Maintain construction details faithfully.

ROW ONE: Cell 1: navy woven palazzo trousers, full length, extremely wide legs opening from the hip, proper smooth tailored waistband with one button and fly, side pockets, no elastic. Cell 2: warm taupe tailored trousers with clear front waist pleats, structured waistband and fly button, straight softly tapered full-length legs, side pockets. Cell 3: indigo denim full-length bib overalls with two shoulder straps and brass buckles, front bib, straight legs and traditional topstitching.
ROW TWO: Cell 4: dusty plum knee-length pencil skirt, fitted straight shape, waistband, waist darts, a small front off-center walking vent, concealed zipper. Cell 5: muted ochre A-line knee-length skirt, fitted waistband, smooth clean gently flared silhouette, no gathers, hidden side zipper. Cell 6: muted forest green knee-length pleated skirt, tailored waistband and crisp evenly distributed box pleats.
ROW THREE: Cell 7: rust linen dress, short set-in sleeves, round neck, fitted darted bodice, a distinct waist seam attaching a generously gathered below-knee skirt, NO buttons or collar. Cell 8: dusty blue simple cotton jersey T-shirt with round rib neckline and short sleeves, straight hem, no pocket. Cell 9: sage cotton jersey long sleeve T-shirt, round neck, narrow rib cuffs, no pocket, simple straight hem.
Ensure each garment remains entirely within one ninth of the square, especially the long overall and full skirt.
```

### realistas-inspiracion-a-02

Orden de izquierda a derecha y de arriba abajo (celdas desde 0):

1. `camisa-clasica` — celda 0
2. `blusa-v` — celda 1
3. `sudadera` — celda 2
4. `hoodie` — celda 3
5. `chaleco` — celda 4
6. `chaqueta-cierre` — celda 5
7. `abrigo` — celda 6
8. `pijama-camisa` — celda 7
9. `mameluco` — celda 8

Prompt exacto:

```text
Create a photorealistic premium sewing-catalog contact sheet, square 1254 x 1254 pixels, exactly three equal columns and three equal rows with invisible boundaries. Each cell is 418 x 418. All products must be COMPLETE and centered safely inside their cell, leaving at least 24 pixels of ivory blank margin on all four edges. Pure warm ivory seamless background (#F4F1E7), consistent soft natural studio shadows, tactile realistic fabric weave and stitches, refined muted colors. Photograph from directly above as carefully arranged flat-lay or invisible support, with natural dimensional fabric drape but NO visible person, body, mannequin, hanger, accessories, tools, logos, text, numbers, labels, borders or dividers. Every product is distinct and isolated; never cross cell boundaries. Not drawings, not vector illustrations, not 3D render style. Include exactly the following products in reading order, left to right, top to bottom. Maintain construction details faithfully.

ROW ONE: Cell 1: classic dusty blue cotton shirt with long sleeves, stand-and-fall collar, buttoned front, sleeve cuffs, chest patch pocket, neat tailored construction. Cell 2: dusty blush loose woven blouse, V-neck with clean facing, three-quarter sleeves, no buttons or pockets. Cell 3: sage French terry crewneck sweatshirt, long sleeves, rib cuffs and rib waistband, no hood, no pocket.
ROW TWO: Cell 4: heather blue pullover hoodie with THREE-PIECE hood (narrow center crown panel between two side panels), kangaroo pocket, rib cuffs and rib waistband; no zipper. Cell 5: charcoal wool tailored lined waistcoat, sleeveless, V neckline and button front, softly pointed front hem. Cell 6: warm rust cotton twill zip-front jacket, standing collar, long sleeves with narrow rib cuffs, two distinct large square front patch pockets.
ROW THREE: Cell 7: warm camel lined wool overcoat, notched lapels, long sleeves, button front, below-knee length, two large patch pockets. Cell 8: muted lilac cotton pajama shirt ONLY, long sleeves, open notched pajama collar, button front, single chest pocket, delicate ivory piping. Cell 9: pale sage BABY all-in-one sleepsuit, long sleeves and full-length legs with little enclosed feet, clear center-front snap placket continuing around the inside legs for diaper access, soft cotton knit, no separate pants.
Uniform visual size, whole items without cropping.
```

### realistas-inspiracion-a-03

Orden de izquierda a derecha y de arriba abajo (celdas desde 0):

1. `neceser` — celda 0
2. `bandolera` — celda 1
3. `intervenir-camisa` — celda 2
4. `intervenir-pantalon` — celda 3
5. `remiendo-rodilla` — celda 4
6. `acortar-bajo` — celda 5
7. `parche-personalizado` — celda 6
8. `collage-montanas` — celda 7
9. `cazadora-mezclilla` — celda 8

Prompt exacto:

```text
Create a photorealistic premium sewing-catalog contact sheet, square 1254 x 1254 pixels, exactly three equal columns and three equal rows with invisible boundaries. Each cell is 418 x 418. All products must be COMPLETE and centered safely inside their cell, leaving at least 24 pixels of ivory blank margin on all four edges. Pure warm ivory seamless background (#F4F1E7), consistent soft natural studio shadows, tactile realistic fabric weave and stitches, refined muted colors. Photograph from directly above as carefully arranged flat-lay or invisible support, with natural dimensional fabric drape but NO visible person, body, mannequin, hanger, accessories, tools, logos, text, numbers, labels, borders or dividers. Every product is distinct and isolated; never cross cell boundaries. Not drawings, not vector illustrations, not 3D render style. Include exactly the following products in reading order, left to right, top to bottom. Maintain construction details faithfully.

ROW ONE: Cell 1: dusty teal waxed cotton lined toiletry pouch with top ZIPPER, boxed rectangular base, short side fabric tab; show slightly three-quarter overhead angle so the depth and zipper are obvious. Cell 2: cognac brown canvas CROSSBODY messenger bag with a front flap and LONG shoulder strap arranged as a tidy loop entirely within its own cell, no person, subtle brushed brass hardware. Cell 3: classic long-sleeved blue cotton button shirt transformed with contrasting rust and cream fabric panels on one lower front and one sleeve cuff, collar and chest pocket visible, tasteful upcycled clothing example.
ROW TWO: Cell 4: full straight-leg indigo jeans transformed with slim tan western-style contrasting fabric side panels on the outer sides of BOTH legs, waistband button and fly retained, full product front view. Cell 5: entire light indigo straight-leg jeans with a large distinct rectangular dark-indigo visible-mending PATCH centered on one KNEE, rows of cream sashiko running stitches securing the patch, no holes. Cell 6: full warm charcoal straight-leg ankle-length trousers with freshly shortened neatly sewn double-fold hems on both legs, no cuffs rolled up, waistband and side pockets.
ROW THREE: Cell 7: one large isolated ROUND embroidered fabric patch, dusty cream linen base with dark green stitched border, an original simple terracotta mushroom-and-leaf motif sewn from layered fabric and embroidery, tactile cloth edges; no text. Cell 8: whole long-sleeved cream linen button shirt with a handcrafted fabric APPLIQUE COLLAGE across the lower front depicting overlapping sage and indigo mountain silhouettes, two small red mushrooms and a golden sun; collar visible, real cloth with careful edge stitching, no printed graphic. Cell 9: classic hip-length blue denim trucker jacket with front and shoulder YOKES, point collar, metal button front, two chest flap pockets and long button-cuff sleeves, realistic golden denim topstitching.
Keep every garment complete. For the visible-mending and shortened-hem examples, show the whole trousers rather than a close-up so each card still reads as clothing.
```

### realistas-inspiracion-a-04

Orden de izquierda a derecha y de arriba abajo (celdas desde 0):

1. `cazadora-denim-corta` — celda 0
2. `gabardina-cruzada` — celda 1
3. `trench-corto` — celda 2
4. `chaqueta-acolchada` — celda 3
5. `chaleco-acolchado` — celda 4
6. `abrigo-acolchado-largo` — celda 5

Las celdas 6, 7 y 8 permanecen vacías y no tienen entrada en el mapa.

Prompt exacto:

```text
Create a photorealistic premium sewing-catalog contact sheet, square 1254 x 1254 pixels, exactly three equal columns and three equal rows with invisible boundaries. Each cell is 418 x 418. All products must be COMPLETE and centered safely inside their cell, leaving at least 24 pixels of ivory blank margin on all four edges. Pure warm ivory seamless background (#F4F1E7), consistent soft natural studio shadows, tactile realistic fabric weave and stitches, refined muted colors. Photograph from directly above as carefully arranged flat-lay or invisible support, with natural dimensional fabric drape but NO visible person, body, mannequin, hanger, accessories, tools, logos, text, numbers, labels, borders or dividers. Every product is distinct and isolated; never cross cell boundaries. Not drawings, not vector illustrations, not 3D render style. Include exactly the following products in reading order, left to right, top to bottom. Maintain construction details faithfully.

ONLY THE FIRST SIX CELLS CONTAIN PRODUCTS. The ENTIRE BOTTOM ROW (last three cells) stays plain blank ivory background; do not add extra products there.
ROW ONE: Cell 1: cropped boxy blue denim jacket, clearly cropped to the natural waist, point collar, button front, long sleeves with cuffs, shoulder yoke and two small chest pockets. Cell 2: classic long beige gabardine double-breasted trench coat to below the knee, notched lapels, two parallel rows of buttons, waist belt, long sleeves with cuff straps, two large front patch pockets. Cell 3: short sage gabardine trench coat to upper thigh, notched collar, double-breasted buttons, matching waist belt clearly buckled, long sleeves, side pockets.
ROW TWO: Cell 4: dusty blue hip-length puffer JACKET, long sleeves, standing collar, center zipper, horizontal quilted padded baffles across body AND sleeves, two front patch pockets, no hood. Cell 5: muted brick-red sleeveless padded puffer VEST, standing collar, front zipper, horizontal quilted baffles, two side slit pockets, NO sleeves, hip length. Cell 6: deep forest green long padded winter puffer COAT below knee with a full hood, long sleeves, center-front zipper, horizontal quilted baffles and two large front patch pockets.
BOTTOM ROW: three blank empty ivory squares, completely empty, no text or objects.
Important: long trench and puffer coat must still fit wholly in their equal 418x418 cells at an appropriately smaller scale; leave bottom row blank rather than stretching coats into it.
```

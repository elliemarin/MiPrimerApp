# Fotografías realistas: recetas digitalizadas, lámina A

Fecha: 2026-11-02. Base revisada: `7703fac`. Generadas con la herramienta de imágenes de OpenAI, no descargadas de terceros. Referencia visual: `public/catalog-images/realistas-tendencias-02.webp`; se mantuvo el fondo marfil, luz difusa y fotografía de producto completo.

## Entregables

- `public/catalog-images/realistas-adultos-nuevos-a.webp`: 1254 × 1254 px, WebP calidad 82, **100 768 bytes**.
- `src/data/digitizedPhotosA.ts`: ocho recetas adultas, variante infantil del buzo, descriptores de las nueve celdas y recortes revisados.
- Estas fotografías ilustran el aspecto posible con telas concretas. No aportan geometría ni certifican medidas, ajuste o pruebas físicas de costura. Los patrones siguen teniendo su estado anterior.

## Orden y revisión visual

| Celda | Receta | Detalles revisados |
|---|---|---|
| 0 | palazzo-botones-laterales | Pierna muy amplia, azul marino, botones en el lateral, centro delantero sin bragueta. |
| 1 | pantalon-volante | Lino rosa, cintura elástica, tres alforzas por pierna y volante inferior. |
| 2 | chaqueta-ranglan | Cuello alto, cremallera completa, manga ranglán, costura sobrebrazo, bolsillos de vivo inclinados y puños con pestaña. |
| 3 | sudadera-bloques | Bloques marfil/óxido en cuerpo y mangas, media cremallera, puños con elástico en jareta, bajo doblado sin rib. |
| 4 | buzo-murcielago | Panel central petróleo, laterales marfil continuos con mangas murciélago, capucha salvia forrada, cordón solo en el bajo adulto, sin bolsillo canguro. |
| 5 | culotte-encaje | Boyshort adulto en encaje rosa, piernas cortas rectas, puntilla en cintura y bajos; foto del producto sin cuerpo. |
| 6 | sudadera-media-cremallera-lisa | Polar salvia liso sin bloques, cuello alto, media cremallera, jareta de elástico en muñecas, bajo sin rib. |
| 7 | culotte-punto-picot | Boyshort adulto opaco de punto lavanda con picot fino; acabado distinto del encaje. |
| 8 | buzo-murcielago-infantil | Proporciones infantiles, banda inferior de rib y **ningún cordón** en capucha ni cintura. |

La primera generación tenía los dos culottes demasiado próximos a una braga con pierna curva. Se corrigieron mediante una segunda edición IA, conservando los otros siete productos. La versión publicada tiene las dos piernas cortas y rectas del boyshort. No se retocaron textiles, siluetas ni prendas con código.

Los recortes se desplazaron respecto a la cuadrícula exacta para conservar el puño izquierdo de la manga murciélago adulta y los bajos largos de la primera fila. Se mantiene separación de las prendas vecinas. Los límites son metadatos de presentación; la lámina permanece íntegra.

Se renderizaron las nueve tarjetas en Chromium con el mismo cálculo de posición, escala y proporción de `CatalogImage`, a 320 px por tarjeta. Revisión visual en `/tmp/new-adult-photos-a-review.png`: prendas completas, ningún vecino visible, cordón adulto y ausencia de cordón infantil distinguibles. `npx tsc -b --pretty false` y `git diff --check` terminaron sin errores. La revisión conjunta verifica además el enrutamiento real del catálogo.

## Origen y reproducibilidad

Primera generación (PNG original conservado fuera del repositorio):

- Ruta: `/workspace/generated_images/exec-b3d8b659-b8d0-49fb-a873-d34a2ec68851.png`.
- SHA-256: `90fd071720dc27b1d4014a04b8e919d58aa7a4f29b48756076cb03ca24e2f17f`.

Edición final (PNG original conservado fuera del repositorio):

- Ruta: `/workspace/generated_images/exec-ecd8436d-4d83-46da-ac76-01d636ae6d16.png`.
- SHA-256: `21b7a95772414f6a6396cbc5a6ce5e475a27fa0f38aec428b46edd1d167ef63a`.

WebP publicado:

- SHA-256: `9acb9470cd906031621264244e76145726e740efaca3a1701bf3ee1e7b0be3f2`.
- Conversión: `ffmpeg -i ORIGINAL.png -c:v libwebp -quality 82 -compression_level 6 public/catalog-images/realistas-adultos-nuevos-a.webp`.
- Comprobación: ffprobe confirma 1254 × 1254; tamaño inferior a 250 KB. La compilación y pruebas de integración de los mapas se realizan en la revisión conjunta del repositorio.

## Prompt inicial exacto

```text
Create a premium, genuinely PHOTOREALISTIC fashion product photography contact sheet for a sewing pattern catalog. A SQUARE 1254 x 1254 image, EXACTLY 3 columns and 3 rows, NINE separate flat-lay garments in nine evenly sized invisible square cells. Photograph actual sewn textiles: fine weave, realistic fleece, convincing seams, slight natural folds, soft diffuse studio light and delicate contact shadows. Continuous warm ivory background. Every complete garment centered inside its own cell with ample margin; nothing cropped, crossing cell boundaries, or overlapping another garment. Entire sleeves and hems visible. No grid lines, frames, text, labels, logos, hangers, people, bodies, mannequins, hands, accessories or extra garments. Beautiful restrained coordinated colors. This must look like expensive ecommerce photographs, not a drawing, vector, illustration, diagram, painting or smooth CGI.

EXACT ROW-MAJOR ORDER, carefully follow the different sewing constructions:
TOP LEFT cell 0: adult women's deep ink navy drapey palazzo trousers, high flat fitted waistband, subtle waist darts, very wide straight long legs, side seam pockets. Closure is ONLY on wearer's left SIDE seam with a neat short vertical row of small tonal side buttons visible near the hip. The center front is completely uninterrupted fabric: NO fly, NO center zipper, NO center button. Show slight three-quarter flat lay so the side-button closure can be seen. Entire pants from waistband to both hems.
TOP MIDDLE cell 1: adult women's warm dusty rose wide-leg linen trousers with elastic gathered waistband, no pockets, three parallel narrow horizontal sewn pintucks around EACH lower leg, directly above a gathered ruffle at each ankle. Exactly three pintuck lines per leg and a softly gathered hem flounce on each leg; full long pants, no shorts.
TOP RIGHT cell 2: adult moss-green medium-weight cotton twill zip jacket. High standing collar with full front zipper, NO hood. Raglan sleeves with diagonal collar-to-underarm seam and a subtle upper-arm longitudinal seam because each sleeve is made of two panels. Separate wrist cuffs with little snap tabs, lightly elasticated lower band, TWO slanted welt pockets. Neat realistic construction. Sleeves spread slightly downward so whole jacket fits.
MIDDLE LEFT cell 3: adult color-block fleece half-zip pullover sweatshirt. High standing collar and zipper extending to middle chest, relaxed dropped shoulders. Ivory upper body and upper sleeves, muted rust lower body and lower sleeves. One continuous horizontal color division just below underarms extends across BODY AND BOTH SLEEVES. Wrists have gathered elastic INSIDE sewn casings made of the same fleece, NOT separate knitted rib cuffs. Bottom is a simple plain turned hem, NO rib waistband. No pockets, no hood.
MIDDLE CENTER cell 4: adult cropped batwing hoodie in soft French terry: dark petrol central body panel widening toward waist, contrasting warm oatmeal side panels CONTINUOUS INTO broad curved batwing sleeves, dusky sage lined hood. Two subtle in-seam pockets on the central panel seams. Dark petrol rib wrist cuffs. Separate straight petrol lower band containing a SHORT DRAWSTRING at CENTER HEM, two ends resting on the garment. NO drawcord at hood. NO kangaroo pouch, NO zipper. Spread broad batwing sleeves to show actual low curved underarm silhouette.
MIDDLE RIGHT cell 5: one pair of adult women's low-rise boyshort underwear, product-only flat lay with no body or person. Dusty rose floral stretch lace, short straight leg sections and a gently shaped crotch, visible neat center front seam, seamless sides. Delicate applied stretch lace edging at waist and both leg openings. Unmistakably boyshort silhouette, not a bikini panty. Tactile beautiful floral lace, ordinary tasteful lingerie ecommerce product photo.
BOTTOM LEFT cell 6: adult solid dusty sage fleece half-zip pullover. Same relaxed dropped-shoulder silhouette as cell 3, high standing collar and chest half-zip, but ONE continuous solid color and no block seams. Wrists have gathered elastic casings sewn from fleece, NOT separate rib cuffs. Plain turned lower hem without rib waistband. No pockets, no hood.
BOTTOM MIDDLE cell 7: one pair of adult women's low-rise boyshort underwear in OPAQUE muted lavender cotton-elastane smooth knit, product-only flat lay with no body or person. Short straight leg sections and gently shaped crotch, center seam, seamless sides. Tiny subtle picot elastic trim folded into the edges at waist and both leg openings. NO floral lace, NO broad lace trim. The fabric must visibly differ from the lace boyshort in cell 5.
BOTTOM RIGHT cell 8: CHILD-SIZED version of the batwing hoodie in cell 4, same dark petrol central panel, warm oatmeal sides continuous into wide batwing sleeves, sage lined hood, rib wrist cuffs, but shorter rounder child proportions. Lower hem is a fitted petrol rib-knit waistband. NO STRINGS, NO CORDS, NO TOGGLES anywhere, particularly no hood or waist drawcord. Two subtle pockets in central panel seams, NO kangaroo pouch. Real sewn child garment shown alone.

Consistent scale per cell appropriate to the garment, graceful evenly spaced layout, commercial product-photo quality. Keep all nine products fully contained with ivory breathing room around them. Render accurately to these construction notes.
```

## Prompt de corrección exacto

Se pasó el PNG inicial como `referenced_image_paths`.

```text
Edit this nine-cell catalog photograph while preserving the exact 1254x1254 3-by-3 layout, ivory background, colors, lighting, sizes and all the other seven garments unchanged. Correct ONLY the two adult women's underwear products: the dusty rose lace product at middle-right (cell5) and opaque lavender knit product at bottom-center (cell7). They must both clearly be LOW-RISE BOYSHORTS with short rectangular leg sections: extend the leg coverage downward to create an approximately 4 cm short inner leg on each side, two mostly straight horizontal leg openings and a small squared crotch notch between them. Their outline must resemble short fitted trunks, not curved bikini briefs or high-cut panties. Keep cell5 soft floral stretch lace with applied scalloped lace at waistband and both straight lower leg edges. Keep cell7 completely opaque smooth cotton-elastane knit with tiny subtle picot edges, no floral lace. Product only, flat lay, no person/body. Do not add any items or text. Preserve all other details including child hoodie at bottom-right WITHOUT any drawcord, adult center hoodie WITH drawcord ONLY at lower hem, three pintucks on ruffle pants, and navy palazzo trousers without a center fly. High-end real textile ecommerce photography, never drawings.
```

# Fotografías de los nuevos diseños adultos — lote B

Fecha: 2026-11-02. Imágenes originales generadas con IA para Hilvana, con
`image_gen.imagegen`. Se revisaron `digitizedAdultCatalog.ts` y los motores
`pants.ts`, `jeans.ts`, `oversize.ts` y `menBatch.ts` antes de generar.

## Recurso y procedencia

- Publicado: `public/catalog-images/realistas-adultos-nuevos-b.webp`.
- Registro: `src/data/digitizedPhotosB.ts`.
- Original de sesión: `/workspace/generated_images/exec-2c734498-e322-48df-8c7d-1746e4bbc9bf.png`.
- Dimensiones: 1254 × 1254 px; ocho imágenes y una celda vacía.
- Codificación: `ffmpeg -i ORIGINAL.png -c:v libwebp -quality 82 -compression_level 6 realistas-adultos-nuevos-b.webp`.
- Tamaño: **117,400 bytes**.
- SHA-256: `6d53c7f425fce189b43a83bfe1f3decc520ef4f72f4741ab1d44da0c4b03c50b`.
- Una generación, sin retoques ni composiciones manuales; solo conversión a WebP.
- Referencia visual interna consultada: `realistas-tendencias-01.webp`.
  No se enviaron imágenes de terceros ni se copiaron fotografías ajenas.
  La generación usa una descripción original de las construcciones del catálogo.

## Correspondencia y revisión visual

Índices desde cero, por filas. Los ocho recortes son exactamente cuadrados de
418 × 418 px. Se inspeccionaron original y WebP; cada prenda queda completa,
sin prendas vecinas, fondos dibujados ni rótulos. Las prendas superiores están
abiertas de mangas hacia abajo para conservar la silueta dentro de su celda.
Además, Chromium decodificó las ocho imágenes y se revisaron sus recortes a
250 px de ancho con el mismo posicionamiento porcentual del catálogo.
Captura de sesión: `/tmp/digitized-b-crop-review.png`.

| Celda | Receta | Rectángulo x, y, ancho, alto | Rasgos verificados |
| --- | --- | --- | --- |
| 0 | `barrel-elastico` | 0, 0, 418, 418 | Pierna curva barrel, bajo estrecho sin puño, cintura elástica sin bragueta ni cordón, bolsillos inclinados, rayas finas. |
| 1 | `palazzo-elastico` (adulto) | 418, 0, 418, 418 | Lino de rayas, pierna muy ancha, jareta elástica con cordón adulto, sin bragueta. |
| 2 | `jogger-oversize-felpa` | 836, 0, 418, 418 | Felpa jaspeada, volumen amplio, cordón y puños de rib ajustados al tobillo. |
| 3 | `baggy-felpa` | 0, 418, 418, 418 | Felpa marrón, cordón, pierna amplia recta con dobladillo, sin puños. |
| 4 | `cargo-recto` | 418, 418, 418, 418 | Gabardina/ripstop oliva, pretina con presillas y bragueta, bolsillos delanteros y de fuelle con cartera en muslos. |
| 5 | `sobrecamisa-cuello-tira` | 836, 418, 418, 418 | Pana caramelo, cuello Mao sin pala, hombro caído, botones y dos bolsillos **bajos** grandes con cartera. |
| 6 | `chaqueta-campo` | 0, 836, 418, 418 | Sarga verde, cuello alto, cremallera bajo tapeta de broches, cuatro bolsillos con cartera y pestañas en los puños. |
| 7 | `palazzo-elastico` (infantil) | 418, 836, 418, 418 | Gabardina albaricoque, proporciones infantiles, pierna ancha, cintura elástica **sin cordón ni lazos**. |

La sobrecamisa lleva bolsillos **bajos**, conforme a `oversize.ts`
(`bolsillo-grande`, `cartera` y marcas de colocación). No se sustituyen por
bolsillos de pecho aunque otros tipos de sobrecamisa sí los tengan.

La foto infantil tiene descriptor `palazzo-elastico-infantil` en la lámina y
se resuelve desde `DIGITIZED_CHILD_PHOTOS_B['palazzo-elastico']`. No es una
receta ni un grupo de diseño nuevo. Evita mostrar un cordón que el generador
desactiva en tallas infantiles.

Estas fotografías ilustran el aspecto de los diseños. No son muestras
confeccionadas ni certifican medidas, comodidad, montaje o ajuste. No cambian
patrones, filtros, piezas, instrucciones, destinatarios ni sus estados
experimentales. La revisión impresa y cosida sigue pendiente.

## Prompt exacto

```text
Create an ORIGINAL photorealistic fashion e-commerce product photography CONTACT SHEET, exactly square 1254 by 1254 pixels. A precisely aligned invisible 3 columns by 3 rows grid of equal 418 by 418 pixel cells. Eight different complete garments, ONE garment centered in each cell, last bottom-right cell entirely empty. Every full garment must remain within its own cell with at least 28 pixels breathing room, including shadows, with no crossing boundaries. Front view directly overhead flat lay. The trousers should fill around 340 pixels of cell height and jackets around 330 pixels of cell width, with sleeves relaxed at a downward angle. All garments must look like premium real physical sewn textiles, rich tactile woven or knitted fabric, coherent seams, gentle fabric folds and soft contact shadows. Unified warm ivory seamless background (#f5f1e8). Quiet beautiful luxury sewing catalog aesthetic, sharp textile detail, soft diffuse studio lighting. No people, mannequin, body, hands, hanger, props, lettering, brand labels, logos, borders, lines, numbered cells, text, drawings, outlines or diagram appearance.

EXACT ORDER from top left, row-major:
TOP LEFT, cell 0: charcoal grey fine pinstripe wool elastic-waist BARREL trousers. Convex outer legs balloon widest around knee and taper into narrow plain hems, not cuffs. Gathered elastic waistband, NO fly, NO button, NO drawstring, NO belt loops. Two slanted front pocket openings. Sculptural barrel silhouette unmistakable.
TOP MIDDLE, cell 1: adult PALAZZO trousers of faded blue and ivory narrow vertical striped linen. Gathered elastic waistband with clearly visible short ivory adult drawstring bow. Exceptionally wide flowing straight full-length legs, wide plain hems, discreet side seam pockets. NO fly/button/belt loops. Full garment front with separated wide legs.
TOP RIGHT, cell 2: adult oversized light oatmeal heather fleece JOGGER trousers. Loose hip and thigh, elastic gathered waistband with short oatmeal drawstring bow, side seam pockets, tapered lower legs terminating in prominent narrow RIB-KNIT ANKLE CUFFS gathered around each ankle. No logos.
MIDDLE LEFT, cell 3: adult BAGGY French terry fleece trousers, muted cocoa brown. Very relaxed broad straight full-length legs, broad PLAIN HEM openings (absolutely NO ankle cuffs or ankle elastic), gathered elastic waistband with short cream drawstring bow, side seam pockets. Real fleece jersey texture.
MIDDLE MIDDLE, cell 4: olive cotton ripstop STRAIGHT CARGO trousers. Regular straight legs and plain hems, structured waistband with belt loops and central button/zip fly. Front slanted pockets, exactly two large box-bellows thigh cargo pockets with rectangular buttoned flap covers. Utilitarian detail and authentic stitching. No ankle cuffs.
MIDDLE RIGHT, cell 5: dusty caramel fine corduroy OVERSIZED SHACKET. Straight long button-front body, obvious dropped shoulder construction, relaxed long sleeves (NOT raglan). SHORT UPRIGHT MAO BAND COLLAR ONLY, without any fold-down points or lapels. Exactly TWO OVERSIZED LOWER FRONT patch pockets with rectangular buttoned FLAP COVERS, placed below the waist, NOT chest pockets. No additional pockets. Plain sleeve hems and plain straight body hem, no ribbing.
BOTTOM LEFT, cell 6: deep forest green cotton twill FIELD JACKET. Straight hip-length body, upright HIGH STAND COLLAR, central zipper visible at upper neck and partly beneath a SNAP storm placket. Exactly FOUR patch pockets with snap rectangular flap covers, two small chest pockets plus two larger lower front pockets. Long sleeves with clearly visible snap adjustment tabs on sleeve hems. No belt, no hood, no camouflage, no shoulder epaulettes.
BOTTOM MIDDLE, cell 7: CHILD-size wide-leg PALAZZO trousers, soft dusty apricot cotton gabardine. Visibly smaller child proportions (approximately age six), gathered elastic waistband, broad straight full-length legs, plain hems, discreet inseam pockets. Absolutely NO drawstring, NO string, NO ties, NO bow, NO cords, NO eyelets, NO fly, NO belt loops. Only a simple elastic waistband. The whole child trouser garment, aesthetically centered in its cell.
BOTTOM RIGHT, cell 8: entirely empty warm ivory background.

Maintain the strict grid and ensure each garment is completely visible and isolated for cropping into its own catalog thumbnail. Photographic realism with realistic textile stitching, never a technical sketch.
```

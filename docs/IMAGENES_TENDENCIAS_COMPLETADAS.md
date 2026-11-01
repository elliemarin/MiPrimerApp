# Imágenes realistas de tendencias completadas — 2026-11-01

19 imágenes originales de IA sustituyen las 19 celdas vectoriales de tendencias, faldas y sombrero pescador. Se mantienen las variantes de largo y manga como fotos diferentes. Las imágenes son ilustrativas: no representan muestras cosidas ni certifican ajuste, medidas o estado del patrón. No cambia la geometría del proyecto.

Fuentes verificadas: `AGENTS.md`, `ESTADO_DEL_PROYECTO.md`, sección 23 de `docs/ARQUITECTURA.md`, `docs/IMAGENES_ESTILOS.md` y los motores `jeans.ts`, `oversize.ts`, `girls.ts`, `babyMore.ts`. Referencias visuales: `estilos-hoodies-01.webp` y `estilos-street-02.webp`.

## Entrega y trazabilidad

`src/data/completedAdultImages.ts` exporta las láminas con descriptores de receta (`COMPLETED_ADULT_SHEETS`), remapeos exactos de fuente antigua (`COMPLETED_ADULT_SOURCE_MAP`) y recortes en píxeles (`COMPLETED_ADULT_BOUNDS`). El remapeo por fuente conserva la elección de variantes y destinatarios; no reutiliza una bomber larga para la corta ni una camiseta corta para manga larga.

Cada lámina tiene una cuadrícula 3 × 3. Las celdas no usadas están vacías: 8 productos en la primera, 7 en la segunda y 4 en la tercera. Los tres WebP finales son de 1254 × 1254 px, calidad 82.

| Archivo | Bytes | SHA-256 WebP |
| --- | ---: | --- |
| `realistas-tendencias-01.webp` | 73,756 | `3353597e869f490eb3a5f4dab7a6f93734b017b586e96e4be6a6830e8901d997` |
| `realistas-tendencias-02.webp` | 72,280 | `bd0dfe845d78a9ff2a94e929f3fa8a49d6d31c4f533d12bf6ef8d2213587157c` |
| `realistas-tendencias-03.webp` | 48,462 | `f21721a8fc9a439ca1192d0a42772b3ab19b00bc9049c683e545af13f59a9262` |

Peso total: 194,498 bytes. Los PNG se generaron con `image_gen`; ninguna fotografía se pintó con código. Conversión exclusivamente de formato: `ffmpeg -i ORIGINAL.png -c:v libwebp -quality 82 -compression_level 6 DESTINO.webp`.

Los originales PNG se conservan durante la sesión en `/workspace/generated_images/`; el sitio utiliza únicamente los WebP versionados en GitHub, no esas rutas temporales.

## Revisión visual y recortes

Se inspeccionaron las tres láminas originales y los 19 recortes WebP decodificados por Chromium a 200 px, con las mismas fórmulas CSS de `CatalogImage`. Las prendas aparecen completas, sin incluir prendas vecinas. La segunda lámina usa límites adaptados para no recortar mangas de sobrecamisa ni cuello de chaqueta. Evidencia de sesión: `/tmp/hilvana-adult-photos/realistas-tendencias-01-review.png`, `-02-review.png`, `-03-review.png`. Esta revisión de recursos complementa la validación integral de la app a cargo de la integración.

Se comprobó cobertura exacta de las 19 fuentes asignadas, sin duplicados, límites dentro del lienzo, dimensiones y presupuesto menor de 200 KB por recurso.

## realistas-tendencias-01

PNG inicial: `/workspace/generated_images/exec-72ec363b-8071-4e66-818e-6552ac4a0922.png`.
PNG final: `/workspace/generated_images/exec-d0bf1db5-7c2e-4f50-8d4a-724afd1e7a5f.png`.
SHA-256 PNG final: `ec61884c52813742806f2c2f298ff5ae3f2008ed60ad53872245eadbac62d986`.

| Celda (base 0) | Receta | Fuente sustituida | Revisión |
| ---: | --- | --- | --- |
| 0 | `jeans-recto` | `tendencia-01/0` | Pierna recta, pretina con botón, bragueta y bolsillos de jeans. |
| 1 | `pantalon-pitillo` | `tendencia-01/1` | Pierna estrecha hasta el tobillo, mezclilla con apariencia elástica. |
| 2 | `jeans-mom` | `tendencia-01/2` | Tiro alto, cadera cómoda y pierna que se estrecha hacia el tobillo. |
| 3 | `pantalon-acampanado` | `tendencia-01/3` | Muslo y rodilla ajustados, campana amplia en el bajo. |
| 4 | `jeans-ancho` | `tendencia-01/4` | Pierna ancha recta desde la cadera y tiro alto. |
| 5 | `pantalon-baggy` | `tendencia-01/5` | Baggy holgado de tiro caído y pernera amplia; corregida la curvatura excesiva de la primera versión. |
| 6 | `pantalon-barrel` | `tendencia-01/6` | Costados abombados en rodilla y cierre gradual al tobillo; sin paneles inventados. |
| 7 | `pantalon-cargo` | `tendencia-01/7` | Dos bolsillos de fuelle con cartera en muslos y silueta holgada. |

Prompt original:

```text
Create a SQUARE 1254x1254 photorealistic apparel product photography contact sheet for Hilvana sewing patterns. Invisible mathematically exact 3 by 3 grid, each cell occupies one third of canvas width and height. All objects fully centered inside their cells, minimum 9 percent empty margin on each cell edge; no objects crossing into other cells. Every cell has the SAME smooth warm ivory seamless background #F5F1E7, no visible borders or tiles. Soft diffused daylight, beautiful tactile real fabric and delicate shadows. Front-facing flat lay with gentle natural volume. Premium professional e-commerce garment PHOTOGRAPHY, not drawings. NO people, body parts, mannequin, hangers, branding, labels, typography, captions, numbers, accessories or props. Garments entirely visible with sleeves and hems comfortably inside cells. Construction must follow descriptions exactly. All unoccupied cells must be completely empty ivory. There are EXACTLY EIGHT adult pairs of trousers, in the first eight row-major cells; BOTTOM RIGHT is EMPTY. Each pair has waistband with one front button and belt loops, zipped front fly, two curved front jeans pockets and little coin pocket unless explicitly cargo; back pockets are not visible from front. All eight silhouettes must be clearly distinct. TOP LEFT: classic medium indigo five-pocket straight jeans, comfortable regular thigh and straight leg from knee to ankle. TOP CENTER: deep indigo skinny five-pocket jeans in stretch denim, close narrow thighs, narrow knee and tight narrow ankle opening. TOP RIGHT: light blue mom jeans, visibly high rise, comfortably full rounded hips, tapered straight legs narrowing toward ankles. MIDDLE LEFT: rich blue high-rise flared jeans, fitted thighs and knees then smoothly opening to broad bell hems. MIDDLE CENTER: washed pale indigo high-rise wide-leg jeans, wide straight legs from hip through full-length hems, not tapered. MIDDLE RIGHT: charcoal-grey baggy jeans, very loose hips with low dropped crotch and loose broad legs only slightly tapering at hem, relaxed dropped rise distinct from high-rise wide leg. BOTTOM LEFT: warm cream denim barrel jeans, high rise, prominent curved outer leg bowing widest around the knee, strongly tapered narrow ankle, matching curved inner leg seam; no darts or added horizontal knee panels. BOTTOM CENTER: muted olive loose baggy cargo trousers, classic waistband and front fly, front hip pockets, one rectangular bellows cargo pocket with flap on each outer thigh, no dangling straps. Both cargo pockets visibly presented slightly toward camera. Bottom right completely empty background.
```

Prompt de corrección aplicado al PNG inicial:

```text
Edit this existing photorealistic contact sheet with a precise single-object correction. Preserve canvas, grid positions, ivory background, lighting, all garments and every detail EXCEPT the grey BAGGY JEANS at MIDDLE RIGHT. The grey baggy legs currently have too much barrel curvature. Make the grey jeans have VERY LOOSE broad straight legs and a slightly dropped crotch, the outer seams almost straight from hip down, the broad hem nearly 90 percent of the width at the knee. A large relaxed straight baggy silhouette, NOT curved barrel legs, NOT tapered joggers, NO elastic hems. Preserve charcoal denim, five-pocket waistband and front fly, stitching and entire garment within its original middle-right cell. Do not alter the cream barrel jeans bottom-left or any other object.
```

## realistas-tendencias-02

PNG inicial: `/workspace/generated_images/exec-34a02379-bfb7-4c4a-9d16-adbc57194fa2.png`.
PNG final: `/workspace/generated_images/exec-6e39ea43-0a1b-4c71-b636-a3362cb7ea0f.png`.
SHA-256 PNG final: `287922afec4268c2d4d183cb30322aef23442ce9d7621ba7845f302b88b276c6`.

| Celda (base 0) | Receta | Fuente sustituida | Revisión |
| ---: | --- | --- | --- |
| 0 | `bomber-clasica` | `tendencia-02/2` | Largo a cadera, cuello/puños/banda de rib, cierre y dos vivos; sin bolsillo de manga. |
| 1 | `bomber-corta` | `tendencia-03/1` | Versión corta a cintura claramente distinta, conserva rib, cierre y vivos. |
| 2 | `sobrecamisa-leñadora` | `tendencia-02/0` | Dos bolsillos de pecho abiertos, sin carteras; cuello con pie y mangas con dobladillo sencillo. Se corrigió visibilidad de bolsillos. |
| 3 | `sobrecamisa-corta` | `tendencia-03/0` | Torso corto, dos bolsillos de pecho abiertos y manga larga con dobladillo, sin puño añadido. |
| 4 | `camiseta-oversize` | `tendencia-01/8` | Manga corta y hombro caído, cuello redondo de rib; sin bolsillos. |
| 5 | `camiseta-oversize-larga` | `tendencia-03/2` | Manga larga y hombro caído; dobladillos lisos sin puños ni banda añadidos. |
| 6 | `chaqueta-trabajo` | `tendencia-02/1` | Un bolsillo de pecho y dos bajos grandes; botones, cuello y dobladillos simples. |

Prompt original:

```text
Create a SQUARE 1254x1254 photorealistic apparel product photography contact sheet for Hilvana sewing patterns. Invisible mathematically exact 3 by 3 grid, each cell occupies one third of canvas width and height. All objects fully centered inside their cells, minimum 9 percent empty margin on each cell edge; no objects crossing into other cells. Every cell has the SAME smooth warm ivory seamless background #F5F1E7, no visible borders or tiles. Soft diffused daylight, beautiful tactile real fabric and delicate shadows. Front-facing flat lay with gentle natural volume. Premium professional e-commerce garment PHOTOGRAPHY, not drawings. NO people, body parts, mannequin, hangers, branding, labels, typography, captions, numbers, accessories or props. Garments entirely visible with sleeves and hems comfortably inside cells. Construction must follow descriptions exactly. All unoccupied cells must be completely empty ivory. There are EXACTLY SEVEN adult tops in the first seven row-major cells; BOTTOM CENTER and BOTTOM RIGHT are EMPTY. TOP LEFT: muted moss-green classic hip-length bomber jacket, dropped shoulders, long loose sleeves, low rib-knit collar, rib-knit cuffs and rib-knit lower band, complete separating center zipper, two angled welt pockets, subtle realistic nylon sheen, NO sleeve zipper pocket. TOP CENTER: muted dusty-lilac cropped bomber jacket with same rib-knit low collar, rib cuffs, lower rib band, zipper and two welt pockets, short boxy torso ending at natural waist and visibly longer sleeves; NO sleeve zipper pocket. TOP RIGHT: full-length oversized plaid overshirt in soft muted navy, ivory and rust woven flannel, dropped shoulders, pointed collar and collar stand, front button placket, exactly TWO rectangular open-top chest patch pockets WITHOUT flaps or buttons, full long sleeves finished by SIMPLE FOLDED HEMS, absolutely NO separate wrist cuffs, plain straight lower hem. MIDDLE LEFT: cropped waist-length work overshirt of muted ochre cotton twill, dropped shoulders, pointed collar and collar stand, button front, exactly TWO open-top square chest patch pockets WITHOUT flaps or buttons, full long sleeves with SIMPLE TURNED HEMS not cuffs, boxy cropped body and plain straight hem. MIDDLE CENTER: ivory oversized boxy cotton jersey T-shirt, SHORT wide dropped-shoulder sleeves, narrow round rib neckband, plain sleeve and lower hems, NO pockets, NO rib wrist cuffs or waist band. MIDDLE RIGHT: dusty-blue oversized boxy cotton jersey T-shirt, LONG loose dropped-shoulder sleeves ending at wrist with plain folded hems and NO rib wrist cuffs, narrow round rib neckband, plain lower hem, NO pockets or waist band. BOTTOM LEFT: hip-length indigo cotton canvas chore jacket, oversized dropped shoulders, pointed collar with collar stand, front buttons, exactly ONE open-top rectangular patch pocket at wearer's left chest plus TWO large lower rectangular patch pockets, long sleeves with simple turned hems and NO separate wrist cuffs, straight plain lower hem. Empty remaining bottom cells.
```

Prompt de corrección aplicado al PNG inicial:

```text
Edit this existing photorealistic clothing contact sheet precisely, preserving canvas, grid, all positions, fabrics, colours and lighting. ONLY alter TOP RIGHT plaid overshirt: ensure it has EXACTLY TWO clearly visible front chest PATCH POCKETS, each a rectangle with an OPEN HORIZONTAL TOP edge and gently squared corners, placed symmetrically one on each side of the button placket. Pockets use same plaid fabric with matching plaid but distinct realistic perimeter topstitching and tiny shadow along pocket edges to make them unmistakable. No flaps, no pocket buttons, no lower pockets. Keep plain hemmed sleeve ends, no separate wrist cuffs. All other six garments remain identical. Do not alter the cropped ochre overshirt or navy chore jacket.
```

## realistas-tendencias-03

PNG inicial: `/workspace/generated_images/exec-a1be5081-f801-45fd-b28a-14cab7f6b0fe.png`.
PNG final: `/workspace/generated_images/exec-a1be5081-f801-45fd-b28a-14cab7f6b0fe.png`.
SHA-256 PNG final: `d34945357e32afc3a79edee60ce5f95fcdcc792f28c3d8b53fd86bef7e596851`.

| Celda (base 0) | Receta | Fuente sustituida | Revisión |
| ---: | --- | --- | --- |
| 0 | `falda-circular` | `ninas-01/4` | Falda circular amplia, pretina elástica doblada, sin pisos ni cierre. |
| 1 | `falda-tul` | `ninas-01/2` | Capas translúcidas de tul sobre forro y pretina elástica; sin adornos añadidos. |
| 2 | `falda-olanes` | `ninas-01/3` | Tres pisos de altura creciente y frunces, jareta integrada arriba. |
| 3 | `sombrero-pescador` | `tendencia-02/5` | Copa oval, banda cónica y ala pespunteada; sin barbiquejo. La receta bebé recibe su imagen específica desde el lote infantil. |

Prompt original:

```text
Create a SQUARE 1254x1254 photorealistic apparel product photography contact sheet for Hilvana sewing patterns. Invisible mathematically exact 3 by 3 grid, each cell occupies one third of canvas width and height. All objects fully centered inside their cells, minimum 9 percent empty margin on each cell edge; no objects crossing into other cells. Every cell has the SAME smooth warm ivory seamless background #F5F1E7, no visible borders or tiles. Soft diffused daylight, beautiful tactile real fabric and delicate shadows. Front-facing flat lay with gentle natural volume. Premium professional e-commerce garment PHOTOGRAPHY, not drawings. NO people, body parts, mannequin, hangers, branding, labels, typography, captions, numbers, accessories or props. Garments entirely visible with sleeves and hems comfortably inside cells. Construction must follow descriptions exactly. All unoccupied cells must be completely empty ivory. There are EXACTLY FOUR products in the first four row-major cells, all other five cells completely empty. TOP LEFT: sage-green cotton full-circle skirt with folded elastic waistband, many soft voluminous folds and broad round flared hem, knee-length, one continuous skirt with NO horizontal tiers, NO buttons, NO belt, NO pockets. TOP CENTER: dusty-rose soft tulle tutu skirt, three translucent gathered tulle layers hanging from one smooth folded elastic waistband, tonal opaque lining underneath, tender fine mesh texture, NO horizontal tiers, NO bow or decoration. TOP RIGHT: ochre cotton three-tier gathered skirt, exactly THREE horizontal tiers of increasing height top to bottom, visible gathered joins at 28 percent and 61 percent of total length, elastic casing integrated into top tier, no separate applied waistband, softly flared, NO lace, bow or decorations. MIDDLE LEFT: warm sand cotton canvas reversible bucket hat, slightly three-quarter frontal view showing shallow oval crown, conical side band and downward sloping brim, concentric topstitching on brim, NO chin strap, ties, eyelets, logo or embellishments. All other cells EMPTY ivory background. Skirts are whole garments laid flat with gentle natural volume, no bodies or mannequins.
```

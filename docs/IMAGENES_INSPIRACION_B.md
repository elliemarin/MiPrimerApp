# Imágenes de inspiración B — 2026-11-01

33 imágenes originales generadas con `image_gen`, distribuidas en cuatro láminas WebP locales. Completan los diseños de inspiración de chaquetas, capas, monos, punto, accesorios y hogar que carecían de foto realista. Mantienen el fondo marfil, la textura de tela y la luz suave de `estilos-hoodies-01.webp` y `accesorios-01.webp`.

Estas imágenes son ilustraciones realistas, no fotografías de muestras confeccionadas. Los 33 diseños siguen siendo inspiraciones con patrón pendiente. No se cambian disponibilidad, generadores, medidas, materiales permitidos ni geometría. Los objetos usados para identificar una funda, portacubiertos u organizador de agujas son únicamente referencias visuales.

## Archivos y procedencia

`src/data/inspirationBImages.ts` exporta `INSPIRATION_B_SHEETS`, `INSPIRATION_B_IMAGES` y `INSPIRATION_B_BOUNDS`. El orden es de izquierda a derecha y de arriba abajo, con índices de celda desde cero. La última lámina tiene solo seis artículos en las dos primeras filas; las tres celdas inferiores están vacías y no se registran.

| Lámina | Bytes | PNG original | SHA-256 WebP |
| --- | ---: | --- | --- |
| realistas-inspiracion-b-01.webp | 124078 | exec-831ca010-10de-480c-8408-216c09139289.png | `9ab30e216558fba95437f58f0eafee3baa08719b6e1569703f92b3b71503c71a` |
| realistas-inspiracion-b-02.webp | 133400 | exec-0bb68be0-a398-497f-bc89-f6d971b9c46a.png | `d2c93a3be23ca4d4c0ca52e1f4c7a0984c3c16a614182ca84a322c9a37281b07` |
| realistas-inspiracion-b-03.webp | 173776 | exec-4efb5e18-f53f-42a8-bb90-c7992440af5e.png | `d3e278f7b3f2fe495669337cfe4756f02e478b41d567f4d6456f7700428ef59e` |
| realistas-inspiracion-b-04.webp | 91258 | exec-53e64aed-0dfa-4748-809d-8e98f368e79f.png | `9ca18be0f091e9ce6e767aa3b200549743584605c77c80563761f9a712ab4ee1` |

Total: 522,512 bytes. Los cuatro archivos miden 1254 × 1254 px y cada uno pesa menos de 200 KB.

Los PNG originales permanecen en `/workspace/generated_images/` durante la sesión. La aplicación solo necesita los WebP incluidos en GitHub. Conversión exclusiva de formato, sin dibujar ni sustituir fotografías con código:

```sh
ffmpeg -i ORIGINAL.png -c:v libwebp -quality 82 -compression_level 6 DESTINO.webp
```

## Revisión visual

Se inspeccionaron los 33 objetos de las cuatro láminas generadas, comprobando el orden, el producto completo, la tela realista y las diferencias de construcción de cada diseño. Se contrastaron nombres, descripciones y `FlatSpec` de las 33 entradas originales antes de generar imágenes.

- Chaquetas: cierre diagonal biker, cuatro bolsillos safari, bandas varsity, medio cierre del anorak, parka larga, bolero de manga tres cuartos, capa circular sin capucha, capa con capucha y poncho con dos bolsillos.
- Monos: distinguir manga corta/larga, envolvente, corto, baggy y palazzo; los dos petos muestran tirantes y piernas completas. El suéter holgado ocupa la última celda de esta lámina.
- Punto y accesorios: cuello alto, suéter corto, chaleco V, túnica larga y camisa boxy; exactamente nueve bolsillos visibles en el organizador de pared; corbata, pajarita y par de mitones completos.
- Hogar: pantuflas, portacubiertos y organizador de agujas distinguibles; funda sobre silla simple para expresar volumen; cesto alto para ropa y cesto bajo con borde doblado para pan. Tercera fila vacía.

Se ajustaron únicamente metadatos de recorte: filas 382/782 en la primera lámina; 416/830 en la segunda; filas 406/819 y columnas 410/847 en la tercera; filas 420/854 en la cuarta. Estos límites conservan tirantes, capuchas, mangas y cintas sin mostrar elementos vecinos. No se modificaron los píxeles generados aparte de la compresión WebP.

La validación local comprueba cuatro WebP decodificables de 1254 px, presupuesto de tamaño, 33 IDs únicos y 33 recortes dentro del lienzo. También se decodificaron las 33 imágenes en Chromium y se revisaron visualmente las cuatro capturas de tarjetas con estos recortes, guardadas en `/tmp/hilvana-inspiration-b-crops/`. Las pruebas globales, compilación y recorrido móvil se documentan con la integración general del catálogo.

## Prompts y correspondencia

### realistas-inspiracion-b-01

1. `chaqueta-biker` — Chaqueta biker asimétrica.
2. `chaqueta-safari` — Chaqueta safari de bolsillos.
3. `chaqueta-varsity` — Chaqueta universitaria varsity.
4. `anorak-canguro` — Anorak de medio cierre.
5. `parka-capucha` — Parka larga con jareta.
6. `bolero-corto` — Bolero corto de manga tres cuartos.
7. `capa-circular` — Capa circular con abertura.
8. `capa-capucha` — Capa con capucha.
9. `poncho-capucha-inspiracion` — Poncho con capucha y bolsillos.

Prompt original:

```text
Create a SQUARE 1254x1254 high-end photorealistic textile product photography contact sheet for the Hilvana sewing catalog. Invisible mathematically even 3-by-3 grid: each cell 418x418 px, every object entirely inside its own cell with at least 8 percent clear ivory padding on all four sides; nothing crosses cell boundaries. Warm ivory seamless background #F5F1E7, soft diffuse daylight, delicate natural shadows, tangible fabric fibers and realistic sewing details. Complete products, front view for clothing laid flat with gentle natural volume, no models, humans, hands, mannequins, hangers, captions, text, logos, letters, numbers, borders or watermarks. Not drawings or vector graphics. All objects must be completely visible including straps, sleeves and hems. Maintain consistent refined e-commerce photography and subdued textile color palette. Exactly NINE separate garments, row-major order. TOP LEFT: tobacco brown supple leather-look biker jacket, long sleeves, cropped hip length, wide notched lapels and visibly diagonal asymmetric silver front zipper, two subtle zip welt pockets. TOP CENTER: khaki cotton-twill safari jacket, long sleeves, classic shirt collar, central buttons, four symmetrical patch pockets with flaps, slightly longer below-hip length, no belt. TOP RIGHT: forest-green wool varsity jacket with cream sleeves, short ribbed stand collar, striped ribbing at cuffs and lower hem, front snap buttons, no lettering or patches. MIDDLE LEFT: ochre hooded pullover anorak, loose long sleeves, central HALF-length zipper from neckline to chest only, one large kangaroo pocket below it, woven windbreaker fabric. MIDDLE CENTER: dusty olive long hooded parka, full central zipper, waist drawcord casing, two large lower patch pockets, thigh length, long sleeves. MIDDLE RIGHT: dusty rose very cropped open-front bolero with rounded neckline and THREE-QUARTER sleeves, softly curved front lower edges, no fastening, no pockets, visibly much shorter torso than other jackets. BOTTOM LEFT: deep navy wool circular cape, round neckline, central front slit and small button fastening, gently spread semicircular hem, NO hood, NO sleeves. BOTTOM CENTER: burgundy wool long hooded cape, front opening with simple buttons, broadly curved hem, no sleeves or pockets. BOTTOM RIGHT: oatmeal textured wool pullover PONCHO, hood at top center, broad rectangular shoulder drape and open side edges, two distinct rectangular patch pockets on lower front, no front opening. Keep silhouettes and construction unmistakably distinct. Nine garments only.
```

### realistas-inspiracion-b-02

1. `mono-camisero` — Mono enterizo camisero.
2. `mono-mecanico` — Mono de trabajo de manga larga.
3. `mono-palazzo` — Mono enterizo palazzo sin mangas.
4. `mono-cruzado` — Mono cruzado de pierna ancha.
5. `playsuit-camisero` — Mono corto camisero · playsuit.
6. `mono-baggy` — Mono enterizo baggy.
7. `peto-bermuda` — Peto con bermuda.
8. `peto-palazzo` — Peto de pantalón palazzo.
9. `sueter-oversize` — Suéter holgado de cuello redondo.

Prompt original:

```text
Create a SQUARE 1254x1254 high-end photorealistic textile product photography contact sheet for the Hilvana sewing catalog. Invisible mathematically even 3-by-3 grid: each cell 418x418 px, every object entirely inside its own cell with at least 8 percent clear ivory padding on all four sides; nothing crosses cell boundaries. Warm ivory seamless background #F5F1E7, soft diffuse daylight, delicate natural shadows, tangible fabric fibers and realistic sewing details. Complete products, front view for clothing laid flat with gentle natural volume, no models, humans, hands, mannequins, hangers, captions, text, logos, letters, numbers, borders or watermarks. Not drawings or vector graphics. All objects must be completely visible including straps, sleeves and hems. Maintain consistent refined e-commerce photography and subdued textile color palette. Exactly NINE separate garments, row-major order. TOP LEFT: sage linen full-length shirt jumpsuit, short sleeves, shirt collar, front buttons, natural waist seam, straight trousers and side pockets. TOP CENTER: indigo cotton-twill mechanic coverall, long sleeves, shirt collar, full center front zip, long straight cargo legs, workwear pockets, unmistakably one-piece torso joined to pants. TOP RIGHT: plum sleeveless palazzo jumpsuit, broad shoulder straps and simple square neckline, defined waist seam, exceptionally wide flowing full-length legs, no shirt collar or sleeves. MIDDLE LEFT: muted terracotta wrap-front jumpsuit, short sleeves, diagonal overlapping V-neck bodice, defined waist and wide full-length trouser legs. MIDDLE CENTER: muted blue linen short shirt playsuit, short sleeves, shirt collar, front buttons, waist seam, SHORT legs ending upper thigh, no long trouser legs. MIDDLE RIGHT: charcoal baggy sleeveless jumpsuit, simple round neck, relaxed bodice and elasticated waist, voluminous low-crotch trousers tapering at the ankles, no shirt collar. BOTTOM LEFT: stonewashed medium-blue denim bib overalls with adjustable shoulder straps and metal buckles, chest bib with patch pocket, attached BERMUDA shorts ending just above knee and two front patch pockets, no shirt beneath. BOTTOM CENTER: cinnamon linen bib overalls with shoulder straps, broad rectangular chest bib, extremely wide full-length PALAZZO trousers, side pockets, no shirt beneath. BOTTOM RIGHT: oatmeal chunky-knit OVERSIZED crewneck sweater, very roomy long body and dropped shoulders, long sleeves, ribbed wrist cuffs, clearly visible yarn stitches, no hood. The eight jumpsuits must show the complete single joined garment with both legs visible and neatly spread. Nine items only.
```

### realistas-inspiracion-b-03

1. `sueter-tortuga` — Suéter de cuello alto.
2. `sueter-corto` — Suéter corto y ancho.
3. `chaleco-punto-v` — Chaleco de punto con escote V.
4. `tunica-suelta` — Túnica suelta de escote V.
5. `camisa-boxy` — Camisa boxy corta y amplia.
6. `organizador-pared` — Organizador de pared con nueve bolsillos.
7. `corbata-clasica` — Corbata clásica.
8. `pajarita` — Moño o pajarita.
9. `mitones-polar` — Mitones de polar.

Prompt original:

```text
Create a SQUARE 1254x1254 high-end photorealistic textile product photography contact sheet for the Hilvana sewing catalog. Invisible mathematically even 3-by-3 grid: each cell 418x418 px, every object entirely inside its own cell with at least 8 percent clear ivory padding on all four sides; nothing crosses cell boundaries. Warm ivory seamless background #F5F1E7, soft diffuse daylight, delicate natural shadows, tangible fabric fibers and realistic sewing details. Complete products, front view for clothing laid flat with gentle natural volume, no models, humans, hands, mannequins, hangers, captions, text, logos, letters, numbers, borders or watermarks. Not drawings or vector graphics. All objects must be completely visible including straps, sleeves and hems. Maintain consistent refined e-commerce photography and subdued textile color palette. Exactly NINE separate products, row-major order. TOP LEFT: dark forest-green fine-knit turtleneck sweater with a tall softly folded roll neck, long sleeves, ribbed cuffs, regular hip length, no decoration. TOP CENTER: dusty lilac chunky-knit cropped boxy sweater, crew neckline, wide torso, long sleeves with ribbed wrist cuffs, short body ending at waist, no hood. TOP RIGHT: mustard knitted sleeveless sweater vest with deep V neckline, broad shoulders and ribbed bottom band, hip length, no buttons or shirt beneath. MIDDLE LEFT: dusty rose lightweight woven linen loose tunic, V neckline, short sleeves, long straight body to mid-thigh, plain front with no fastening, relaxed generous fit. MIDDLE CENTER: muted sky-blue linen boxy cropped shirt, classic shirt collar, short wide sleeves, center front buttons, one chest patch pocket, broad short rectangular torso. MIDDLE RIGHT: natural oatmeal cotton-canvas WALL ORGANIZER, full vertical rectangle with two simple top hanging loops, EXACTLY NINE large empty rectangular patch pockets arranged in three rows and three columns, nine pockets visibly countable, soft moss lining inside their upper openings, no rod and no objects in pockets. BOTTOM LEFT: one deep navy woven classic necktie, narrow neck loop gently curved behind a finished traditional knot at top, one complete broad pointed tie blade extending down, subtle fabric weave, no shirt or person. BOTTOM CENTER: one burgundy linen bow tie, two symmetrical double-folded bow wings gathered by a neat narrow center band, small matching neck strap tucked behind, no other garment. BOTTOM RIGHT: one matching pair of softly textured dusty blue polar-fleece mittens, enclosed fingers and separate thumb shape, simple wrist cuffs, pair neatly side by side. Nine products only.
```

### realistas-inspiracion-b-04

1. `pantuflas` — Pantuflas de tela.
2. `portacubiertos-enrollable` — Portacubiertos enrollable.
3. `organizador-agujas` — Organizador de agujas enrollable.
4. `funda-silla` — Funda de silla para personalizar.
5. `cesto-ropa` — Cesto textil alto.
6. `cesto-pan` — Cesto de pan con borde doblado.

Prompt original:

```text
Create a SQUARE 1254x1254 high-end photorealistic textile product photography contact sheet for the Hilvana sewing catalog. Invisible mathematically even 3-by-3 grid: each cell 418x418 px, every object entirely inside its own cell with at least 8 percent clear ivory padding on all four sides; nothing crosses cell boundaries. Warm ivory seamless background #F5F1E7, soft diffuse daylight, delicate natural shadows, tangible fabric fibers and realistic sewing details. Complete products, front view for clothing laid flat with gentle natural volume, no models, humans, hands, mannequins, hangers, captions, text, logos, letters, numbers, borders or watermarks. Not drawings or vector graphics. All objects must be completely visible including straps, sleeves and hems. Maintain consistent refined e-commerce photography and subdued textile color palette. Exactly SIX products in ONLY THE FIRST TWO ROWS, and leave THE ENTIRE BOTTOM THIRD COMPLETELY EMPTY solid ivory. This is a 3x3 grid with cells 6, 7, 8 empty, NOT a two-row stretched layout. TOP LEFT in first 418px square: one matching pair of quilted dusty rose textile house slippers, low rounded closed toes, cream soft lining, pair at a gentle three-quarter angle with their openings and soles visible, no feet. TOP CENTER: an unrolled natural oatmeal linen reusable cutlery holder, a compact horizontal rectangular cloth with four slim stitched storage slots, one fork, one spoon and one blunt table knife tucked partly inside so the textile function is clear, fabric flap opened upward and narrow sage tie ribbons visible, all complete within first-row center cell. TOP RIGHT: an unrolled dusty blue cotton knitting-needle organizer, wide horizontal cloth rectangle with a row of many narrow vertically stitched sleeves, several wooden knitting needles of different lengths tucked into the sleeves, open protective flap above, fabric ties at one edge, distinguish clearly from cutlery. MIDDLE LEFT in second-row first 418px square: a warm oatmeal linen SLIPCOVER fitted over a simple armless straight-backed dining chair, plain rectangular back and fitted seat, loose full textile skirt falling almost to floor, front three-quarter view showing shape and all four corners, no surrounding furniture. MIDDLE CENTER: one tall cylindrical slate-blue canvas LAUNDRY HAMPER, flexible fabric sides, two short fabric loop handles at rim, open round top with natural beige lining visible, tall height approximately one and a half times its diameter, no laundry inside. MIDDLE RIGHT: one LOW shallow rust-colored fabric BREAD BASKET, softly rounded square base, broad outward-folded cream cuff around entire upper edge, open empty interior, height less than half width, angled slightly from above so folded rim and fabric interior are clear. Entire bottom row completely empty ivory, no seventh item. No extraneous props. Make every textile object realistic, sewable, complete and recognizable.
```

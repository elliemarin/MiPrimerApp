# Imágenes de la ampliación por estilos — 2026-11-01

90 imágenes originales generadas con `image_gen`: 69 construcciones nuevas y 21 estilos antes reunidos en otra tarjeta. Son ilustraciones realistas del diseño, no fotografías de muestras confeccionadas ni una simulación de caída. La geometría, piezas, telas compatibles y medidas proceden siempre del motor de patronaje.

Se conserva el estilo visual de Hilvana: fondo marfil, producto completo, iluminación suave y textura textil. Los materiales y colores de portada son ilustrativos; el usuario los cambia en Acabados. No hay servicio de generación ni credenciales necesarias para mostrar las imágenes.

## Archivos y correspondencia

Los diez WebP miden 1254 × 1254 px. El mapa estable por celda está en `src/data/styleCatalogImages.ts`: `STYLE_CATALOG_IMAGE_SHEETS`, `STYLE_CATALOG_IMAGES` y `STYLE_CATALOG_IMAGE_BOUNDS`. Las filas tienen recortes revisados para conservar prendas completas y excluir vecinos. La prioridad de estas imágenes sobre variantes vectoriales la resuelve `catalogImageFor`.

| Lámina | Bytes | PNG original final | SHA-256 WebP |
| --- | ---: | --- | --- |
| estilos-hoodies-01.webp | 93440 | exec-64c0a3f5-7f02-487f-979b-7bec008dc8f5.png | `5daa1797b413088990380b68c0aed460b46b2de2c24026405b142a08a044e837` |
| estilos-street-02.webp | 110680 | exec-17281054-e30a-4057-8ed2-73701f9ddd78.png | `754a6f1091533c017efa5710166cb665dd1945dcb887f04812ea500b7914a0d4` |
| estilos-street-03.webp | 105814 | exec-cb7826f9-ae2e-4073-b130-bf02bcd096c4.png | `a942e5dd947727ee4a3bc73237fe0d94a8a04b64e2c88294ceea2571921540fb` |
| estilos-vestidos-01.webp | 85500 | exec-afc4c4fe-ce30-4d48-b0bd-f594c23b6670.png | `05c1d7f1f56a627e4441db2b34db208a236c79df2d50b15cfca2ddb4c00e514b` |
| estilos-vestidos-02.webp | 83284 | exec-72db5955-8629-402e-9fc9-ab2a80a4aa1e.png | `4d38d88daeb0ded3cb163f023dd357002bff6f91ec11b2c4bcab0d9f6169f5f4` |
| estilos-vestidos-03.webp | 94518 | exec-cf578f91-4af1-4ccc-a5a8-f12e3c73e23b.png | `7ca3edab41d05ec5aa1b6fb4a16dd147d09c7b4a61e9ab54467c827bb32a1770` |
| estilos-bebe-01.webp | 95028 | exec-494096d5-6342-4cb1-b8f5-9ba42da29b4b.png | `fa8b8f1932bb3637d9b45f753ff829b9b0eaf09917d08ffa094a53d23fcbb09f` |
| estilos-bebe-02.webp | 143528 | exec-58c6cdba-a67d-45db-8b99-96c76bc60b82.png | `6f9e23d2f5aee2a00ed5e1b8bf9d841dc9a92790ef0301e071283930bcd1b42c` |
| estilos-infantil-01.webp | 141682 | exec-f01f895e-a2d4-41c7-a144-5b32a5535346.png | `d9ef9eda6b3004b80e97d359dc5cc597e848607be8c3d632a06935c7285efe8a` |
| estilos-infantil-02.webp | 143736 | exec-08376a35-d098-4978-abd5-5e0538693924.png | `299c5bca5886833b4bb6392dd3fae01c533143ed6302b060b3447d214d1d04ad` |

Peso total: 1,097,210 bytes.

Los PNG originales se conservaron en `/workspace/generated_images/` durante la sesión. GitHub contiene los WebP finales; no depende de esa carpeta temporal. Conversión exclusivamente de formato: `ffmpeg -i ORIGINAL.png -c:v libwebp -quality 82 -compression_level 6 DESTINO.webp`. No se pintaron ni inventaron fotografías con código.

## Revisión

Se revisaron las diez láminas y las 90 tarjetas en Chromium a 390 px. `tests/browser/style_photos_smoke.py` verifica presencia única, carga real de los 90 recursos y dimensiones; guarda diez capturas con los recortes de tarjeta. `tests/catalog-images.test.ts` comprueba mapas, archivos y presupuesto de tamaño.

Durante la revisión se regeneraron las mangas lisas y dobladillos de hoodies, la división de seis paneles por pierna del pantalón patchwork y las construcciones de bebé que la primera generación había interpretado como bolsillos adicionales, mangas raglán o chaleco. La versión final conserva el poncho rectangular abierto, escote cuadrado, babero con mangas montadas y petos sin bolsillos de pecho. Las imágenes no certifican ajuste ni confección física.

## Prompts y orden de celdas

### estilos-hoodies-01

Orden de izquierda a derecha y de arriba abajo:

1. `street-hoodie-cierre`
2. `street-hoodie-chaleco`
3. `street-hoodie-canguro`
4. `street-hoodie-globo`
5. `street-hoodie-peplum`
6. `street-hoodie-diagonal`
7. `street-hoodie-bandas`
8. `street-hoodie-canesu`
9. `street-hoodie-panel-central`

Prompt original:

```text
Create a SQUARE, photorealistic apparel product photography contact sheet for Hilvana sewing patterns. Exactly NINE distinct complete adult hoodies arranged in an invisible, mathematically even 3 by 3 grid: three equal rows and three equal columns. Each garment is centered entirely inside its square cell, with at least 7% empty padding on every side, nothing crossing cell boundaries. Warm ivory seamless background #F5F1E7, softly diffused daylight, beautiful tangible French terry cotton texture, subtle cast shadows. Front view, garments laid flat with natural volume and sleeves angled gently down; no people, hands, mannequins, hangers, labels, letters, logos, numbers, captions, borders, or props. High-end realistic e-commerce clothing photography, not drawings or technical diagrams. All garments have hoods, no drawstrings anywhere. Follow this EXACT row-major sequence and construction: TOP LEFT: muted blue full-length zip-front hoodie with two-piece hood, relaxed long sleeves and plain hem, NO pockets. TOP CENTER: sage sleeveless pullover hoodie vest, wide dropped-shoulder arm openings, plain body, NO pockets. TOP RIGHT: ochre long-sleeve pullover hoodie with one large kangaroo front pouch pocket and clear slanted hand openings. MIDDLE LEFT: dusty lilac hoodie with distinctly full balloon sleeves gathered into narrow rib-knit wrist cuffs, loose torso with plain turned hem. MIDDLE CENTER: rose hoodie with long sleeves, cropped bodice joined at natural waist to a visibly gathered deep peplum ruffle around lower body, no pockets. MIDDLE RIGHT: diagonally color-blocked hoodie, cream upper section and deep indigo lower section joined by one diagonal seam from left underarm to right lower hem, long sleeves. BOTTOM LEFT: hoodie with THREE distinct sewn horizontal body bands in muted navy, blue-grey and cream, long sleeves. BOTTOM CENTER: hoodie with high horizontal yoke seam at armpit height, oatmeal upper chest and dusty olive lower body, long sleeves. BOTTOM RIGHT: hoodie with one full-length vertical central body panel occupying one third width, ivory center panel and indigo side body panels, long sleeves. The characteristic seams, sleeve volume, pockets and closures must be visibly correct. Each design should look sewable and beautifully photographed. Square canvas.
```

Prompt de corrección o regeneración final:

```text
Edit this 3x3 hoodie catalog contact sheet precisely. Preserve all nine garments, their order, color, pose, framing, shadows, background and 1254x1254 canvas. Correct construction only: (1) BOTTOM LEFT three-horizontal-band hoodie: the THREE colored bands exist ONLY on the TORSO; make BOTH sleeves entirely solid NAVY from shoulder to wrist, absolutely no horizontal sleeve colorblocking or sleeve division seams. (2) BOTTOM CENTER yoke hoodie: keep cream yoke ONLY on torso and make BOTH sleeves solid SAGE from shoulder to wrist, without cream sleeve caps. (3) MIDDLE RIGHT diagonal hoodie: diagonal seam ONLY on torso, make BOTH sleeves entirely IVORY from shoulder to wrist. (4) On every hoodie except the lilac balloon sleeve hoodie at MIDDLE LEFT, eliminate separate rib-knit wrist cuffs: finish sleeves with simple turned hems, open fairly wide straight wrist ends, no cuff seams or gathering. On all nine remove separate lower rib-knit waistbands; use plain turned hems except keep pink peplum. MIDDLE LEFT lilac balloon sleeves MUST keep gathered ribbed wrist cuffs, they are correct. No other alterations. All garments remain complete inside original cells.
```

### estilos-street-02

Orden de izquierda a derecha y de arriba abajo:

1. `street-hoodie-patchwork`
2. `street-hoodie-chaleco-cierre`
3. `street-hoodie-poncho`
4. `street-pantalon-bootcut`
5. `street-pantalon-setentas`
6. `street-pantalon-palazzo`
7. `street-pantalon-culotte`
8. `street-pantalon-paperbag`
9. `street-pantalon-carpintero`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: TOP LEFT: adult pullover hoodie with a body divided into four visibly sewn square panels in a two by two arrangement, harmonious muted navy, slate, cream and sage blocks, long sleeves, no pockets or drawstrings. TOP CENTER: charcoal grey sleeveless hooded vest with full-length front zipper, wide armholes, no pockets or drawstrings. TOP RIGHT: oatmeal pullover hooded poncho sweatshirt, extremely wide boxy straight torso, wide short dropped-shoulder sleeves, no pockets or drawstrings. MIDDLE LEFT: high-waisted indigo denim bootcut jeans with five-pocket construction, regular thigh and knee, subtle flare below knee for boots. MIDDLE CENTER: seventies high-waisted denim bell-bottom jeans, fitted thigh and knee, dramatically wider flared hems, front fly and classic five pockets. MIDDLE RIGHT: warm sand high-waisted tailored palazzo trousers, very broad loose straight legs to floor, front fly, smooth flat front WITHOUT pockets. BOTTOM LEFT: rust linen culottes, extremely wide flared legs ending mid-calf, plain front without pockets, front fly. BOTTOM CENTER: sage wide-leg paperbag trousers with gathered elastic waist and ruffle rising ABOVE the casing, matching cloth tie belt visibly tied at front. BOTTOM RIGHT: straight-leg carpenter denim jeans, classic front fly and five-pocket construction, extra narrow tool pocket on one thigh, small hammer loop on other outer thigh. Keep all full garments within square cells.
```

### estilos-street-03

Orden de izquierda a derecha y de arriba abajo:

1. `street-pantalon-cargo-slim`
2. `street-pantalon-western`
3. `street-pantalon-patchwork`
4. `street-pantalon-rodilla`
5. `street-pantalon-costura-frontal`
6. `street-pantalon-doble-rodilla`
7. `tipo-gorro-gato`
8. `tipo-gorro-conejo`
9. `tipo-gorro-orejeras-oso`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: First SIX garments are adult trousers; last THREE are baby hats. TOP LEFT: olive slim-leg cargo trousers with front fly, two thigh cargo bellows pockets with flaps, tapered legs. TOP CENTER: high-waisted straight indigo western jeans with wide cream denim contrasting side-panel inserts down BOTH outer legs from hip to ankle, seams visibly forward enough to show the full side bands. TOP RIGHT: wide-legged denim patchwork jeans, each leg constructed from SIX large rectangular panels in two columns by three rows, several shades of blue denim, sewn construction seams clearly visible, front fly. MIDDLE LEFT: straight charcoal indigo biker jeans with a separate rectangular contrast DENIM panel inserted around each knee, top and bottom horizontal panel seams; no quilted ridges. MIDDLE CENTER: high-waisted taupe palazzo trousers with one highly visible central vertical construction seam down the FRONT of each very wide leg, no pockets, front fly. MIDDLE RIGHT: ochre canvas straight workwear pants with large rectangular double-knee reinforcement PATCHES laid over both front legs extending from mid-thigh to upper calf, clearly topstitched patch edges, front fly and five-pocket construction. BOTTOM LEFT: adorable small sage stretch-knit baby beanie with TWO triangular pointed cat ears, no face decorations, no earflaps, no ties. BOTTOM CENTER: adorable cream stretch-knit baby beanie with TWO long soft rabbit ears, no face decorations, no earflaps, no ties. BOTTOM RIGHT: brown fleece baby aviator cap with rounded teddy-bear ears at crown and full earflaps below sides with a SHORT snap chin tab, no ties, no face decorations. Hat front or slight three-quarter view; show complete objects with margins.
```

Prompt de corrección o regeneración final:

```text
Precise single-object correction. Everything in this contact sheet must remain unchanged except TOP RIGHT patchwork jeans. They currently show FOUR horizontal patchwork rows per leg. They must have THREE horizontal rows per leg, not four. Remove the lowest horizontal seam about three quarters down each leg and combine those two lower patches into one long lower patch. Preserve the vertical seam down each leg. Final result EXACTLY 2 columns x3 rows =6 contrasting denim panels PER leg. Upper seam at thigh level, second at knee level, then uninterrupted lower panels from knee to hem. No third horizontal seam. Keep waistband, front fly, silhouette, whole sheet composition, canvas size and other eight objects exactly the same.
```

### estilos-vestidos-01

Orden de izquierda a derecha y de arriba abajo:

1. `vestido-adulto-trapecio-redondo`
2. `vestido-adulto-trapecio-pico`
3. `vestido-adulto-recto-barco`
4. `vestido-adulto-tunica-kimono`
5. `vestido-adulto-caftan`
6. `vestido-adulto-trapecio-mariposa`
7. `vestido-adulto-imperio`
8. `vestido-adulto-imperio-mariposa`
9. `vestido-adulto-cintura-fruncida`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: All NINE are adult women's loose comfortable dresses, not fitted, no belts, closures, pockets or decoration unless specified. TOP LEFT: sage sleeveless round-neck A-line knee-length linen dress, smooth uninterrupted front. TOP CENTER: muted terracotta sleeveless V-neck A-line midi linen dress, smooth front. TOP RIGHT: indigo sleeveless boat-neck straight knee-length shift dress, smooth front. MIDDLE LEFT: dusty blue straight knee-length tunic dress with integrated short kimono sleeves and round neckline, no waist seam. MIDDLE CENTER: loose cream maxi kaftan to ankle with very wide integrated sleeves, round neck, no waist seam or belt. MIDDLE RIGHT: rose A-line knee-length round-neck dress with short butterfly flutter ruffles over both shoulders. BOTTOM LEFT: sage sleeveless round-neck empire dress with seam immediately below bust and gathered midi skirt. BOTTOM CENTER: dusty lavender round-neck empire dress with short butterfly flutter ruffles on shoulders, below-bust seam and gathered midi skirt. BOTTOM RIGHT: ochre sleeveless round-neck dress with relaxed bodice ending at natural waist and gathered knee-length skirt. All dresses fully visible, exact equal square cells.
```

### estilos-vestidos-02

Orden de izquierda a derecha y de arriba abajo:

1. `vestido-adulto-cintura-manga`
2. `vestido-adulto-talle-bajo`
3. `vestido-adulto-dos-pisos`
4. `vestido-adulto-tres-pisos`
5. `vestido-adulto-imperio-boho`
6. `vestido-adulto-camisero-recto`
7. `vestido-adulto-camisero-fruncido`
8. `vestido-adulto-camisero-trapecio`
9. `vestido-adulto-paneles-horizontal`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: All garments are loose adult women's dresses; keep physically appropriate long adult proportions and visibly distinguish construction. TOP LEFT: dusty blue relaxed round-neck dress with short loose dropped-shoulder sleeves, natural-waist seam and gathered knee-length skirt. TOP CENTER: blush sleeveless round-neck dropped-waist dress with long straight loose torso down to hip level then short gathered skirt to knee, casual 1920s silhouette. TOP RIGHT: sage sleeveless round-neck dress with natural-waist seam then TWO clearly separated gathered skirt tiers to midi length. MIDDLE LEFT: ivory ankle-length dress with short loose sleeves, round neck, natural waist seam and THREE clearly separated gathered tiers of skirt. MIDDLE CENTER: terracotta sleeveless V-neck ankle-length bohemian dress, empire seam immediately under bust then TWO gathered tiers below, no belt. MIDDLE RIGHT: indigo straight knee-length button-front dress, short sleeves, round neckline WITHOUT shirt collar, complete vertical button front from neckline to hem, no pockets or waist seam. BOTTOM LEFT: ochre sleeveless round-neck midi button-front dress with natural waist seam and gathered skirt, buttons continue ALL THE WAY TO HEM, no belt. BOTTOM CENTER: sage sleeveless V-neck A-line knee-length button-front dress, buttons all the way to hem, NO shirt collar, no pockets. BOTTOM RIGHT: sleeveless round-neck knee-length A-line dress made from THREE horizontal flat fabric panels in slate blue, pale blue and ivory, clear horizontal seams, NO gathering, NO ruffles and NO waist shaping.
```

### estilos-vestidos-03

Orden de izquierda a derecha y de arriba abajo:

1. `vestido-adulto-canesu-fruncido`
2. `vestido-adulto-tirante-ancho-trapecio`
3. `vestido-adulto-tirante-ancho-fruncido`
4. `vestido-adulto-tirante-ancho-escalonado`
5. `vestido-adulto-pichi-cuadrado`
6. `vestido-adulto-volanton`
7. `vestido-adulto-kimono-volante`
8. `vestido-adulto-caftan-pico`
9. `vestido-adulto-manga-campana`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: All garments are loose adult women's dresses. TOP LEFT: muted blue sleeveless round-neck knee-length dress with high chest yoke seam just below armpits and very full straight body gently gathered immediately under that high yoke. TOP CENTER: sage midi A-line dress with square neckline and continuous integrated shoulders shaped like 4cm-wide straps; smooth front without waist seam. TOP RIGHT: rust midi sundress with square neckline and 4cm-wide integrated shoulder straps, natural waist seam and gathered skirt. MIDDLE LEFT: cream ankle-length dress with square neckline and 4cm-wide shoulder straps, natural waist seam and THREE visibly separate gathered skirt tiers. MIDDLE CENTER: indigo loose knee-length pinafore shift dress with square neck and very broad 8cm continuous shoulders, A-line silhouette, plain surface, NO separate bib or fasteners, NO blouse underneath. MIDDLE RIGHT: dusty rose sleeveless round-neck loose straight dress ending at knee with deep 20cm gathered ruffle joined at lower hem, one low ruffle seam only. BOTTOM LEFT: sage loose tunic dress with round neck and short integrated kimono sleeves, straight body ending near knee then broad gathered ruffle at lower hem. BOTTOM CENTER: terracotta ankle-length wide kaftan with very broad integrated sleeves and deep V neckline, NO waist seam or belt. BOTTOM RIGHT: lavender loose round-neck dress with elbow-length flared bell sleeves, natural-waist seam and gathered midi skirt. Fully show every garment and preserve equal cell margins.
```

### estilos-bebe-01

Orden de izquierda a derecha y de arriba abajo:

1. `bebe-body-sin-mangas`
2. `bebe-body-mariposa`
3. `bebe-body-falda`
4. `bebe-body-canesu`
5. `bebe-cardigan-cruzado`
6. `bebe-cardigan-pico`
7. `bebe-blusa-peplum`
8. `bebe-camisa-globo`
9. `bebe-peto-canesu`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: All NINE garments are adorable BABY-SIZED infant clothes with short baby proportions, very small buttons/snaps, no drawstrings or long ties. TOP LEFT: sleeveless cream interlock baby bodysuit with central front snaps continuing down to snap crotch and bound armholes. TOP CENTER: coral baby bodysuit with small flutter ruffles at both armholes, central front snap closure and snap crotch. TOP RIGHT: pink short-sleeve baby bodysuit with a short gathered skirt attached at waist, show bodysuit bottom and crotch beneath skirt, front and crotch snaps. MIDDLE LEFT: blue short-sleeved baby bodysuit with cream upper chest yoke and clear horizontal sewn seam over chest, central front snaps, snap crotch. MIDDLE CENTER: sage muslin long-sleeved crossover infant cardigan, diagonal overlapping front with small side snaps, absolutely NO ties. MIDDLE RIGHT: ochre jersey long-sleeve baby cardigan with V neck and central front snap closure. BOTTOM LEFT: pink sleeveless baby blouse with central front snaps and a wide gathered peplum ruffle below waist. BOTTOM CENTER: pale blue baby blouse with rounded neckline, central front snaps, short puffy balloon sleeves gathered into narrow cuffs. BOTTOM RIGHT: terracotta linen short baby overalls/romper, cream bib and bodice ending in a distinct horizontal waist seam above terracotta short legs, shoulder straps with snaps, crotch snaps. Every garment entire and separate.
```

Prompt de corrección o regeneración final:

```text
Edit ONLY the sage crossover cardigan in the CENTER CELL of this nine-item baby apparel sheet. Remove elastic gathering from its wrists. Both sleeves have plain smooth turned hem cuffs with open straight wrist ends, no elastics, no ribbed bands. Preserve everything else exactly: all other eight clothes, construction details, colors, positions, background, lighting, crop and 1254x1254 square canvas.
```

### estilos-bebe-02

Orden de izquierda a derecha y de arriba abajo:

1. `bebe-peto-falda`
2. `bebe-peto-cargo`
3. `bebe-pantalon-rodilleras`
4. `bebe-pantalon-panel-lateral`
5. `bebe-pantalon-punos-extensibles`
6. `bebe-babero-mangas`
7. `bebe-poncho-bano`
8. `bebe-bolero-redondo`
9. `bebe-bonete-visera`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: All nine items are BABY-SIZED infant garments, short baby proportions, no models, no drawstrings or long ties anywhere. TOP LEFT: pink baby short overalls/romper with bib and snap shoulder straps, gathered short overskirt attached at waist, shorts and snap crotch remain clearly visible underneath. TOP CENTER: olive green short baby overalls with bib, shoulder snap straps, snap crotch, two square bellows cargo pockets with flaps on the thighs. TOP RIGHT: beige straight-leg infant pants with elastic waist and large oval brown fabric reinforcement patches at both knees. MIDDLE LEFT: blue straight infant pants with elastic waist and cream side panels sewn along both outer legs from waist to hem; show the contrasting strips clearly. MIDDLE CENTER: sage baby joggers with elastic waist and extra-long ribbed ankle cuffs folded over broadly, no cords. MIDDLE RIGHT: yellow waterproof baby feeding smock/bib with wide covered chest, long sleeves gathered at elastic wrists, uninterrupted closed front, back snap opening not visible from front; no pouch pocket. BOTTOM LEFT: pearl grey terry baby bath poncho WITHOUT hood, broad rectangular cape-like body with open sides, round neck and full front opening secured with snaps. BOTTOM CENTER: cream waist-length baby bolero jacket with short sleeves, rounded front edges, open below a single top snap closure. BOTTOM RIGHT: blue linen infant bonnet with a wide soft curved visor attached at front, short snap chin tab only, absolutely NO long ribbons or ties. Bonnet at slight three-quarter angle so crown and brim both show.
```

Prompt de corrección o regeneración final:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: Exactly NINE baby garments with specific sewing construction, product photos. TOP LEFT: pink short baby romper with shoulder straps and two shoulder snaps, a gathered overskirt at waist, smooth plain bib with NO chest pocket, no side buttons; straight open SHORTS beneath skirt, snap crotch. TOP CENTER: olive baby short romper with shoulder straps and two shoulder snaps, smooth continuous bib-body front with NO chest pocket, NO waist seam, NO fly; only TWO large rectangular cargo flap pockets on thighs and snap crotch. TOP RIGHT: beige straight elastic-waist baby pants with large brown OVAL knee patches, uninterrupted center rise seam, NO fly or fake fly stitching. MIDDLE LEFT: blue straight infant pants with wide cream contrasting strips sewn down both outer legs, elastic waist and plain hems. MIDDLE CENTER: sage baby joggers, elastic waist, long folded rib ankle cuffs, no cords. MIDDLE RIGHT: yellow waterproof feeding smock with broad smooth front, LONG sleeves attached with VERTICAL curved set-in armhole seams at shoulders like a regular shirt, ELASTIC wrist ends, absolutely NO diagonal raglan seams, round neck, no front opening. BOTTOM LEFT: pearl grey terrycloth BATH PONCHO: two WIDE RECTANGULAR towel panels sewn at shoulders, one flat square neck cut-out with horizontal bottom and vertical corners; front split vertically from square neck to hem with a placket and four snaps. Sides are absolutely straight vertical edges and totally unsewn/open, NO armholes or armhole cutouts, no curves, no hood, no sleeves. This is a broad square towel cape, not a fitted vest. BOTTOM CENTER: cream short-sleeve waist-length infant bolero with rounded front edges and one upper snap, open below. BOTTOM RIGHT: blue linen infant bonnet with wide soft curved visor and short chin snap tab, NO long ties. Everything full and centered in exact equal grid cells. Do not add a chest pocket or decorative fly to any garment. Tiny actual infant proportions, natural textile quality.
```

### estilos-infantil-01

Orden de izquierda a derecha y de arriba abajo:

1. `tipo-conjunto-overol-gorro`
2. `tipo-conjunto-ajuar`
3. `tipo-conjunto-vestido-cubrepanal`
4. `tipo-conjunto-pelele-diadema`
5. `tipo-conjunto-campesino`
6. `tipo-conjunto-blusa-bombacho`
7. `tipo-conjunto-trapecio`
8. `tipo-conjunto-volante-capri`
9. `tipo-cubrepanal-olanes`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: This sheet contains EIGHT infant outfit SETS plus ONE individual baby bloomer; each entire set must stay centered within ONE cell, items laid adjacent as a coherent set with no overlap, never shared between cells. All infant/toddler proportions, subtle country fabrics, no loose ties, drawstrings, text or models. TOP LEFT: sage linen long-leg baby overalls with bib, button shoulder straps and cuffed legs beside matching stretch-knit hat with two rounded bear ears. TOP CENTER: cream newborn gift SET of three-piece soft bonnet with short snap chin tab, tiny lined booties with elastic backs, and small classic rounded bib with snap closure, all three components clear. TOP RIGHT: dusty pink sleeveless infant dress with gathered casing neckline held by SHORT button shoulder tabs and one small FIXED decorative bow at upper chest, next to matching bloomer showing THREE gathered ruffles across its BACK. TOP RIGHT outfit is a DRESS AND BLOOMER, two separate pieces. MIDDLE LEFT: sage short infant romper with shoulder straps, gathered ruffles along the straps and snap crotch, beside coordinating narrow headband with small fixed bow. MIDDLE CENTER: ochre peasant infant blouse, gathered round elastic neckline, short puffy sleeves and small ruffle hem, alongside short puffy bloomers with elastic leg openings. MIDDLE RIGHT: pale blue striped short-sleeved baby blouse with round neckline and buttons down full front, next to plain blue long loose bombacho pants with elastic waist and gathered elastic ankles. BOTTOM LEFT: peach sleeveless A-line infant blouse with round neck and smooth front, alongside matching plain gathered bloomer. BOTTOM CENTER: sage gingham sleeveless A-line blouse with broad gathered hem ruffle, beside matching wide-leg elastic-waist CAPRI pants. BOTTOM RIGHT: ONE individual dusty rose baby diaper-cover bloomer viewed from BACK with elastic waist and THREE parallel horizontal rows of gathered ruffles across entire seat. Every set should be beautifully photographed and visually distinct.
```

### estilos-infantil-02

Orden de izquierda a derecha y de arriba abajo:

1. `tipo-cubrepanal-tirantes`
2. `tipo-vestido-trapecio-mariposa`
3. `tipo-falda-medio-circulo`
4. `tipo-chaleco-ribeteado`
5. `tipo-mono-pico-volantes`
6. `tipo-blusa-trapecio-volante`
7. `tipo-delantal-pichi-liso`
8. `tipo-bonete-volante-doble`
9. `tipo-bonete-encaje`

Prompt original:

```text
Create a SQUARE photorealistic clothing product photography contact sheet for Hilvana sewing patterns. EXACTLY NINE complete garments in an invisible mathematically even 3 by 3 grid, three equal rows and columns. Each garment centered completely inside its own square cell with generous 9% empty padding on all sides, nothing crossing into neighboring cells. Consistent warm ivory #F5F1E7 seamless background, softly diffused studio daylight, realistic woven/knit fabric texture and subtle shadows. Straight front view, garments flat laid with natural volume, elegantly arranged so all construction details are visible. No people, mannequin, hangers, text, labels, logos, numbers, borders or props. Not a technical drawing, not an illustration: premium real textile photography. Square canvas. Every garment should have the EXACT construction specified, no extra pockets or closures. Row-major sequence: All NINE items are child or baby sewing designs, no models or decorations beyond those specified. TOP LEFT: sage linen infant bloomer diaper-cover with gathered elastic waist and leg openings, TWO buttoned suspenders rising from front waist and crossing at back, no separate bib, no bow or ruffles. TOP CENTER: dusty pink child's knee-length A-line trapeze dress, round neckline, smooth uninterrupted front, short circular butterfly flutter ruffles over both shoulders. TOP RIGHT: child's ochre knee-length HALF-CIRCLE skirt with simple elastic waistband, moderate circular flare, plain fabric and neat curved hem. MIDDLE LEFT: cream sherpa child's sleeveless OPEN FRONT vest, round neck, all edges bound neatly with tan cotton bias tape, no buttons or closures or bow. MIDDLE CENTER: blue gingham infant SHORT romper with V neckline, broad buttoned shoulder straps with tiny fixed decorative bows, broad gathered ruffles at both leg openings, no pockets. MIDDLE RIGHT: pink gingham sleeveless child's A-line blouse, round neck, broad gathered ruffle around bottom hem, no buttons visible in front. BOTTOM LEFT: indigo child's plain slipover pinafore APRON, square neckline and broad shoulder sections continuing over shoulders, one simple rectangular apron body with bound edges, open sides and short side waist ties neatly arranged within the cell, NO pockets and NO ruffles. BOTTOM CENTER: muted rose linen baby bonnet with TWO visibly separate concentric gathered fabric ruffles surrounding face opening, one cream and one dusty rose, three-part fitted crown and SHORT snap chin tab, NO ribbons. BOTTOM RIGHT: pale blue linen baby bonnet with delicate gathered ivory eyelet lace trim around face opening, three-part fitted crown, SHORT snap chin tab, NO ribbons. Hats in slight three-quarter view to clearly show complete brim trim and crown.
```

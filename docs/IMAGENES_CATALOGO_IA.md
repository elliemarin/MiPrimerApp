# Imágenes profesionales del catálogo — 30 octubre 2026

**Estado actual (2 de noviembre):** 318 diseños, 2,074 recetas y todas sus
selecciones tienen fotografía IA. La auditoría completa está en
[`auditoria/fotos-catalogo.csv`](auditoria/fotos-catalogo.csv). Las cifras de
110 diseños y 13 láminas que siguen describen la primera entrega.

Los **110 diseños editables** tienen una ilustración original de producto generada con `image_gen`: prendas, accesorios, hogar, pañalero y los 44 diseños de disfraces. No se multiplicaron tarjetas por medidas. El pañalero tiene imágenes de manga corta/larga; los pantalones, shorts, joggers y pijamas cambian a proporciones infantiles al filtrar Bebé.

## Archivos y presentación

- `public/catalog-images/`: 13 láminas WebP, 1,602,182 bytes en total (1.6 MB). Cada original es una composición de 3 × 3 imágenes, con iluminación suave, tela visible y fondo marfil.
- `src/data/catalogImages.ts`: correspondencia explícita entre `designGroup.id` y celda, variantes de bebé y límites revisados de cada objeto. Los límites evitan mostrar puntas de un objeto vecino y conservan objetos de referencia completos.
- `src/ui/CatalogImage.tsx` / `catalogImage.css`: recorte en CSS, carga diferida, texto accesible, proporciones conservadas y respaldo de dibujo técnico si falla la carga.
- Integración en `LibraryPage`, frente de `ModelDetail` y `ModelVariantPicker`. Espalda y costados siguen usando geometría técnica real. Los proyectos guardados, medidas y patrones no usan estas imágenes.
- La ficha dice **«Ilustración generada con IA»**. No se presentan como fotos de muestras ya confeccionadas ni como certificación del patrón. Los objetos junto a fundas/tapetes sólo muestran el uso del textil.
- `.webp` está incluido en la precarga del service worker para uso sin conexión.

## Generación y revisión

Se generaron láminas originales mediante la herramienta de imágenes. Se inspeccionaron las 13 láminas, se corrigieron mediante la misma herramienta las alas de ángel (tres lóbulos por ala), las faldas de pétalos/hojas, las polainas con cierre liso sin botones y el conjunto de hada (dos alas largas de hoja, no cuatro alas). El body muestra la apertura frontal completa con broches y entrepierna abrochada del motor real. El hoodie no promete un bolsillo canguro que su receta base no incluye.

Los archivos se codificaron en WebP con FFmpeg, calidad 86; no se recortaron ni redibujaron archivos raster con scripts. La aplicación recorta cada sujeto mediante CSS. `public/catalog-images/README.md` conserva la procedencia y los originales de esta sesión. No hay fotografías descargadas de tiendas ni recursos externos con licencias pendientes.

## Verificación

- `tests/catalog-images.test.ts`: igualdad exacta entre los 110 grupos editables y el mapa de imágenes, celda propia por diseño, cobertura de todas las recetas, archivos WebP presentes y presupuesto total inferior a 2.5 MB; variantes del pañalero y bebé sin mutación del modelo.
- `tests/browser/catalog_art_smoke.py`: catálogo real en móvil y hoja de contacto de los 110 diseños a 390/1500 px; imágenes descargadas **y decodificadas**, recorte sin desbordes y geometría sin cambios.
- Capturas de auditoría: `/tmp/hilvana-art-library-390.png`, `/tmp/hilvana-art-contact-390.png`, `/tmp/hilvana-art-contact-1500.png`; índice `/tmp/hilvana-art-audit.json`.

Para añadir un diseño nativo, generar una imagen acorde con las piezas reales, registrar la celda y revisar la hoja de contacto. Una nueva construcción debe tener su propia imagen; cambiar sólo el tamaño sigue siendo una variante dentro de la misma tarjeta. Las referencias de IA ilustran el diseño: la correspondencia exacta de costuras, escala y ubicación de extras se consulta en las vistas armadas y el patrón generado.

## Láminas vectoriales históricas (2026-11-01)

`ninas-01`, `bebe-02`, `tendencia-01/02/03` e `infantil-01` a `infantil-05` no son IA: `scripts/render-kids-sheets.ts` las dibuja desde
el dibujo técnico real de cada diseño, con textura y sombra suaves. Para ellas la
leyenda original dice «Ilustración dibujada a partir del patrón real» (`catalogImageCaption`).
Las celdas posteriores a la lista de grupos muestran variantes exactas
(`VARIANT_IMAGES` en `src/data/catalogImages.ts`); `tendencia-03` solo tiene
celdas de variante y se registra con lista vacía para que su archivo se pruebe.
**Ya están sustituidas en el catálogo activo:** `REALISTIC_SOURCE_MAP` y los
mapas por receta conservan sus identidades y resuelven a fotografías nuevas.
No se cambia la leyenda de un dibujo para presentarlo como IA. Ver
[`IMAGENES_CATALOGO_COMPLETO.md`](IMAGENES_CATALOGO_COMPLETO.md).

## Tercer y cuarto lote con fotografía IA (2026-11-02)

`realistas-adultos-nuevos-a/b.webp` incorporan **17 imágenes**: una por cada
una de las 15 recetas digitalizadas y dos versiones infantiles sin cordones.
Incluyen también las variantes que compartían una foto poco precisa: barrel
elástico, palazzo elástico, jogger y baggy de felpa, cargo recto, sobrecamisa de
cuello Mao y culotte de punto con picot. Total: 218,168 bytes adicionales.

`digitizedPhotosA.ts` y `digitizedPhotosB.ts` contienen fuentes y recortes.
El resolutor prioriza destinatario infantil y receta antes que el grupo. Los
ocho alias de `lote-adultos-01` apuntan a fotos, sin alterar los ids del catálogo.
Se eliminó `PENDING_PHOTO_SHEETS`: las pruebas y la auditoría rechazan todas
las láminas vectoriales históricas para cualquier receta activa.

Prompts, originales, hashes y revisión de las prendas:
[`IMAGENES_ADULTOS_NUEVOS_A.md`](IMAGENES_ADULTOS_NUEVOS_A.md) y
[`IMAGENES_ADULTOS_NUEVOS_B.md`](IMAGENES_ADULTOS_NUEVOS_B.md).

## Bolsos y mochilas con foto pendiente (2026-11-09)

Los 8 diseños nuevos de bolsos y mochilas aún no tienen fotografía IA: esta
sesión no podía generar imágenes. Están en `PENDING_AI_PHOTOS` y su tarjeta
muestra el dibujo técnico real, nunca la foto de otra construcción. Las pruebas
exigen foto a todos los demás y dibujo técnico a estos ocho. Guía y prompts:
[`BOLSOS_Y_MOCHILAS.md`](BOLSOS_Y_MOCHILAS.md).

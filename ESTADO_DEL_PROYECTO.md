# Estado del proyecto — Hilvana

Bitácora de traspaso: qué está hecho, qué falta y en qué orden seguir. Si eres
una IA (ChatGPT, Claude u otra), **lee primero `AGENTS.md`** y luego este archivo.
Actualízalo al terminar cada tarea.

- App publicada: https://elliemarin.github.io/MiPrimerApp/ (cambia al nombre del
  repositorio si se renombra; el flujo de despliegue se adapta solo).
- Última actualización: 2026-11-02 (Claude: tercer y cuarto lote de diseños: tendencias, hombre y lencería).

## Cómo continuar en 5 minutos

```bash
npm install
npm test            # 3726 pruebas: catálogo, fotos, patrones, persistencia, PDF, proyector, logos y transformaciones
npm run dev         # http://localhost:5173/
npm run build
```
Cada push a `main` ejecuta pruebas, compila y publica en GitHub Pages
(`.github/workflows/deploy.yml`).

## Tercer y cuarto lote: tendencias, hombre y lencería (2026-11-02)

**Este es el relevo más reciente.** 20 fotos de referencia (11 del tercer lote
y 9 del cuarto, de hombre y lencería). Detalle imagen por imagen en
`docs/DISENOS_DIGITALIZADOS.md` («Tercer lote» y «Cuarto lote»). Todo es
**experimental**: nada se ha impreso ni cosido.

- Generadores nuevos: `adultBatch.ts` (sudadera de media cremallera con o sin
  bloques, chaqueta ranglan de manga en dos piezas, buzo murciélago con capucha)
  y `menBatch.ts` (cazadora de mezclilla con canesú y paneles, chaqueta de campo
  o safari, culotte de encaje de una pieza por lado).
- Opciones nuevas: pantalón elástico (`cintura: pretina` con abertura lateral y
  botones, `amplitudBajo`, `bolsillos: costado`, `cordon` solo adulto, `volante`,
  `alforzas`); jeans (`pinzas`); sobrecamisa (`cuelloTipo: tira`, `bolsillos:
  grandes`); chaqueta de campo (`cierre`, `cuelloTipo`, `largoExtra`).
- Catálogo: `src/data/digitizedAdultCatalog.ts` con 15 tarjetas y 5 inspiraciones
  que ahora generan patrón y conservan su foto (`pantalon-palazzo`,
  `pantalon-pinzas`, `cazadora-mezclilla`, `cazadora-denim-corta`,
  `chaqueta-safari`). Familia nueva **Lencería**.
- Imágenes: los 6 diseños nuevos sin foto IA (pantalón con volante, chaqueta
  ranglan, sudadera de media cremallera, buzo murciélago, culotte, palazzo con
  botones laterales) y 2 variantes se dibujan desde sus piezas en la lámina
  `lote-adultos-01`. La ficha lo dice («Ilustración dibujada a partir del patrón
  real») y `PENDING_PHOTO_SHEETS` lo permite en las pruebas.
  **Pendiente:** generar fotos IA en el estilo de Codex y quitar la lámina de la lista.
- Seguridad: sin cordones en tallas infantiles; el culotte solo existe en
  tallas de mujer y en punto con ≥ 20 % de elasticidad.
- Herramienta: `npx vite-node scripts/sweep-generators.ts [ids]` barre todas las
  tallas y variantes; solo fallan rechazos intencionales (jeans con pretina y
  oversize en bebé, cazadora corta en tallas infantiles).
- `scripts/render-kids-sheets.ts` importa `flats.ts` primero: con otro orden
  falla por una importación circular de `babyStyleFlats.ts`.
- Validación: **3,726 pruebas en 82 archivos** (`tests/digitized-adults.test.ts`
  nueva) y `npm run build`.

Siguiente paso sugerido: coser muestras (cazadora, culotte, palazzo con pretina)
y generar las fotos IA pendientes.

## Transformar mi ropa con imágenes realistas (2026-11-01)

Relevo anterior (Codex). El catálogo ya tenía fotografías, pero la
sección de transformaciones seguía mostrando siluetas genéricas y tarjetas solo
de texto. Se partió de `d01eb92`, con instalación, 3,689 pruebas y build correctos.

- **27 comparaciones antes/después**, 54 imágenes originales de IA en nueve
  láminas WebP locales. Se conserva el fondo marfil, la textura textil y el
  acabado realista del catálogo.
- Cada tarjeta muestra el resultado; la cabecera y el detalle ofrecen los
  botones «Antes» y «Con el cambio». El resultado aparece primero, con las
  mismas proporciones al alternar. Los controles no modifican medidas,
  confirmación, notas ni borradores.
- Se retiró `TransformationDiagram`. Cada propuesta tiene una fotografía
  propia con la intervención correspondiente: ventanas de contraste, cuñas,
  bolsillos, parches, puños, bandas y volantes. La espalda se muestra cuando
  el cambio se coloca ahí.
- `transformationPhotos.ts` reúne los lotes A/B/C; los recortes conservan cada
  prenda completa. Los recursos se incluyen en el precache de la PWA y un
  fallo de imagen muestra texto explícito, sin volver a las siluetas.
- Se mantienen las 27 ideas, diez motores y su PDF. Las fotografías ilustran
  apariencia; no se deducen medidas ni se certifica una confección a partir de
  ellas. Las pruebas de muestras físicas siguen pendientes.

**Validación:** 3,694 pruebas en 81 archivos y compilación de Pages correctas.
Los nueve WebP suman 743,502 bytes. En móvil y escritorio se verificaron las
27 tarjetas, 54 vistas, seis filtros y comparación sin alterar las medidas ni
la confirmación. Se revisaron las nueve galerías y el fallo explícito de imagen.
Sobre el build, las nueve láminas se decodificaron con la red desconectada usando
el service worker. El recorrido de confección conserva filtros, entradas
decimales, bloqueo de valores inválidos, borrador tras recarga y PDF de campana:
siete páginas, medidas 365/220 mm, controles exactos de 50/100 mm y manifiesto
sin patrón de la prenda base.

**Para Claude:** consultar `docs/TRANSFORMACIONES_DE_PRENDAS.md` y los documentos
de imágenes A/B/C enlazados ahí para encontrar prompts, fuentes, inventario y
revisión. Al añadir una idea, incluir su pareja fotográfica y revisar el cambio
real que representa: las bandas/volantes prolongan la prenda; los bolsillos de
fuelle no llevan una tapa si el patrón no la incluye. La comparación visual no
es una simulación del borrador a medida.

## Imágenes realistas completas del catálogo (2026-11-01)

Relevo anterior. La usuaria detectó diseños que aún mostraban
dibujos. La entrega anterior fotografió los 90 estilos nuevos, pero quedaron
46 grupos editables antiguos y variantes con fuentes vectoriales. Se partió de
`e447bb8` con instalación, 3,672 pruebas y compilación correctas.

- **123 imágenes nuevas de IA** con la presentación existente: fondo marfil,
  textura realista y prenda completa. Incluyen 19 adultas, 38 infantiles y 66
  referencias de inspiración; 16 láminas WebP locales.
- La auditoría recorre **2,059 recetas y 312 grupos**: 246 diseños con patrón,
  61 inspiraciones y 5 referencias solo para estudio. Todos tienen imagen, sin cambiar estados,
  medidas, tallas, proyectos o geometría de patronaje.
- Se sustituyen las fuentes de las variantes, además de la portada del grupo:
  manga larga, sobrecamisa/bomber corta, pantalones infantiles y sombreros.
  El sombrero de bebé tiene su propia foto con lengüeta de broche.
- `catalog-photo-completeness.test.ts` detecta recetas que vuelvan al dibujo,
  archivos ausentes y variantes confundidas. La auditoría reproducible queda
  en `scripts/audit-catalog-photos.mjs` y `docs/auditoria/fotos-catalogo.csv`.
- `tests/browser/catalog_photo_completeness_smoke.py` comprueba tarjetas,
  detalles y recortes móviles, con modos desarrollo y publicación.

**Validación:** 3,689 pruebas en 80 archivos, TypeScript y compilación de Pages
correctos. Auditoría: 328 imágenes/celdas activas en 39 láminas, cero fuentes
vectoriales o faltantes. En Chromium móvil: 246 tarjetas, 77 al filtrar bebé,
123 detalles nuevos, 16 galerías de recortes y dos cambios de variante; sin
errores de navegador ni 404. Repetido sobre el build de Pages, incluida una
página nueva sin red: las 16 láminas nuevas cargan desde el service worker.
Recursos nuevos: 1,702,020 bytes; catálogo completo en disco: 4,643,880 bytes.

**Para Claude:** usar `docs/IMAGENES_CATALOGO_COMPLETO.md` y los cuatro documentos
de lotes enlazados allí para encontrar prompts, celdas y revisiones visuales.
Las fotos nunca se usan para calcular medidas ni sustituyen la vista editable
del estudio. Las láminas vectoriales antiguas siguen en disco por compatibilidad,
pero ninguna receta del catálogo activo las devuelve. Una nueva variante debe
recibir foto y comprobarse en su selección, no solo en la tarjeta del grupo.
La confección de muestras continúa pendiente; no se certificaron patrones.

## Catálogo por estilos y transformaciones (2026-11-01)

Relevo anterior. La petición era variedad de construcciones,
no multiplicar tarjetas por talla o color. Se partió de `8d25d82`, con instalación,
3,054 pruebas y compilación correctas.

| Diseños con patrón disponible | Antes | Ahora |
| --- | ---: | ---: |
| Catálogo completo | 156 | 246 |
| Bebé | 40 | 77 |
| Hoodies para mujer | 1 | 13 |
| Pantalones para mujer | 10 | 22 |
| Vestidos para mujer | 0 | 27 |

- **69 construcciones nuevas:** 12 hoodies, 12 pantalones, 27 vestidos y 18
  diseños de bebé. Cada una tiene patrón paramétrico, piezas, márgenes,
  instrucciones, materiales y dibujo de colocación frontal/trasero.
- **21 estilos antes ocultos** tienen tarjeta propia: conjuntos infantiles,
  cubrepañales con olanes/tirantes, bonetes, pichi/mono de pico, etc. Las tallas,
  medidas y largos siguen dentro del estilo. Los IDs de las recetas y los
  proyectos existentes se conservan.
- **90 imágenes realistas originales de IA**, en diez láminas WebP locales.
  Son ilustraciones; las medidas se calculan siempre desde la geometría.
- **Navegación:** persona y tipo de prenda siempre visibles, accesos Mujer y
  Vestidos, estilos nuevos primero. Los hoodies mantienen una búsqueda estricta;
  «bonete doble» no encuentra otro bonete solo por recomendar gasa doble.
- **Transformar mi ropa:** tercera sección de Biblioteca con 27 ideas y diez
  construcciones de complementos. Incluye paneles vaqueros, cuñas setenteras,
  cargo, bolsillos, volantes, puños y bandas. Mide la prenda existente, conserva
  un borrador local y genera PDF de las piezas nuevas con materiales, pasos y
  referencias de ubicación. No incluye un patrón inventado de la prenda base.
- **Revisión de confección:** cierres separables, cruces de botones, frunces,
  puños y curvas de paneles comprobados. Se corrigieron el largo total de manga
  globo y pantalones con puños extensibles, y el orden de montaje de volantes.
  El estudio excluye tapetas ocultas de los nuevos bodies y distingue las caras
  de las mangas del babero abierto por detrás. Las rodilleras exteriores se
  pueden colorear como pieza independiente.

**Validación:** 3,672 pruebas en 79 archivos, TypeScript y compilación de Pages.
Los recorridos móviles de 390 px verifican filtros, tallas, intervención sin
recargar, vistas completas, materiales, persistencia y PDF. Hoodie con cierre:
42 páginas/5 plantillas; vestido trapecio: 30/5; body con canesú: 21/11.
Transformación de campana: 7 páginas con medidas reales 365/220 mm. Se conservaron
los recorridos anteriores de bonete con encaje y delantal, incluyendo bordados.
Los PDFs mantienen controles exactos de 50/100 mm y escala de impresión 100 %.

**Límites y siguientes pasos para Claude:** todos los patrones nuevos siguen
experimentales. Falta imprimir y coser muestras; las comprobaciones matemáticas
no certifican caída ni ajuste. Los vestidos usan bloques holgados sin pinzas:
vestidos entallados y corsetería requieren motores específicos. Transformaciones
usa propuestas predefinidas; reconocimiento por foto y edición de la prenda usada
en el estudio quedan pendientes. No se añadió 3D ni exportación de puntadas para
la Singer. Priorizar muestras de cierres/puños, paneles de mezclilla, vestidos
abotonados y aberturas infantiles antes de ampliar otra tanda.

Contratos y detalles: `docs/ESTILOS_URBANOS.md`, `docs/VESTIDOS_POR_ESTILO.md`, `docs/ESTILOS_BEBE_2026.md`,
`docs/TRANSFORMACIONES_DE_PRENDAS.md`, `docs/IMAGENES_ESTILOS.md` y
`docs/auditoria/catalogo.csv`. Conteo total separado: 2,059 recetas, 312 tarjetas
incluyendo inspiraciones; de ellas, 1,993 recetas/246 tarjetas tienen patrón.

## Continuación del trabajo de Claude (2026-11-01)

Relevo anterior. Se retomó `1db95f4`, el segundo lote de ocho
referencias infantiles. Las cinco entregas de Claude estaban guardadas y
publicadas. No había un PR o una rama pendiente: se continuó comprobando su
último lote y corrigiendo los fallos reproducidos en el estudio y el PDF.

- **Base de partida:** instalación, 3,031 pruebas en 70 archivos y compilación
  correctas antes de editar.
- **Búsquedas:** «bonete» incluye las nuevas variantes; «puntilla» y «encaje»
  encuentran la receta adecuada. Los petos/overoles y las diademas infantiles
  también aparecen con sus nombres comunes.
- **Delantal de una pieza:** la colocación frontal y trasera se separa por el
  hombro real; la orientación trasera se compensa para mostrar letras e imágenes
  legibles y producir la guía de ubicación correspondiente.
- **Monos y petos:** se corrigieron los enlaces en espejo de las copias y sus
  bolsillos para que el dibujo y las coordenadas del patrón coincidan.
- **Largo de blusa con volante:** el largo solicitado representa cuerpo más
  volante. Se elimina el alargamiento silencioso, se valida el mínimo admisible
  y la comprobación del patrón mide la prenda completa. Los valores iniciales
  visibles permiten construir las dos variantes.
- **Proyectos anteriores:** un bordado o extra guardado en una cara física
  incorrecta bloquea el PDF y pide recolocarlo en Acabados o Extras. No se
  modifican sus datos automáticamente. Una blusa antigua con largo y volante
  incompatibles debe ajustar esas medidas antes de volver a generar el patrón.
- **Notas de motivos corregidas:** cerezas y panda ya existían, con IDs
  `cerezas` y `panda-amigo`. Se verifican dentro del estudio y el PDF; el pendiente
  de añadirlos a Bordados estaba desactualizado.

**Validación final:** 3,054 pruebas en 73 archivos, TypeScript y compilación para
GitHub Pages correctos. Se completaron seis recorridos en Chromium con pantalla
táctil de 390 px, guardado/reapertura y PDF: bonete doble, delantal pichi, mono de
pico, peto largo, blusa con volante y conjunto vichy. Todos conservan controles
PDF de 50/100 mm. Se verifican motivos, colores, lados y centros en milímetros.

Pruebas nuevas: `kids-batch2-placement`, `kids-legacy-placement`,
`trapeze-top-length`, regresiones de búsqueda, y los recorridos
`tests/browser/digitized_kids_handoff_smoke.py` y
`tests/browser/production_kids_handoff_smoke.py` (build compilado, sin módulos
`/src`, IndexedDB y manifiesto del PDF).

Detalle y límites en `docs/DISENOS_DIGITALIZADOS.md`. La confección de muestras,
la caída de capucha/canguro y el uso de un proyector físico siguen pendientes.
No se certificaron estos patrones como cosidos ni se recuperaron cambios de
Claude que no estuvieran guardados en GitHub.

## Segundo lote de diseños digitalizados (2026-11-01)

Relevo anterior de Claude. Ocho fotos más; detalle en
`docs/DISENOS_DIGITALIZADOS.md` («Segundo lote»).

- 4 generadores nuevos (`kidsBatch2.ts`): bonete de tres piezas con volante
  (tela, doble o puntilla), delantal pichi de una pieza, mono y peto con
  tirantes (formas pichi, pico y peto; corto o largo; volante o vuelta;
  entrepierna con broches para bebé) y blusa trapecio con volante opcional.
- Pantalón elástico con `corte` capri, bermuda o short calculado desde la
  entrepierna; conjuntos `trapecio` y `vichy`. El chaleco de borreguito ya
  existía.
- Sin cintas al cuello ni en los hombros: botones, broches y lengüetas.
- 13 recetas y 6 tarjetas nuevas; láminas `infantil-04/05`.
  Validación: **3,031 pruebas en 70 archivos**.

## Diseños infantiles digitalizados desde fotos (2026-11-01)

Relevo anterior. Detalle completo, imagen por imagen, en
`docs/DISENOS_DIGITALIZADOS.md`.

- La usuaria envió 16 fotos de diseños de niños y bebés con patrón. Se
  reconstruyeron como **12 generadores nuevos** desde medidas (cambian de talla
  solos) más opciones en 5 existentes. No se copiaron imágenes, marcas ni
  medidas: varias referencias eran de IA con medidas imposibles; las coherentes
  sirvieron solo de comprobación.
- Nuevos: chaleco de borreguito, chaqueta polar con cuello alto y cierre,
  chaqueta acolchada reversible, chaqueta con capucha forrada y botones,
  sudadera canguro, blusa campesina, blusa con botones, vestido con jaretas,
  pelele de volantes, diadema con lazo, gorro duende, gorro con orejeras.
  Opciones: pantalón `bombacho` (con volantito), cubrepañal con tirantes
  cruzados y lazo, sombrero con lazo, barrel con bolsillos delanteros y cuatro
  conjuntos más.
- **Seguridad:** sin cordones ni cintas para atar (lazos cosidos fijos,
  lengüetas con broche); escotes comprobados para pasar la cabeza.
- Biblioteca: acceso nuevo **Infantil**; 24 recetas y 13 tarjetas nuevas;
  láminas `infantil-01/02/03` dibujadas desde las piezas.
- Validación: barrido de todas las tallas infantiles y variantes sin errores,
  **3,012 pruebas en 70 archivos**.
  **Pendiente:** coser muestras; formas de aplique «cerezas» y «panda».

## Tendencias (mezclilla y oversize) y más Bebé (2026-11-01)

Relevo anterior. Detalle completo en `docs/TENDENCIAS_Y_BEBE.md`.

- **Pantalón de mezclilla** (`jeans.ts`, generador `pantalon-mezclilla`) con
  siete siluetas: recto, pitillo, mom, acampanado, ancho, baggy y barrel.
  Pretina con bragueta de cierre (tapeta, canesú, bolsillos de cinco con vista y
  forro, relojera, presillas) o cintura elástica; bolsillos de parche o cargo.
  Las inspiraciones baggy, barrel, cargo, pitillo y acampanado ahora generan
  patrón sin cambiar su id; nuevas tarjetas jeans recto, mom y pierna ancha.
- **Hombro caído / oversize** (`oversize.ts`, `oversize-hombro-caido`):
  camiseta (corta o larga), sobrecamisa (tapeta, pie de cuello y cuello),
  chaqueta de trabajo con tres bolsillos y bomber con rib, forro y cierre
  separable (clásica y corta).
- **Bebé** (`babyMore.ts`): peto/jumper corto y largo con tirantes y aberturas
  para broches, barrel y baggy de bebé con elástico, gorro con orejas (oso, gato,
  conejo), sombrero pescador reversible y tres conjuntos (verano, invierno,
  recién nacido) que juntan varias prendas en un solo PDF.
- **Biblioteca:** nuevo acceso **Tendencias** (12 tarjetas); Bebé pasa de 15 a
  22 diseños; familia nueva «Conjuntos de bebé». Imágenes `tendencia-01/02/03`
  dibujadas como vectores desde el dibujo técnico (no IA); cada variante del
  selector tiene su propio dibujo.
- Validación: barridos de todas las tallas y variantes sin errores, **2,970
  pruebas en 69 archivos**, compilación correcta; recorrido en iPhone 13 con PDF
  del pantalón barrel (44 hojas carta).
  **Pendiente:** coser muestras antes de quitar «experimental»; revisar holguras
  de baggy y barrel con una persona real.

## Modo proyector y PDF para proyector (2026-11-01)

Relevo anterior. Detalle completo en `docs/PROYECTOR.md`.

- **Proyectar en la mesa** desde «Todo listo para coser»: pantalla completa con
  fondo negro y las piezas reales a escala 1:1; mover, girar 90°, voltear,
  centrar, bloquear y ocultar controles. Cuadro de control de 5 cm siempre a la
  vista. No exige haber elegido colores; solo un patrón válido.
- **Calibración** guardada por dispositivo: rápida con regla (cuadro de 10 cm,
  corrige ancho y alto) o precisa con 4 esquinas (homografía: escala, giro e
  inclinación), y pantalla de comprobación con cuadrícula de 10 cm.
- **PDF para proyector**: hojas grandes 1:1 (hasta 4,8 m) con fondo negro,
  cuadrícula de 10 cm y cuadro de calibración de 10 × 10 cm para usar en otras
  apps de proyección. Se registra en Exportaciones.
- **Instrucciones** en Ayuda → «Proyectar el patrón sobre la tela» y dentro del
  asistente.
- Validación: **2,933 pruebas en 68 archivos**; recorrido en Chromium e iPhone 13.
  **Pendiente:** prueba con proyector físico real.

## Colección Niña y ampliación de Bebé (2026-11-01)

Relevo anterior. Detalle completo en
`docs/NINA_Y_BEBE_AMPLIADO.md`.

- **11 generadores nuevos, todos `experimental`**, con piezas, márgenes una sola
  vez, relaciones de costura, comprobaciones, materiales y pasos:
  vestido trapecio (sin mangas o con volantes de mariposa), vestido de tirantes
  con falda fruncida, falda de tul, falda de tres olanes, falda circular
  (completa o medio círculo; la inspiración `falda-circular` ahora genera patrón
  sin cambiar su id), cubrepañal (liso o con olanes), bonete con lengüeta,
  patucos, saco de dormir, toalla con capucha y babero bandana.
- **Biblioteca:** filtro Bebé de 7 a 15 diseños; nuevo acceso **Niña** junto a
  Bebé (colección `Niña` + vestidos, faldas y petos infantiles existentes).
  Familias nuevas: cubrepañales, patucos, sacos de dormir, toallas; «Gorros y
  bonetes». Buscar «gorro» incluye el bonete; «beanie» solo el gorro de punto.
- **Dibujos técnicos desde las piezas reales** (`src/data/kidsFlats.ts`) con
  enlaces explícitos zona → pieza; las piezas al doblez se despliegan en dos
  mitades en la vista armada. El figurín funciona para vestidos y faldas.
- **Imágenes:** láminas `ninas-01` y `bebe-02` dibujadas como vectores desde el
  dibujo técnico (no son IA; la ficha lo indica). Se regeneran con
  `npx vite-node scripts/render-kids-sheets.ts`.
- **Seguridad infantil codificada:** el vestido comprueba que pase la cabeza;
  el saco de dormir exige escote < cabeza − 4 cm y sisas < cabeza − 6 cm; sin
  cintas para atar en bonete, babero ni tirantes.
- **Motor:** `offset.ts/setEnd` conserva la esquina de costura al prolongar un
  margen (corregía un corte fuera de línea en hombros de recién nacido).

Validación: **2,924 pruebas en 67 archivos**, TypeScript y compilación correctos.
Recorrido en iPhone 13 (Playwright): chip Niña, ficha, figurín, «Obtener patrón»
y PDF del vestido trapecio con volantes (21 hojas carta, 6 plantillas), sin
errores de consola.

**Pendiente:** imprimir y coser muestras de cada diseño antes de quitar
«experimental»; probar el saco con bebé real y tabla de grosor.

## Logos en Bordados y control de mover (2026-10-31)

Relevo anterior. El recorrido Base → Extras → Telas y colores →
Bordados → PDF se conserva. Esta entrega atiende subir un logo y mover objetos
pequeños sin tener que acertar a una línea de la letra.

- **Subir logo o imagen** en Bordados abre una hoja sencilla: elegir archivo,
  revisar imagen y ancho, colocar. Después usa los mismos controles de tamaño,
  borrar, deshacer y posición que los motivos existentes. El alto conserva la
  proporción. PNG/WebP mantienen transparencia; las fotos conservan orientación.
  Se guarda una copia PNG local, máximo 2400 px de lado y 40 MB de entrada.
- **Control de mover de 48 px** sobre la selección, tanto en Bordados como en
  Extras. Se adapta a zoom, scroll y tamaño de pantalla; al llegar a un borde
  cambia de lado para seguir accesible. Las flechas del teclado ajustan un píxel
  de pantalla (Mayús: diez), convertido a coordenadas físicas sin redondearlas.
- **Selección más fácil:** letras, logos y grupos de la vista armada responden
  también en su caja y alrededor de sus líneas. El arrastre usa el centro del
  objeto y el desfase del dedo; agarrar el botón no lo hace saltar. Funciona en
  vistas físicas y lados en espejo. Un gesto cancelado no guarda movimiento;
  soltar fuera de una pieza válida conserva la posición anterior.
- **Persistencia y salida reales:** el archivo permanece en IndexedDB y ZIP;
  el PDF incluye el logo con su transparencia en ficha, transferencia 1:1 y guía
  de ubicación cuadriculada. También aparece en las capturas y el prompt de la
  lámina editorial. Un archivo ausente/corrupto produce un error claro; no se
  exporta un rectángulo vacío. No hay conversión automática a puntadas.
- **Revisión de PDF:** un grupo oculto dentro de otro grupo ahora se omite también
  de las miniaturas, evitando un fallo al exportar un logo oculto.
- **Publicación anterior verificada:** el despliegue pendiente del 30 de octubre
  terminó. La prueba del sitio público pasó con las 110 imágenes, intervención
  sin recarga y PDF del pañalero de 18 páginas/9 plantillas. Se cerró la
  [incidencia #1](https://github.com/elliemarin/MiPrimerApp/issues/1).

Validación final: **2,899 pruebas en 66 archivos**, TypeScript y compilación para
GitHub Pages correctos. Comprobaciones y archivos de relevo:

- `docs/LOGOTIPOS_BORDADOS.md`: importación, archivos y capturas editoriales.
- `docs/LOGOTIPOS_PDF.md`: escala, transparencia, espejo y límites de exportación.
- `docs/ASAS_DE_MOVIMIENTO.md`: contrato del control, punteros, zoom y extras.
- `tests/browser/logo_move_smoke.py`: móvil 390 px y escritorio 1440 px; logo,
  letra de 3 mm tocada en su hueco, control de 48 px, arrastre exacto, cancelación,
  tamaño proporcional, reapertura, ZIP y PDF real.
- `tests/browser/move_handle_smoke.py`: extras en pierna espejo, zoom, piezas,
  cambio de cara, flechas y cambio de tamaño de ventana.
- `tests/browser/production_logo_smoke.py`: recorrido contra el build compilado
  con prefijo `/MiPrimerApp/`, sin módulos de desarrollo; guardado y reapertura
  desde IndexedDB, PNG transparente de 70 mm y PDF del pañalero de 21 páginas.
- `tests/browser/embroidery_image_import_smoke.py`: PNG/WebP alfa, EXIF, imagen
  grande, archivo corrupto, ZIP y capturas editoriales.
- PyMuPDF confirma controles de **50/100 mm**, logo de prueba de **50 × 25 mm**
  y logo colocado desde la interfaz de **80 mm** de ancho, con canal alfa.

**Pendiente de dispositivo físico:** Safari/iPhone, carrete y formatos HEIC/AVIF
dependientes del navegador; impresión al 100 % en la impresora real. El panel
avanzado SVG/DST sigue requiriendo digitalizar las imágenes. No se certifica
compatibilidad de puntadas con la Singer HD9120 ni se promueven los patrones
experimentales a probados por este cambio.

## Prenda completa, pañalero y 44 disfraces (2026-10-30)

El recorrido principal ahora es **Base →
Extras sobre la prenda completa → Telas y colores → Bordados → PDF**. Se conservan
los proyectos existentes, sus medidas físicas y las piezas independientes.

- **Intervenir sin recargar:** se reprodujo el fallo con dos despliegues reales.
  El service worker anterior activaba una actualización mientras la pestaña
  seguía necesitando módulos de la versión vieja. Ahora espera a **Guardar y
  actualizar**, guarda antes de activar y conserva la página si guardar falla.
  La hidratación de IndexedDB también protege cambios y eliminaciones concurrentes.
- **Primera actualización desde la versión anterior:** cerrar todas las pestañas
  y ventanas de Hilvana, incluida la app instalada, y abrirla de nuevo. Recargar
  una pestaña antigua por sí solo puede dejar el worker nuevo esperando. No borrar
  los datos del navegador. Las actualizaciones siguientes usan el nuevo aviso.
- **Vista armada compartida** entre Extras y Acabados, con frente/espalda donde
  hay correspondencias físicas. Arrastrar coloca el centro en mm sobre una pieza
  real y distingue copias derecha/izquierda y caras de manga. El bolsillo genera
  su propio patrón; no altera el contorno de corte de la prenda. **Piezas** queda
  como vista técnica opcional. Las letras y ventanas de cámara no se invierten
  en las instancias en espejo; la guía canónica PDF compensa esa orientación.
- **Materiales más sencillos:** un botón para todo el diseño y excepciones al
  tocar una zona, solapa o marco. Fotos/carrete permanecen en Telas. Después se
  pasa a bordados sobre la misma vista, con arrastre, tamaño, borrar y deshacer.
  Las herramientas secundarias quedan plegadas. Alas, colas y accesorios de
  personaje sugieren primero decoraciones; los bolsillos siguen en Todos. Se reduce el texto en móvil
  para conservar espacio de selección sin esconder la prenda.
- **Pañalero / body real:** un diseño, manga corta o larga, tallas por meses
  RN–24 meses o medidas personalizadas. Apertura frontal y entrepierna con
  broches, tapetas integradas, mangas, ribetes medidos y refuerzos. Nueve
  plantillas (17 piezas contando copias); no es un cuello envolvente. Se corrigió
  también la doble reducción de las antiguas ilustraciones infantiles.
- **40 construcciones nuevas de disfraz → 44 diseños en esa colección:**
  tabardos, chalecos, faldones de pétalos/hojas/tentáculos, alas, colas, diademas,
  cuellos, puños, polainas, pecheras, faja y cuatro conjuntos. Cambian contorno o
  inventario; tamaños y colores siguen dentro del mismo diseño. Los conjuntos
  conservan IDs por componente, reversos, refuerzos, márgenes y pasos reales.
- **Catálogo:** 1,923 registros, 1,846 recetas con motor, **110 diseños editables**.
  Bebé tiene siete diseños agrupados. Se mantiene la clasificación estricta y
  los 269 recursos externos de la entrega anterior en su biblioteca separada.
- **Imágenes generadas con IA:** fotografías ilustrativas propias para los 110
  diseños, optimizadas en láminas WebP. Se usan en catálogo, detalle y variantes;
  el estudio editable y los patrones conservan geometría vectorial. Las imágenes
  son referencias visuales, no fotografías de muestras cosidas verificadas.

**Verificado:** 2,859 pruebas en 61 archivos. Recorridos reales a
320/390/1440 px, arrastre táctil y ratón, cambios de lado y vista técnica,
material global y de solapa, fotos, bordados legibles y conservación al reabrir.
Auditoría por interfaz de las 53 familias nativas. Pañalero: nueve plantillas en
PDF de 19 páginas. Tabardo, kit dragón y alas de hada: seis descargas verificadas;
comprobación vectorial de controles de 50/100 mm, cuadrícula de 10 mm, colores,
manifiesto y PrintScaling=None. Las 110 imágenes se cargaron y decodificaron
en auditoría a 390/1500 px. TypeScript y build para Pages pasan. El build
con prefijo `/MiPrimerApp/` abre Intervenir sin recargar, descarga el PDF del
pañalero y conserva la biblioteca y sus imágenes al recargar sin conexión
(`tests/browser/production_smoke.py`).

**Límites que debe conocer la siguiente IA:** los patrones nuevos siguen como
experimentales hasta imprimir y coser muestras. La vista armada es orientativa
2D, sin simulación de caída ni vistas laterales inventadas. Babero, gorro, cojín,
dona y banderín conservan una cara física principal. Los proyectos antiguos sin
identidad de lado se asignan a una copia determinista, sin duplicar extras;
pueden recolocarse después. Un bordado superpuesto a un bolsillo sigue anclado a
la pieza base, no se convierte automáticamente en hijo del bolsillo. Verificar
Safari/iPhone y cámara en dispositivo físico sigue pendiente.

**Siguiente paso recomendado:** confeccionar muestras del pañalero y de una
construcción de cada familia de disfraces; registrar medidas, correcciones y
fotos antes de cambiar su estado. Después añadir correspondencias de costado
verificables y anclaje opcional de bordado a un bolsillo independiente.

Relevo técnico: [actualización sin recarga](docs/INTERVENIR_SIN_RECARGA.md),
[vista armada](docs/VISTA_ARMADA.md),
[acabados](docs/ACABADOS_EN_DISENO_COMPLETO.md),
[pañalero](docs/PANALERO_BEBE.md) y
[disfraces](docs/DISFRACES_AMPLIADOS.md) e
[imágenes del catálogo](docs/IMAGENES_CATALOGO_IA.md).

## Catálogo auditado, fuentes gratuitas y decoraciones (2026-10-30)

**Relevo anterior.** Se revisaron los **1,882 registros** del
catálogo, incluidas las variantes y referencias sin motor. Se conservan los
**1,804 patrones paramétricos agrupados en 69 diseños**; la ampliación de fuentes
externas no infla ese número ni convierte PDF descargados en geometría editable.

- Taxonomía explícita por construcción, independiente de las colecciones y de
  menciones de mejoras futuras. Hoodie, sudadera sin capucha, chaqueta, capa,
  poncho y los tipos de fundas/bolsos se distinguen. La búsqueda acepta español,
  inglés y «hoddie» sin mezclar cualquier objeto con capucha. El CSV de auditoría
  registra cada ID, sus etiquetas, parámetros, disponibilidad y destinatarios.
- **Bebé** visible junto al buscador, con seis diseños que generan patrón y
  selector de meses. No se confunde edad con categoría de objeto; unisex sirve
  para destinatarios adultos, sin habilitar recetas de adulto para bebé.
- Filtros combinables de tipo exacto, destinatario, tejido, ajuste, dificultad,
  elasticidad, técnica y colección. Etiquetas activas removibles, estado vacío
  claro y recuperación segura de búsquedas guardadas. Se revisaron técnicas y
  niveles contra la construcción real, no contra adornos potenciales.
- Dos bibliotecas explícitas: **Patrones editables / Gratis de internet**.
  Los resultados externos ya no aparecen debajo de búsquedas nativas filtradas.
  Las fuentes gratuitas tienen búsqueda, categoría, idioma, autor, acceso y
  filtro de fichas con muestra documentada, con persistencia independiente.
- **269 diseños/proyectos gratuitos de siete autores**, 227 enlaces directos
  a PDF verificados, 11 con instrucciones en español y 258 en inglés. Cada ficha
  separa patrón e instrucciones, indica cuando comparten PDF, cuando se corta
  por medidas y cuando el autor pide correo/pedido gratuito. No se hicieron
  pedidos ni registros en nombre de la persona usuaria.
- **Nueve PDF originales locales** de Bikes & Bloomers, con permiso CC BY-NC-SA,
  atribución y manifiesto SHA-256. Los demás archivos se enlazan a sus autores;
  no se republican PDF que prohíben redistribución. Los archivos grandes no se
  precargan con la PWA. El índice local está en `public/pattern-library/`.
- Los dos PDF de hada aportados se revisaron: seis hojas de patrón y cinco de
  instrucciones. La ficha detalla piezas/materiales y enlaza el pedido gratuito
  y el tutorial oficial. No se inventaron enlaces PDF públicos ni se publicaron
  los adjuntos, cuyos enlaces de pedido son temporales.
- Ilustraciones revisadas de los **69 diseños**: fundas con objetos de referencia,
  textiles de hogar reconocibles, frunces, lazos y mangas caídas. Se omiten
  bolsillos opcionales que la base no corta. La capa visual se usa en catálogo,
  detalle y selector; conserva intactos el patrón y las zonas del estudio.
- **Extras → Decorar:** 22 opciones nuevas, 433 extras totales en 15
  construcciones. Encajes, blondas, flecos, pompones y cintas comprados generan
  metraje/colocación; olanes fruncidos/plisados y bandas generan sus piezas de
  corte reales. Incluye color, arrastre, persistencia y guías de montaje.
  Una intervención con solo mercería exporta instrucciones y colocación sin
  inventar una plantilla de encaje.

**Verificado:** recorridos Chromium 320/390/1440, las 43 familias nativas por UI,
bebé y meses, filtros combinados/persistentes, separación de bibliotecas y las
269 fuentes. PDF local descargado desde la app; nueve copias con hash intacto.
Decoraciones: PDF de 24 páginas, tres plantillas, marcas de 10 mm y controles
de 50/100 mm; intervención de solo mercería con cero plantillas. Regresión de
materiales/fotos/modelos y auditoría visual sin cambios en geometría guardada.
Suite final: **2,435 pruebas en 55 archivos**, TypeScript y build para Pages
correctos. Auditoría de las 269 fuentes sin incidencias de metadatos/integridad.
También se comprobó la **app publicada**: búsquedas específicas, bebé 0–6 y
aplicación de adornos a 390 px; fuentes gratuitas a 320/390/1440 px, filtros
persistidos, ficha del hada y descarga real de una copia PDF de 24 páginas.
Publicación funcional `b064c1b`: ambos flujos de Pages finalizaron correctamente.
La prueba de descarga usa el proxy heredado cuando se ejecuta desde la nube.

**Pendiente real:** imprimir y coser muestras de las nuevas decoraciones;
comprobar iPhone/Safari/cámara y los permisos de descarga en dispositivo físico.
Las fuentes externas conservan tallas y márgenes propios y aún no se editan
dentro del estudio. Las nueve prendas históricas tienen UK 12 aproximada e
instrucciones mínimas, como informa su autor. Revisar enlaces y erratas con los
scripts antes de actualizar hashes/fechas. Una revisión digital no equivale a
una prueba de confección.

Relevo: [auditoría del catálogo](docs/AUDITORIA_CATALOGO.md),
[navegación](docs/NAVEGACION_BIBLIOTECA.md),
[fuentes gratuitas](docs/FUENTES_GRATUITAS.md),
[fuentes en español y copias autorizadas](docs/FUENTES_ESPANOL_Y_ABIERTAS.md),
[ilustraciones](docs/AUDITORIA_ILUSTRACIONES.md) y
[decoraciones](docs/DECORACIONES_Y_MERCERIA.md).

## Diseños agrupados, disfraces y muestras documentadas (2026-10-30)

**Relevo anterior.** La biblioteca reúne **1,804 recetas en 69
diseños con patrón**. Las medidas y versiones se eligen dentro de cada diseño.

- Una tarjeta por construcción: largos, capacidades, asas y otras medidas
  pasan a selectores antes de crear. Se conservan todos los IDs, parámetros,
  enlaces anteriores y proyectos. Las variantes se resuelven a recetas reales;
  no se inventan combinaciones cuando una opción exige ajustar otra medida.
- Talla corporal separada de medidas del diseño: Chica/Mediana/Grande, meses o
  medidas propias. Los presets de adultos se excluyen al elegir bebé, incluso
  si se cambia de destinatario después de haber elegido un largo adulto.
- Búsqueda y filtros operan antes de agrupar; el representante cumple la
  selección. Buscar o cambiar destinatario/tela/ajuste conserva la colección.
- **Elegir una tela o subir foto** abre inmediatamente una hoja visible en
  Acabados. Incluye buscador, catálogo, cámara y carrete. Aplicar/cerrar/Escape
  devuelve el foco a la parte. La bandeja de arrastre continúa en Estudio.
- Nueva colección **Disfraces**: capa semicircular reversible, corona de cinco
  o siete puntas, sombrero cónico con ala y orejas para diadema. Cuatro motores
  y quince recetas agrupadas, con piezas, márgenes, medidas, materiales y pasos
  reales. Ilustraciones propias y vista de materiales/fotos por pieza.
- **Qué incluye el patrón** muestra despiece, cantidades, medidas/márgenes,
  materiales, instrucciones y alcance. Calcula una referencia con el motor
  real sin guardar proyectos/perfiles; informa su comprobación geométrica.
- **Patrones con muestra confeccionada** reúne diez fuentes externas concretas,
  con búsqueda, categorías y fichas detalladas. Documenta muestras de sus
  autores y enlaza el original; no afirma verificación física de Hilvana ni
  garantía del 100 %. Los PDF externos todavía no son editables en el estudio.

**Verificado:** 2,349 pruebas en 50 archivos, TypeScript y build para Pages.
Chromium 320/390/1440 px: agrupación, selección de medidas, filtros combinados,
bebé 0–6, enlaces anteriores, materiales visibles y persistencia, fichas sin
guardar, fuentes y navegación directa. Regresión de confección: PDF de 32 y
69 páginas, doce plantillas en el proyecto completo. Nuevos PDF: capa de 24
páginas/dos plantillas y sombrero de 22/seis, con controles de 50/100 mm y
manifiestos válidos. Se comprueban extremos de medidas, márgenes independientes
y unión cono/ala con diferencia inferior a 0,02 mm. Regresión editorial aprobada
en tres anchos y sin Web Share: PNG/ZIP, prompt y transferencia conservados.

**Pendiente:** imprimir y coser las cuatro construcciones nuevas, registrar
fotos/medidas/telas y corregir lo observado antes de promover su estado. Siguen
**Experimental**. Probar cámara, accesibilidad y compartir nativo en iPhone;
revisar periódicamente los enlaces y correcciones de los autores externos.

Relevo: [docs/DISENOS_Y_MEDIDAS.md](docs/DISENOS_Y_MEDIDAS.md),
[docs/DISFRACES_Y_PATRONES_CON_MUESTRA.md](docs/DISFRACES_Y_PATRONES_CON_MUESTRA.md),
[docs/DISFRACES_ORIGINALES.md](docs/DISFRACES_ORIGINALES.md) y
[fuentes revisadas](docs/FUENTES_PATRONES_SELECCIONADOS.md).

## Láminas editoriales para el ChatGPT personal (2026-10-30)

Se añade **Preparar lámina** al terminar en
Acabados, al ver el modelo y desde el PDF de confección.

- Una prenda/accesorio o hasta seis proyectos por look, con nombre, número y
  ambiente opcional. Estilo fijo `HILVANA_EDITORIAL_V1`: papel marfil, figura
  principal y espalda, prendas separadas, paleta y detalles como la referencia.
- Prepara localmente PNG con vistas reales, fotos de telas, colores, extras,
  bordados y miniaturas del despiece validado. Conserva todas las referencias
  mediante paginación y los contornos de patrones se presentan «sin escala».
- Compartir nativo cuando el dispositivo admite los archivos. Alternativa:
  descargar PNG, copiar prompt y abrir ChatGPT para adjuntar/pegar/enviar. ZIP
  con texto, imágenes e inventario SHA-256. No se usa una API ni se envía nada
  automáticamente; el navegador no garantiza abrir ChatGPT con fotos pegadas.
- Si cambia el diseño, talla, materiales o selección, exige actualizar las
  referencias. Los datos privados del perfil/notas no se añaden al paquete.
  Los patrones de confección y sus medidas permanecen intactos.

**Verificado:** 2,294 pruebas en 45 archivos, TypeScript y build para Pages.
Recorrido editorial en Chromium 320/390/1440 px, fotos y colores de los PNG,
ZIP/hashes, estilo constante, copia manual, compartir/cancelar simulados,
persistencia y tres puntos de entrada. Regresión del recorrido completo y PDF
de 69 páginas/doce plantillas con controles de 50/100 mm.

**Pendiente:** hoja real de compartir en iPhone/Safari y Android con ChatGPT
instalado; revisar una generación enviada por el usuario. El prompt conserva
el estilo, pero la imagen generada puede variar. Se mantienen las verificaciones
físicas de patronaje pendientes de las entregas anteriores.

Relevo: [docs/LAMINAS_EDITORIALES.md](docs/LAMINAS_EDITORIALES.md) y
[docs/CHATGPT_PERSONAL_COMPARTIR.md](docs/CHATGPT_PERSONAL_COMPARTIR.md).

## Ilustraciones profesionales, figurines y telas recientes (2026-10-30)

Se conserva la identidad y el recorrido de
Hilvana; esta entrega mejora los dibujos y reduce las herramientas visibles.

- Catálogo con acabado vectorial compartido: paletas por familia, volumen
  discreto, costuras, pespuntes y herrajes. Cojines proporcionados y fundas para
  bebida montadas; los dibujos no cambian las piezas del patrón.
- Figurines originales con anatomía, rostro, manos, pies y cabello nuevos.
  Cuatro siluetas, ocho tonos iniciales más color libre, proporciones adultas o
  infantiles y espalda. Los SVG funcionan sin red ni un servicio de IA.
- En el detalle de prendas: **Prenda / En figurín**. En Acabados: **Ver en
  modelo**, para revisar los colores y fotos elegidos en las piezas. Hereda
  materiales del delantero, espalda, mangas, capucha y acabados integrados;
  distingue peto/falda y exterior/asas. Las composiciones con paneles distintos
  se revisan en las piezas, sin inventar su montaje sobre un cuerpo.
- Composición específica de capucha bajada, mangas caídas de haori/cárdigan,
  cintura y tirantes de jumper, proporciones de bebé. Los monos antiguos de
  referencia sin una composición coherente conservan la vista plana. El estudio
  usa también vista plana cuando proyectar una manga/capucha desplazaría un
  bordado o imagen existente. La geometría y coordenadas físicas no se alteran.
- Estudio con **Mover, Dibujar, Bordados, Telas y Más**. Se retira Imagen de la
  barra; Más conserva funciones avanzadas, propiedades, capas, vistas y cortes.
  Borrar y Deshacer siguen funcionando.
- **Telas → Tomar foto / Elegir del carrete**. Las nuevas aparecen primero en
  Mis telas y en Estudio/Acabados, también después de recargar. No se obliga a
  calibrar al importar. Se espera el guardado antes de anunciar éxito; ante un
  fallo se ofrece Reintentar. Se conservan fotos y diseños anteriores.
- Exportación del figurín a SVG autónomo con fotografías incrustadas y trazos
  incluidos; el archivo no depende de URLs temporales ni del CSS de la app.

**Verificado:** 2,272 pruebas en 41 archivos, TypeScript y build para Pages.
Chromium 320/390/950/1440 px: cámara/carrete, muestras recientes, recarga,
barra única de cinco controles, piel/silueta, fotos reales sobre modelo y
patrones intactos. Regresiones de basurita, foto/calibración y cortes de paneles
aprobadas; el PDF conserva controles de 50/100 mm. SVG fotográfico autónomo
comprobado. Se revisaron visualmente hoodie, haori, cárdigan, pantalón, falda,
jumper y bebé, incluidos cuerpos amplios y vista de espalda.

**Pendiente:** Safari/iPhone físico, permisos reales de cámara/carrete y HEIC,
VoiceOver; muestras físicas de los patrones. El figurín es ilustrativo 2D y
no verifica ajuste, caída ni ubicación de extras: estos se trabajan en las piezas.

Detalle para continuar:
[docs/ILUSTRACIONES_Y_TELAS.md](docs/ILUSTRACIONES_Y_TELAS.md).

## Hilvana 0.2 · interfaz simple y biblioteca diez veces mayor (2026-10-30)

Se conserva el historial de esta entrega y de las anteriores debajo.

- La app abre en un **buscador de prendas y accesorios**. Navegación principal:
  Elegir una base, Proyectos y Más. La biblioteca muestra 24 tarjetas por página,
  filtros combinables y conserva búsqueda, colección y talla de bebé al volver.
- **1,867 entradas**, de las que **1,789 generan patrón**; 1,707 recetas nuevas
  con geometría distinta en 19 colecciones. Son modelos y variantes paramétricas
  de largo, corte, capacidad y acabados, no 1,789 motores independientes ni
  copias por color/talla corporal. Las referencias previas sin motor se conservan
  en los proyectos, pero no se anuncian como patrones en la búsqueda principal.
- Al elegir: **Obtener patrón** o **Intervenir**. Tallas **Chica/Mediana/Grande**
  con contornos explícitos de las tablas propias; opción **A medida** con medidas
  necesarias reales. Bebé conserva meses; accesorios permiten ajustar medidas
  del objeto sin inventar una talla corporal.
- **22 motores**: nueva sudadera/hoodie holgada con delanteros/espalda completos,
  mangas y capucha de dos laterales. Escote con paso de cabeza comprobado,
  base de capucha y cuello coincidentes, sin rib ni cremallera ficticios.
- **411 opciones de extras sobre once construcciones**: bolsillos por uso,
  cierres/solapas, organizadores de 1–8 canales, tiras y portacelular con ventana
  de cámara ajustable. Este último se monta con cinco piezas reales que dejan
  la abertura; no es un agujero dibujado sobre un rectángulo sin despiece.
- El estudio de extras se redujo a buscar, arrastrar, mover, ajustar medidas,
  borrar y Deshacer. Asa táctil de 44 px; en móvil la pieza y la bandeja se ven
  juntas. Un botón acerca la zona. Las nuevas bases usan **piezas físicas**
  para ubicar; se valida que el complemento quepa en el contorno real.
- **Acabados 2D:** obliga a elegir color/tela para cada pieza/zona y superficie
  estructural del extra. La cámara tiene cinco superficies. Aplicar lo mismo a
  todo es una acción explícita. Se conservan fotos como tela. El PDF también
  bloquea el acceso directo si hay materiales pendientes.
- **337 bordados y composiciones originales**, incluidos 151 motivos individuales
  y 186 composiciones; abeja amarilla/negra con alas y otras capas reales. Cinco
  tipografías OFL con letras, números y acentos españoles. Sus contornos conservan
  huecos y curvas, funcionan sin conexión y no dependen del texto CSS del móvil.
- El PDF reúne patrones, instrucciones, materiales, paletas de hilo, guías de
  bordado y **ubicación con cuadrícula de 10 mm**. Códigos E1/B1, origen físico,
  centros X/Y, tamaño, giro y `pieceId` quedan en la guía y manifiesto. Colores
  vectoriales y nombres legibles; no se cambia la escala de la geometría.
- **Corrección de pantalón:** costados delantero/trasero ahora comparten trazado
  y altura de rodilla; la entrepierna sigue resuelta con tolerancia estricta.
  Algunos largos/holguras anteriores daban 3–4 mm de diferencia. Se marca el
  motor Experimental para revisar la nueva muestra; exportaciones de pantalón
  hechas con 0.1.0 se identifican desactualizadas aunque no cambien parámetros.
- `newPatternState` conserva copias de medidas/contexto: editar el patrón no
  puede mutar lateralmente la versión de medidas del perfil.
- Cambiar talla/medidas regenera las vistas físicas al volver a Extras/Acabados.
  El PDF bloquea vistas antiguas o bordados fuera de la pieza actual, conservando
  los extras y sus coordenadas para que se revisen sin escalado silencioso.

**Verificado:** 2,260 pruebas en 38 archivos, TypeScript y build. Catálogo completo,
construcciones, parámetros, márgenes, costuras, fuentes, materiales y posiciones.
Chromium 320/390/1440 px: filtros/bebé 0–6, C/M/G y medidas personalizadas,
arrastre táctil/escritorio con zoom, once superficies, abeja+letras, guardado y
recarga. Proyecto hoodie+cargo+cámara: **69 páginas, doce plantillas**, guías con
cuadrícula de 10 mm y controles de 50/100 mm. Cojín personalizado de 450×350 mm:
PDF de 18 páginas. Siguen pasando las regresiones de basurita y DST por vista.

**Límites:** geometría verificada no sustituye imprimir/coser una muestra ni
simula caída 3D. Las vistas antiguas de foto/dibujo se identifican ilustrativas.
Las guías de bordado son vectores para transferir/digitalizar; no son rellenos
de puntadas ni una integración nueva con la HD9120. Probar Safari/iPhone físico.

Contrato y próximos pasos para Claude:
[docs/INTERFAZ_SIMPLE_Y_BIBLIOTECA.md](docs/INTERFAZ_SIMPLE_Y_BIBLIOTECA.md).

## Recorrido guiado y complementos de confección (2026-10-30)

La creación desde Biblioteca, Base o Intervención ahora lleva a **Personalizar**:
**Base → Personalizar → Estudio → PDF**, siempre dentro del mismo proyecto.
La barra permite volver a las medidas o a cualquier paso. Los proyectos previos
siguen abriéndose con sus datos; no hay migración destructiva.

- **27 opciones originales sobre diez construcciones**: bolsillos de parche,
  punta, redondeados, con botón/velcro/cierre, cargo con fuelle, organizadores
  de tres canales, trabillas y lazo para herramienta. Incluye presets para
  teléfono, lápices, reglas, tijeras con protector y cinta métrica. Las
  recomendaciones dependen de la familia de la base; Todos permite explorar.
- Personalizar ajusta ancho/alto terminados, cantidad, fondo del cargo y
  ubicación. Tocar la vista coloca el complemento; también hay coordenadas
  accesibles. La posición en el dibujo es **ilustrativa** y debe comprobarse
  sobre la prenda; no se presenta como un traslado automático al patrón base.
- Cada opción genera piezas reales con IDs estables, hilo, cantidades,
  márgenes por borde una sola vez, medidas verificadas, materiales y pasos
  de montaje. El cargo incluye cuerpo, fuelle U coincidente con piquetes y
  dos caras de solapa. El cierre incluye cuerpo, respaldo y vistas. Las
  trabillas duplican el ancho de tubo y reservan los extremos para fijación.
- El estudio conserva el vínculo: mover, dimensionar, duplicar, borrar,
  Deshacer/Rehacer, telas y colores actualizan la definición de confección.
  Cuerpo y solapa se pueden pintar por separado. Los detalles constructivos
  se regeneran al dimensionar el conjunto; modificar una parte estructural
  por separado exige revisión y bloquea el PDF en vez de imprimir otra cosa.
- **Dibujar en estudio** abre el lápiz. Se conservan la biblioteca de figuras,
  apliques, bordados, fotos como tela y paneles de collage anteriores. Los
  bocetos sin técnica se declaran referencia; no se inventan piezas ocultas.
- **PDF de confección** reúne en un archivo la ficha, vistas y referencias,
  medidas de cada pieza con/sin margen, cantidades/materiales, plano de corte
  estimado, guía con casillas, patrones base+complementos+paneles, plantillas
  de aplicaciones/refuerzos y guías de bordado 1:1. Lleva índice por páginas,
  cuadrados de control, versiones congeladas y manifiesto JSON adjunto.
- Si se interviene una prenda sin patrón base, el botón y la portada dicen
  **PDF de intervención**: entrega los complementos y decoraciones, sin
  prometer el patrón para confeccionar la prenda original. Los cortes sobre
  los propios complementos también se resuelven en este modo.
- Se bloquea la exportación completa ante geometría inválida, medidas
  faltantes, paneles obsoletos, partes incompatibles o piezas excluidas;
  se ofrecen enlaces para corregirlas. Las exportaciones se conservan y
  detectan cambios posteriores de diseño, patrón o medidas.

**Estado físico:** todos los complementos son experimentales hasta imprimir y
coser muestras. No cambian la talla/holgura de la base. Un figurín no verifica
ajuste, una ilustración no define el despiece, y las guías de bordado del PDF
no son archivos de puntadas. Se mantienen los límites de HD9120/CREATIVATE.

Detalles técnicos, pruebas y próximos pasos en
[docs/RECORRIDO_CONFECCION.md](docs/RECORRIDO_CONFECCION.md).

**Verificado:** 450 pruebas, TypeScript y build de producción; Chromium móvil
390×844 y escritorio 1440×1000. Recorrido real con pantalón M92, tres complementos,
redimensionado/duplicación/borrado/Deshacer, dibujo, color y aplique: PDF único de
47 páginas, nueve plantillas y guías, con controles de 50/100 mm correctos.
Intervención sin base: siete páginas con el bolsillo y su montaje. Probados
guardado/recarga, exclusiones y recuperación, nombres completos en piezas
pequeñas, gestos y regresiones de paneles/haori. Safari y muestras físicas pendientes.

## Basurita en la selección del estudio (2026-10-30)

- Al insertar o elegir una figura aparece una basurita junto a su selección,
  también en móvil, sin abrir Propiedades. El control se mantiene dentro del
  lienzo al mover, girar, ampliar o desplazar la figura.
- Área táctil de 44×44 px y nombre accesible «Eliminar figura seleccionada».
  No inicia gestos del lienzo. Eliminar se registra en el historial: Deshacer
  recupera la figura y Rehacer vuelve a quitarla; el guardado persiste el cambio.
- La selección múltiple conserva su acción de eliminar. El botón respeta el
  bloqueo de los elementos seleccionados y de los hijos de un grupo.
- Verificación:372 pruebas y build; prueba móvil de insertar, borrar, deshacer,
  rehacer y recargar en `tests/browser/delete_selection_smoke.py`.

## Paneles de collage y patrones desde el estudio (2026-10-30)

**Entrega de paneles.** El catálogo suma **160 modelos**, **82 con patrón**
y 21 motores base. Las secciones siguientes conservan las entregas anteriores.

### Qué cambió

- Cinco chaquetas experimentales reales de collage/patchwork, basadas en la
  chaqueta abierta de hombro caído: bandas horizontales, franjas verticales,
  cuadrícula, canesú diagonal y collage geométrico irregular. La composición
  divide las piezas del patrón, no solo dibuja rayas sobre una ilustración.
- El proyecto de estas variantes abre directamente las piezas reales en el
  estudio, con paneles pintables y colores orientativos que se pueden cambiar
  por muestras de telas/fotos. Se conservan las vistas ilustrativas originales.
- En otras prendas con patrón: **Estudio → Generar patrones → Preparar piezas
  reales → Cortar paneles**. Recta funciona arrastrando de borde a borde;
  Por puntos permite cortes quebrados con «Guardar corte». Se pueden cruzar
  cortes, trabajar sobre contornos cóncavos y elegir tela en cada región.
- «Generar patrones de paneles» convierte el diseño a piezas editables en
  Patronaje para descargar PDF/SVG 1:1. Conserva las piezas no cortadas y una
  versión recuperable del patrón anterior. Quitar todos los cortes permite
  restaurar la base. Preparar vistas no borra fotografías ni dibujos existentes.
- Cada nueva unión lleva margen por lado (10 mm por defecto), piquetes
  coincidentes, etiqueta legible C1/C2…, hilo y guía de armado antes del montaje
  de la prenda. Se puede ajustar el margen de un corte en el diálogo de paneles.
  La unión conserva exactamente la línea terminada: no se reduce ni agranda
  la prenda para hacer sitio al margen.
- Se heredan márgenes exteriores, dobladillos, jaretas, cantidades al doblez,
  pares simétricos, marcas, líneas internas y costuras con otras piezas.
  Cuando un panel deja de tocar el doblez se convierte en un par simétrico.
- La tela/color de una zona se asocia al nombre imprimible de su panel.
  Los patrones exportados contienen también orientación, cantidad y marcas;
  las fotos de tela son referencias visuales, no instrucciones de corte automático.
- Los cortes inválidos se rechazan sin aplicar partes del resultado. Si cambia
  la geometría del patrón base, se exige revisar los cortes; se bloquea PDF/SVG
  del editor para evitar entregar las piezas originales como si fueran paneles.
- Se propagan exclusiones de exportación y ocultación a paneles descendientes.
  La versión anterior conserva la base para recuperar el trabajo. Los cortes
  y materiales se guardan en el documento/patrón y viajan en JSON/ZIP existentes.

### Ejemplos y pruebas

- Chaqueta M92: bandas **8 plantillas**, franjas **9**, cuadrícula **22**,
  diagonal **6**, irregular **8**. La cuadrícula contiene 9 paneles de espalda,
  9 de delantero y 4 de manga: 35 piezas físicas al contar los pares.
- Base anterior:310 pruebas y build correctos. Resultado: **372 pruebas**,
  TypeScript y compilación de producción correctos.
- Pruebas matemáticas: conservación del área, márgenes una sola vez, uniones
  coincidentes, piquetes en el mismo punto físico, contorno curvo, concavidades,
  cortes cruzados/quebrados, hilo, doblez/cantidades, estabilidad de IDs,
  materiales, versiones, exclusiones y rechazo atómico de errores.
- Cinco composiciones en cinco tallas adultas; todos los 82 modelos de catálogo
  con motor se crean con sus parámetros reales y pasan validación.
- Chromium 390×844: crear haori desde Biblioteca, preparar piezas, dibujar
  corte recto y quebrado rápido, deshacer, aplicar tela a un panel, generar,
  guardar/recargar, descargar PDF de paneles. 25 páginas, cuadrado de 50 mm y
  barra de 100 mm verificados con PyMuPDF. Variante de cuadrícula abre 22
  plantillas y zonas9/9/4; geometría obsoleta bloquea PDF y SVG.
- Script repetible: `tests/browser/panels_smoke.py` (servidor dev + Python
  Playwright/Chromium/PyMuPDF). Siguen pasando las pruebas móviles previas de
  telas, figuras, pellizco y PDF del haori sin cortes.

### Límites y siguiente trabajo para Claude

1. **Experimental hasta imprimir y coser muestras.** Comprobar planchado,
   encuentros, piquetes y volúmenes de márgenes con retazos de peso parecido.
   Se conserva la talla de la base; no se simulan caída ni elasticidad 3D.
2. Funciona sobre piezas reales generadas o manuales del patrón. La foto o
   dibujo ilustrativo de una prenda no define automáticamente su despiece de
   confección. En esos proyectos, Despiece conserva la exportación de recortes
   decorativos; para paneles de construcción se necesita una base real.
3. Cortes abiertos rectos o quebrados, sin lazos/autointersecciones. Las curvas
   exteriores se aproximan como segmentos con tolerancia de 0.03 mm. Curvas de
   corte Bézier editables y recortes cerrados con hueco quedan para otra etapa.
   Se rechazan tangencias ambiguas y bordes resultantes menores de 0.5 mm.
4. Los delanteros/mangas de la base son pares simétricos: la distribución se
   espeja. Para telas diferentes a izquierda/derecha o verdadera asimetría
   habrá que expandir instancias y mapearlas antes de cortar; no prometerlo hoy.
5. Las vistas de patrón son exactas; las vistas de la prenda/figurín siguen
   siendo ilustrativas y no reciben una proyección 3D del patchwork. Mejorar
   una composición plana ensamblada es un trabajo posterior, sin usarla para
   calcular medidas ni inventar un ajuste.
6. Al cambiar medidas/márgenes de la base, revisar/eliminar cortes antiguos y
   trazar sobre la nueva geometría. Los ajustes manuales de nodos de paneles
   siguen disponibles en Patronaje y pueden necesitar revisión si cambia la
   distribución. Los IDs evitan mezclar ajustes de piezas distintas.

## Segunda ampliación · prendas, accesorios y fotos de tela (2026-10-30)

Esta sección documenta la segunda ampliación. Las cifras más recientes están
en el relevo de paneles situado arriba; se conserva este historial.

### Resultado actual

- **155 modelos** (antes 57): **77 generan patrón**, 5 son flujos de estudio
  sin patrón de confección y 73 son inspiración claramente identificada.
  Hay **58 accesorios**, **36 chaquetas/abrigos** y **12 monos/petos/jumpers**.
  Los enlaces a otras bibliotecas no se suman a estos contadores.
- **21 motores** en total. Once nuevos: chaqueta abierta/chaleco de hombro
  caído; top cerrado/blusón de escote cuadrado; poncho/ruana rectangular;
  jumper de peto con falda fruncida; funda con solapa; bolsa con jareta;
  estuche plano con cierre/forro; delantal con bolsillo/tiras; banda para anudar;
  banderín triangular con jareta; antifaz curvo forrado.
- Los motores construyen piezas paramétricas reales con IDs estables, costuras,
  medidas terminadas, márgenes, materiales y pasos de confección. Se mantienen
  **experimentales** hasta imprimir y coser muestras. Las variantes complejas
  (bomber, cazadora denim entallada, trench, acolchada, biker, monos con pantalón)
  tienen dibujos diferentes y zonas editables, pero **no un patrón anunciado
  falsamente como listo**. No se reutiliza el motor de haori para simularlos.
- Presets utilizables: haoris cortos/largos, cárdigans geométricos, chaqueta
  caja, chaleco abierto, ponchos/ruanas, jumpers mini/midi/maxi, blusones;
  fundas de laptop/tablet/teléfono/libro/lentes/consola, saquitos, bolsas de
  viaje/regalo/zapatos/pan, estuches/monederos, delantales, bandas y banderines.
  Los tamaños en pulgadas de fundas son orientativos: pide medir el objeto.
- **Filtros:** colecciones de Accesorios y Jumpers/monos separadas de Bolsos,
  subtipos de accesorio, chaquetas, holgados/oversize, destinatario y atributos
  combinables. La disponibilidad separa patrón real, diseño de estudio e
  inspiración. Búsqueda por sinónimos (chamarra/chaqueta, jumper/jumppers,
  mezclilla/denim), sin acentos, contador y restablecimiento. Conserva filtros,
  vista de ilustración y talla de bebé al regresar desde una ficha.
- **Ilustraciones:** biblioteca y fichas alternan dibujo técnico/ilustración;
  las prendas se muestran sobre figurín con cuerpo y piel seleccionables;
  los accesorios como objetos. Los monos/petos alinean torso/falda o pantalón
  en cintura. Es composición plana, no simulación de caída ni verificación
  de talla. Se conserva el estudio/figurín exportable de la entrega anterior.
- **Fotos como tela desde el estudio:** Telas → Fotografiar tela / Subir imagen.
  El importador conserva el original y un PNG ligero (máximo 1600 px de lado),
  estima un color de muestra y selecciona la tela automáticamente. Tocar o
  arrastrar a una zona la recorta al contorno real de esa zona. Persiste local,
  en ZIP y en el figurín mediante el modelo Fabric existente.
- **Ajustar foto:** tras aplicar, «Ajustar tela de…» lleva a la zona/elemento
  correcto. «Ajustar imagen a esta parte» cubre sus límites sin deformar la
  proporción de la foto; «Repetir muestra» restaura el mosaico. Se puede girar,
  desplazar y cambiar escala, y abrir Recortar/calibrar. Ampliar la vista de
  la foto no cambia las medidas del patrón ni inventa calibración física.
- **12 bibliotecas externas** investigadas, buscables por tipo de proyecto en
  un directorio plegable de Biblioteca. Incluye fuentes paramétricas, PDF y
  tutoriales, con condiciones y límites visibles. Investigación detallada en
  [FUENTES_PATRONES_AMPLIADAS.md](docs/FUENTES_PATRONES_AMPLIADAS.md).
  No se copiaron catálogos comerciales ni se finge importación editable/API.
- **Defecto previo corregido:** el preset short calculaba el largo antes de
  holgura de tiro/pañal, y usaba un bajo de pantalón largo muy estrecho; en bebé
  cruzaba el corte trasero y descuadraba costuras. Ahora parte del tiro terminado,
  reserva la bajada posible del tiro trasero y el dobladillo, y calcula el bajo
  desde el muslo. Respeta un bajo explícito. Sin aflojar tolerancias ni probar
  largos al azar. Los IDs de todos los modelos previos se mantienen; delantal,
  antifaz y banderín previos pasan de plantilla visual a motor experimental.

### Verificación de esta ampliación

- Base antes de editar: **86/86** y build correctos.
- Entrega: **310/310 pruebas**, TypeScript y build de producción
  `BASE_PATH=/MiPrimerApp/ npm run build` correctos.
- **77 presets completos**: crear proyecto desde su modelo/talla, generar,
  comprobar contornos de corte, costuras y medidas. No se prueba únicamente
  el motor con sus parámetros por defecto.
- 42 pruebas de prendas holgadas en nueve cuerpos; 26 de los nuevos accesorios;
  59 regresiones de shorts (ocho tallas bebé, once mujer y diez hombre, en
  plano/punto, más comprobación de bajo explícito).
- Fotos: conservación original/PNG, archivo válido, tamaño, ajuste de imagen,
  escala/calibración sin mutación del patrón. Los 155 dibujos tienen contornos
  finitos e IDs de zona únicos; estilos representativos revisados visualmente.
- Chromium **390 × 844**: filtros y subtipos, disponibilidad de patrones,
  búsqueda, ilustraciones con piel/cuerpo, volver sin perder 0–6 meses,
  directorio de fuentes, cámara/carga, aplicar foto a zona, ajustar cobertura,
  guardar/recargar, ver textura en figurín y abrir recorte/calibración.
  Sin errores del navegador ni desbordamiento horizontal.
- Scripts repetibles nuevos, con servidor de desarrollo y Python Playwright:
  `tests/browser/library_expansion_smoke.py` y `fabric_photo_smoke.py`.
- Creación desde la ficha de un haori M92 y descarga PDF: 20 páginas,
  cuadrado de 50 mm y barra de 100 mm verificados en el PDF con PyMuPDF.
  Script `tests/browser/garment_pattern_smoke.py`; aún falta imprimir/coser.

### Pendientes y límites para retomar

1. Imprimir y coser muestras de estos once motores; revisar movilidad de
   chaqueta/top, paso de cabeza, unión de mangas, largo de tirantes y fundas
   con el objeto real. Son construcciones geométricas holgadas: no sustituyen
   patronaje entallado, mangas sastre, copa de manga montada o forros de abrigo.
2. Desarrollar motores específicos de bomber/denim/trench/acolchados y mono
   con pantalón; verificar tiro+torso+apertura, nunca unir dos dibujos y
   anunciarlo como patrón listo. Cuellos de suéter/rib siguen pendientes.
3. Las fundas no incluyen acolchado ni protección certificada; estuche plano
   sin base en caja; delantal de sisas rectas sin pinzas; antifaz sencillo sin
   copas moldeadas. Adaptar dimensiones no equivale a talla comercial.
4. FreeSewing es el candidato paramétrico para adaptar; el directorio externo
   no es una integración terminada. Cada diseño necesita revisión de licencia,
   atribución, versión, conversión a IDs/costuras y pruebas. Otras fuentes son
   PDF/tutorial y varias prohíben redistribuir el patrón.
5. Probar cámara/HEIC y gestos en Safari de un iPhone físico. Si el navegador
   no decodifica HEIC, la app pide JPG. Fotos: luz plana, recorte sin pliegues y
   calibración con regla si se desea repetición a escala real. Se proyecta
   textura plana recortada, no se simulan sombras o caída tridimensional.
6. Heredados: muestras de babero/gorro, CREATIVATE y sincronización real,
   bolsillos, acomodo manual de corte, PDF anidado y digitalización profesional.

## Relevo de Codex · biblioteca y estudio (2026-10-30)

**Solicitud:** ampliar los recursos del estudio (telas, patrones, accesorios,
figuras de bordado), recomendaciones, categorías y tallas de bebé funcionales,
arrastrar materiales a zonas/recortes, colorimetría, figurines diversos y estudiar
la Singer Smart Heavy Duty HD9120.

### Entregado en este cambio

- **57 modelos** en biblioteca (antes 44); 29 flujos con generador o estudio.
  Se distinguen patrones de confección, diseños editables y mera inspiración.
  No se anuncian como patrones los modelos que carecen de motor.
- **10 generadores** totales: cinco nuevos motores experimentales de funda
  envolvente para bebidas (lata/vaso), cojín de sobre, dona para cabello,
  bandana reversible y textil rectangular de doble cara. Incluyen piezas,
  costuras, medidas terminadas, márgenes, materiales y pasos; los presets
  permiten individuales, posavasos, servilletas, marcapáginas y tapete de máquina.
  Delantal, antifaz y banderín tienen zonas editables en estudio, todavía sin
  patrón de confección. Se conservan todos los generadores previos.
- **54 tipos de tela + 30 materiales**: búsqueda sin acentos, familias,
  composición, rangos de gramaje/elasticidad, caída, aguja, cuidado, usos y
  motivos para evitar una tela. Son referencias editoriales que dependen del
  fabricante, no mediciones del lote ni certificaciones del material.
- Catálogo con colores y seis estampados procedurales originales. Cada muestra
  se puede guardar como PNG local y usar sin conexión. Se marca **ilustrativa,
  sin calibración ni existencias**. El inventario de insumos empieza en cero.
- Sugerencias por modelo/tejido/elasticidad, con explicación; la mezclilla se
  prioriza en pantalones compatibles. En estudio: **Telas → arrastrar al
  lienzo**, o elegir muestra y tocar zona. Funciona sobre piezas de patrón
  agregadas como vista, zonas de prenda y recortes cerrados; respeta bloqueo,
  máscaras y contorno real. Deshacer/rehacer y persistencia conservados.
- **111 figuras vectoriales originales en 11 colecciones**, buscables por
  nombre/sinónimos: hongos, insectos, animales, botánica, mar, cielo, comida,
  costura, celebración, geometría y naturaleza. Son editables con tamaño físico;
  no se presentan como bordados ya digitalizados. Se conservan los IDs previos.
- Gesto opcional del lienzo para editar con dos dedos un elemento seleccionado;
  fuera del elemento continúa el zoom normal. Los tiradores permiten escalar,
  estirar en un eje y girar; dimensiones exactas siguen en Propiedades.
- Máscaras de zona ahora recortan también la **geometría exportada** antes
  de agregar márgenes; antes solo coincidían visualmente en el lienzo.
- Categorías de destinatario efectivas; selección por meses **0–3, 0–6, etc.**
  conservada desde Biblioteca hasta las medidas del proyecto. Son intervalos
  orientativos de una tabla propia, no tallas universales. 0–3 usa B0-3 (620 mm
  de estatura), 0–6 usa B0-6 (680 mm), y se deben verificar medidas reales.
- **Círculo cromático** táctil/teclado, saturación/luminosidad, HEX y armonías
  complementaria, análoga, tríada y monocromática. Muestras del diseño y telas;
  aplicación explícita a selección o a toda la vista. Pantalla orientativa.
- **Figurines:** cuatro cuerpos × adulto/infantil, ocho tonos de piel naturales
  y color personalizado, cabello, colocación/tamaño de la prenda; preferencias
  guardadas en el diseño y SVG portátil con texturas incrustadas. Es una
  ilustración de composición plana, no prueba de ajuste ni simulación 3D.
- **HD9120:** bastidor 170 × 100 mm y guía CREATIVATE. Exportación de bordado
  por vista y posiciones relativas conservadas (se corrigió que varios motivos
  se centraban uno sobre otro). SVG vectorial y DST de puntada recta siguen
  siendo funciones diferentes; DST **experimental**, compatibilidad física con
  esta máquina todavía no comprobada. Se bloquea SVG/DST en vistas que incluyen
  textos, imágenes, parches o máscaras todavía no soportados por ese exportador
  de contornos, para no entregar cajas o trazados sin recortar como si fueran
  el bordado final.
- Investigación de fuentes y plan concreto para FreeSewing en
  [docs/FUENTES_Y_MAQUINA.md](docs/FUENTES_Y_MAQUINA.md). No hay una API externa
  integrada aún ni se han copiado catálogos comerciales. La opción recomendada
  es adaptar paquetes paramétricos locales, no importar miles de PDFs como si
  fueran geometría editable.

### Verificación

- Antes de editar: **40/40 pruebas y compilación** correctas.
- Después: **86/86 pruebas**, TypeScript y compilación de producción correctos.
- Chromium en **390 × 844**: categorías Mujer/Bebé; 0–3 y 0–6 llegan al
  patrón y se guardan; búsqueda/personalización de telas y PNG persistente;
  inventario; círculo táctil; figurín con texturas y exportación SVG sin enlaces
  blob; sin errores del navegador ni desbordamiento horizontal.
- Navegador escritorio: arrastre HTML de tela a pierna, deshacer/rehacer,
  insertar figura buscada, recargar y conservar el diseño.
- Gestos táctiles mediante CDP: arrastre de tela confirmado; el lienzo Board
  probado con captura de pellizco, fin único y zoom alternativo. En el estudio
  integrado, una estrella pasó de 80 a 336 mm con dos dedos; se corrigió que
  los avisos flotantes interceptaran los toques. Scripts repetibles en
  `tests/browser/studio_smoke.py` y `studio_touch.py` (servidor dev + Playwright).
- Navegador: descarga real DST del frente y bloqueo al elegir una espalda
  mayor al bastidor; `tests/browser/embroidery_smoke.py`.
- Pruebas numéricas nuevas: geometría de accesorios, talla/categoría,
  recomendaciones, límites de los 111 contornos, máscaras con giro/espejo/
  recorte, composición y aislamiento de vistas DST, colorimetría y figurines.

### Permisos corregidos y publicación

La primera entrega quedó bloqueada por 403 en push, API y fork. Tras el ajuste
hecho por la persona usuaria, la comprobación `git push --dry-run origin
HEAD:main` pasó y el remoto seguía en el commit base `6a5dcab`, sin avances
intermedios que integrar. Se sube el cambio de biblioteca/estudio junto con este
relevo actualizado. Consultar Actions para el resultado final de la publicación;
no confundir subida del código con despliegue terminado.

El respaldo local anterior sigue disponible, pero su nota de bloqueo describe
el intento inicial; esta bitácora del repositorio es el estado más reciente.

### Siguiente trabajo recomendado para Claude

1. Comprobar Actions/Pages tras la subida y revisar la app publicada. Conservar
   esta bitácora y los cambios posteriores de otras personas.
2. Probar Safari y VoiceOver en un iPhone físico: arrastre, pellizco, gestos
   cerca de los tiradores y zonas pequeñas. Chromium móvil no sustituye iOS.
3. Imprimir a 100 % y coser muestras de los nuevos accesorios (además de
   babero/gorro previos) antes de promoverlos de Experimental.
4. Probar CREATIVATE → Device con un motivo pequeño, confirmar formatos con
   Singer y bordar en retazo. El manual no enumera extensiones. No prometer
   conexión directa, DST/XXX/VP3 universal ni rellenos/satén automáticos.
5. Prototipo FreeSewing: un diseño con licencia/versión registradas, adaptador
   de piezas y pruebas de costuras/holgura/mm; después torso+manga, camiseta,
   sudadera y body. Véase la investigación. No confundir escala visual con
   graduación paramétrica.
6. Biblioteca más amplia de accesorios con patrón real: estuche de laptop,
   funda de libro, neceser, organizador y cesta con base. Mantener estados
   honestos y medidas del objeto, sin tablas corporales ficticias.
7. Mejorar ajuste inicial de la prenda en figurín por familia/vista y permitir
   combinar superior e inferior; hoy es la vista elegida con posición manual.
8. Editar recomendaciones y gramajes con fichas de fabricantes concretos;
   permitir vincular un tipo de catálogo con una tela física del inventario.
9. Quedan las tareas anteriores de sincronización real, bolsillos, acomodo
   manual de corte, PDF de tallas anidadas y digitalización profesional.

## Hecho y verificado

### Núcleo (src/lib)
- Unidades en milímetros; vista en cm o pulgadas sin pérdida (`units.ts`).
- Geometría: vectores, Bézier (longitud por Gauss-Legendre), homografía,
  acomodo por estantes, desplazamiento robusto de polígonos con Clipper.
- Motor de patronaje: piezas con ids estables, márgenes por borde con esquinas
  en espejo en dobladillos y jaretas, validación (contornos, cruces, márgenes,
  costuras, piquetes, medidas terminadas), ajustes manuales por id con revisión
  al regenerar, anidado de tallas y comparación con versiones.
- Generadores implementados: pantalón de cintura elástica (recto, ancho,
  jogger con puño; bebé con pañal), falda fruncida, bolsa tote con base en caja.
- Generadores experimentales (falta revisar una muestra impresa): babero con
  broche (escote verificado sobre la geometría) y gorro de punto.
- PDF carta 1:1 vectorial: mosaico con márgenes y solapamiento configurables,
  códigos de hoja, rombos de alineación, líneas de recorte, mapa de montaje,
  cuadrado de 5 × 5 cm y barra de 10 cm verificados al milímetro,
  `PrintScaling=None`, JSON de trazabilidad adjunto, plantillas acomodadas sin
  escalar y SVG 1:1.
- Ficha del proyecto en PDF (vistas vectoriales, medidas, materiales con
  supuestos, plano de corte estimado, pasos con casillas, técnicas, avances).
- ZIP completo del proyecto e importación (probado de ida y vuelta).
- Sincronización con repositorio privado de GitHub (probada contra una API
  simulada; **falta probar con una cuenta real** — marcada Experimental).
- DST experimental: puntada recta con verificación de bastidor (prueba de ida
  y vuelta del formato).

### Interfaz (src/features)
- Biblioteca: 160 modelos con filtros (destinatario, prenda, dificultad, talla,
  tejido, elasticidad, ajuste, técnica), dibujos técnicos paramétricos de
  frente, espalda y costados, tablas de tallas explícitas, fotos de referencia
  con permiso de uso, estado honesto (implementado / experimental / pendiente).
- Medidas: perfiles por persona, 22 medidas con guía visual, tablas de
  referencia, versiones con aprobación y bloqueo (editar una versión usada crea
  otra), comparación entre versiones.
- Patronaje: lienzo con reglas físicas, zoom y gestos; herramientas Mover,
  Puntos (nodos y tiradores), Medir, Comparar costuras, Trazar (con modo
  asistido que se ajusta a bordes), Calibrar; paneles de medidas/holguras,
  pieza (márgenes por borde, girar, reflejar, duplicar), revisión (con
  «desenrollar costura»: ambos lados en línea con piquetes y reparto del
  embebido), capas de referencia, anidado de tallas y exportación con vista
  previa de hojas. Coordenadas físicas del cursor.
- Estudio: plantillas con zonas, fotos calibrables, parches, piezas de patrón;
  formas, 111 figuras vectoriales, lápiz, pincel, línea, pluma, texto, imágenes;
  telas con escala real, rotación y desplazamiento; técnicas y acabados;
  recorte libre (polígono o curva), máscaras de zona, capas, grupos,
  alineación, guías con imán; continuidad entre
  vistas con comprobación de alturas; modos apariencia y técnico; comparación
  con versiones.
- Proyecto: estados (idea → terminado), referencias con corrección de
  perspectiva, análisis de prenda desde fotos (lo visto, lo medido, lo pendiente
  y propuesta de patrón compatible), medidas, telas y materiales, despiece,
  guía verificable con imágenes de piezas, versiones (aprobar, restaurar,
  reemplazar con confirmación), exportaciones con dependencias y avisos de
  desactualización, avances con fotos, duplicar, archivar, eliminar.
- Telas: recorte con perspectiva, ajustes de color sin tocar el original,
  calibración física, hilo y sentido del pelo, datos técnicos; inventario de
  materiales.
- Ajustes: unidades, tema, calibración de escala en pantalla, sincronización,
  privacidad (borrar datos, liberar espacio). Ayuda con estado real de funciones.

## Pendiente (orden sugerido)

1. **Probar la sincronización con una cuenta real de GitHub** (repo privado y
   token de grano fino). Quitar «Experimental» solo después.
2. **Imprimir y coser muestras** del babero y el gorro, y de la colección Niña
   y Bebé ampliada (`docs/NINA_Y_BEBE_AMPLIADO.md`); si están bien, pasarlos a
   `implementado`.
3. **Más patrones** siguiendo `AGENTS.md §5`: bloque de torso y manga para
   camiseta, sudadera y body de bebé. Cada uno entra como `experimental`.
4. **Ampliar complementos**: ya hay módulo reutilizable de bolsillos aplicados,
   cargo, cierres y trabillas. Faltan bolsillos internos/laterales que modifiquen
   las costuras de la base; primero imprimir y coser las muestras existentes.
5. **Plano de corte manual**: acomodar piezas sobre el ancho real de la tela
   (hoy se estima por rectángulos).
6. **Exportación de patrón por tallas anidadas** en un solo PDF.
7. **Bordado**: digitalización real (rellenos, satén) requiere un motor
   dedicado; hoy solo hay puntada recta experimental.
8. **3D**: no implementar sin simulación física real.
9. Pulir dibujos técnicos de abrigos (solapas) y vestidos.
10. Accesibilidad: pruebas con VoiceOver en iPhone.

## Tareas para la persona dueña del repositorio

- **Renombrar el repositorio** a `hilvana` (Settings → General → Repository
  name). El flujo de despliegue usa el nombre del repo automáticamente; después
  de renombrar, la app quedará en `https://elliemarin.github.io/hilvana/` (si no
  se actualiza sola, ejecuta Actions → «Publicar en GitHub Pages» → Run workflow).
  Actualiza también el remoto local: `git remote set-url origin https://github.com/elliemarin/hilvana`.
- **Permisos de colaboradores**: en un repositorio de cuenta personal, GitHub
  solo ofrece permiso de escritura a colaboradores. Para dar «admin» a otra
  persona hay que transferir el repositorio a una organización.

## Decisiones tomadas

- Nombre: **Hilvana** (de hilvanar: la puntada provisional con que se prueba
  una prenda). Identidad: papel de tiza, verde de tapete de corte, amarillo de
  cinta métrica para todo lo que es medida, rojo de hilo para errores.
  Tipografías Bodoni Moda (títulos) y Figtree (interfaz).
- Sin servidor propio: datos locales (IndexedDB) + ZIP + repositorio privado de
  GitHub opcional. Así es privado por defecto y gratuito de mantener.
- Hojas carta por defecto: margen 8 mm, solapamiento 12 mm, pie de 13 mm.
- Tablas de tallas propias con códigos que no se confunden con sistemas
  comerciales (E92, M88, H100).

## Límites conocidos

- La vista de apariencia es plana: no simula caída ni ajuste.
- Las plantillas del estudio se escalan de forma aproximada a la persona.
- iOS puede borrar datos de sitios no instalados tras días sin uso: instalar
  en la pantalla de inicio y usar ZIP o sincronización.

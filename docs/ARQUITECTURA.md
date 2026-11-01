# Arquitectura de Hilvana

Documento técnico de referencia. Explica cómo funciona cada parte y cómo
verificarla. Mantenlo al día cuando cambies una pieza clave.

La entrega visual más reciente se describe en
[`ILUSTRACIONES_Y_TELAS.md`](ILUSTRACIONES_Y_TELAS.md): `FlatArtwork` y `FigureArt`
comparten dibujo vectorial; `garmentComposition` transforma únicamente la
ilustración; `modelMaterials` relaciona materiales de piezas sin mutar patrones.
`fabricOrder` comparte el orden de muestras recientes y `fabricSave` espera la
persistencia antes de confirmar una importación. La barra del estudio tiene
cinco controles y sus funciones avanzadas viven en Más.

## 1. Pila

- React 18 + TypeScript estricto + Vite. Estado global con zustand.
- PWA (vite-plugin-pwa): se instala en la pantalla de inicio del iPhone y
  funciona sin conexión.
- `pdf-lib` para PDF vectorial, `pdfjs-dist` (carga diferida) para leer PDFs
  importados, `fflate` para ZIP, `idb` para IndexedDB.
- Enrutado por hash (`#/proyectos/...`) para que funcione en GitHub Pages.

## 2. Modelo de datos (`src/store/types.ts`)

- `Profile`: persona con `versions[]` de medidas (`MeasurementVersion`). Una
  versión aprobada o usada en una exportación queda bloqueada: editarla crea una
  versión nueva.
- `Project`: referencias, vínculo a perfil y versión, `pattern` (estado del
  motor), `patternVersions`, `design` (documento del estudio),
  `designVersions`, telas, materiales, guía (casillas y notas), notas de avance,
  exportaciones con sus dependencias y registro de cambios.
- `Fabric` y `Material`: biblioteca propia. Una tela está **calibrada** si tiene
  `calibration.mmPerPx`; si no, es una **textura visual**.
- Archivos (fotos, PDF, exportaciones) en el almacén `files` de IndexedDB,
  referenciados por id. `collectGarbage()` borra los que nadie usa.

### Versiones y dependencias

- `makeVersion` guarda una copia profunda y una huella (`stableHash`).
- Cada exportación llama a `freezeDeps`, que crea (si hace falta) la versión de
  patrón o diseño que corresponde al estado actual y registra
  `deps = { measurement, pattern, design }`.
- `projectAlerts` y `exportOutdated` (`src/features/projects/deps.ts`) comparan
  huellas para avisar qué documentos quedaron desactualizados.
- Las versiones aprobadas nunca se sobrescriben: guardar crea una nueva y
  reemplazar requiere confirmación explícita.

## 3. Guardado

`useApp.put/update*` marca la entidad como sucia con un contador de revisión;
`saveNow` escribe todas las sucias en **una transacción** y solo después marca
«Guardado» (si la entidad cambió durante el guardado, sigue pendiente). Ante un
error reintenta cada 15 s y la interfaz ofrece «Reintentar». También se guarda
al ocultar la pestaña.

## 4. Motor de patronaje (`src/lib/pattern`)

- `types.ts`: pieza = nodos con id + bordes (recta o cúbica) con margen y
  acabado por borde (`costura`, `dobladillo`, `jareta`, `doblez`, `orillo`,
  `sin-margen`), piquetes por distancia sobre el borde, hilo, líneas internas,
  cantidad de corte, pares simétricos o al doblez.
- `offset.ts`: contorno de corte. Paralelas por borde, ingletes con límite,
  recorte de esquinas cóncavas e **esquinas en espejo** para dobladillos y
  jaretas rectas (el margen doblado sigue al costado).
- `validate.ts`: contorno cerrado, autointersecciones de costura y corte,
  costura dentro del corte, margen uniforme por borde (detecta márgenes
  duplicados), piquetes, relaciones de costura (igual, embebido, fruncido,
  estirado) y medidas terminadas medidas sobre la geometría.
- `engine.ts`: genera, aplica ajustes manuales por id, detecta los que requieren
  revisión, estima consumo de tela (rectángulos envolventes, supuestos
  explícitos) y acomoda piezas.
- Generadores: `pants.ts` (pantalón de cintura elástica; resuelve la caída del
  tiro trasero por bisección para igualar entrepiernas), `skirt.ts`, `tote.ts`.

## 5. PDF carta a escala real (`src/lib/pdf`)

- `tile.ts`: carta 215.9 × 279.4 mm, margen no imprimible y solapamiento
  configurables, franja de pie de 13 mm. Paso = área útil − solapamiento.
- `export.ts`: portada con instrucción de imprimir al 100 %, cuadrado de 5 × 5
  cm relleno (bordes exactos), barra de 10 cm y de 3 in, leyenda de líneas, mapa
  de montaje y trazabilidad; una página por hoja con contenido, recortada al área
  útil, rombos de alineación en el solapamiento, líneas de recorte, código de
  hoja y barra de control. `PrintScaling=None` y JSON de la exportación adjunto.
- Plantillas pequeñas: `exportPackedPdf` acomoda varias por hoja sin escalar.

### Verificación manual del PDF

```bash
PDF_OUT=/tmp/pdf npx vitest run tests/pdf.test.ts
python3 -c "import pymupdf as f; d=f.open('/tmp/pdf/patron.pdf'); print([round(r['rect'].width*25.4/72,3) for r in d[0].get_drawings() if r.get('fill') is not None][:2])"
```
Debe imprimir `[50.0, 100.0]` (cuadrado y barra en mm).

## 6. Estudio de diseño (`src/features/studio`)

- `model.ts`: documento con vistas (frente, espalda, costados, parche, pieza),
  zonas (trayectos en mm), elementos con tamaño físico (`w`, `h` en mm),
  rotación, relleno (color o tela con rotación, desplazamiento y escala),
  trazo con tipo de puntada, técnica, acabado del borde, margen para el
  recorte, base o refuerzo, zona, máscara y continuidad entre vistas.
- Las plantillas salen de `src/data/flats.ts` (dibujos técnicos paramétricos),
  escaladas de forma aproximada a las medidas del perfil.

## 7. Sincronización y ZIP

- ZIP (`src/lib/zip.ts`): estructura legible con `proyecto.json`, perfiles,
  telas, referencias originales, patrón y diseño (actual y versiones), SVG de
  vistas, exportaciones, avances y `resumen.pdf`. Se importa desde Proyectos.
- GitHub (`src/lib/sync`): la persona crea un repositorio **privado** y un token
  de acceso con permiso de contenido solo para ese repositorio. Los cambios se
  encolan (`outbox`) y se reintentan sin conexión.

## 8. Pruebas

`tests/pattern.test.ts` (geometría y patrones), `tests/pdf.test.ts` (mosaico y
PDF). Ejecuta `npm test` antes de cada commit.


## 9. Biblioteca ampliada y herramientas de diseño (2026-10-30)

- `data/materialLibrary.ts`: 54 fichas textiles y 30 insumos originales;
  `recommendFabrics` puntúa compatibilidad/recomendación por modelo sin inventar
  mediciones. `swatchSvg/Url` producen referencias procedurales (seis motivos).
- `lib/fabricLibrary.ts`: convierte SVG original a PNG y crea `Fabric`/archivo
  locales. No asigna calibración, elasticidad medida ni stock ficticio.
- `FabricTray.tsx`: catálogo/sugeridas/mis telas; HTML drag para escritorio y
  Pointer Events con captura para móvil. `surfaces.ts` localiza el contorno real
  y aplica `Fill` inmutable; el historial vive en `StudioEditor`. Las cargas
  asíncronas leen el documento más reciente antes de aplicar el relleno.
- `data/shapes.ts`: IDs estables, categorías/tags y búsqueda sin acentos;
  contornos originales normalizados 0..100. Se conservan todos los IDs previos.
- `Board.tsx`: `BoardPinch` y ciclo opcional `onPinchStart/Move/End`; si el
  editor no captura el gesto se conserva el zoom. `StudioEditor` guarda un
  documento de inicio y un último preview para un solo commit al terminar.
- `despiece.ts`: las máscaras de zona se transforman desde vista a espacio de
  plantilla y se intersectan después del recorte libre y antes del margen.
- `ColorimetrySheet.tsx` + `lib/draw/colors.ts`: conversiones HSL/HEX,
  selección táctil/teclado y armonías; selección o vista completa como destino.
- `FigurineSheet.tsx` + `lib/draw/figurine.ts`: croquis SVG original, preferencias
  opcionales `DesignDoc.figurine` (compatibles con diseños viejos), capas reales
  del estudio y exportación autónoma con imágenes incrustadas.
- `lib/pattern/generators/accessories.ts`: cinco motores nuevos experimentales;
  mantienen milímetros/IDs/márgenes/comprobaciones del motor existente.
- `lib/sizes/tables.ts`: tabla propia de bebé por intervalos de meses; el código
  se conserva en el perfil y la selección se pasa en la ruta de biblioteca.
- `projects/tabs/embroideryExport.ts`: selección de una sola vista y posiciones
  físicas de los motivos restauradas antes de SVG/DST. Preset HD9120 170×100;
  5 mm de resguardo por lado. No garantiza formato aceptado por la máquina.

Verificación: `npm test` (86 casos) y `npm run build`; pruebas visuales en
Chromium 390×844 y escritorio. Detalles de fuentes y pruebas físicas pendientes
en `FUENTES_Y_MAQUINA.md` y la bitácora principal.


## 10. Más prendas y accesorios; material desde fotografía

- `data/catalogExpansion.ts` separa los nuevos presets/dibujos del catálogo
  original. `catalog.ts` agrega `accesorios` y `monos`; los IDs antiguos se
  conservan. `flats.ts` incorpora estilos y zonas diferentes de chaquetas,
  petos/enterizos y objetos textiles. Ningún dibujo genera piezas de costura
  por el hecho de existir.
- `generators/relaxed.ts`: cuatro motores (chaqueta abierta, top cerrado,
  poncho y jumper de falda). `accessoriesPlus.ts`: siete motores de accesorios.
  Se registran en `generators/index.ts`: 21 motores totales, 77 presets de catálogo.
- `projects.ts/patternFor`: el short resuelve largo desde tiro+holgura+pañal;
  mínimo geométrico incluye descenso del tiro trasero y espacio de dobladillo.
  El bajo por defecto deriva del muslo, con respeto de bajo explícito.
- `features/library/filters.ts` contiene las reglas puras combinables,
  clasificación de disponibilidad y sinónimos. Filtros/vista/talla por meses
  se conservan en sessionStorage; no alteran medidas de proyectos existentes.
- `ModelIllustration.tsx`: ilustración vectorial original sobre croquis, con
  grupos alineados en cintura en enterizos; no usa geometría de costura.
- `data/patternSources.ts` y `PatternSourcesPanel.tsx`: directorio de doce
  fuentes externas con formatos, condiciones y búsqueda; no hay descarga o
  copia automática de sus catálogos ni suma al contador de patrones internos.
- `lib/fabricPhoto.ts`: importador compartido de cámara/fototeca para FabricsPage
  y FabricTray. Preserva original+PNG, reduce a1600px, valida y libera URLs;
  mantiene escala visual hasta calibrar. FabricDetail protege cargas antiguas
  y libera sus URLs también.
- `studio/fabricFit.ts`: `fabricRepeat`, `pathBounds`, `coverFabric` ajustan
  solo el relleno de la zona/elemento, conservando relación de aspecto y
  milímetros del patrón. Inspector/ViewsPanel ofrecen cubrir/repetir, escala,
  giro y posición; StudioEditor lleva a la última zona pintada.

Pruebas actuales:310 unitarias/integración, más scripts móviles de biblioteca y
foto en `tests/browser`. Límites y fuentes en la bitácora y
`FUENTES_PATRONES_AMPLIADAS.md`. Muestras físicas y Safari real siguen pendientes.


## 11. Paneles de construcción desde el estudio

- `lib/pattern/panels.ts`: subdivisión atómica de contornos de costura mediante
  polilíneas abiertas. `PanelCut` almacena IDs, pieza original, puntos en mm,
  margen y huella `pieceGeometryHash`. `panelizePattern` devuelve piezas,
  relaciones de costura, mapa origen→paneles y problemas. Bordes externos
  heredan metadatos; nuevos bordes comparten la línea, margen por cada lado y
  piquetes C1/C2 coincidentes. Curvas exteriores aproximadas a0.03mm.
- `PatternState.panelCuts/panelMaterials` opcionales conservan compatibilidad
  con proyectos anteriores. El motor divide después de ajustes de base; aplica
  ajustes de panel, remapea relaciones/pasos, materiales y cantidades. Los
  pasos para armar paneles anteceden a los pasos de montar la prenda.
  `Piece.panelSource` identifica el origen sin depender del nombre visible.
- `features/studio/panelWorkflow.ts`: deriva vistas reales desde la base sin
  divisiones, asigna zonas por panel, conserva telas al subdividir, valida
  referencias/huellas, transforma cortes en un PatternState y guarda versión
  anterior. Propaga exclusiones de padres y evita reintroducir paneles omitidos.
- `DesignDoc.panelCuts` añade viewId a cada corte físico. StudioEditor ofrece
  Recta/Por puntos, visualización de uniones, deshacer y acceso a generación.
  No captura doble toque en este modo para no consumir puntos dibujados rápido.
- `PanelPatternsSheet.tsx`: prepara vistas, ajusta márgenes, elimina cortes,
  revisa piezas/errores y genera/restaura patrón. Si solo hay foto/ilustración,
  explica cómo usar una base y enlaza al Despiece de apliques existente.
- `data/panelPresets.ts`: cinco distribuciones sobre las piezas reales de la
  chaqueta geométrica; `CatalogModel.panelPreset` vincula cada variante. El
  proyecto vuelve a resolverlas tras elegir medidas/tejido/ajuste definitivos.
  `TopOpts.panelPreset` añade líneas ilustrativas al dibujo de catálogo.
- `ExportPanel.tsx`: bloquea PDF/SVG ante errores `panel-*`; no exporta la
  base como sustituto silencioso de un despiece inválido. La exportación 1:1
  sigue usando el motor vectorial existente, sin escalar las piezas.

Pruebas:372 casos y `tests/browser/panels_smoke.py` más regresiones anteriores.
Relevo/limitaciones físicas detallados en `ESTADO_DEL_PROYECTO.md`.


## 12. Eliminar directamente desde la selección

StudioEditor coloca una acción HTML flotante cerca de la caja transformada de
la figura elegida y limita su posición a las dimensiones del lienzo. Usa
`removeElements` y el historial existentes; el botón no propaga PointerDown al
lienzo, tiene área44×44px y se desactiva con selección bloqueada. CSS específico
`.selection-delete`. Smoke móvil en `tests/browser/delete_selection_smoke.py`.

## 13. Recorrido guiado, complementos y PDF de confección

- `ui/ProjectJourney.tsx`: Base/Personalizar/Estudio/PDF conservando proyecto.
  Nuevas rutas `personalizar/:id` y `confeccion/:id`; creación desde modelos,
  motores o intervención abre `CustomizePage` antes del estudio.
- `data/components.ts`: 27 presets contextuales originales. Motor
  `lib/pattern/components.ts` con diez construcciones reales; extensión opcional
  `PatternState.components`. Engine agrega piezas/materiales/pasos antes de
  panelizar y valida medidas/márgenes/colocaciones/ajustes manuales.
- `features/customize/componentDesign.ts`: grupos y partes con IDs propios,
  snapshot `DesignDoc.componentSelections`, sincronización, lectura desde
  historial, normalización paramétrica y detección de cambios incompatibles.
  StudioEditor actualiza la definición al guardar y normaliza al terminar
  gestos. Inspector/ops conservan el vínculo al dimensionar/duplicar/borrar.
- `lib/pdf/projectPack.ts` prepara, valida y fusiona ficha+patrones+
  aplicaciones+bordados vectoriales, sin escalar geometría. Dos modos:
  confección completa con base real, o intervención con base no incluida.
  `SewingPackSheet` revisa y congela dependencias; `pdf-confeccion` registra
  el documento final con manifiesto adjunto, inventario e índice paginado.
- `summary.ts` imprime todas las medidas/márgenes/materiales/pasos y referencias;
  `FlowDoc.table` envuelve celdas y conserva contenido al pasar de página.
- `draw/drawable.ts` envuelve etiquetas con métricas Helvetica y calcula sus
  cuatro esquinas giradas; `pdf/export.ts` incluye hojas con solo texto y
  mantiene el pie separado de la barra de control. No cambia la escala física.
- `Board.tsx` reconoce doble toque solo entre dos toques breves y cercanos;
  arrastres, trazos largos y pellizcos cancelan la candidatura. Se evita que
  dibujar y tocar otro objeto rápidamente deje seleccionada la figura anterior.

Contrato, comprobaciones y límites físicos detallados en
`docs/RECORRIDO_CONFECCION.md`. Las posiciones sobre dibujos son ilustrativas;
solo `placement.pieceId` define marcas físicas exactas. Los complementos son
experimentales hasta imprimir y coser muestras.

## 14. Interfaz simple, biblioteca paramétrica y colocación física (0.2)

- Entrada por defecto Biblioteca. `LibraryPage/ModelDetail/ModelStartSheet`
  ofrecen búsqueda paginada y Obtener patrón/Intervenir. `quickSizes.ts` conserva
  referencias explícitas C/M/G; las medidas personalizadas no usan valores
  corporales inventados. Los accesorios ajustan parámetros de objeto.
- `catalogCollections.ts`: 1,707 variantes nuevas, 19 colecciones; 1,789 modelos
  con motor en total. `componentCollections.ts`: 411 opciones/once construcciones.
  `hoodie.ts` añade el motor 22; `pants.ts` corrige costados compartidos y rodilla.
- `features/simple/workflow.ts` prepara piezas reales y define superficies/
  elecciones de material. `FinishesPage` reduce edición a materiales y grupos
  de bordado. Ambos pasos usan coordenadas físicas; no hay simulación 3D.
- `vectorPath` conserva curvas y contraformas; `embroidery` identifica grupos
  multicolor/letras. Catálogo de 337 motivos/composiciones y cinco fuentes OFL
  precompiladas, sin llamadas de red en ejecución.
- `pdf/placement.ts` exporta cuadrícula 10 mm, origen 0,0 y posiciones E/B con
  `pieceId`. `projectPack` bloquea materiales pendientes e incluye posiciones
  y guías en manifiesto/PDF. `DrawPath.color/fillColor` conserva paletas.
- Versión 0.2.0 identifica PDF de pantalón 0.1.0 que necesitan revisar el trazado,
  aunque sus parámetros tengan el mismo hash. `newPatternState` copia medidas
  y contexto para no compartir referencias con el perfil.

Relevo, pruebas, licencias y límites en `docs/INTERFAZ_SIMPLE_Y_BIBLIOTECA.md`.

## 15. Referencias editoriales para ChatGPT

`features/editorial` prepara un paquete local desde una selección de proyectos.
`prompt.ts` conserva una dirección de arte versionada y construye el inventario
real; `resolveEditorialPattern` resuelve cortes pendientes sin mutar el proyecto.
`evidence.tsx` rasteriza vistas del estudio, figurines, muestras y miniaturas
validadas con fotos incrustadas y paginación. Las texturas se identifican por
vista y prefijo de parche, nunca por una búsqueda ambigua de zona en todo el doc.

`package.ts` reúne PNG/texto/manifiesto SHA-256 y detecta referencias obsoletas.
`EditorialSheet` se carga bajo demanda desde Acabados/modelo/confección y conserva
preferencias opcionales en `Project.editorial`. `handoff.ts` limita las acciones
a compartir explícitamente, copiar y abrir ChatGPT; la generación y envío final
pertenecen a la cuenta del usuario. No modifica geometría, PDF ni exportaciones
de costura. Contratos, pruebas y límites en `docs/LAMINAS_EDITORIALES.md`.

## 16. Agrupación de diseños y materiales visibles

`data/catalogGrouping.ts` añade metadatos `designGroup` a las recetas existentes,
sin cambiar IDs ni parámetros. `features/library/groups.ts` agrupa después de
filtrar y elige un representante compatible. `ModelVariantPicker` muestra ejes
de medidas; cada elección resuelve una receta existente. `ModelStartSheet`
separa talla corporal y medidas del diseño, limita las recetas al destinatario
y conserva los valores de los enlaces anteriores. Los resultados cuentan
diseños; las pruebas de patronaje siguen recorriendo todas las recetas.

`FabricTray.dialogTitle` permite abrir la bandeja en `Sheet` desde Acabados,
con toque simple, foco inicial y retorno al control de la parte. Sin esa opción
continúa como bandeja con arrastre en Estudio. El catálogo recuerda colección al
buscar o ajustar filtros compatibles. Relevo en `docs/DISENOS_Y_MEDIDAS.md`.

## 17. Disfraces y evidencia de confección

`generators/costumes.ts` añade capa semicircular, corona, sombrero cónico y
orejas: cuatro motores experimentales con cantidades, curvas, márgenes y
uniones explícitas. `costumeCatalog.ts` reúne quince recetas en cuatro diseños.
`FlatSpec.object.detailCount` distingue cinco/siete puntas de corona;
`modelMaterials.ts` mapea colores/fotos por los IDs de sus piezas y excluye
refuerzos/soportes comprados de la composición exterior.

`patternDetailPreview.ts` calcula una referencia de la receta sin guardar;
`ModelPatternDetails` expone despiece, medidas, materiales y pasos del motor.
La comprobación geométrica no promueve el estado de confección.
`curatedPatterns.ts` contiene diez fuentes individuales con evidencia del autor,
idioma, acceso y licencia. `CuratedPatternsPanel` las presenta aparte del
inventario local: enlaces externos, sin copia de archivos ni importación
paramétrica. Relevo en `docs/DISFRACES_Y_PATRONES_CON_MUESTRA.md`.

## 18. Taxonomía, bibliotecas separadas y fuentes gratuitas

`data/catalogTaxonomy.ts` clasifica explícitamente todos los diseños y normaliza
etiquetas de construcción de cada receta. `library/filters.ts` busca identidades
sin contaminar resultados con categorías paraguas, telas mencionadas como
posibilidades o variantes futuras. La agrupación sigue ocurriendo después del
filtrado; los IDs de receta no cambian. Bebé se expresa como destinatario con
meses, separado de la categoría de prenda/accesorio. `scripts/audit-catalog.mjs`
produce el inventario por ID en `docs/auditoria/catalogo.csv`.

`LibraryPage` monta exclusivamente la biblioteca seleccionada. `FreePatternsPanel`
y `freePatternFilters.ts` filtran el índice local de 269 fuentes gratuitas, con
preferencias de sesión independientes. `data/freePatternLibrary.ts` importa
`public/pattern-library/free-patterns.json`; cada entrada distingue URL y formato
de patrón/instrucciones, acceso directo/correo/pedido, idioma real y verificación
HTTP o mediante navegador. La evidencia de muestra se cruza con la curaduría
previa, sin deducirla de un PDF legible.

`assets` solo apunta a las nueve copias que permiten redistribución; sus rutas
se resuelven con `BASE_URL` para Pages. Los enlaces de instrucciones admiten
fragmentos `#page=N`. Los originales de terceros permanecen intactos con licencia,
atribución y SHA-256; no se añaden al precache pesado de la PWA. Los proyectos de
corte por medidas muestran guía de corte, sin prometer plantillas. Los externos
no entran en el motor paramétrico ni se escalan para adaptar una talla.

## 19. Ilustraciones de catálogo y decoraciones de confección

`catalogArtwork.ts` y `CatalogObject.tsx` componen una representación independiente
para `FlatArt catalog`, usada en catálogo/detalle/medidas. Los objetos de contexto
no son zonas, bordados ni piezas almacenadas; `buildFlat`, el estudio y la
proyección de materiales conservan sus coordenadas. Las pruebas comprueban que
la capa visual no muta el modelo físico.

`decorativeComponents.ts` añade 22 presets en **Decorar**. Los cuatro tipos nuevos
en `pattern/decorations.ts` son mercería comprada, olán fruncido, olán plisado y
banda aplicada. Largo montado y ancho visible se guardan en mm; el patrón de un
frunce desarrolla el largo por su proporción y el plisado usa tres veces el
largo, con marcas explícitas. Las tiras compradas generan materiales/pasos y
colocación, sin piezas de corte falsas. La validación reserva el margen superior
del olán sobre la base; márgenes y dobladillos se añaden una sola vez.

`customize/decorationArt.ts` dibuja los motivos y calados originales;
`componentDesign` conserva color/foto, posición e historial. Los cambios libres
de `vectorPath` invalidan la correspondencia con el patrón. `projectPack` evalúa
si una intervención está vacía después de incorporar guías de colocación, para
permitir una intervención útil con solo mercería y cero plantillas. Contratos y
pruebas: `docs/DECORACIONES_Y_MERCERIA.md`.


## 20. Vista armada, materiales y publicación sin interrumpir proyectos

`simple/assembled.ts` proyecta las vistas físicas sobre frente/espalda del diseño.
Las coordenadas y dimensiones guardadas siguen en mm; `assemblySurfaceId` separa
instancias de una misma plantilla, como piernas o mangas. `AssemblyArtwork`
comparte representación entre Personalizar y Acabados, conserva paneles/fotos y
compensa reflejos del arte interior. Los helpers de colocación verifican tanto
el contorno físico como la cara visible de manga. `lib/pdf/placement.ts` agrupa
por pieza e instancia, identifica izquierda/derecha y compensa la guía canónica
para las copias en espejo, sin invertir la plantilla independiente del bordado.

`FinishesPage` ofrece material global, cambios por parte y luego bordados.
`finishEmbroidery.ts` mantiene juntos los elementos multicolor y comprueba
concavidades y límites de cara. `CustomizePage` mantiene los extras independientes
del patrón base y conserva la identidad de lado al moverlos en vista técnica.
Contratos y límites: `VISTA_ARMADA.md`, `ACABADOS_EN_DISENO_COMPLETO.md`.

`babyBodysuit.ts` añade el generador de body con broches y `babyPatterns.ts`
actualiza el ID estable del antiguo body de inspiración; las dos mangas forman
una tarjeta. `costumeExpansion.ts` contiene 40 construcciones y conjuntos con
medidas editables; `costumeFlats.ts` enlaza cada superficie a una pieza real,
incluidos reversos y copias en espejo. Nuevas familias y recetas se clasifican
explícitamente, se registran en `generators/index.ts` y se auditan en CSV.

La PWA usa `registerType: prompt`. `AppUpdateNotice` espera confirmación explícita
dentro de la app y un `saveNow()` exitoso antes de activar el worker; los módulos
viejos siguen disponibles mientras su página los necesita. `store/app.ts` evita
que una carga tardía sobrescriba cambios, incluidos los ya autoguardados. La
migración desde el antiguo worker requiere cerrar la última pestaña una vez.
Prueba reproducible de dos despliegues: `tests/browser/upgrade_navigation_smoke.py`.


`catalogImages.ts` y `ui/CatalogImage.tsx` presentan imágenes de IA originales
para los 110 diseños nativos; 13 láminas WebP suman 1.6 MB. El recorte visual
revisado vive en el mapa de cada celda, conserva la proporción y evita vecinos.
Las fotos ilustrativas nunca proporcionan coordenadas ni medidas al motor.
Las vistas técnicas y el figurín siguen usando geometría editable; los recursos
WebP se precargan para uso sin conexión. Ver `IMAGENES_CATALOGO_IA.md`.

## 21. Logos raster y selección accesible (2026-10-31)

`EmbroideryImageSheet` llama a `embroideryImage.ts`: valida/decodifica la foto,
normaliza orientación y transparencia a PNG y registra el archivo con `addFile`.
La inserción usa una raíz `embroidery.kind: image` y un hijo `kind: imagen`, ambos
con técnica Bordado y medidas físicas. El documento referencia `image.fileId`,
no una URL temporal; los mecanismos existentes conservan el archivo al guardar,
sincronizar y restaurar ZIP. La cancelación de la hoja no modifica el diseño.

`SelectionMoveHandle` es un botón HTML de 48 px sobre el SVG; transforma las
esquinas seleccionadas con `getScreenCTM` y recalcula su posición al cambiar
selección, zoom o ventana. `embroideryPlacement.ts` conserva el desfase en la
vista visible y elige superficie con el centro del objeto. Así el asa flotante
no cambia de pieza por estar encima de ella; las instancias en espejo conservan
escala y legibilidad. `pointInPreview(..., true)` se usa solo durante movimientos
ya capturados; insertar o soltar desde el catálogo sigue limitado al lienzo.
Los polígonos transparentes de selección amplían la zona táctil sin alterar la
geometría guardada o exportada. Cancelar un puntero descarta el estado temporal.

`DrawImage` añade raster afín a `Drawable`; `PdfCanvas.image` conserva alfa,
giro y espejo a escala 1:1. `raster.ts` valida los archivos antes de devolver PDF.
La guía de transferencia y la de ubicación tienen orientaciones independientes.
`visibleDesignElement` aplica visibilidad heredada a raíz e hijos; ocultar un
subgrupo no deja un raster pendiente en miniaturas. `freezeDeps.imageFileIds`
identifica las imágenes de la versión exportada. El ZIP incluye las imágenes y
sus rutas relativas desde las vistas SVG; un archivo ausente bloquea el respaldo.

Relevo y comprobaciones: `LOGOTIPOS_BORDADOS.md`, `LOGOTIPOS_PDF.md` y pruebas
`embroidery-image`, `embroidery-placement`, `embroidery-raster-pdf`,
`selection-move-handle`, `placement-drag`. Las imágenes son guías de transferencia,
no moldes de tela ni digitalización automática de puntadas.


## 22. Continuación del lote infantil de Claude (2026-11-01)

`kidsFlats.ts` enlaza los monos/petos `--1` con la copia dibujada en espejo y
`--2` con la directa. El delantal pichi continuo usa una sola pieza física para
frente y espalda: `assembled.ts` obtiene su línea de hombro del patrón actual y
recorta el intervalo físico de cada cara. La espalda invierte su eje Y; el
metadato `artworkFlipY` compensa esa orientación en letras, motivos y logos sin
cambiar sus centros ni dimensiones. `placement.ts` distingue una reflexión de
un giro de 180° en la guía canónica; la plantilla independiente conserva la
orientación original.

`artworkPlacementIssues` valida vista, cara y límites físicos de los bordados y
complementos con lado guardado. Los proyectos sin ese metadato mantienen sus
coordenadas físicas anteriores. Esto impide exportar posiciones antiguas que
quedaron en la mitad equivocada tras corregir el mapeo del delantal; no migra el
dibujo ni elimina objetos. La visibilidad heredada evita bloquear por un grupo
oculto.

`generateTrapezeTop` trata el largo de blusa como una medida terminada que
incluye el volante. Se valida el largo restante del cuerpo y se mide la suma
real de cuerpo y volante en los controles; una combinación imposible no se
alarga silenciosamente. El catálogo conserva IDs, variantes y estados de
confección experimentales.

La búsqueda reconoce los nuevos bonetes por familia y nombre de la receta, y
los petos por su construcción, aunque el dibujo se defina en `flat.kids`.
Las etiquetas de puntilla/encaje pertenecen solo a esa variante. Detalle de la
revisión y límites en `DISENOS_DIGITALIZADOS.md`.

## 23. Estilos reales y transformación de prendas (2026-11-01)

`catalogStyleIdentity.ts` separa 21 construcciones existentes sin modificar IDs
de recetas, parámetros ni proyectos. El pipeline aplica esta identidad después
de `withDesignGroup` y antes de la taxonomía. `streetStyleCatalog`,
`dressStyleCatalog` y `babyStyleCatalog` añaden 69 construcciones con mapas
explícitos de familia. Se agrupa después de filtrar; las tallas no generan tarjetas.
El CSV de auditoría se regenera con `node scripts/audit-catalog.mjs`.

`streetStyles.ts`, `dressStyles.ts` y `babyStyles.ts` calculan geometría en mm,
costuras, frunces, márgenes e instrucciones. Las divisiones de paneles conservan
las Bézier exteriores que no cruza el corte, para evitar pequeños autocruces de
margen debidos al aplanado. Los motores anteriores mantienen sus IDs y recetas.
Todos los nuevos modelos son experimentales y requieren muestras físicas.

`FlatSpec.street/dressStyle/babyStyle` selecciona dibujos completos con contratos
`*_SURFACE_PIECES`. Los mapas se rellenan al construir la vista de referencia y
se consultan después en `assembled.ts` y `modelMaterials.ts`. Cada superficie
conserva pieza física, instancia, orientación y, cuando corresponde, doblez.
Los bodies nuevos excluyen la tapeta oculta x<0; el babero con apertura trasera
intercambia las caras físicas de sus mangas verticales. Las mangas de body,
hoodie y vestido se orientan sobre X; las de otras blusas bebé, sobre Y.

`styleCatalogImages.ts` añade 90 fotografías ilustrativas de IA, diez WebP de
1254 × 1254 y recortes visuales por celda. Tienen prioridad sobre las antiguas
miniaturas vectoriales de variantes. Las imágenes no intervienen en el trazado,
las medidas ni la escala del PDF. Son recursos locales del precache PWA.

`features/transform` se abre como tercer modo de Biblioteca, sin ruta adicional.
27 propuestas en `data/transformations.ts` usan diez motores independientes:
panel, cuña, volante, puño, bolsillo plano/tapa/fuelle, parche, trabilla y banda.
Los parámetros son medidas de la prenda existente, nunca medidas inferidas de
una foto. Los borradores locales se guardan por ID de idea. La exportación reúne
instrucciones y mosaico vectorial 1:1 con `transformacion.json`; el manifiesto
declara `includesBaseGarment: false`. No modifica proyectos ni finge tener un
patrón base, reconocimiento de imágenes o simulación 3D.

Regresiones: `catalog-style-identity`, `style-catalog-integration`,
`street-styles`, `dress-styles`, `baby-styles`, `transformations`; recorridos
compilados `tests/browser/style_catalog_smoke.py` y `transformations_smoke.py`.
Los tests anteriores del lote infantil ahora seleccionan la construcción en
su propia tarjeta. Detalles en `ESTILOS_URBANOS.md`, `VESTIDOS_POR_ESTILO.md`,
`ESTILOS_BEBE_2026.md`, `TRANSFORMACIONES_DE_PRENDAS.md` e `IMAGENES_ESTILOS.md`.

## 24. Cobertura fotográfica completa del catálogo (2026-11-01)

`completedAdultImages.ts` y `completedInfantImages.ts` aportan 57 fotos para las
fuentes que todavía eran vectoriales. `catalogImages.ts` resuelve por la pareja
antigua `sheet/cell`, tanto en el mapa de grupos como en `VARIANT_IMAGES`. Esto
conserva mangas, largos y proporciones específicas al seleccionar una receta.
El sombrero de bebé tiene una excepción por ID antes del mapa de variantes;
los aliases de grupo de vestido trapecio y cubrepañal comparten su foto vigente.
La prioridad de `STYLE_CATALOG_IMAGES` conserva las 90 fotos de la entrega
anterior. Los imports de tipos de los nuevos registros no crean ciclos en runtime.

`inspirationAImages.ts` y `inspirationBImages.ts` cubren las 66 referencias sin
patrón con fotos propias (61 inspiraciones y cinco de solo estudio). No modifican `modelHasPattern`, filtros, generadores
ni estados. Las 312 entradas de `CATALOG_IMAGES` y las 2,059 recetas resuelven a
recursos de IA; la biblioteca simple sigue mostrando 246 diseños disponibles.

Los 16 WebP nuevos se incluyen en el precache habitual de la PWA. Los recortes
están en los mapas `*_BOUNDS` de cada registro y preceden al recorte por defecto
de 418 px. `CatalogImage` conserva su alternativa técnica ante un fallo real
de carga. Las láminas vectoriales históricas permanecen para los scripts antiguos,
pero no son la portada resuelta de ningún artículo. La geometría editable sigue
en `FlatArt`, `assembled.ts` y los motores de patronaje.

Inventario reproducible: `node scripts/audit-catalog-photos.mjs`. Las pruebas
`catalog-images` y `catalog-photo-completeness` revisan grupos, recetas,
destinatarios, archivos y diferencias entre variantes. El recorrido Playwright
`catalog_photo_completeness_smoke.py` comprueba la decodificación y los recortes
del componente en móvil, con manifiesto local reutilizable en producción.
Procedencia y límites: `IMAGENES_CATALOGO_COMPLETO.md`.

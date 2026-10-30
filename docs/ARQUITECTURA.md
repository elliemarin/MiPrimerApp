# Arquitectura de Hilvana

Documento técnico de referencia. Explica cómo funciona cada parte y cómo
verificarla. Mantenlo al día cuando cambies una pieza clave.

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

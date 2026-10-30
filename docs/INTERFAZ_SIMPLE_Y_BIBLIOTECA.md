# Hilvana 0.2: búsqueda, extras y acabados

Relevo de Codex, 2026-10-30. Leer `AGENTS.md` y el primer apartado de
`ESTADO_DEL_PROYECTO.md`. Las notas anteriores describen entregas históricas.

## Objetivo y recorrido

La solicitud fue reducir herramientas visibles y concentrar la experiencia en
elegir una base, obtener un patrón o intervenirla, colocar extras y terminar
con materiales/bordados. Se eligió 2D físico para tener posiciones verificables;
no se simuló un modelo 3D.

1. `/` abre Biblioteca con búsqueda y 24 tarjetas. La siguiente página añade
   otras 24. Los filtros combinan persona, tipo, colección, tela y ajuste;
   se normalizan acentos y sinónimos, incluido «hoddie».
2. Ficha con dos acciones: Obtener patrón e Intervenir. `ModelStartSheet`
   usa tallas sencillas o medidas personalizadas, y crea un proyecto persistente.
   Obtener patrón conduce al PDF; Intervenir prepara las piezas reales y abre
   `/personalizar/:id`.
3. Extras: búsqueda, cuatro grupos, asa de arrastre, mover directamente,
   basurita/Deshacer y medidas plegables. Cuadrícula de 10 mm y un acercamiento
   contextual. En móvil la bandeja tiene su propio espacio bajo el lienzo.
4. `/acabados/:id`: Materiales primero y Bordados después. Se exige una elección
   explícita para cada superficie, incluso al abrir el PDF por URL. Hay una
   acción explícita para usar el mismo material en todo. Un toque en la tela
   o foto la aplica a la superficie elegida.
5. Bordados: elegir una figura/composición o texto con tipografía, arrastrar,
   cambiar ancho y eliminar/Deshacer. Generar patrones abre la revisión final.
6. PDF a escala real con base, extras, materiales, instrucciones, bordado y
   guías de ubicación. Se conserva el registro y sus dependencias.

La navegación principal tiene Elegir una base, Proyectos y Más. El estudio y
patronaje completos siguen en Más para trabajos anteriores y ajustes expertos;
no se borraron documentos ni herramientas de proyectos existentes.

## Inventario verificable

- `data/catalogCollections.ts`: **1,707 recetas nuevas** en **19 colecciones**.
  Sumadas a las 160 anteriores hay **1,867 entradas**, **1,789 con motor**.
  Cada receta cambia geometría de corte/capacidad/largo/acabado; se deduplicaron
  geometrías efectivamente iguales. No se cuentan colores ni tallas corporales
  como modelos distintos. La interfaz dice «patrones y variantes».
- Colecciones de pantalón/jogger, falda, chaquetas/chalecos geométricos,
  tops/blusones, ponchos, jumpers, hoodies/sudaderas y objetos: fundas, lectura,
  estuches, bolsas, cojines, textil de mesa, bandanas, banderines y otros.
- `CatalogModel.collection/variantLabel/searchTerms` permiten explorar por uso.
  IDs anteriores conservados. Los nuevos patrones son Experimentales.
- **411 opciones de extras sobre once construcciones**, no 411 motores:
  contratos y pruebas en `docs/COMPLEMENTOS_AMPLIADOS.md`. Algunos usos comparten
  tamaños, de forma explícita; no se añaden copias por color.
- **337 diseños/composiciones**: 151 motivos individuales, 96 escenas y
  90 emblemas/arreglos. Las composiciones se identifican como tales; cada una
  tiene geometría propia, no es un recolor contado varias veces.
- **Cinco tipografías**, 96 glifos cada una: clara/sans, elegante/serif,
  manuscrita, monoespaciada y cómic. A–Z, a–z, números, signos y acentos españoles.
  Los caracteres no disponibles se rechazan con explicación.

## Tallas y medidas

`lib/sizes/quickSizes.ts` da nombres sencillos a referencias explícitas de las
tablas propias. No equivale a una conversión de marcas comerciales:

| Referencia | Chica | Mediana | Grande |
| --- | --- | --- | --- |
| Mujer | M88 | M96 | M104 |
| Hombre | H92 | H100 | H108 |

La ficha muestra pecho/cintura/cadera/estatura antes de continuar. A medida
crea una versión personalizada con las medidas realmente escritas y exige las
necesarias del motor; las opcionales se identifican. Meses de bebé y estaturas
infantiles mantienen su sistema propio. Los accesorios no reciben una talla
corporal: sus parámetros de diseño pueden ajustarse en «Medidas del objeto».

`newPatternState` copia cuerpo y contexto para evitar compartir referencias con
una versión del perfil. Un PDF guarda las versiones exactas que lo produjeron.

## Geometría y colocación

- Nuevo motor `sudadera-capucha-holgada`: delantero/espalda completos de una
  pieza, mangas simétricas y dos laterales de capucha. El escote amplio permite
  pasar cabeza sin suponer que la tela se estire. La base de capucha coincide
  con el cuello y tiene piquete de hombro. Dobladillos, sin rib/cierre simulados.
- Se corrigió el pantalón: mismo trazado exterior y altura de rodilla en ambas
  piezas, manteniendo cadera, largo, bajo y resolución estricta de entrepierna.
  Se probaron 270 combinaciones. Su nueva geometría queda Experimental hasta
  revisar muestra. PDF previos hechos en 0.1.0 se señalan para revisión mediante
  `exportOutdated`, aunque el hash de parámetros siga igual.
- `features/simple/workflow.ts/prepareSimpleProject` prepara vistas de piezas
  reales a partir del patrón. `simpleViews` prioriza esas piezas sobre dibujos
  ilustrativos, y evita duplicar ambas clases de vistas en el recorrido.
- `customize/placementDrag.ts` transforma Pointer Events/drag desde el CTM real
  del SVG, respetando viewBox, scroll y acercamiento. `placement.pieceId` vincula
  el centro X/Y a la pieza. Se valida que quepa, incluidas concavidades; se puede
  reducir explícitamente un extra que todavía no quepa, sin escalarlo a escondidas.
- El origen es **0,0 de la pieza**, no `view.minX/minY` (estos incluyen aire de
  presentación). Pantalones/mangas pueden ser pares: elegir lado y transferir
  marcas según cantidad; el campo «Dónde lo vas a coser» guarda la intención.
  Una vista al doblez representa esa pieza de corte, no una simulación vestida.
- `lib/pdf/placement.ts/preparePlacementGuide` devuelve `placements` y dibujos
  por vista ocupada. Códigos E1/B1, pieza, centro, ancho, alto, giro y cantidad
  forman parte de `confeccion.json`. La cuadrícula de 10 mm con referencias cada
  50 mm usa exactamente el mismo espacio que la edición y el patrón.
- Las guías de ubicación son documentos de transferencia: **no se corta por
  sus líneas**. Las plantillas de confección tienen su propia sección. Las
  fotografías/vistas antiguas tienen `precise:false` y aviso ilustrativo.

## Materiales y bordados

- `DesignDoc.simpleWorkflow/materialChoices` son opcionales y compatibles con
  datos previos. `materialTargets` enumera zonas de base y `componentPaintRoles`
  de cada extra (cinco en cámara). `missingMaterials` exige una elección que
  coincida con el relleno actual; no da por elegido un color por defecto.
- `applyMaterial` asigna la elección y relleno sin cambiar geometría. Conserva
  las fotos del inventario y actualiza materiales de las piezas del extra.
  Se invalida la confirmación si un editor posterior cambia ese relleno.
- `data/embroideryMotifs.ts` define partes SVG coloreadas; los grupos son solo
  unidades para mover. Cada parte conserva geometría y color.
- `DesignElement.vectorPath` contiene contornos normalizados 0..100. Los mismos
  comandos sirven para pantalla, SVG y PDF, incluidos huecos de O/B/8.
  `embroidery` identifica metadatos de motivo/letras en el grupo.
- `letteringFonts.json` contiene glifos precompilados. Fuentes, URL/SHA256 y
  licencias OFL: `public/licencias/bordado`. Reproducir con
  `scripts/build_lettering_fonts.py` y FontTools; no hay dependencia de red/API
  para dibujar letras en ejecución. Alto = contorno completo con acentos.
- `embroideryForView` agrupa las partes de un motivo sin convertir el grupo
  en una caja ficticia. `DrawPath.fillColor/color` conserva colores vectoriales
  en PDF/SVG. La ficha incluye códigos, swatches, HEX y nombres orientativos.
- El PDF es guía de transferencia/digitalización, **no un archivo de puntadas**.
  DST avanzado sigue Experimental, solo contornos de puntada recta, sin rellenos
  ni compensación; conserva cambios de hilo pero no paleta RGB en el formato.
  Compatibilidad física con HD9120/CREATIVATE sigue pendiente de probar.

## PDF y validaciones

`prepareSewingPack` bloquea materiales pendientes, dimensiones/contornos inválidos,
paneles obsoletos, partes incompatibles o piezas omitidas. `buildSewingPackPdf`
copia páginas vectoriales sin escalarlas, registra dependencias y adjunta el
inventario, posiciones e índice. Imprimir al 100 %.

La ficha simple muestra las piezas reales elegidas, materiales y códigos sin
repetir dibujos ilustrativos ni todos los registros técnicos. Encabezado Hilvana,
colores y leyendas legibles. Nombres largos se envuelven; las cajas de texto
giradas y hojas solo de etiquetas se conservan. Las plantillas de cada sección
llevan controles de 50 mm y 100 mm. El pie no invade la barra de calibración.

## Verificación

Base previa: 450 pruebas y build correctos. Entrega: **2,259 pruebas en
37 archivos**, TypeScript y build de producción correctos.

```bash
npm install
npm test
npm run typecheck
BASE_PATH=/MiPrimerApp/ npm run build
npm run dev -- --host 0.0.0.0
python3 tests/browser/simple_journey_smoke.py
```

El script de navegador usa contextos limpios, Python Playwright, Chromium y
PyMuPDF. Importa `/src` solo para leer estado y convertir coordenadas: necesita
servidor dev; para producción hay que adaptar esas importaciones.
Si cambias el módulo del almacén o la versión de app mientras Vite está abierto,
reinicia el servidor antes del smoke completo: la recarga en caliente puede
dejar dos URLs de módulo en memoria y la importación de inspección leer otro
almacén. La verificación final se ejecutó con Vite recién iniciado.

- Todos los 1,789 presets se crean/generan con su configuración real, sin
  parámetros ignorados. Se prueban también extremos de cuerpo representativos.
- Las 411 opciones se generan con contornos/márgenes/costuras válidos. Cámara:
  área de abertura, cinco piezas, ocho piquetes y cambios de medidas verificados.
- Los 337 motivos tienen contornos cerrados finitos y colores válidos. Glifos
  de cinco familias conservan curvas/contraformas y tamaño físico.
- Chromium 320/390/1440 px: inicio/filtros, bebé 0–6 y talla 680 mm de estatura,
  Chica/Mediana/Grande, medidas personalizadas, arrastre táctil y escritorio
  con zoom, once superficies explícitas, abeja y texto manuscrito, guardado y recarga.
- Hoodie+cargo+cámara: **69 páginas, doce plantillas, dos motivos**, guía de
  ubicación con cuatro posiciones precisas. Cuadrícula de **10 mm** medida con
  PyMuPDF, controles de **50/100 mm** en cada sección y colores RGB vectoriales.
- Cojín a medida de 450×350 mm: PDF de 18 páginas. Regresiones de basurita y
  DST por vista siguen pasando. Revisadas capturas móviles y páginas del PDF.

## Pendientes prioritarios para Claude

1. Imprimir y coser muestras: hoodie (paso de cabeza/capucha/movilidad), nuevo
   trazado de pantalón, cargo, cámara y organizadores. No promover a Implementado
   solo por pasar pruebas numéricas.
2. Safari/iPhone físico, VoiceOver y fotos HEIC; revisar arrastre/zoom con la
   pantalla pequeña y teclado real. Chromium móvil no sustituye esa prueba.
3. Expandir instancias simétricas/al doblez para editar izquierda/derecha de
   forma independiente conservando marcas y cantidades físicas. Hoy la vista
   refleja la plantilla, y el lado se indica en la ubicación/notas.
4. Mejorar ilustración ensamblada si se necesita, conservando por separado el
   espacio de colocación física. No prometer caída/ajuste 3D sin simulación real.
5. Canales de anchos individuales y ventanas para cámaras de geometría libre;
   hoy los canales son iguales y la ventana rectangular ajustable.
6. Nuevas bases verdaderamente diferentes: bomber, trench, sastre/entallados,
   bolsillos internos que cambien costuras y otros motores con muestra física.
   El catálogo actual es amplio por variantes paramétricas, no por miles de
   construcciones independientes ni importación de PDFs de terceros.
7. Digitalización real de bordados (rellenos/satén), flujo HD9120 con prueba en
   retazo y confirmación de formato. Mantener licencias/atribuciones de fuentes.
8. Medir uso real del recorrido y retirar pasos que no ayuden; mantener búsqueda,
   paginación y datos de proyectos anteriores al simplificar herramientas.

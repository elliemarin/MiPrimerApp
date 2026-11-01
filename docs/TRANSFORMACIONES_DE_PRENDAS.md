# Transformaciones de prendas existentes

Implementación de Codex, 2026-11-01. Entrada: **Biblioteca → Transformar mi ropa**.

La sección contiene 27 propuestas para pantalones, hoodies/sudaderas, camisas,
chaquetas, vestidos y faldas. Usa diez construcciones paramétricas compartidas:
panel rectangular de sustitución, cuña, volante, puño, bolsillo plano, bolsillo
con tapa, bolsillo con fuelle, parche de doble cara, trabilla y banda doble.
Estas propuestas no se cuentan como patrones nuevos de prendas completas.

## Recorrido y alcance

1. Filtrar por prenda y buscar por palabras; todos los términos se combinan.
2. Elegir una modificación y revisar el esquema antes/después, ubicación y tela.
3. Medir la prenda extendida y sustituir los valores de ejemplo. Se muestran cm;
   internamente se conservan mm. Opcionalmente anotar dos referencias de ubicación.
4. Confirmar que las medidas corresponden a la prenda y generar el PDF.

El PDF incluye descripción, ubicación, medidas, materiales, cantidades de corte,
espacio ocupado por cada pieza, pasos completos y plantillas vectoriales a 1:1
con márgenes incluidos. Se adjunta `transformacion.json`, con medidas, cantidades,
acabados, márgenes, comprobaciones y `includesBaseGarment: false`.

Los borradores de medidas y las notas se conservan por propuesta en
`localStorage`, clave `hilvana-transform-<id>`. Son borradores locales; no son
proyectos sincronizados. No se analizan fotografías ni se deducen dimensiones de
una imagen. Las propuestas predefinidas son el alcance solicitado y entregado.

## Archivos y contratos

- `src/data/transformations.ts`: ideas, etiquetas, construcciones y búsqueda.
- `src/lib/pattern/generators/transformations.ts`: diez motores `transform-*`,
  sin medidas corporales requeridas; inscritos en el registro común.
- `src/features/transform/TransformationsPanel.tsx`: listado y formulario.
- `src/features/transform/TransformationDiagram.tsx`: esquema orientativo de
  colocación; nunca se usa como geometría de patronaje ni se presenta como foto.
- `src/features/transform/export.ts`: preparación validada y exportación. Usa
  `buildPattern`, `pieceDrawable`, `arrangeForTiles`, `exportTiledPdf` y `FlowDoc`.
  `copyPages` conserva geometría vectorial y dimensiones de las hojas carta.
- `tests/transformations.test.ts`: 91 pruebas, incluyendo tres PDF completos.
- `tests/browser/transformations_smoke.py`: recorrido móvil de 390 px,
  compatible con servidor de desarrollo y compilación publicada.

## Decisiones geométricas importantes

- **Panel western:** sustituye una ventana rectangular en una zona plana y
  recta; conserva la talla. La ventana se corta *dentro* de la línea de unión
  para reservar sus márgenes. No se promete reproducir curvas de cadera, tiro o
  cintura con un rectángulo ni ampliar automáticamente toda la prenda.
- **Cuñas acampanadas:** el dato principal es el largo de cada costura de la
  abertura, `L`. Con aumento de bajo `A`, la altura es
  `sqrt(L² - (A/2)²)`, por lo que los dos lados inclinados miden `L`. No se
  confunde altura vertical con longitud de costura. Se rechazan cuñas demasiado
  anchas y se exige probar/nivelar la caída antes del dobladillo definitivo.
- **Fuelle:** la tira mide `2 × alto + ancho` sobre su línea de unión. Sus
  piquetes coinciden con las dos esquinas del fondo del bolsillo.
- **Tapas:** se cortan dos caras por bolsillo; las dos unidades del catálogo
  producen cuatro caras. El parche usa una cara visible y un reverso por unidad.
- **Volantes:** el recorrido de prenda se multiplica una sola vez por el frunce.
  Se distingue tira abierta (dobladillos extremos) de aro cerrado (costura).
- **Puños:** el contorno en reposo es el contorno de manga por la proporción
  indicada; la elasticidad requerida se informa. Las bandas lisas mantienen el
  contorno de unión, sin reducción.
- **Trabillas:** los 2 cm de sujeción de cada extremo se descuentan del largo
  libre; la pieza no está calculada para suspender cargas ni como seguridad.

Los contornos de una prenda ya usada no están disponibles en el modelo: no se
inventan relaciones de costura contra una pieza base inexistente. Las longitudes
de unión externas se contrastan con lo que la persona midió. Todas las piezas
son experimentales hasta revisar muestras impresas y cosidas.

## Verificación y siguiente paso

Las 27 propuestas se generaron con dimensiones al 80 %, 100 % y 120 % del ejemplo:
contornos válidos, márgenes fuera de costura, comprobaciones de medidas y costuras
internas coincidentes. Se probaron filtros, cantidades y bloqueo de entradas
inválidas/no finitas. Tres PDF (panel western, campana setentera y cargo) conservan
cuadrado de 50 mm, barra de 100 mm, impresión sin escalado y manifiesto adjunto.
También pasó el recorrido en Chromium móvil: 27 propuestas, filtro de pantalones,
búsqueda de campana sin resultados ajenos, decimal con coma, confirmación de
medidas, PDF con abertura de 365 mm y aumento de 220 mm, bloqueo de valores vacíos
o inválidos y restauración de medidas tras recargar. La confirmación no se guarda:
se vuelve a revisar al abrir otro borrador. No hubo errores de JavaScript ni
desbordamiento horizontal a 390 px. TypeScript pasó después de la integración.

Siguiente paso útil: imprimir y coser los tres ejemplos anteriores sobre prendas
de descarte. Después integrar los borradores como proyectos con referencias
fotográficas manuales y piezas disponibles en Acabados; actualmente la sección
exporta directamente sus piezas y pasos. Para reconocimiento automático de una
foto harían falta un servicio real, controles de error y medidas introducidas
por la persona: una fotografía no proporciona escala física por sí sola.

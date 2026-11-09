# Bolsos y mochilas (2026-11-09)

La usuaria mandó 8 fotos de bolsos y mochilas y pidió añadirlos a la sección de
bolsos. Están en el catálogo editable (**Patrones editables → Prenda o
accesorio: Bolsos y bolsas**), con el mismo flujo que el resto de patrones:

- ficha con dibujo técnico de frente y espalda;
- «Obtener patrón» con las medidas del objeto;
- PDF completo;
- «Proyectar en la mesa».

Son **construcciones propias**: no se copian marcas, imágenes ni medidas. Las
medidas de las referencias solo sirven de comprobación (por ejemplo, la
mochila de 32 × 45 × 14 cm o la tote de 40 × 25 × 12 cm). Todo es
**experimental** hasta coser muestras.

## Archivos

- `src/lib/pattern/generators/bags.ts`: los 8 generadores.
  - Cada contorno se arma por tramos con nombre (`tagged`): cremallera, base,
    boca, asa, lateral…
  - Los puntos donde cambia el tramo se conservan al simplificar, para que las
    costuras se comprueben por tramos.
  - Los entrantes (boca de la bolsa de compra, curva bajo la lengüeta de la
    riñonera) son arcos de radio mayor que cualquier margen; si no, la línea de
    corte se cruza.
- `src/data/bagFlats.ts`: dibujos técnicos trazados desde las piezas reales y
  las líneas de colocación de los bolsillos.
  - `BAG_SURFACE_PIECES` liga cada zona con su pieza física.
  - Se usa en la vista armada (`assembled.ts`) y en los colores por pieza
    (`modelMaterials.ts`).
  - En `FlatSpec` va como `bagStyle`.
- `src/data/bagCatalog.ts`: 10 recetas en 8 diseños (la funda de portátil tiene
  13, 14 y 15–16 pulgadas). Familias nuevas en `catalogTaxonomy.ts`:
  - `mochila`: «Mochilas»;
  - `rinonera`: «Riñoneras y delantales de cadera».

## Los ocho

| Diseño | Construcción |
|---|---|
| Funda acolchada para portátil | Medidas del portátil (13, 14, 15–16 pulgadas o a medida) con 8 mm de holgura y 6 mm de acolchado. Guata termoadhesiva y acolchado en canales o rombos. Cremallera en tres lados entre dos paneles, con fuelle en la base: panel y fuelle suman justo el contorno. Lleva bolsillo exterior, bolsillo interior con divisiones, lengüetas y bies en las costuras interiores. |
| Bolsa en U con bolsillo bordado | Fondo en arco (radio 0,4 × ancho) con fuelle que lo sigue, refuerzo de base, forro y asas dobladas en cuatro. El bolsillo redondeado lleva ramitas para bordar (diseño propio). Sin fondo, la bolsa es plana. |
| Bolsa de compra con asas laterales | El asa sale de la misma pieza que el delantero y la espalda. Los costados se estrechan hacia arriba y miden lo mismo que el lateral del cuerpo; la base es rectangular. La punta del asa delantera se une con la trasera de su lado. |
| Bolsa estrella con asa calada | Estrella al doblez con puntas y entrantes redondeados. Cada cara lleva su asa calada, marcada como costura y línea de corte. La boca va de un entrante al otro por la punta de arriba. Lleva refuerzo de entretela en la punta y bolsillo exterior. |
| Tote de caja con bolsillos | Delantero, espalda, costados y base con su forro. Los bolsillos de las cuatro caras van doblados, con la boca en el doblez. Las cintas de las asas bajan por las caras y dividen el bolsillo en tres. |
| Mochila de solapa | Laterales, base, solapa redondeada y jareta con 8 ojales. Bolsillos delantero y laterales con fuelle y solapa. Correas con hebilla, tirantes acolchados, correas regulables y asa. |
| Mochila osito infantil | Arco con cremallera arriba que baja un poco por los costados, banda de costados y base, orejas en la costura y bolsillo. Sin cordones (aviso `mochila-infantil`). |
| Riñonera organizadora | Cuerpo al doblez con lengüetas para el cinturón. Bolsillo con cremallera, bolsillo grande redondeado con ranuras para bolígrafos y bolsillo de tijeras. El cinturón se calcula con el contorno pedido más 20 cm para ajustar. |

## Fotos IA pendientes

En este entorno no se pueden generar imágenes. Para no enseñar la foto de otra
construcción, los 8 diseños están en `PENDING_AI_PHOTOS`
(`src/data/catalogImages.ts`) y sus tarjetas muestran el **dibujo técnico
real**. Las pruebas lo comprueban.

Para completarlas (con una herramienta de imágenes, como se hizo con las demás
láminas):

1. Generar una lámina 3 × 3 de 1254 × 1254 px, fondo marfil, luz suave, tela
   visible, sin marcas ni texto. Una celda por diseño, en este orden:
   1. funda acolchada para portátil verde salvia con cremallera en tres lados y
      bolsillo de estampado geométrico propio;
   2. bolsa lila con fondo en U, asas y bolsillo redondeado con ramitas
      bordadas;
   3. bolsa verde de lona con asas laterales de una pieza y costados que se
      estrechan;
   4. bolsa estrella verde con asa calada y forro estampado de flores;
   5. tote de fieltro crudo de caja con bolsillos alrededor, asas de cinta y
      flores bordadas sueltas;
   6. mochila de lona verde con solapa, jareta, bolsillos con fuelle y correas
      con hebilla;
   7. mochila infantil de pana mostaza con orejas de osito y bolsillo;
   8. riñonera de lino rosa con bolsillo de cremallera, bolsillo grande y
      bolsillo de tijeras.
2. Guardarla como `public/catalog-images/bolsos-01.webp` (calidad 86).
3. Registrar `'bolsos-01': ['funda-portatil-cremallera', 'bolsa-u-bordada',
   'bolsa-asas-laterales', 'bolsa-estrella', 'tote-bolsillos',
   'mochila-solapa', 'mochila-osito', 'rinonera-organizador']` en
   `CATALOG_IMAGE_SHEETS`.
4. Vaciar `PENDING_AI_PHOTOS` y volver a contar en las pruebas de fotos.

## Validación

- `tests/bags.test.ts` comprueba:
  - las 10 recetas y su familia;
  - que cada zona del dibujo apunta a una pieza real;
  - todo el rango de medidas con márgenes de 6 y 15 mm;
  - las construcciones de cada referencia;
  - la proyección y el PDF.
- Las pruebas de catálogo cuentan ahora 2084 recetas, 326 diseños (265 con
  patrón) y 5 grupos al buscar «tote».
- En la app se comprobó el flujo completo:
  - la búsqueda;
  - la ficha;
  - «Obtener patrón»;
  - «Descargar PDF completo» con la estrella y la riñonera;
  - el proyector.
- El barrido de 87 combinaciones no da errores.

## Pendiente

- Fotos IA (arriba).
- Coser una funda y una mochila osito de muestra.
- `neceser` y `bandolera` siguen como inspiraciones pendientes.

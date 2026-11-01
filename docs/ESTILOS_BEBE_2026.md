# Dieciocho construcciones nuevas para bebé

Entrega del 2026-11-01. Complementa los lotes de Claude sin volver a publicar
sus tallas, colores o conjuntos como diseños nuevos. Todos estos patrones
siguen en **experimental**: se comprobaron geometría, márgenes, uniones,
medidas y recorrido digital; faltan muestras impresas y cosidas.

## Archivos y contrato

- `src/data/babyStyleCatalog.ts`: 18 modelos, un grupo por construcción;
  `BABY_STYLE_FAMILIES` declara su familia sin inferirla por el nombre.
- `src/lib/pattern/generators/babyStyles.ts`: 18 entradas de generador,
  compartiendo los bloques anteriores cuando procede y añadiendo piezas o
  contornos propios. No se escalan imágenes para obtener tallas.
- `src/data/babyStyleFlats.ts`: frente y espalda desde piezas reales, con
  `BABY_STYLE_SURFACE_PIECES` para telas, extras y bordados. El bonete muestra
  una sola vista. Las imágenes realistas del catálogo son ilustraciones de
  IA; no constituyen evidencia de confección.
- `tests/baby-styles.test.ts`: todas las tallas bebé y primera infancia,
  costuras, corte, medidas, referencias de instrucciones, piezas visibles,
  geometrías distintas y regresiones de construcción.

El ID del modelo, grupo y generador es el mismo. Las medidas se eligen dentro
de cada tarjeta. Las fotografías se registran aparte en `styleCatalogImages`.

## Qué cambia de verdad

| ID | Construcción |
| --- | --- |
| `bebe-body-sin-mangas` | Se eliminan las mangas; sisas sin margen y ribetes propios. |
| `bebe-body-mariposa` | Volantes de sisa independientes sobre el cuerpo sin mangas. |
| `bebe-body-falda` | Sobrefalda fruncida con dos mitades delanteras abiertas; no bloquea los broches. |
| `bebe-body-canesu` | Delanteros y espalda divididos en canesú y cuerpo inferior, con piquetes de unión. |
| `bebe-cardigan-cruzado` | Extensión diagonal de los delanteros y broches de cruce, sin cintas. |
| `bebe-cardigan-pico` | Escote V, manga montada y apertura central ribeteada. |
| `bebe-blusa-peplum` | Cuerpo sin mangas y peplum fruncido por costura, incluido en el largo total. |
| `bebe-camisa-globo` | Copa de manga fruncida y puño con jareta. |
| `bebe-peto-canesu` | Peto corto dividido por cintura en piezas independientes. |
| `bebe-peto-falda` | Pelele con sobrefalda y acceso a la entrepierna intacto. |
| `bebe-peto-cargo` | Bolsas con fuelle integrado, solapas y guías de ubicación. |
| `bebe-pantalon-rodilleras` | Rodilleras ovaladas, margen de vuelta y cruces de colocación. |
| `bebe-pantalon-panel-lateral` | Paneles longitudinales con curvas originales de tiro conservadas. |
| `bebe-pantalon-punos-extensibles` | Puños largos de rib: el largo solicitado incluye el puño doblado. |
| `bebe-babero-mangas` | Pecho cerrado, apertura trasera y mangas con puño elástico. |
| `bebe-poncho-bano` | Paños rectangulares con lados abiertos y tapetas delanteras de broches. |
| `bebe-bolero-redondo` | Cuerpo corto, frente curvo ribeteado y manga corta. |
| `bebe-bonete-visera` | Visera de doble tela suave entre banda y forro, con piquetes propios. |

## Decisiones que conservar

**Puños para crecer.** Se genera la pierna con `largo - altoPuno / 2`. El puño
se corta a dos veces su alto, se cierra en anillo y se dobla por construcción;
después se vuelve hacia fuera a la mitad para la talla inicial. Por eso el
largo con puño vuelto es exactamente el pedido y el desplegado gana medio
alto de puño. Ambos largos tienen una comprobación explícita. No volver a
sumar el puño completo a una pierna que ya tiene el largo solicitado.

**Paneles de pantalón.** Se dividen por las rectas de cintura y bajo sin
aplanar las curvas del tiro. El primer ensayo con `panelizePattern` produjo
autointersecciones de corte en la talla E50 por aproximación de curvas y
offset; quedó sustituido por una división analítica que conserva Bézier,
márgenes, cantidades, referencias de costura e IDs.

**Body y tapetas.** Las piezas delanteras conservan la tapeta integrada
negativa, pero el dibujo y las superficies del armado solo muestran `x >= 0`.
Cada mitad es una instancia distinta: no se despliega otra vez como una pieza
al doblez. Los canesús conservan la misma regla. No colocar bordados sobre la
vista oculta.

**Babero.** La pieza cerrada llamada `espalda` se lleva en el pecho y el par
de `delantero` detrás. También se invierte qué mitad de la manga se muestra
en cada cara; las letras permanecen derechas. No interpretar los nombres
heredados del bloque como orientación final del babero.

**Dibujo de pantalón.** La extensión física de tiro se proyecta hacia la
profundidad al mostrar la prenda armada. Se conserva un centro delantero
continuo y dos piernas separadas; la ilustración no cambia la pieza de corte.
Las sisas de tops y mangas comparten su curva visual, evitando huecos entre
ambas superficies. Los tirantes se ubican en el ancho del peto, no en el ancho
máximo del pantaloncito.

**Orden de mariposas.** Unir hombros → fruncir y colocar volantes → ribetear
sisas → cerrar costados. El ribete se corta en la dirección elástica del punto.

**Peplum.** El ribete de apertura corresponde solamente al torso. Los dos
frentes del peplum llevan dobladillo propio. Su alto está incluido en el largo
total del modelo.

## Qué falta comprobar físicamente

- Ajuste de cuello, pecho, cadera sobre pañal y movilidad en cada estilo.
- Altura real de rodilleras, colocación de bolsas y comodidad del cruce.
- Caída de mangas globo, falditas y visera suave.
- Recuperación de rib y elásticos; anclaje de todos los broches.
- Muestra impresa al 100 % y confección documentada antes de certificar un
  patrón como probado. Los controles numéricos no sustituyen esa evidencia.

No se añadieron cordones para atar. El babero y el poncho de baño tienen
indicaciones de uso vigilado y no se presentan como ropa de dormir. El bonete
no se ofrece como equipo certificado de protección solar.

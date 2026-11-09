# Tapetes de juego (2026-11-09)

Sección nueva de la biblioteca: **Tapetes**, el octavo modo. La usuaria mandó
16 fotos de tapetes y pidió:

- hacer sus patrones, incluidos los sensoriales;
- diseñarlos y modificarlos para que el patrón sea mejor;
- que todos se puedan proyectar.

Los sensoriales también se proyectan: cada cuadro o triángulo lleva marcado su
elemento.

Otros nombres: alfombra de juego, tapete de actividades, «tapis d'éveil»
(francés), «Krabbeldecke» o «Spieldecke» (alemán), «play mat» o «activity mat»
(inglés). Van como etiquetas de búsqueda.

Son **diseños propios**: no se copian telas, estampados, marcas ni personajes.
El conejo de la foto con boca en X se rehízo con una cara propia. Todo es
**experimental** hasta coser una muestra.

## Cómo funciona

- `src/lib/pattern/generators/playmats.ts`: cada diseño devuelve un trazado
  (`MatLayout`) en milímetros con estas partes:
  - la silueta entera;
  - si es simétrica, para poder cortarla al doblez;
  - las líneas de acolchado, ya recortadas a 3 cm del borde y alrededor de los
    apliques;
  - los apliques (con cantidad 2, el segundo es su reflejo), los bordados y las
    marcas;
  - las piezas extra y las costuras;
  - el dibujo de la tarjeta.
- `build` convierte el trazado en patrón:
  - delantero y trasero, o solo el trasero si el delantero va por piezas (el
    arcoíris y los sensoriales);
  - apliques sin margen;
  - ribete al hilo o al bies, con su costura comprobada, o abertura para
    voltear;
  - avisos, materiales y pasos.
- **Corte**: «Entera (para proyectar)» o «Al doblez (la mitad de papel)».
  - Al doblez, las líneas se cortan en el eje; para marcar la otra mitad se
    usa «Voltear» en el proyector.
  - La espiral del sol no es simétrica, así que el sol va siempre entero.
- `shapeKit.ts`: utilidades de siluetas, compartidas con los bolsilleros:
  - `clipLines` recorta el acolchado;
  - `rightOfFold` corta las líneas justo en el doblez;
  - `halfOnFold` da la media pieza;
  - `simplifyLine` simplifica también líneas cerradas, como los círculos.
- `sensoryKit.ts`: **13 elementos sensoriales**, dibujados en un cuadro de
  30 cm y escalados:
  - textura, liso, etiquetas de cinta, anilla mordedora, nube que se levanta,
    orejas en un bolsillo, flor de pétalos rellenos, banderines, zanahorias en
    un bolsillo, rama con hojas, oruga, solapas con sorpresa, estrella
    crujiente y mariposa;
  - cada uno dice sus piezas (forradas, rellenas o aplicadas), dónde van y qué
    material piden.
- Dibujo: `src/features/playmats/PlaymatArt.ts`. Ficha, PDF y proyección: el
  catálogo común `PlushCatalog`.

## Los once patrones (17 tarjetas)

| Generador | Construcción |
|---|---|
| `tapete-sol` | Sol de 12 a 20 rayos, acolchado en espiral o en círculos. Lleva tres lengüetas con broche donde se enganchan una nube y un arcoíris con anilla. |
| `tapete-arcoiris` | Medio círculo de 3 a 6 bandas cosidas arco con arco (costuras comprobadas), con el centro claro y un corazón aplicado opcional. |
| `tapete-oso` | Cabeza y orejas, con tres anillos acolchados (el de fuera separa las orejas). Hocico, nariz, ojos e interior de las orejas aplicados; boca bordada. |
| `tapete-conejo` | 150 × 100 cm con orejas de 80 cm y acolchado en franjas que rodea la cara. |
| `tapete-flor` | De 5 a 8 pétalos con acolchado radial desde un centro. |
| `tapete-hoja` | Acorazonada, ovalada, ginkgo, festoneada o monstera, con nervio central y nervios acolchados. Los cortes de la monstera miden 7 cm de ancho para poder voltearlos o ribetearlos. |
| `tapete-fresa` | Hojas y rabito aplicados y pepitas pespunteadas en tresbolillo. |
| `tapete-petalos` | Centro redondo, o colchoneta con marco acolchado y cabecero de media luna con fuelle. Lleva un número par de pétalos rellenos que cubren justo el borde, con un piquete entre pétalos. |
| `tapete-puzle` | De 2 a 4 filas y columnas de cojines con pestañas y huecos en damero. Cada hueco es más ancho que la pestaña para que entre ya rellena. |
| `tapete-sensorial` | Cuadros de 3 × 3 o 4 × 4 con un elemento por cuadro, trasero entero y ribete al hilo. |
| `tapete-sensorial-hexagonal` | Seis triángulos con un elemento cada uno. |

## Seguridad

- Todos llevan el aviso `tapete-seguridad`: jugar con un adulto delante; no
  sirven para dormir ni para la cuna.
- Los de pétalos llevan además `petalos-seguridad`, por los rebordes rellenos.
- Los sensoriales llevan `sensorial-seguridad`:
  - bucles de cinta cortos y con doble pespunte;
  - cintas de atar de 15 cm como máximo;
  - anillas de 5 a 6,5 cm;
  - papel crujiente siempre cerrado dentro;
  - sin botones, cuentas ni espejos de cristal.
- Los ojos y las narices son de tela aplicada.

## Validación

- `tests/playmats.test.ts` comprueba:
  - las 17 tarjetas y sus dibujos;
  - el rango de tamaños, entero o al doblez, volteado o con ribete;
  - que acolchado y apliques quedan dentro;
  - la media pieza al doblez;
  - las medidas de referencia;
  - que el puzle encaja con holgura;
  - que los elementos caben en su cuadro o triángulo;
  - los avisos, la proyección de todas las tarjetas y el PDF.
- El barrido de 792 combinaciones no da errores.

## Pendiente

- Coser un tapete hoja y un sensorial de muestra para comprobar el acolchado y
  los elementos.
- Elegir qué elemento va en cada cuadro desde la ficha.
- Más formas: nube, luna y tortuga.

# Casitas de muñecas portátiles (2026-11-08)

Grupo nuevo dentro de **Juguetes y peluches**: «Casitas de muñecas». La usuaria
mandó 16 fotos de casitas de tela (tipo libro, bolsa con asas, cubo con tejado,
tapete de cuatro habitaciones y páginas de fieltro) y pidió diseñar las suyas,
experimentando con muebles interactivos. Son **diseños propios**: se toma la
forma de construir, no las telas, los dibujos ni las medidas de nadie (salvo
las proporciones genéricas de 6 × 4 × 4 pulgadas de la casita cubo, que se
escalan). Todo es **experimental** hasta coser muestras.

## Cómo funciona

- `src/lib/pattern/generators/dollFurniture.ts`: kit de **23 muebles**. Cada
  mueble es una lista de partes dibujadas a escala de una muñeca de 12 cm. Cada
  parte dice cómo se hace:
  - **fieltro** o **aplicación** con entretela termoadhesiva: sin margen;
  - **forrada**: dos capas que se voltean, para puertas, solapas y bolsillos;
  - **rellena**: almohadas y colchones.

  Cada parte dice también cómo se juega con ella (puerta con bisagra a un lado,
  solapa que se levanta, bolsillo, pieza suelta) y qué se borda en la pared
  (cable de la lámpara, tallos, cuerda de tender, barra del ropero).

  | Tipo de juego | Muebles |
  |---|---|
  | Puertas que se abren | Armario, nevera, horno, fregadero, lavadora, puerta de la fachada |
  | Bolsillos | Cama con manta, bañera, ropero, platero con platos, sillón con libro |
  | Solapas | Mantel con puntilla, tapa del inodoro |
  | Cortinas | Con alzapaños de velcro |
  | Otros | Toalla que se quita, espejo de lámina de seguridad, tendedero con ropa y pinzas de fieltro, muñequita y gato de fieltro |
- `src/lib/pattern/generators/dollhouses.ts`: cada casita es un **trazado**.
  - Tiene paneles (interior, exterior y guata, o franjas y hastiales) con
    huecos para cada mueble. `placeSlot` encaja el mueble en su hueco, apoyado
    abajo.
  - La silueta de cada mueble se marca en la pared con **líneas de
    colocación**. Se imprimen y también **se proyectan**, para coser cada
    mueble en su sitio.
  - Las piezas de un mismo mueble se agrupan y suman cantidades.
  - Una parte forrada de menos de 16 mm se corta en fieltro, con aviso.
- El dibujo de la tarjeta (`src/features/toys/DollhouseArt.ts`) sale del mismo
  trazado. El cubo se dibuja de frente, abierto, con el jardín.

## Las seis casitas (8 tarjetas)

| Generador | Construcción |
|---|---|
| `casita-libro` | Se abre como un libro, con forma de dos casas o de calabaza. Dentro, ropero-bolsillo y cama; fuera, puerta que se abre y ventanas (o puerta y banderines, con hoja y tallo en la calabaza). Lleva lomo pespunteado y lengüeta de velcro. |
| `casita-bolsa` | Dos habitaciones que se doblan por la mitad, con asas en los dos extremos. Forma redondeada, con tejado o rectangular. Habitaciones: baño y dormitorio, cocina y dormitorio, o salón y dormitorio. Cierre con broches o cremallera alrededor. |
| `casita-plegable` | Cruz con cocina, comedor, dormitorio y baño. Los laterales se doblan como puertas, lleva dos asas, velcro y ribete al bies. |
| `casita-cubo` | Franja de tejado, pared, suelo y frente, con hastiales en pentágono: tejado a 45°, cada agua igual al fondo entre √2. Lleva refuerzos de espuma sin margen, asa en la cumbrera y frente que se abre como jardín (velcro o botón). Cama, almohada y manta sueltas. |
| `casita-tapete` | Tapete acolchado con cuatro habitaciones y desván, separadas con puntilla. Se dobla en cuatro y queda una casita con tejado. Lengüeta y ribete. |
| `casita-paginas` | Ocho páginas de fieltro, cada una con un mueble interactivo, agujeros para encuadernar, muñequita y gato. |

Seguridad: el aviso general de juguetes, más uno sobre las piezas sueltas
pequeñas (platos, pinzas, ropa, libro y gato). Los espejos son de lámina de
seguridad. Las cortinas cierran con velcro, sin cintas largas.

## Validación

- `tests/dollhouses.test.ts` comprueba:
  - las 8 tarjetas y sus dibujos;
  - todas las formas y habitaciones con muñecas de 9, 12 y 20 cm;
  - que cada mueble cae dentro de su hueco y que puertas y bolsillos están bien
    definidos;
  - las costuras del cubo (hastiales con la franja, tejado con paredes, frente);
  - el ribete del largo del borde;
  - la proyección sin bloqueos y el PDF.
- El barrido de 60 combinaciones no da errores.

## Pendiente

- Coser una casita libro y un tapete de muestra.
- Más muebles: escalera, chimenea, cuna y bañera con cortina de tul.
- Elegir qué mueble va en cada habitación desde la ficha.

# Adornos navideños (2026-11-11)

Sección nueva de la biblioteca: **Adornos navideños**, el décimo modo. La
usuaria mandó 9 fotos y pidió esta sección:

- casitas de fieltro nevadas;
- renos con pajarita, gorro o lazo;
- galletas de jengibre;
- una lámina de figuritas para calendario de adviento;
- un árbol de fieltro por capas;
- árboles escalonados de retales;
- plantillas sueltas;
- un molde de bota de 45 cm;
- una media con reno aplicado.

Son **diseños propios**: se toma la forma de construir, no las imágenes, los
textos ni las marcas de las fotos. Todo es **experimental** hasta coser una
muestra.

## Tres formas de construir

- **Fieltro** (casita, reno, galleta, árbol por capas y figuritas):
  - Cada pieza se corta por su contorno, sin margen añadido.
  - La puntada (festón o pespunte a mano) va marcada por dentro, a la distancia
    del parámetro `margen`: «Puntada desde el borde», de 2 a 8 mm, 3 mm por
    defecto.
  - Las piezas que van entre delantero y trasero (cuernos, orejas, chimenea,
    estrella y tronco) se marcan en el cuerpo con la zona que queda dentro.
  - Los apliques llevan su línea de colocación en la pieza donde se cosen, con
    su propia puntada.
  - Ojos, botones y pomos son marcas de botón; las mejillas son de colorete.
- **Retales en sándwich** (árbol escalonado):
  - Delantero, guata y trasero se cosen revés con revés, sin voltear.
  - El margen queda a la vista y se recorta con tijeras de zigzag; se elige de 4
    a 10 mm.
  - Lleva botón de estrella sobre la presilla.
- **Tela forrada** (bota):
  - Delantero y trasero van en espejo, con su forro y con margen de 6 a 15 mm.
  - Puño doble recto (anillo de dos veces la boca) o puño de ondas de fieltro
    con copos bordados.
  - La presilla va en la costura de atrás.
  - Opcional: talón y puntera de contraste. Su borde curvo va sin margen,
    cosido con zigzag o festón.
  - Aplique opcional en el delantero: reno con lazo y acebo, o árbol con bolas.
    - Solo va en la zona libre: fuera del margen, bajo el puño y lejos del talón
      y la puntera.
    - Si no cabe, se mueve un poco o se reduce, y la ficha lo avisa.

## Diseños

| Generador | Opciones |
|---|---|
| `adorno-casita` | Estrella y dos ventanas, o corazón, una ventana y puerta a un lado. Todas llevan tejado nevado de ondas, chimenea con nieve, marco y puerta en arco con tablas y ventanas con cruz bordada. |
| `adorno-reno` | Pajarita, gorro o lazo. Cuernos de dos capas, orejas con interior rosa, hocico, nariz rellena y boca bordada. |
| `adorno-jengibre` | Botones, falda con copos y lazo, o bufanda de flecos y gorro. Glaseado ondulado bordado. |
| `adorno-arbol` | Tres capas con ondas sobre una trasera entera, estrella y tronco entre capas, bolas, guirnalda y copos. |
| `adorno-arbol-retales` | 3 o 4 pisos. |
| `adorno-adviento` | 9 figuras: manopla, botita, gorrito, esfera, estrella, árbol, regalo, corazón y bastón. Número del día del 1 al 24. |
| `bota-navidena` | Puño recto u ondas, talón y puntera, aplique. Alto de 25 a 60 cm. |

- **Número del día:** se dibuja con las cifras de Pacifico (SIL OFL), que están
  copiadas en `ornamentDigits.ts` para no cargar todas las tipografías.
  - `fitNumber` lo pone lo más grande posible dentro de la figura, sin tocar
    los apliques.
  - El bastón es demasiado estrecho para el número y la ficha lo dice.
- **Tamaño:** el alto que se pide es el del adorno terminado, cuernos o
  estrella incluidos. Las pruebas lo miden.

## Tarjetas (24)

- **Adornos para colgar (11):**
  - casita nevada y casita del corazón;
  - reno con pajarita, con gorro y con lazo;
  - galleta con botones, con falda y con bufanda;
  - árbol por capas;
  - árbol de retales de lunares y de 4 pisos de rayas.
- **Calendario de adviento (9):** una por figura, con un número de ejemplo.
- **Botas y medias (4):** clásica, de talón y puntera de cuadros, media con
  reno de 30 cm y bota con árbol.

## Seguridad

- `adorno-seguridad`:
  - es un adorno, no un juguete;
  - botones, cuentas y pompones son piezas pequeñas;
  - presilla corta;
  - si es para niños, ojos y botones bordados.
- `bota-seguridad`: lejos de la chimenea, velas y estufas; los apliques no son
  para bebés.

## Cambio en el motor de márgenes

`src/lib/pattern/offset.ts` unía mal una esquina entrante junto a un borde
corto cuando la esquina saliente del otro extremo aún no se había unido. Le
pasaba al árbol escalonado recorrido en un sentido: la línea de corte se
cruzaba en un lado y no en el otro.

- Ahora, si las paralelas no se cortan dentro de sus tramos y se trata de ese
  caso, se unen en su prolongación.
- Condiciones: esquina entrante, el tramo más corto es menor que la distancia
  de unión y la unión queda dentro del límite del inglete.
- La batería completa pasa sin cambios en los demás patrones.

## Validación

- `tests/ornaments.test.ts` (9 pruebas):
  - las 24 tarjetas y sus dibujos;
  - un barrido de 300 combinaciones de tamaño, opciones y margen;
  - la puntada marcada y los apliques en su sitio;
  - el número del día dentro de la figura;
  - forro, puño y aplique de la bota;
  - el árbol de retales;
  - los avisos, la proyección y el PDF.
- En la app, a tamaño iPhone, se comprobó el flujo completo, sin errores de
  consola:
  - la rejilla;
  - la ficha;
  - las opciones (figura y número);
  - las piezas;
  - el PDF de la media con reno (13 páginas);
  - el proyector.

## Pendiente

- Coser muestras: un reno de fieltro, una figurita de adviento y la bota.
- Una guirnalda (varias galletas o figuritas unidas por una cinta).
- Nombre bordado en el puño de la bota.

# Casitas de juego (2026-11-09)

Sección nueva de la biblioteca: **Casitas de juego**, el noveno modo. La
usuaria mandó 10 fotos de casitas de tela (fundas de mesa y casitas de rincón)
y pidió varios diseños con mezclas, colores, decoraciones, ventanas y cortinas:
honguito, princesa, payasos, hada del bosque, rayas…

Son **diseños propios**: se toma la forma de construir, no las telas, los
dibujos, las marcas ni los textos de las fotos. Todo es **experimental** hasta
coser una muestra.

## Dos construcciones

- **Casita de rincón** (`casita-rincon`) se arma con estas piezas:
  - tejado triangular forrado que cuelga de un gancho en el vértice, con
    presilla y anilla;
  - faldón en la base del tejado;
  - jareta para la barra de rincón;
  - pared de cortina con dobladillos y jareta arriba.
  - La pared lleva la puerta (en arco o con cortinas y alzapaños de velcro) o,
    en la versión sencilla, tres paneles: el de la puerta se enrolla con velcro.
  - Medidas por defecto (las de la foto): barra de 130 cm, pared de 98 cm,
    tejado de 85 cm.
- **Casita de mesa** (`casita-mesa`) es una funda para la mesa:
  - techo del tamaño del tablero y cuatro paredes que casan con él;
  - puerta cortada en la pared de delante, con ventanas en todas las paredes;
  - faldones (si el tema los lleva) y bajo con dobladillo;
  - esquinas cosidas o abiertas con tiras de velcro;
  - puerta con cortinas o enrollable, y persianas enrollables según el tema.
- Ventanas: cruz, redonda, corazón, arco o rombo.
  - Se marcan en la pieza como línea de corte y se ribetean con bies.
  - Las barras de la cruz son tiras de bies con su línea de colocación.
- Faldones: ondas, goteo de glaseado, picos, hojas o almenas.
  - Cada faldón tiene un número entero de ondas o picos y mide justo su borde.
  - Las costuras se comprueban.

## Temas

`THEMES` en `src/lib/pattern/generators/playhouses.ts`: 12 temas. Cada uno
elige faldón, ventana, puerta, persianas y buhardilla, y lleva apliques
propios:

| Tema | Lleva |
|---|---|
| Honguito | Lunares en el tejado, hierba, seta |
| Princesa | Corona, corazones, estrellas |
| Payasos | Tejado de rayas y payaso con nariz roja y confeti |
| Hada del bosque | Guirnalda de hojas, seta, flores, mariposa |
| Chocolate con glaseado | Faldón de goteo y grajeas |
| Noche estrellada | Luna, estrellas, buhardilla, persiana |
| Castillo | Almenas, piedras, banderín |
| Jardín | Valla, flores, farol |
| Lunares rosa | Lazos y cortinas de lunares |
| Rayas | Paredes de tela de rayas |
| Menta con persianas | Persianas enrollables |
| Sencilla | Paneles, como la foto con medidas |

- **Mezclas:** en la ficha se cambian el tema, el faldón, las medidas y las
  esquinas. Cualquier tema sirve para las dos construcciones.
- **Apliques que no caben:** `fitDecos` revisa cada motivo y lo omite entero si
  no cabe en su pieza o si taparía la puerta, una ventana o el faldón (pasa en
  medidas muy pequeñas). Los motivos de varias piezas, como la seta o el
  payaso, se quedan o se van juntos.
- **Dibujo:** la casita de rincón se ve de frente; la de mesa, con el lateral
  en perspectiva. Lo hace `src/features/playhouses/PlayhouseArt.ts` con el
  mismo trazado (`playhouseLayout`).

## Tarjetas (12)

- **Rincón (8):** honguito, princesa, circo de payasos, hada del bosque,
  chocolate con glaseado, noche estrellada, castillo y sencilla de paneles.
- **Mesa (4):** jardín, lunares rosa, rayas y menta de esquinas abiertas.

## Seguridad

- El aviso `casita-seguridad` está en todas:
  - fija bien la barra, el gancho y la funda;
  - nada de cordones: alzapaños, persianas y esquinas cierran con velcro;
  - apliques bien cosidos;
  - no es para colgarse de ella ni para dormir dentro sin vigilancia.

## Validación

- `tests/playhouses.test.ts` comprueba:
  - las 12 tarjetas y sus dibujos;
  - las dos construcciones con los 12 temas, tres medidas, tres faldones y
    márgenes de 6 a 15 mm;
  - que los apliques no salen de su pieza ni tapan puertas ni ventanas;
  - los faldones;
  - las construcciones de las fotos;
  - los avisos, la proyección y el PDF.
- El barrido de 432 combinaciones no da errores.

## Pendiente

- Coser una casita de rincón de muestra para comprobar la caída del tejado y
  del faldón.
- Más temas: granja, barco y tienda de helados.
- Elegir los apliques uno a uno desde la ficha.

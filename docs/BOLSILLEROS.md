# Bolsilleros (2026-11-08)

Sección nueva de la biblioteca: **Bolsilleros**, el séptimo modo. La usuaria
mandó 9 fotos de «accesorios porta cosas» y pidió buscar cómo se llaman:

| Idioma | Nombres |
|---|---|
| Español | bolsillero, organizador colgante, organizador de pared |
| Francés | porte-objets, vide-poches mural |
| Alemán | Utensilo, Wandutensilo |
| Inglés | wall pocket organizer, hanging organizer |

Son **diseños propios**: se toma la forma de construir, no las telas, los
dibujos ni las marcas de nadie. Todo es **experimental** hasta coser una muestra.
Los nombres en otros idiomas van como etiquetas de búsqueda de cada tarjeta.

## Cómo funciona

- `src/lib/pattern/generators/organizers.ts`: cada diseño es un **trazado**
  (`OrgLayout`) en milímetros a la medida de referencia. Lleva:
  - la silueta del cuerpo;
  - los bolsillos, con su sitio en el delantero y su boca;
  - los apliques de fieltro, los bordados y el colgador (presilla, tira de
    broche o jareta);
  - piezas extra (cola, hojas, pétalos, conejito…) y el dibujo de la tarjeta.
- `build` convierte el trazado en patrón:
  - delantero y trasero, más entretela o guata sin margen;
  - bolsillos forrados (margen pequeño) o de una capa (dobladillo de 15 mm en
    la boca), y la franja de pliegues de la ballena;
  - apliques sin margen; con cantidad 2, el segundo es el reflejo en el otro
    lado;
  - colgador, y ribete al bies (con su costura comprobada) o abertura para
    voltear.
- **Líneas de colocación**: cada bolsillo y aplique se marca en el delantero.
  Se imprimen y **se proyectan**, para coserlos en su sitio.
- **Curvas hacia dentro**: el cuerpo se redondea con radio 1,5 × margen + 4 mm
  (`closeBody`). Con una curva más cerrada, la línea de corte se cruza.
  - Si el cuerpo va al doblez, como la ballena, se redondea entero y se vuelve
    a cortar por el doblez.
- Dibujo: `src/features/organizers/OrganizerArt.ts`, con el mismo trazado.
  Ficha, PDF y proyección: el catálogo común `PlushCatalog`. El margen ofrece
  6, 10 y 15 mm, y además el del patrón si es otro (12 mm en el trébol).

## Los nueve

| Generador | Construcción |
|---|---|
| `bolsillero-gato` | Gato de 70 cm con orejas, dos bolsillos forrados, cara bordada, cola rellena y presillas en las orejas. La referencia lleva remaches, pero no son para bebés. |
| `bolsillero-koala` | Cabeza redonda, orejas de borreguito, nariz y dos bolsillos. El de abajo sigue el bajo del cuerpo y queda atrapado en la costura. |
| `bolsillero-zorro` | Cabeza de zorro con cara blanca, orejas rosas y ojos dormidos sobre un panel con tres bolsillos. |
| `bolsillero-ballena` | Ballena al doblez por la barriga. Franja de 3 bolsillos con pliegue encontrado (2 × 22 mm cada uno): se dobla por la boca. Lleva aleta, ojo y sonrisa. |
| `bolsillero-flor` | Centro Ø 30 cm con 6 bolsillos acolchados, 8 pétalos de retales, tallo y 2 hojas. Todo con guata. |
| `bolsillero-trebol` | De 3 a 5 hojas en corazón, con un bolsillo de una capa en cada una, y tallo. Margen de 12 mm como la referencia (1/2 pulgada). |
| `organizador-cuna` | Gota acolchada con bolsillo delantero, hoja y tira corta de broche para colgar por fuera de los barrotes. |
| `zanahoria-conejito` | Saco-zanahoria con 3 hojas y bolsillo con rayas pespunteadas. Lleva un conejito relleno con orejas y bufanda. |
| `portalapices-zorro` | Zorro con franja de 4 bolsillos en 4 telas, que suman el forro. Se cuelga de un bastón por una jareta trasera. El ancho (38 cm) es el de la franja. |

## Seguridad

- Todos llevan el aviso `bolsillero-seguridad`:
  - colgar fuera del alcance de la cuna;
  - presilla corta, sin cordones largos;
  - para bebés, ojos bordados y sin remaches.
- El de cuna lleva además el aviso `cuna`: va por fuera de los barrotes y se
  quita cuando el bebé ya se pone de pie.

## Validación

- `tests/organizers.test.ts` comprueba:
  - las 9 tarjetas y sus dibujos;
  - todo el rango de tamaños con acabado volteado y con ribete, margen de 6
    y de 15 mm, y el trébol de 3 a 5 hojas;
  - que bolsillos, apliques y bordados caen dentro del cuerpo y están
    marcados;
  - las construcciones de cada referencia;
  - los avisos, la proyección y el PDF.
- El barrido de 132 combinaciones no da errores.

## Pendiente

- Coser una ballena y un gato de muestra (comprobar los pliegues y la cola).
- Elegir el número de bolsillos del zorro y del gato desde la ficha.

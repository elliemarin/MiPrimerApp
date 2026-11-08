# Cojines (2026-11-08)

Sexto modo de la biblioteca: **Cojines**. La usuaria envió 16 fotos de cojines
con su patrón y pidió revisarlos «como una patronista profesional», lo más
precisos posible, y que **todo lleve patrón para proyectar también**. Hay 18
tarjetas hechas con 17 generadores, en cinco grupos: bebé y lactancia, animales,
naturaleza y cielo, Navidad, y pufs y sillones. Todo es **experimental** hasta
coser muestras.

## Cómo funciona

- Generadores en `src/lib/pattern/generators/cushions.ts`, con el kit
  `cushionKit.ts`:
  - `finishCushion()` marca la abertura o la cremallera invisible y añade, si se
    piden, el **vivo** (tira al bies) y el **fuelle** (costado). Ambos se
    calculan con el contorno real y se comprueban con una relación de costura.
  - `strips()` corta las tiras largas en tramos iguales de 1,1 a 1,4 m.
  - `ruffle()` crea un volante fruncido a una proporción comprobada.
  - `bandsOf()` corta una silueta en franjas horizontales (la abeja). Cada unión
    mide lo mismo por construcción.
  - `polyRuns()` convierte un polígono en pieza con bordes con nombre y lo
    simplifica sin perder las esquinas de corte.
- Margen de 6 a 15 mm (1 cm por defecto). Las piezas pequeñas (patas, picos,
  antenas, brazos largos) usan como máximo 6 mm. En la abeja el margen se
  limita a 1 cm.
- Todos los cojines llevan el aviso de cuna: no se ponen en la cuna de un bebé
  menor de 12 meses. Los pufs llevan además el aviso de las bolitas.
- **Proyectar**: la ficha de juguetes y cojines (`src/features/toys/PlushCatalog.tsx`,
  común a las dos secciones) tiene «Proyectar sobre la tela». Crea un proyecto
  con el patrón (`projectFor`) y abre `#/proyectar/<id>`. El proyecto queda en
  Proyectos, donde también está el PDF para proyector.
- Dibujos (`src/features/cushions/CushionArt.ts`) hechos con las piezas reales.
  Brazos, patas, orejas y aletas se colocan en sus piquetes. Hay estampados de
  vichy, cuadros, rayas y lunares.

## Revisión de cada referencia

| Referencia | Qué se respetó | Qué se corrigió o añadió |
|---|---|---|
| Hipocampo de peluche | Cuerpo de dos piezas, aleta y líneas de compartimento | Hecho con IA (rótulos sin sentido). Silueta rediseñada con cresta de puntas redondeadas y cola en gancho que se puede voltear. Las líneas pasan a ser pespuntes opcionales. Aviso de sueño. |
| Cojín de lactancia | 70 × 52 cm y brazo de 22 cm | Curvas concéntricas (exterior r = 35 cm, interior r = 13 cm, tramo recto de 17 cm). Funda con cremallera invisible y fuelle opcional. |
| Puf conejo | 60 × 40 × 30 cm, orejas de 15 × 20 | Testero en arco de 40 cm con lados de 10 cm. Envolvente de 60 × 83 cm, que es el arco exacto. Base en dos mitades con cremallera, orejas entreteladas y cola. |
| Puf pera (ruso, a 34 cm) | Gota de 20 cm, banda al doblez (28 → 8 cm) y base de 23 cm | La gota se recalcula para medir lo mismo que la banda, y la base para medir lo mismo que los bajos. Escalable a 60–100 cm. |
| Sillón de vichy | 4 cuadrados de 30, 2 rectángulos de 30 × 15, 4 triángulos (diagonal de 33,5 cm, que cuadra) | Fuelle opcional para el grosor de la foto y bisagras para plegarlo. |
| Pato redondo | Cuerpo en huevo, alas, patas largas y pico de dos piezas | «Cortar 2 delanteros y 2 traseros» enteros solo puede ser exterior y forro; se hace delantero y trasero con fuelle (0 = plano). El pie palmeado se suaviza para voltearlo. |
| Árbol con patas | Cuerpo de pisos y patas de tubo con suela | La estrella va aparte, en otro color, y entra en la costura de arriba. El tubo mide exactamente el contorno de la suela. |
| Pino al doblez | 49 cm, pisos de 13, 17 y 21 cm de medio ancho | El tronco del dibujo es una punta mal trazada; se interpreta como un tronco de 7 cm de ancho, como en la foto. |
| Estrella con piernas (IA) | Piernas de 25 + 5 cm y 7 cm de pie; estrellitas de 20–22 cm | «50 cm de alto y 20 de ancho» es imposible para una estrella de cinco puntas. Se toma el alto y el radio se resuelve para que la línea de costura mida justo eso. |
| Conejo redondo | Cabeza de dos círculos, orejas y lazo | 2 orejas exteriores y 2 interiores de distinto tamaño no se pueden cerrar. Se cortan 4 exteriores y el interior se aplica encima. Opción de bola de 6 gajos. |
| Mariposa con encaje | Alas de 35 × 30 cm, cuerpo de 20 × 8 y antenas de 10 cm | Encaje del doble del contorno, o volante de tela comprobado al doble. Las antenas son una tira doblada en cuatro. |
| Abeja (alemán) | Silueta de cabeza y cuerpo con franjas, alas y antenas | «Cortar 1» es solo una cara: se cortan 2 de cada franja. Las alas son 4 (2 por ala). Las franjas salen de la misma silueta, cortada en el punto más estrecho del cuello. |
| Manzana (alemán) | Cuerpo con hoyuelos, hoja y tallo | Una hoja de tela necesita 2 piezas para voltearse (o 1 de fieltro). |
| Nubes | Tres formas: grande, mediana y pequeña | Entrantes redondeados (cierre morfológico) para poder coser y voltear. |
| Hongo y bellota | Siluetas de la referencia | Se cortan en sombrero y pie, y en capucha y fruto, para hacerlos en dos telas. Las uniones miden lo mismo y la de la bellota es la misma curva. |
| Mariposa de alas rellenas | 4 alas con el centro recto y banda con el hilo a lo largo | Vivo calculado con el contorno de las alas. La banda se ajusta apretando el centro. |

## Validación

- `tests/cushions.test.ts`:
  - catálogo, y cada tarjeta sin errores y con dibujo;
  - todo el rango de tamaños con y sin vivo, fuelle y cremallera;
  - medidas de las referencias y costuras que coinciden;
  - vivo, fuelle y volante medidos con el contorno;
  - avisos de seguridad;
  - proyectar juguetes y cojines sin bloqueos;
  - PDF.
- Un barrido de 207 combinaciones da 0 errores.

## Pendiente

- Coser muestras: pino, lactancia, puf conejo y hipocampo primero.
- La franja crema bajo el sombrero del hongo puede ser una pieza aparte.
- Proyectar también las figuras de tela (aplicaciones), que hoy salen solo en PDF.

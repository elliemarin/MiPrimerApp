# Figuras de tela por capas (2026-11-03)

Sección nueva en la biblioteca: **Figuras de tela** (cuarto botón, junto a
«Transformar mi ropa»). La usuaria pidió PDF ajustables de figuras para hacer
en tela, muchos diseños (flores, casas, árboles, animales, verduras, juguetes,
arte, caras y ojos, abstractos, figuras humanas, partes del cuerpo,
psicodélicos y artísticos) y cuidar las profundidades de las capas. Envió de
referencia dos mariposas de fieltro, un hongo de tres piezas y manzanas de
vichy y de rayas; se reconstruyeron como diseños propios, sin copiar imágenes
ni marcas. Todo es **experimental**: nada se ha cosido todavía.

## Qué hace

- **156 diseños originales** en 13 categorías (`src/data/fabricFigures/`):
  flores 14, árboles, plantas y hongos 10, cielo y mar 8, animales 27, casas 8,
  frutas y verduras 18, juguetes 11, caras y ojos 12, cuerpo y figuras humanas 9,
  geometría 9, abstractos 10, psicodélicos 11 y arte 9.
- Cada figura es una pila de piezas de atrás hacia delante. El motor
  (`src/lib/applique/figure.ts`) calcula a la escala pedida:
  - la **parte visible** de cada pieza (lo que no tapan las de encima);
  - la **solapa** (3, 5 u 8 mm) que entra bajo la pieza de encima, para que no
    queden huecos al coser su borde;
  - si se pide **ahorrar tela**, quita lo que queda oculto más allá de la
    solapa: siempre en el borde de la pieza; en el interior solo si el hueco es
    grande (no se abren agujeros pequeños bajo un ojo o un lunar). Una
    apertura morfológica elimina astillas ocultas de menos de 2 mm;
  - la **capa real** (profundidad): 1 = sobre la tela base; cada pieza queda una
    capa por encima de la más alta que pisa. El número de pieza es el orden de
    colocación;
  - el **margen de 5 mm** en la técnica de bordes doblados;
  - avisos si una pieza queda oculta o es demasiado fina (< 4 mm, u 8 mm con
    doblado) para cortarla: se sugiere agrandar o bordar.
- Pantalla (`src/features/figures/`): búsqueda, categorías, tarjetas sobre una
  muestra de lino, hoja de detalle con vistas **Terminada**, **Paso a paso**
  (las piezas aún no colocadas se ven punteadas) y **Piezas** (como se cortan).
  Opciones: ancho en cm (4–150, con tamaños rápidos), técnica, solapa, ahorrar
  tela, espejo para la termoadhesiva y color de cada pieza. Se guardan por
  figura en `localStorage`.
- PDF (`src/features/figures/export.ts`): portada con la figura a color y
  números, orden de colocación (capa, va sobre, debajo de), telas por color con
  área (+30 %), paso a paso según la técnica; **guía de colocación a tamaño
  real** (en mosaico si no cabe); **piezas 1:1** acomodadas varias por hoja (o
  en mosaico si son grandes), en espejo para la termoadhesiva, con muestra de
  color, línea fina donde va el borde de la pieza de encima y las piezas de
  varias partes separadas («parte 1 de 4»). Lleva `figura.json` adjunto.

## Cómo añadir una figura

1. En el archivo de su tema (`nature.ts`, `animals.ts`, `everyday.ts`,
   `people.ts`, `art.ts`) añade `fig(id, nombre, categoría, etiquetas, anchoMm,
   descripción, capas)`. Las capas van **de atrás hacia delante**:
   `[nombre, color, forma, estampado?]`.
2. Dibuja en una caja de unos 200 × 200 con las formas de
   `src/lib/applique/shapes.ts` (círculo, elipse, pétalos, estrella, hoja, gota,
   corazón, ondas, manchas, espirales, trazos, `svg()`; `uni`, `minus`, `inter`,
   `pair` para pares izquierda/derecha, `around` para repetir en círculo).
3. Cada pieza debe verse en parte y no ser más fina de 4 mm al ancho sugerido:
   `tests/fabric-figures.test.ts` lo comprueba en todas las figuras.
4. Si una pieza va por encima de otra, debe solaparla (aunque sea poco): dos
   piezas que solo se tocan quedan en la misma capa y sin solapa.

## Pendiente

- Coser muestras (hongo, mariposa en capas, vitral) antes de quitar
  «experimental».
- Llevar una figura al Estudio para colocarla sobre una prenda.
- Patrones de tela reales (vichy, rayas) en la portada del PDF; ahora solo en
  pantalla.

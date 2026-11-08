# Juguetes y peluches (2026-11-08)

Sección nueva de la biblioteca: **Juguetes y peluches** (quinto botón). La
usuaria envió 16 fotos de juguetes con su patrón (abejas de rayas, mariquita
redonda con lazo, hada de fieltro, libélula de lino, muñecas flor, perrito,
patito, muñecas de 30 cm con ropa, conejitas con peto, gatos con peto y vestido,
conejo 3D de vichy y conejo de patchwork) y pidió hacer y perfeccionar los
patrones. Se reconstruyeron como **diseños propios** (no se copian imágenes,
marcas ni medidas; varias referencias eran de IA con medidas imposibles, por
ejemplo una cabeza de 14 cm de ancho para un cuerpo de 8 cm). Todo es
**experimental** hasta coser muestras.

## Cómo funciona

- Los juguetes usan el **motor de patrones** de la app: cada pieza tiene línea de
  costura, margen añadido en milímetros (no se escala), piquetes, marcas de
  bordado y relaciones de costura que `validatePattern` comprueba. El PDF usa las
  mismas piezas 1:1 que la ropa.
- Kit `src/lib/pattern/generators/toyKit.ts`: `plush()` traza curvas suaves por
  puntos con bordes con nombre (`cuello`, `costado`, `base`, `union`…);
  `insertion()` marca dónde entran brazos, piernas y orejas; `match()` declara
  costuras que deben medir igual. Diseño a 30 cm (1 unidad = 1 mm) escalado con el
  alto.
- Generadores (`toys.ts`):
  - `muneco-trapo`: muñeca, conejita, gatito, perrito, patito, abeja y muñeca
    flor. Cabeza y cuerpo unidos por un cuello del mismo largo; brazos y piernas
    entre piquetes; abertura para voltear en la pieza trasera. La **ropa se
    calcula con el cuerpo relleno** (contorno ≈ 0,92 × doble del ancho plano +
    holgura): peto corto o largo, vestido con broches, chaqueta de hombro caído
    (copa = suma de sisas), pantalón de jareta. Accesorios: moño, bolso cruzado,
    bufanda, hueso, zapatos (la parte de arriba mide lo mismo que la suela), base
    de cabello y parche de patchwork. La muñeca flor reparte los pétalos para
    cubrir **exactamente** el contorno de la cabeza menos el cuello.
  - `peluche-bichito`: cabeza de dos círculos con cara aplicada, cuerpo, bracitos,
    patitas, alas forradas, lunares, antenas y lazo.
  - `fieltro-hada`: fieltro sin margen, festón a mano.
  - `peluche-libelula`: banda del cuerpo un 32 % más larga que se frunce cada 4 cm
    (el largo terminado coincide con el pedido), cabeza de dos medias esferas,
    alas forradas y tira de unión.
  - `peluche-conejo-3d`: fuelle central de la cabeza resuelto para medir lo mismo
    que el borde de las cabezas laterales, panza resuelta contra el frente del
    cuerpo, cuello de cuerpo + panza igual al de la cabeza y suelas con el mismo
    contorno que la planta.
- Seguridad: aviso en todos los juguetes (para menores de 3 años, ojos bordados,
  sin botones, cuentas ni alambre); la abeja tiene antenas bordadas como opción;
  error si una pieza rellena queda más estrecha de 16 mm para voltearla.
- Pantalla `src/features/toys/`: tarjetas (`src/data/toys.ts`, 16 recetas) con
  ilustración dibujada **con las piezas reales** colocadas en vista frontal
  (ToyArt), ficha con alto, opciones, margen, lista de piezas, avisos y PDF.
  El PDF (`export.ts`) incluye materiales, tabla de corte, **costuras
  comprobadas**, pasos y piezas 1:1.

## Pendiente

- Coser muestras (muñeca con ropa, conejo 3D y abeja) antes de quitar
  «experimental».
- Manga de dos piezas y cabeza con pinzas para muñecas más grandes.
- Ropa extra (camiseta, falda, gorro de punto) y más animales.

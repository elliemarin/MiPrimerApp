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

## Segundo lote (2026-11-08)

La usuaria envió 10 fotos más (ositos planos, osos 3D de cuadros y de recuerdo,
cinco conejos distintos, una casa hongo de gajos y una casita de gnomos de
fieltro) con «Realiza lo mismo con estos». Se añadieron **10 tarjetas** (26 en
total) y una sexta categoría, **Casitas**. Generadores nuevos en
`src/lib/pattern/generators/toys2.ts` (los avisos y parámetros comunes pasaron a
`toyKit.ts`):

- `peluche-plano` (osito o conejita): cabeza de dos caras (el osito con las
  orejas redondas en el contorno), cuerpo con las piernas de una pieza, brazos
  en los costados, hocico aplicado opcional y lazo. La V entre las piernas
  lleva un margen máximo de 5 mm para que los dos lados no se monten.
- `peluche-oso-3d`: cabeza de cinco piezas (dos laterales, fuelle de la nariz a
  la coronilla y dos traseras). La costura de la nuca es **la misma curva** en la
  cabeza lateral y en la trasera (`mirrorRun` / recorrido inverso), así que
  miden igual por construcción. El cuello delantero del cuerpo toma el largo
  del cuello de la cabeza lateral y el trasero el de la cabeza trasera: las
  cuatro esquinas coinciden. Cuerpo con pinza en ojal en la espalda (`fishDart`),
  base ovalada resuelta contra el bajo de los cuatro cuerpos, brazos, piernas
  con suela y cola.
- `peluche-conejo-sentado`: cara de perfil (hocico) y cabeza trasera unidas por
  encima de la cabeza, orejas largas caídas o medianas metidas en esa costura,
  cuerpo de pera con pinzas y base, patas delanteras, patas traseras con suela y
  cola de círculo fruncido.
- `peluche-casa-hongo`: N gajos de pared (5 a 8) cuyos bordes rectos suman
  exactamente el contorno de la base y de la tapa; N gajos esféricos de tejado
  terminados en una onda, y un bajo de tejado con **la misma onda repetida N
  veces** (mismos tres puntos y tangentes, así que miden igual). Paredes y
  tejado se rellenan por cortes que quedan escondidos en la unión. Puerta,
  ventanas y lunares de fieltro.
- `fieltro-casa-gnomos`: casita plana de fieltro sin margen (casa, tejado
  ondulado, puerta, ventanas, setas, hojas y lunares) con cinta opcional para
  colgar; avisa de que es un adorno.
- Muñeco de trapo: personaje nuevo **conejo de orejas largas** (orejas de 168
  unidades y hocico aplicado con nariz bordada), ropa nueva **blusa con volante
  y pantalón** (volante fruncido 1,7 veces el bajo de la blusa, comprobado) y
  accesorio **sombrero** (ala doble con la línea de la copa marcada; la base de
  la copa mide justo esa línea; se cose a la cabeza, sin cintas).
- Ilustraciones: el osito y la conejita planos y la casita de gnomos se dibujan
  con sus piezas reales; oso 3D, conejo sentado y casa hongo en vista frontal.
  Las tarjetas pueden llevar estampado (`print`: vichy, cuadros o rayas).
- Referencias con medidas dudosas: el patrón de «oso de tela» de cuadros y
  leopardo parecía hecho con IA (nombres mezclados en francés, español e
  italiano y medidas que no cierran), así que solo se tomó la idea de
  construcción. El kit comercial de oso de 17 piezas y el conejo de una
  diseñadora concreta sirvieron de inspiración de construcción, sin copiar
  piezas, medidas ni nombres.

## Proyectar (2026-11-08)

La ficha de juguetes es ahora la ficha común `src/features/toys/PlushCatalog.tsx`
(también la usan los cojines). Además del PDF tiene **«Proyectar sobre la
tela»**, que crea un proyecto con el patrón y abre el proyector a tamaño real.
Los dibujos usan los ayudantes de `src/features/toys/art.ts`.

## Pendiente

- Coser muestras (muñeca con ropa, conejo 3D, oso 3D, conejo sentado y casa
  hongo) antes de quitar «experimental».
- Manga de dos piezas y cabeza con pinzas para muñecas más grandes.
- Ropa extra (camiseta, falda, gorro de punto) y más animales.

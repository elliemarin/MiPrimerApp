# Tendencias (mezclilla y oversize) y más Bebé

Entrega de Claude del 2026-11-01. Respuesta a «amplía la gama de pantalones y
chaquetas actuales (oversize, hombros caídos, mezclilla más compleja, baggy,
barrel…) y en bebés más jumpers, pantalones barrel, conjuntos y gorritos».
Todo es **experimental**: nada se ha impreso ni cosido todavía. No cambies el
estado a `implementado` sin una muestra física.

## Qué hay

| Tarjeta (grupo) | Recetas (ids del catálogo) | Generador | Para |
| --- | --- | --- | --- |
| Jeans rectos de cinco bolsillos | `jeans-recto` | `pantalon-mezclilla` | niña/niño, mujer, hombre |
| Pantalón pitillo | `pantalon-pitillo` (antes inspiración) | `pantalon-mezclilla` | niña/niño, mujer, hombre |
| Mom jeans de tiro alto | `jeans-mom` | `pantalon-mezclilla` | niña/niño, mujer, hombre |
| Pantalón acampanado | `pantalon-acampanado` (antes inspiración) | `pantalon-mezclilla` | niña/niño, mujer, hombre |
| Jeans de pierna ancha | `jeans-ancho` | `pantalon-mezclilla` | niña/niño, mujer, hombre |
| Pantalón baggy | `pantalon-baggy` (antes inspiración), `baggy-bebe` | `pantalon-mezclilla` | todos; bebé con elástico |
| Pantalón barrel | `pantalon-barrel` (antes inspiración), `barrel-bebe` | `pantalon-mezclilla` | todos; bebé con elástico |
| Pantalón cargo | `pantalon-cargo` (antes inspiración) | `pantalon-mezclilla` | niña/niño, mujer, hombre |
| Camiseta oversize | `camiseta-oversize`, `camiseta-oversize-larga` | `oversize-hombro-caido` | todos |
| Sobrecamisa oversize | `sobrecamisa-leñadora`, `sobrecamisa-corta` (antes inspiración) | `oversize-hombro-caido` | niña/niño, mujer, hombre |
| Chaqueta de trabajo oversize | `chaqueta-trabajo` | `oversize-hombro-caido` | niña/niño, mujer, hombre |
| Bomber oversize | `bomber-clasica`, `bomber-corta` (antes inspiración) | `oversize-hombro-caido` | niña/niño, mujer, hombre |
| Peto de bebé (jumper) | `pelele-tirantes` (corto), `overol-bebe` (largo) | `peto-bebe` | bebé, 1–4 |
| Gorro con orejitas | `gorro-orejas-oso`, `-gato`, `-conejo` | `gorro-orejas` | bebé, 1–4, niña/niño |
| Sombrero pescador (bucket) | `sombrero-pescador` (antes inspiración), `sombrero-pescador-bebe` | `sombrero-pescador` | todos |
| Conjuntos de bebé | `conjunto-verano`, `conjunto-invierno`, `conjunto-recien-nacido` | `conjunto-bebe` | bebé, 1–4 |

Las inspiraciones que ya existían conservan su id (`withTrendPatterns` en
`src/data/trendCatalog.ts` las convierte en patrones). El filtro **Bebé** pasó
de 15 a 22 diseños con patrón. Nuevo acceso **Tendencias** en la biblioteca
(`LibraryPage.tsx`, colección `Tendencias`: 12 tarjetas).

## Archivos

- `src/lib/pattern/generators/jeans.ts`: pantalón de mezclilla con siluetas
  (`recto`, `pitillo`, `mom`, `acampanado`, `ancho`, `baggy`, `barrel`), tiro
  bajo/medio/alto, pretina con bragueta de cierre o cintura elástica, bolsillos
  `cinco` (delanteros en curva con vista y forro, relojera, traseros de parche),
  `parche` o `cargo` (con cartera). Piezas con pretina: delantero, trasero,
  canesú, vista y forro de bolsillo, relojera, pretina, tapeta, presillas,
  bolsillo trasero y, si toca, bolsillo cargo y cartera.
- `src/lib/pattern/generators/oversize.ts`: hombro caído para `camiseta`
  (cuello de rib), `sobrecamisa` (tapeta integrada, pie de cuello y cuello,
  bolsillos de pecho o tres bolsillos) y `bomber` (cuello, bajo y puños de rib,
  forro, vivos y bolsa de bolsillo, cierre separable).
- `src/lib/pattern/generators/babyMore.ts`: `peto-bebe`, `gorro-orejas`,
  `sombrero-pescador` y `conjunto-bebe` (compone generadores con ids
  prefijados: `pelele-…`, `sombrero-…`, `overol-…`, `gorro-…`, `bonete-…`).
- `src/data/trendCatalog.ts`: tarjetas, variantes, grupos y colecciones.
- `src/data/catalogTaxonomy.ts`: familias (`conjunto` nueva), DESIGNS y
  `constructionFacets` de los seis generadores.
- `src/data/kidsFlats.ts`: dibujos técnicos desde piezas reales del peto, gorros,
  sombrero y conjuntos, con `KIDS_SURFACE_PIECES`. `compose()` coloca las prendas
  de un conjunto en una línea base común y admite `row` para accesorios
  pequeños debajo. Los jeans y las prendas oversize reutilizan los dibujos de
  pantalón y parte superior ya existentes.
- `scripts/render-kids-sheets.ts` → `public/catalog-images/tendencia-01.webp`,
  `tendencia-02.webp` y `tendencia-03.webp` (ilustraciones vectoriales dibujadas
  desde el dibujo técnico, **no IA**). `tendencia-03` solo tiene celdas de
  variante (`VARIANT_IMAGES` en `catalogImages.ts`), para que cada versión del
  selector muestre su propio dibujo. Regenerar:
  `npx vite-node scripts/render-kids-sheets.ts tendencia-01 tendencia-02 tendencia-03`.
- `tests/trends.test.ts`: barrido de siluetas, cierre de cintura, formas,
  elástico de bebé, copa de manga = sisa, piezas de sobrecamisa y bomber,
  aberturas del peto, sombrero, ids únicos en conjuntos y enlaces de dibujos.

## Reglas de construcción que no deben romperse

- **Mezclilla:** el tiro trasero se baja por bisección hasta que las dos
  entrepiernas midan lo mismo; el costado se comparte entre delantero y
  trasero. El canesú absorbe la pinza y se resuelve para que la cintura cerrada
  mida cintura + holgura. La tapeta lleva margen propio y la extensión de la
  bragueta descuenta ese margen (si no, el corte se cruzaba).
- **Cintura elástica:** holgura mínima de 9 % para que pase por la cadera.
  En bebé y 1–4 años: extensiones de tiro 1/16 y 1/10 de cadera, rodilla al
  58 % y largo mínimo tiro + 8 cm. El bolsillo trasero se escala o se omite con
  el aviso `sin-bolsillo-trasero` si no cabe.
- **Siluetas:** barrel curva la pierna (rodilla más ancha que el bajo); el
  acampanado abre desde la rodilla; baggy y barrel bajan el tiro con holgura de
  tiro propia. Medidas a revisar con muestra.
- **Hombro caído:** medio hombro ≤ cuarto de pecho con holgura − 40 mm × escala
  de talla, para no comerse el escote; la copa de manga se resuelve para medir
  igual que la sisa; los puntos de control de la axila son diagonales (una sisa
  muy cerrada doblaba el margen).
- **Bomber:** rib al 85 % del largo que cubre.
- **Peto:** delantero y espalda al doblez con babero; tirantes con dos broches
  para crecer; aberturas de pierna y entrepierna para broches de presión.
  Sin cordones ni cintas largas.
- **Sombrero:** copa oval resuelta al contorno de cabeza; banda y ala como
  sectores de cono en dos mitades, forro reversible. El barbiquejo es corto y
  con broche; el aviso pide no cambiarlo por cintas largas ni dormir con él.
- **Gorro con orejas:** en punto (elasticidad 30 %); orejas en pares.

Validación de esta entrega: barridos en todas las tablas de tallas y variantes
(jeans 4256/4256, oversize 226/226, bebé 325/325 sin errores de
`validatePattern`), **2,970 pruebas en 69 archivos**, TypeScript y compilación
correctos. Recorrido en iPhone 13 (Playwright): chip Tendencias (12 tarjetas),
ficha y PDF del pantalón barrel (44 hojas carta), selector de conjuntos, gorros y
bomber con su propio dibujo, sin errores de consola.

## Pendiente

- Imprimir y coser muestras (empezar por jeans recto talla M, barrel, peto
  corto y gorro de oso) antes de quitar «experimental».
- Revisar holguras de baggy y barrel con una persona real; el tiro bajo del
  baggy es una estimación.
- Las vistas armadas de los jeans y prendas oversize usan los dibujos genéricos
  de pantalón y parte superior; un dibujo propio con canesú y bolsillos de
  cinco sería más fiel.

# Auditoría visual del catálogo — 30 de octubre de 2026

Se revisaron las **69 familias con patrón**, una tarjeta representativa por
construcción, y los contornos de todas las recetas mediante la regresión del
catálogo. Los cambios visuales son vectores originales: mantienen la identidad
de Hilvana y no requieren red ni un servicio de generación de imágenes.

## Qué cambió

- Fundas: bordes textiles suaves y un objeto de referencia distinto para laptop,
  teléfono, tablet, libro, cuaderno, lector, lentes, consola, pasaporte, tarjetas,
  bastidor, patrones, cables y muestrario. Los objetos se dibujan fuera de la
  funda; no representan estampados o bordados incluidos.
- Hogar: vajilla, taza, máquina de coser, bandeja, ratón, teclado, florero y marco
  hacen reconocible el uso de cada rectángulo. El marcapáginas se muestra junto
  a un libro y la servilleta aparece doblada.
- Cabello y lazos: scrunchie con frunces orgánicos; bandas, pulseras, cinturón y
  lazo se muestran anudados en lugar de una tira casi invisible.
- Bolsas: jareta fruncida con cordones, estuche con cremallera, tote con volumen
  de la base. La tarjeta del tote no anuncia el bolsillo opcional que el motor
  de la base no corta; el jogger tampoco muestra sus bolsillos aún pendientes.
- Chaquetas y blusones: mangas caídas, pliegues suaves y proporción de la prenda
  montada; se conserva cada composición de paneles. Los dibujos originales del
  estudio y la vista en figurín mantienen su contrato previo.
- Colores de referencia: azul gris en fundas, lino cálido en estuches y rosa
  tierra en bandas. Las telas elegidas en el proyecto siguen prevaleciendo.

## Contrato técnico

`src/data/catalogArtwork.ts` produce una copia de presentación y una referencia
opcional. `CatalogObject.tsx` dibuja objetos originales con SVG. Sólo se activa
con `FlatArt catalog`: tarjetas de biblioteca, detalle y selector de medidas.
`buildFlat`, el caché original, zonas guardadas, colocación de bordados/extras,
geometría de corte y PDF no se transforman. La proyección de las mangas usa el
mismo cálculo ilustrativo existente para figurines, sólo en frente y espalda.
Los costados permanecen como dibujo técnico.

Los objetos no se convierten en zonas editables ni piezas del patrón. La ficha
muestra «Ejemplo de uso. El patrón incluye el textil; los objetos son de
referencia». El SVG lleva la misma explicación accesible. No se afirma una
simulación de caída ni un ajuste comprobado por la ilustración.

## Registro de las familias revisadas

| Familia | Tratamiento |
| --- | --- |
| Pantalón recto con cintura elástica | Revisado; silueta específica conservada |
| Jogger con cintura elástica | Revisado; silueta específica conservada |
| Pantalón amplio con cintura elástica | Revisado; silueta específica conservada |
| Short con cintura elástica | Revisado; silueta específica conservada |
| Pantalón de pijama | Revisado; silueta específica conservada |
| Falda fruncida con cintura elástica | Revisado; silueta específica conservada |
| Babero | Revisado; silueta específica conservada |
| Gorro de punto | Revisado; silueta específica conservada |
| Bolsa tote con asas | Base montada; sin bolsillo opcional |
| Funda de cojín o almohada | Revisado; silueta específica conservada |
| Funda para bebidas | Revisado; silueta específica conservada |
| Dona para cabello | Frunces y contorno orgánico |
| Bandana reversible | Revisado; silueta específica conservada |
| Mantel individual reversible | Textil con contexto de uso; servilleta doblada |
| Posavasos textil | Textil con contexto de uso; servilleta doblada |
| Servilleta reversible | Textil con contexto de uso; servilleta doblada |
| Marcapáginas textil | Textil con contexto de uso; servilleta doblada |
| Tapete para máquina de coser | Textil con contexto de uso; servilleta doblada |
| Delantal con peto y bolsillo | Revisado; silueta específica conservada |
| Antifaz forrado | Revisado; silueta específica conservada |
| Banderín triangular | Revisado; silueta específica conservada |
| Chaqueta de hombro caído | Mangas caídas y pliegues; paneles conservados |
| Cárdigan abierto | Mangas caídas y pliegues; paneles conservados |
| Chaleco abierto | Mangas caídas y pliegues; paneles conservados |
| Poncho rectangular | Revisado; silueta específica conservada |
| Ruana abierta | Revisado; silueta específica conservada |
| Jumper con peto y falda | Revisado; silueta específica conservada |
| Top de escote cuadrado | Mangas caídas y pliegues; paneles conservados |
| Top de escote cuadrado sin mangas | Mangas caídas y pliegues; paneles conservados |
| Funda para portátil | Funda suave + objeto de referencia específico |
| Funda para tableta | Funda suave + objeto de referencia específico |
| Funda para teléfono | Funda suave + objeto de referencia específico |
| Funda para libro o agenda | Funda suave + objeto de referencia específico |
| Funda para lentes | Funda suave + objeto de referencia específico |
| Funda para lector electrónico | Funda suave + objeto de referencia específico |
| Funda para consola portátil | Funda suave + objeto de referencia específico |
| Bolsa con jareta | Frunce, canal y cordones |
| Estuche plano con cierre | Bordes suaves y cremallera |
| Banda o lazo para cabello | Banda anudada; forma terminada |
| Cinturón de tela para anudar | Banda anudada; forma terminada |
| Pulsera anudada de tela | Banda anudada; forma terminada |
| Lazo reutilizable para regalo | Banda anudada; forma terminada |
| Chaqueta collage de bandas | Mangas caídas y pliegues; paneles conservados |
| Chaqueta patchwork de franjas | Mangas caídas y pliegues; paneles conservados |
| Chaqueta patchwork de nueve paneles | Mangas caídas y pliegues; paneles conservados |
| Chaqueta de canesú diagonal | Mangas caídas y pliegues; paneles conservados |
| Chaqueta de collage geométrico | Mangas caídas y pliegues; paneles conservados |
| Sudadera sin capucha | Revisado; silueta específica conservada |
| Hoodie holgada | Revisado; silueta específica conservada |
| Funda para cuadernos | Funda suave + objeto de referencia específico |
| Funda para tarjetas y notas | Funda suave + objeto de referencia específico |
| Funda para pasaporte | Funda suave + objeto de referencia específico |
| Funda para patrones | Funda suave + objeto de referencia específico |
| Funda para bastidor | Funda suave + objeto de referencia específico |
| Funda para cables | Funda suave + objeto de referencia específico |
| Funda para muestrario textil | Funda suave + objeto de referencia específico |
| Tapete para bandeja | Textil con contexto de uso; servilleta doblada |
| Tapete para taza | Textil con contexto de uso; servilleta doblada |
| Tapete para plato | Textil con contexto de uso; servilleta doblada |
| Centro de mesa | Textil con contexto de uso; servilleta doblada |
| Camino de mesa | Textil con contexto de uso; servilleta doblada |
| Tapete para ratón | Textil con contexto de uso; servilleta doblada |
| Protector textil de escritorio | Textil con contexto de uso; servilleta doblada |
| Base para muestrario | Textil con contexto de uso; servilleta doblada |
| Panel decorativo textil | Textil con contexto de uso; servilleta doblada |
| Capa semicircular de aventura | Revisado; silueta específica conservada |
| Corona textil de puntas | Revisado; silueta específica conservada |
| Sombrero cónico de mago | Revisado; silueta específica conservada |
| Orejas textiles de personaje | Revisado; silueta específica conservada |

## Verificación

- `tests/catalog-artwork.test.ts`: 69 diseños finitos, entradas sin mutaciones,
  contexto dentro del encuadre y fuera de las zonas editables; alias explícitos
  de objetos; tote sin prometer un bolsillo no incluido.
- Regresión: contornos de todo el catálogo, composición de figurines, materiales
  por pieza y disfraces. Las fotografías y transformaciones elegidas conservan
  sus IDs y valores.
- `tests/browser/catalog_art_smoke.py`: tarjetas reales a 390 px y hojas de
  contacto completas a 390/1500 px. Revisa ausencia de errores y desbordamiento,
  presencia de contextos y estado del caché antes/después. Artefactos locales:
  `/tmp/hilvana-art-contact-{390,1500}.png`,
  `/tmp/hilvana-art-library-390.png` y `/tmp/hilvana-art-audit.json`.
- Regresión completa `visual_materials_smoke.py` aprobada a 320/390/950/1440 px:
  cámara/carrete simulados, orden de telas tras recarga, barra de herramientas y
  figurín. Acabados/modelo a 390/1440 px: foto conservada, tono/silueta guardados,
  patrón intacto. Log `/tmp/hilvana-art-materials-regression.log`.

No se sustituyeron dibujos técnicos por fotografías que pudieran representar
una confección distinta. Las prendas y accesorios experimentales conservan la
necesidad de imprimir y coser muestras, independientemente de su ilustración.

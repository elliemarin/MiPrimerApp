# Auditoría de categorías y filtros · 30 de octubre de 2026

Se revisaron los **1,882 registros** del catálogo local: **1,804 recetas con
patrón** y 78 referencias de estudio/inspiración. Representan **147 diseños**,
de los que **69 generan patrón**, clasificados en **60 familias precisas**
(43 familias tienen recetas nativas). Las medidas siguen agrupadas dentro de
cada diseño. No se cambiaron IDs, parámetros geométricos ni proyectos guardados.

El inventario completo, una fila por ID, está en
[auditoria/catalogo.csv](auditoria/catalogo.csv). Incluye diseño, nombre, categoría,
familia, destinatarios originales y resueltos por filtro, dificultad, técnicas,
tejidos, elasticidad, ajuste, motor, estado, disponibilidad y parámetros. Los
parámetros conservan sus unidades originales: longitudes en milímetros,
proporciones como razones y opciones como valores enumerados.

## Causa de los resultados incorrectos

La búsqueda incluía la etiqueta general de categoría, por ejemplo «Sudaderas,
chalecos, chaquetas y abrigos», además de colecciones y párrafos sobre versiones
que todavía no se construyen. Por ello, una coincidencia de texto no siempre
describía el artículo. Además, la búsqueda de hoodie exigía capucha pero también
aceptaba una parka, capa o poncho con capucha. Las fuentes externas aparecían
debajo con un buscador independiente, lo que podía confundirse con resultados
de la misma selección; ahora la interfaz las presenta en una pestaña separada.

## Clasificación y búsqueda

`src/data/catalogTaxonomy.ts` asigna explícitamente los 147 IDs de diseño a una
familia. Cada registro de `CATALOG` recibe su etiqueta `family`; la comprobación
exhaustiva rechaza cualquier diseño sin clasificar. La asignación se basa en
construcciones, parámetros e IDs, nunca en el parecido de una ilustración.

- **Hoodies** tiene una familia propia. Hoodie, hoodies, hoddie, hoddies y hoody
  encuentran únicamente esa familia. Se conservan las 72 recetas de medidas y
  la antigua inspiración; la disponibilidad distingue ambas cosas.
- **Sudaderas sin capucha, chaquetas, chalecos, cárdigans, abrigos, ponchos,
  ruanas y capas** son familias distintas. Las consultas con/sin capucha
  verifican la construcción real.
- **Jumppers/jumpers/petos** identifica petos; monos/enterizos/jumpsuits identifica
  monos. «Pantalones» no devuelve un overol o un mono por mencionar sus piernas.
  Se aceptan «jumper falda», «peto falda», «delantal peto» y «pantalón corto»
  mediante relaciones explícitas de construcción. «Funda laptop» excluye una
  consola portátil y «funda libro» excluye fundas de tecnología.
- **Bolsas con jareta y estuches** pasan a la categoría general Bolsos; el overol
  pasa a Monos/petos. El ID `cesta-textil` conserva su receta de tote y ahora se
  llama «Bolsa tote compacta para el escritorio», que describe su construcción.
- Accesorios se separan en fundas de tecnología, lectura, costura y lentes;
  cojines, bebidas, cabello, bandanas, delantales, mantelería, tapetes,
  organizadores, disfraces y otras familias específicas. Un cinturón o lazo de
  regalo no aparece como accesorio de cabello porque comparta motor.

Las familias de filtro amplias no ensanchan una búsqueda específica a sus
objetos hermanos. «Servilleta» devuelve servilletas; «mantel/individual»,
individuales; «banda», bandas sin donas; «monedero» elige recetas de monedero y
su representante de 12 × 9 cm, sin lápices ni lentes. También se distinguen
neceseres, túnicas, parkas/trench, pajaritas/corbatas, protectores/tapetes,
portacubiertos, almohadas y variantes de peto/mono según el nombre propio de la
receta o su construcción. Las consultas generales «mantelería», «fundas» y
«estuches» conservan su alcance amplio. Se comprueban variantes y representantes,
no solo que los resultados compartan una etiqueta general.

Los nombres conocidos se resuelven por identidad antes de buscar el resto de
los términos. Los términos adicionales siguen buscando dimensiones, nombres,
usos declarados, tejidos, ajuste y destinatarios; acentos, mayúsculas y espacios
no cambian el resultado. Se excluyen las etiquetas generales de categoría,
colección y la prosa sobre variantes futuras. Los nombres completos visibles de
las tarjetas siguen siendo localizables. Se filtra **antes** de agrupar: tanto
la tarjeta como sus medidas representativas cumplen los filtros activos.

`sanitizeFilters` valida los filtros persistidos y elimina subcategorías antiguas
que ya no tienen un control visible. Las combinaciones contradictorias ofrecen
cero resultados y la posibilidad de quitar filtros; no se ignora un filtro para
rellenar la lista con otros artículos.

## Bebé y destinatarios

Los registros compatibles con bebé son nueve: pantalón recto, jogger, jogger de
pañal, short, pantalón de pijama, body, mameluco, babero y gorro. Body y mameluco
continúan como inspiración. Los otros siete registros se agrupan en **seis diseños
con patrón**. Los presets de colección con largos adultos no reciben etiqueta de
bebé. El acceso visible Bebé emplea destinatario, por lo que no oculta pantalones
compatibles por estar en una categoría general diferente.

Baberos y gorros pertenecen ahora a Accesorios y el jogger de pañal a Pantalones;
la edad se conserva como destinatario. La combinación Bebé + Accesorios devuelve
babero y gorro. Una sesión antigua con categoría `bebe` se migra a destinatario
Bebé y categoría general Todos, recuperando los seis diseños y el selector de
meses.

Unisex admite Mujer y Hombre, igual que el selector de creación. **No se deduce
bebé ni infancia desde unisex.** Se conservan explícitamente el delantal infantil
y los accesorios con medidas adultas; no se mezclan las variantes del adulto al
elegir meses en el selector de talla.

## Técnicas, telas y dificultad revisadas

Las etiquetas de técnica de las recetas nativas reflejan sus piezas y pasos de
confección. Bordado/aplicación siguen disponibles para intervenir cualquier base,
pero no se presentan como operaciones necesarias de todas ellas.

- Hoodies y sudaderas: punto y dobladillos, dificultad 2. Sus patrones actuales
  tienen bajos sencillos; no se les asignan puños de rib inexistentes.
- Chaquetas/top de hombro caído y jumpers: dificultad 2; collage solo cuando hay
  cortes de paneles. El jumper no anuncia botones: el motor fija los tirantes.
- Estuches: cierre y forro, dificultad 2. Jaretas, dobladillos y bolsillos se
  asignan donde efectivamente existen.
- Tote: forro solo cuando el parámetro lo incluye (también en el valor original
  implícito). Sin forro lleva dobladillo y dificultad 1; forrada, dificultad 2.
- Se distinguen los puños del jogger, el forro de fundas/antifaces y el frunce de
  faldas/donas. El sombrero de mago conserva dificultad 3.
- Las referencias antiguas de hoodie/sudadera dejan de anunciar cierre. La
  blusa en V no lleva etiqueta de punto ni rib cuando propone tejido plano y
  vistas. Varsity y poncho de polar admiten punto además de plano; los mitones
  de polar recomiendan polar y se clasifican como punto, sin elasticidad nula.

La dificultad es una orientación de las operaciones de confección, no una
certificación de ajuste. Esta auditoría no cambia el estado de verificación
física de ningún patrón.

## Reproducción y comprobaciones

```bash
node scripts/audit-catalog.mjs
npx vitest run tests/catalog-taxonomy.test.ts tests/library-filters.test.ts tests/catalog-groups.test.ts tests/catalog-massive.test.ts
npm test
npm run build
```

La prueba de taxonomía recorre todos los artículos y familias, comprueba las
búsquedas estrictas y combinadas, destinatarios, disponibilidad, técnicas,
medidas, agrupación y sesiones anteriores. El CSV se regenera sin red y sin
leer proyectos o perfiles privados. Al agregar un diseño nuevo hay que
clasificarlo, comprobar sus destinatarios y actualizar esta auditoría.

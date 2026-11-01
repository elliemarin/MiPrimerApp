# Hoodies y pantalones por construcción

Entrega del 1 de noviembre de 2026. Esta ampliación incorpora **24 estilos**:
doce hoodies y doce pantalones. Cada estilo es una tarjeta y un generador
independiente; no se cuentan cambios de talla ni color como estilos nuevos.

## Archivos

- `src/lib/pattern/generators/streetStyles.ts`: recetas, parámetros, patrones,
  materiales, relaciones de costura y pasos. Reutiliza los bloques verificados
  de `hoodie.ts` y `jeans.ts` sin modificar sus recetas anteriores.
- `src/data/streetStyleCatalog.ts`: tarjetas y familias explícitas. Todos los
  modelos admiten mujer, hombre y unisex; ninguno se ofrece como talla de bebé.
- `src/data/streetStyleFlats.ts`: vistas frontal/trasera y enlaces explícitos
  `STREET_SURFACE_PIECES` entre cada zona y su pieza real. Los paneles comparten
  el mismo sistema de referencia; los bolsillos, puños y refuerzos son piezas
  separadas.
- `tests/street-styles.test.ts`: geometría, talla, costuras, márgenes, identidad
  estructural, dibujos y referencias a piezas.

## Estilos

Hoodies: cierre completo, sin mangas, bolsillo canguro, mangas globo con puños,
peplum fruncido, corte diagonal, tres bandas, canesú, panel central, patchwork de
cuatro bloques, chaleco con cierre y poncho de manga corta amplia.

Pantalones: bootcut, campana setentera, palazzo, culotte acampanado, paperbag con
cinturón, carpintero, cargo slim, western con paneles laterales delanteros,
patchwork de seis paneles por delantero, cortes de rodilla, palazzo con costura
frontal y doble rodilla aplicada. Los estilos básicos de jeans anteriores
continúan en sus tarjetas originales.

## Decisiones de construcción

- Las curvas y líneas de los bloques son paramétricas en milímetros. Los
  márgenes se añaden por borde. El peplum añade su alto al cuerpo; el largo
  elegido de manga globo ya incluye el puño de 65 mm, que se descuenta del
  trazado de la manga antes de añadir su pieza independiente.
- Los paneles usan `panelizePattern`. Las curvas Bézier exteriores completas
  que no cruza ningún corte se restauran después de dividir: evita pequeños
  cruces de margen al aproximar la transición cóncava de la bragueta con muchos
  segmentos rectos. Las relaciones y piquetes se reasignan a esos bordes.
- El cierre del hoodie divide el delantero en dos paneles. La relación central
  comprueba sus largos, pero las instrucciones indican coser cada cinta por
  separado, nunca unir los dos cantos entre sí. Su largo útil se obtiene del
  cuello hasta el bajo. Se necesita cierre separable, recortado por arriba si
  no existe una medida comercial exacta.
- El chaleco elimina las mangas, sus comprobaciones y relaciones de montaje;
  remata ambas sisas con bies sin margen incorporado en esa abertura.
- El puño globo frunce una abertura de manga amplia sobre una banda doblada;
  no asume un porcentaje de estiramiento para resolver la diferencia.
- Paperbag usa el margen especial de cintura para formar canal y volante:
  ancho de elástico + 15 mm + dos altos de volante. Admite volante de 20–35 mm
  y elástico de hasta 30 mm. El cinturón tiene patrón aparte.
- Los refuerzos de rodilla y el bolsillo de herramientas incluyen guías de
  colocación física. Los refuerzos exteriores deben seguir visibles en el
  estudio; no deben confundirse con entretelas internas por su nombre.

## Límites y siguiente revisión

Todos los patrones permanecen **experimentales**. Las pruebas geométricas no
certifican ajuste, caída, comodidad ni resistencia física. Imprimir y coser
muestras en orden: cierre separable y sisas del chaleco; volumen de manga globo;
unión del peplum; cintura paperbag; campana/culotte y tiro; paneles western y
bragueta; bolsillos de trabajo. El cargo slim necesita tela con elasticidad.

Las vistas son diagramas 2D de colocación. Las fotografías generadas del catálogo
son referencias visuales y no proporcionan medidas ni simulación de caída. Los
generadores no exportan archivos de puntadas para una máquina de bordar.

Los accesorios de carpintero son de uso ligero, no equipo certificado para
cargas. Este catálogo no incorpora reconocimiento automático de prendas a
partir de fotografías.

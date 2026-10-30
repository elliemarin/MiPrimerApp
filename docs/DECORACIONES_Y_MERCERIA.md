# Decoraciones y mercería en Extras

Entrega de 2026-10-30. La pestaña **Decorar**, junto a «Para esta prenda», reúne
22 opciones originales de colocación y construcción. Son accesorios del diseño,
no nuevas tallas ni prendas duplicadas.

- 14 adornos comprados: encaje floral, blonda festoneada, calado geométrico,
  ojales, pasacintas, entredós aplicado, dos largos de flecos, pompones,
  ondulina, satén, terciopelo, galón y grosgrain.
- Cuatro frunces iniciales: suave, clásico, abundante y ligero para tul.
  Cada uno permite editar la proporción de frunce de 1,25 a 3.
- Tres olanes de pliegues: anchos, clásicos y finos. La cantidad de pliegues
  es editable y cambia las marcas del patrón.
- Una banda aplicada de tela de contraste, compatible con fotos de materiales.

## Medidas y PDF

`PatternComponent.width` es el **largo al colocarlo** y `height` el **ancho
visible**, ambos en milímetros. Se conserva el ID de componente, la posición en
la pieza real, las cantidades y los materiales al guardar, mover o redimensionar.

**Mercería comprada (`cinta-comprada`).** El PDF no inventa una plantilla para
fabricar encaje, pompones o flecos. Incluye metraje, ancho comercial, instrucciones
y marcas de colocación: por tramo, largo montado + 20 mm, correspondientes a
10 mm de remate en cada extremo. No añade margen al ancho comprado. Los motivos
vectoriales son ilustrativos; se debe buscar un producto equivalente. El
pasacintas describe el uso de una cinta adicional, que debe medirse sobre su
recorrido real. Las puntillas y el entredós son **aplicados sobre la superficie**;
no abren ni modifican estructuralmente la base.

**Olán fruncido (`olan-fruncido`).** La tira desplegada mide
`largoMontado × proporción` sobre su línea terminada. Incluye piquetes de cuartos,
instrucciones para reducirla al largo montado y cinta de fijación calculada como
largo montado + 20 mm por copia. Esa cinta cubre el margen superior; su ancho es
margen + 5 mm. La validación de posición reserva también el espacio del margen
superior sobre la prenda. No frunce ni escala una imagen del patrón.

**Olán plisado (`olan-plisado`).** Despliegue de tres veces el largo montado.
Cada repetición es `3 × largoMontado / númeroPliegues`: lleva su primera línea
de doblez a la marca final; el doblez central queda dentro. Consume dos tercios
de cada repetición y conserva exactamente un tercio montado. Genera las tres
líneas por pliegue con IDs estables respecto al número de pliegues. Las pruebas
comprueban las longitudes, además del texto de las instrucciones.

En ambos olanes, el margen superior y los extremos usan `allowance` (10 mm
iniciales); el bajo añade 10 mm para un doblez de 5 + 5 mm. Los extremos se
rematan y doblan una vez. Las medidas visibles no incluyen estos márgenes.
El fruncido de tul usa el mismo acabado previsto: hay que probarlo con la tela
elegida. Se genera una **tira recta**, no un volante circular ni un escote curvo.

**Banda aplicada (`cinta-aplicada`).** Rectángulo de tela al hilo, con los cuatro
márgenes doblados hacia dentro. No se presenta como bies ni como solución para
curvas. La tira desplegada tiene el mismo largo/ancho terminados; los márgenes
se añaden una sola vez fuera.

Límites: largo montado 50–2.000 mm, ancho visible 10–400 mm, 1–8 copias;
márgenes 3–20 mm. Pliegues enteros entre 2 y 24, de al menos 5 mm montados cada
uno. Los adornos deben caber en la pieza; no se simula su caída ni elasticidad.
Todos siguen experimentales hasta imprimir y coser muestras.

## Arquitectura y comprobaciones

- `data/decorativeComponents.ts`: 22 presets y sus términos de búsqueda.
- `lib/pattern/decorations.ts`: despiece, desarrollo, marcas, materiales y
  comprobaciones de tamaño posteriores a los ajustes manuales.
- `lib/pattern/components.ts`: integración con la base y colocación física.
- `features/customize/decorationArt.ts`: dibujos originales, calados transparentes
  y trazos de pliegue; no se reutilizan dibujos de patrones de terceros.
- `CustomizePage`: pestaña Decorar, largo/ancho, cantidad, frunce y pliegues.
- `componentDesign`: material por cuerpo, persistencia y reconstrucción al
  redimensionar. La modificación libre de su `vectorPath` se detecta antes de
  exportar, igual que los cambios de forma de otros complementos.
- `projectPack`: una intervención compuesta solo por mercería puede exportar
  ficha e instrucciones y guía de colocación, con **cero** plantillas de corte.
  Se comprueba que existan guías después de incorporarlas al paquete; nunca se
  crea una pieza ficticia de encaje para eludir la comprobación de contenido.

Verificación específica: `tests/decorations.test.ts` más la regresión de
componentes. `tests/browser/decorations_smoke.py` prueba los anchos
320/390/1440, arrastre con tacto/ratón, elecciones de color, recarga y PDF real
con cuadrícula de 10 mm y controles de 50/100 mm. El PDF de referencia añade
una blonda comprada y un olán plisado a un mantel individual: tres plantillas
(dos de la base, una tira de olán), sin una falsa plantilla de encaje.

Pendiente: confección física de las tiras/terminaciones, variedades de mercería
reales y pruebas en Safari/iPhone. La posición en una pieza real se documenta
con coordenadas; la correspondencia final con un borde curvo requiere prueba
de costura y no se deduce del dibujo.

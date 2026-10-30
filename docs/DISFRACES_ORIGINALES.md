# Construcciones originales para disfraces

Entrega del 30 de octubre de 2026. Son **cuatro diseños**, con quince recetas
de medidas elegibles dentro de cada tarjeta. Todos son **experimentales**:
las pruebas geométricas y del PDF no sustituyen imprimir y coser una muestra.
No tienen evidencia física para el filtro de patrones confeccionados.

| Diseño | Motor | Plantillas / piezas cortadas | Construcción |
| --- | --- | --- | --- |
| Capa semicircular | `capa-semicircular` | 2 / 4 | Dos cuartos exteriores y dos de reverso, cada pareja en espejo. Centro espalda, abertura frontal y cierre comprado. |
| Corona de puntas | `corona-textil` | 3 / 3 | Exterior, reverso y entretela; cinco o siete puntas; banda con traslape de velcro. |
| Sombrero de mago | `sombrero-mago` | 6 / 9 | Cono y forro, dos medias alas exteriores y dos de reverso, un refuerzo de cono y dos de ala. |
| Orejas para diadema | `orejas-diadema` | 3 / 6 | Dos frentes, dos reversos y dos refuerzos. La diadema forrada es un soporte comprado. |

## Contrato de medidas

Todas las medidas internas siguen en milímetros. Estos diseños piden medidas
directas de cuello/cabeza/objeto y no inventan tallas universales.

- **Capa:** radio interior = (contorno de cuello + holgura) / π; radio exterior
  = radio interior + largo. Cada pieza cubre un cuarto de corona circular.
  Dos cuartos unidos por centro espalda forman una capa semicircular.
- **Corona:** largo de banda = cabeza + holgura + traslape. El contorno cerrado
  resta el traslape. Las puntas son nodos del contorno, no adornos dibujados
  sobre una tira rectangular. El número de puntas cambia geometría e ilustración.
- **Sombrero:** radio de cabeza = (cabeza + holgura) / 2π; generatriz del cono
  = √(alto² + radio²); ángulo del sector = contorno / generatriz. El borde curvo
  del sector y los dos medios arcos interiores del ala coinciden. Las alas se
  unen por radios para formar el anillo: no se representa un agujero con un
  círculo relleno ni se depende de un contorno múltiple que el motor no admite.
- **Orejas:** ancho y alto son de cada pieza terminada. Los frentes y reversos
  comparten las curvas; las plantillas de entretela no añaden margen.

Los márgenes se generan fuera de las líneas terminadas. Secciones circulares
usan subdivisiones cúbicas fijas: los IDs de nodos/bordes sobreviven a cambios
de medidas. Las relaciones de unión tienen tolerancia de 0,1 mm; el ensayo de
sombreros exige una diferencia menor a 0,02 mm entre cono y ala.

## Archivos y verificación

- `src/lib/pattern/generators/costumes.ts`: cuatro motores, validación explícita
  de rangos, piezas y cantidades, relaciones, comprobaciones, materiales,
  supuestos y pasos de confección con referencias a piezas reales.
- `src/data/costumeCatalog.ts`: recetas y grupos de diseño, colección Disfraces.
  Las ilustraciones son originales y describen el objeto montado; las piezas
  de fabricación se generan por separado.
- `tests/costume-patterns.test.ts`: 23 casos, incluidas quince recetas, motor
  completo, contornos y cortes finitos, unión cono/ala en distintas dimensiones,
  conteo de piezas, margen independiente, valores extremos y medidas inválidas.

El siguiente paso físico es imprimir, comprobar la escala y coser cada diseño
con sus materiales previstos. Registrar foto, medidas usadas, ajustes y resultado
antes de promover su estado. La capa requiere revisar el cierre y el largo
sobre la persona; el sombrero depende de la rigidez de la entretela; las orejas
requieren comprobar el anclaje a la diadema real. Ninguno incluye un disfraz
completo ni una integración con una bordadora.

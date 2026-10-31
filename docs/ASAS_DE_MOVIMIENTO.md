# Asa para mover bordados y extras pequeños

`src/ui/SelectionMoveHandle.tsx` muestra un botón HTML circular de **48 × 48 px**
sobre la selección. Su tamaño no depende de los milímetros del objeto ni del
zoom del lienzo. Si no cabe arriba, aparece debajo o a un lado; permanece dentro
del rectángulo visible del SVG. No forma parte del diseño ni de las exportaciones.

## Contrato de integración

- Montar el componente como hermano del SVG en un contenedor `position: relative`.
- `svgRef` identifica ese SVG. `corners` son las esquinas del objeto en las
  coordenadas del SVG visible. Para vistas armadas, aplicar
  `assemblyArtworkMatrix(surface, root)` a `elementCorners(root)`: así coinciden
  incluso las mangas y las copias en espejo que conservan letras legibles.
- El componente usa `getScreenCTM()`, `useLayoutEffect`, `ResizeObserver` y observa
  cambios de `viewBox`/`preserveAspectRatio`. Seleccionar desde una lista también
  coloca el asa sin esperar a tocar el lienzo.
- El padre implementa `onPointerDown`, conserva el desplazamiento entre el dedo
  y el centro del objeto y captura el puntero **en el SVG**. El asa no captura el
  puntero: los eventos siguientes siguen llegando al manejador existente.
- `disabled` comunica bloqueo. El padre decide si la selección pertenece a la
  cara/pieza visible; una selección de otra vista no debe mostrar asa.
- `onNudge` es opcional y recibe **píxeles de pantalla**, no milímetros. Flechas:
  1 px; Mayús + flecha: 10 px. `previewDelta` convierte al sistema del SVG sin
  introducir la traslación de su origen.

## Extras

`CustomizePage` usa el grupo/cuerpo del documento vivo para seguir el gesto.
El asa respeta el bloqueo tanto del grupo como del cuerpo y no aparece en otra
cara. Selección, arrastre y flechas conservan las dimensiones y el identificador
de la copia física. La colocación final sigue pasando por las comprobaciones
existentes de cabida; no se escalan piezas para hacerlas caber.

`pointInPreview(svg, x, y, allowOutside = false)` mantiene inserciones y drops
dentro del SVG. Únicamente el movimiento de una selección ya capturada usa
`true`: el dedo puede salir un poco del visor mientras el centro del objeto sigue
dentro. Soltar cancela o valida la posición como antes. Punteros secundarios no
reemplazan el arrastre activo; cancelar o perder captura descarta el gesto.

## Comprobaciones

- `tests/selection-move-handle.test.ts`: posición de asa, selección diminuta,
  bordes, fallback lateral, esquinas transformadas y datos no válidos.
- `tests/placement-drag.test.ts`: CTM, scroll/letterboxing, offset conservado al
  salir del SVG, inserciones acotadas y conversión de flechas.
- `python tests/browser/move_handle_smoke.py`: Chromium a 390 px con tacto y a
  1440 px con ratón. Trabilla de 20 × 60 mm sobre una pierna en espejo; selección
  desde lista, clic sin salto, arrastre con distancia física comprobada, zoom,
  vista técnica, flechas, cambio de cara y redimensionado. Comprueba asa de 48 px
  y dimensiones físicas sin cambios.

Safari/iPhone en dispositivo físico sigue pendiente. El asa mejora el objetivo
táctil; no equivale a una validación física de confección del patrón.

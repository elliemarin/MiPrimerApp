# Vista armada para intervenir y terminar

`src/features/simple/assembled.ts` construye una vista **Frente / Espalda** del diseño completo a partir de la ilustración del catálogo y las vistas de las piezas físicas ya preparadas. `AssemblyArtwork.tsx` es el mismo renderizador en Intervenir y en Telas/bordados; muestra colores, fotografías de tela, paneles y extras existentes del documento.

La vista es **orientativa en 2D**: no simula caída, volumen, fruncido, elasticidad o ajuste sobre el cuerpo. Las transformaciones son proyecciones reversibles para colocar elementos; nunca sustituyen los contornos, dimensiones ni verificaciones del motor de patrones. No se ofrecen los costados ilustrados antiguos porque aún carecen de una correspondencia física fiable. Los cortes impresos y las guías se calculan sobre las piezas originales, en milímetros.

## Contrato para las pantallas

- `buildAssembly(project)` devuelve escenas con `view` sintética para el SVG y `surfaces` enlazadas a la `view` física, `pieceId` y `zoneId` ilustrada. `surface.path` está en coordenadas de escena; `surface.physicalBounds` delimita la cara visible de la pieza física.
- `assemblyHit(scene, point, preferredSurfaceId?)` rechaza puntos fuera de la ilustración o del contorno físico. Devuelve pieza y punto en milímetros. `assemblyPoint` / `inverseAssemblyPoint` permiten mover un extra manteniendo sus medidas reales.
- El centro de `physicalBounds` sirve como posición inicial; el centro de una manga plana completa corresponde a su doblez, no al centro de su cara visible. Hay que validar también el contorno y tamaño del extra con el motor físico.
- `assemblyComponentFits(surface, component)` añade la comprobación de cara visible al contorno físico, incluyendo concavidades. `firstFittingAssemblyPosition(component, surface, pieces, preferred?)` busca solo dentro de esa cara, valida con el motor y conserva el tamaño escogido; devuelve `undefined` si el extra no cabe.
- `AssemblyArtwork` devuelve contenido SVG sin crear su propio `<svg>`. Recibe `scene`, `project`, `fabrics`, `selectedId` opcional y callbacks `onElementPointerDown(event, rootElementId, surface)` / `onSurfacePointerDown(event, surface)`. Un bolsillo o bordado compuesto se selecciona por su grupo completo.

## Identidad y persistencia

Un mismo patrón se puede cortar varias veces. La identidad `assemblySurfaceId` distingue manga/pierna derecha e izquierda, cara frontal/trasera y mitades de falda al doblez. `assemblySurfaceLabel` describe ese lado en la guía PDF. Ambos campos opcionales viven en `PatternComponent.placement` y en `DesignElement`; el punto continúa en las coordenadas locales de la pieza real. La reconciliación de componentes conserva esa identidad. Un extra siempre produce piezas independientes, no un recorte de bolsillo dentro del patrón base.

El renderizador hereda la instancia desde el grupo padre o la definición del componente. Los proyectos antiguos sin estos campos conservan sus coordenadas y se muestran en una sola instancia determinista; no se duplican automáticamente en ambas piernas. Se pueden mover después a la instancia deseada. Las mangas de los generadores actuales tienen su largo en X; sus dos caras ocupan mitades distintas de Y. La falda fruncida despliega en espejo sus mitades al doblez. En el pañalero de broches se excluye la vista doblada de la tapeta para la colocación exterior.

Las letras, dibujos multicolor y ventanas de cámara no se reflejan al colocar una instancia de la prenda en espejo. `assemblyArtworkReflection(surface, root)` compensa alrededor del centro del grupo; `assemblyArtworkMatrix` combina esa compensación con la proyección. El centro, las dimensiones y el documento original no cambian. La guía sobre la pieza canónica utiliza la misma reflexión; el patrón independiente del bordado o bolsillo conserva su orientación original.

## Nuevos modelos y límites pendientes

Para nuevas ilustraciones, usar `zone.id` igual al `piece.id` real, o `piece-id--derecha` / `piece-id--izquierda` para instancias repetidas, además de etiquetas comprensibles. No presentar forros y entretelas como caras exteriores. Las correspondencias conocidas de capa/corona/sombrero/orejas están explícitas; el resto usa papeles de construcción (delantero, espalda, manga, peto, etc.). Un objeto desconocido conserva una vista de su cara física principal en lugar de inventar una prenda.

Los 40 nuevos disfraces tienen correspondencias explícitas en `COSTUME_SURFACE_PIECES`, incluidos el espejo de cada instancia y los reversos visibles de alas, colas y accesorios. Estos reversos sí se muestran cuando la cara posterior corresponde a esa pieza real; no se incorporan entretelas como superficies exteriores. Las piezas de contraste y los componentes propios de cada conjunto conservan sus IDs físicos.

La auditoría de los 69 diseños anteriores y el pañalero cubre 70 grupos: todos tienen superficies válidas y transformaciones finitas; las prendas y bolsos muestran frente y espalda. Cinco grupos recurren a su cara física principal: babero, gorro, cojín, dona de cabello y banderín. El volumen de la dona y el gorro queda pendiente de una proyección de montaje específica. La auditoría adicional de los 40 disfraces comprueba correspondencias exactas, reversos e instancias en espejo.

Pendiente: añadir mapas de construcción explícitos para cada generador, geometría lateral verificable y representación específica de volúmenes, cierres y solapes. La geometría ilustrada puede diferir del contorno de corte; la validación física sigue siendo obligatoria y no acredita una prueba de confección. Las fotografías de tela mantienen su repetición y ajuste, aunque la proyección puede deformarlas visualmente.

Pruebas: `tests/assembled-design.test.ts` verifica coordenadas reversibles, identidad de instancias al guardar/reabrir, grupos, separación de caras de manga, falda al doblez y patrones independientes del bolsillo sin modificar la pieza base. También valida cobertura por diseño, renderizado único de cada color, eliminación de bolsillos ilustrados inexistentes y orientación legible en piezas espejo.

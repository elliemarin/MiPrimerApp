# Acabados sobre el diseño completo

Actualizado: 30 de octubre de 2026.

## Recorrido

1. En **Extras** se colocan bolsillos y accesorios sobre la prenda completa, con vistas de frente y espalda.
2. En **Telas y colores**, **Elegir tela o color** aplica una elección a toda la base y a los extras. **Cambiar una parte o bolsillo** permite excepciones. También se puede tocar una zona de la ilustración; en prendas divididas en paneles se identifica el panel físico tocado.
3. **Continuar a bordados** abre la vista completa con los materiales elegidos. El usuario toca una zona, añade una figura o texto, y lo arrastra. Solo aparecen los bordados de la cara mostrada. Tamaño, borrar, deshacer y rehacer siguen disponibles.
4. **Generar patrones** abre el PDF de confección. La plantilla de cada bolsillo sigue siendo una pieza independiente. La ubicación queda en la guía de colocación de la pieza base.

La elección por foto sigue abriendo un diálogo inmediato con **Tomar foto** y **Elegir del carrete** visibles. Las telas propias quedan al principio y se conservan al recargar. El estado predeterminado al reabrir Acabados es Telas y colores; los materiales y bordados ya guardados se conservan.

**Ver piezas** conserva la vista técnica como alternativa. El figurín y la lámina editorial están dentro de **Más opciones**, después de elegir materiales. La vista principal muestra la prenda completa y sus detalles.

## Coordenadas y límites

- `assembled.ts` describe superficies visibles y su transformación reversible a la pieza real. La ilustración es una proyección 2D orientativa; no simula caída, volumen ni ajuste corporal.
- `AssemblyArtwork.tsx` renderiza las superficies, fotos, extras y bordados desde el documento real. Se comparte con Extras.
- Los elementos siguen almacenándose en milímetros sobre una `DesignView` física. `assemblySurfaceId` y `assemblySurfaceLabel` distinguen mangas, piernas, mitades al doblez y caras repetidas.
- Las copias en espejo compensan el reflejo de los dibujos alrededor de su centro: las letras se leen correctamente y una ventana de cámara no cambia de lado. La guía de ubicación registra la copia en espejo y cómo transferirla; la plantilla independiente del bordado conserva su orientación legible. Izquierda y derecha se refieren a quien viste la prenda.
- `finishEmbroidery.ts` traslada el grupo completo con todos sus colores y contornos, sin escalar sus medidas. Al cambiar de superficie actualiza la pieza y la identificación visual de todos sus descendientes.
- Insertar, soltar y redimensionar comprueba el contorno físico y los límites de la cara visible. La comprobación incluye los segmentos entre las esquinas para evitar que un rectángulo atraviese un escote cóncavo.
- Los bordados son dibujos de transferencia/digitalización. No son archivos de puntadas para bordadora.
- Las prendas comparten por ahora el material entre instancias cortadas de la misma pieza, por ejemplo dos mangas. No hay material independiente para cada copia especular de una sola pieza física.
- Las pruebas geométricas y de PDF no sustituyen una prueba de confección. No se marca ningún patrón nuevo como probado al coser.

## Pruebas

Pruebas unitarias: `tests/finish-embroidery.test.ts` cubre cambio de cara multicolor sin alterar medidas, escote cóncavo, tamaños imposibles y colocación en media manga. `tests/assembled-design.test.ts` verifica la correspondencia de las superficies.

Pruebas de navegador con Chromium, ratón y tacto:

```bash
python tests/browser/material_picker_smoke.py
python tests/browser/assembled_finishes_smoke.py
```

Se ejecutaron a 320, 390 y 1440 px. El recorrido comprueba materiales globales y un bolsillo con otro color, bordado frontal y letras traseras, arrastre de 30 × 35 mm, cambio a 80 mm de ancho, borrar/deshacer, guardado/recarga y ausencia de errores JavaScript o desbordamiento horizontal. La importación fotográfica usa una imagen sintética; no se probó una cámara física.

La revisión añadió regresiones para conservar la pierna elegida al mover un extra en **Piezas**, mantener letras legibles sobre una copia en espejo y tocar la solapa del bolsillo para cambiar solamente su material. Los bordados conservan también el límite de su cara de manga al editarlos en la vista técnica.

El PDF de prueba del hoodie con bolsillo cargo, abeja y letras contiene 78 páginas y 7 piezas de confección. Se verifican manifiesto, secuencia de secciones, bordados vectoriales multicolor, controles de 50/100 mm, cuadrícula de ubicación de 10 mm y `/PrintScaling /None`. El número de páginas depende de las medidas y de las opciones elegidas.

Pendiente de validación manual en dispositivos: cámara real en iPhone/Android y comodidad del arrastre en pantallas táctiles físicas. El seguimiento general y los comandos de validación de la entrega están en `ESTADO.md`.

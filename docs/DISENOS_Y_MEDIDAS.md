# Un diseño, sus medidas y un selector visible de materiales

Entrega del 30 de octubre de 2026. La biblioteca deja de presentar cada
combinación de largo, capacidad o acabado como una tarjeta independiente.
Con la colección de disfraces incorporada, hay 1,804 recetas en 69 diseños
con patrón. El recuento de las diez fuentes externas se mantiene aparte.

## Recorrido

La persona busca una prenda o accesorio y abre un diseño. Al pulsar **Intervenir**
u **Obtener patrón**, elige las medidas y la versión del diseño. Las prendas
conservan la selección de talla corporal Chica/Mediana/Grande, meses o medidas
personalizadas. Los accesorios permiten ajustar las medidas del objeto.
Después continúa a **Extras → Telas y bordados → PDF**.

La agrupación conserva formas diferentes: pantalón recto, amplio y jogger;
hoodie y sudadera sin capucha; chaqueta y chaleco. Las combinaciones de medidas
del mismo diseño se eligen dentro. Las bolsas tote y con jareta reúnen también
sus variantes por capacidad o uso. La búsqueda sigue encontrando las medidas
y los usos de sus variantes.

En Acabados, **Elegir una tela o subir foto** abre una hoja sobre la pantalla.
Antes cerraba los colores y montaba una bandeja al final de la página, fuera
del área visible. Ahora se ven inmediatamente las telas, el buscador y los
botones de cámara/carrete. Al aplicar o cerrar, el foco vuelve a la parte elegida.
En el Estudio avanzado se conserva la bandeja que permite arrastrar al lienzo.

## Contrato para continuar

- `CatalogModel.designGroup` identifica el diseño; `features/library/groups.ts`
  reúne las recetas sin cambiar sus IDs ni su geometría. Los enlaces y los
  proyectos anteriores mantienen el modelo concreto que ya usaban.
- La biblioteca filtra recetas y después agrupa los resultados. La tarjeta
  muestra el nombre del diseño y enlaza a una receta que cumple la búsqueda y
  los filtros. Al abrir se preselecciona esa receta; se pueden explorar las
  demás medidas del diseño antes de crear el proyecto.
- Las opciones de medidas se resuelven a recetas existentes. Elegir una variante
  no inventa combinaciones incompatibles ni confunde largo de prenda con talla
  corporal. Los parámetros implícitos de los modelos antiguos se conservan.
- El recuento de resultados representa diseños, no combinaciones de medidas.
  Las pruebas de los patrones siguen recorriendo todas las recetas originales.
- `FabricTray` sigue siendo compartido entre Acabados y Estudio. La presentación
  modal de Acabados no elimina el arrastre disponible en el Estudio avanzado.

## Verificación

Suite completa: 2,349 pruebas en 50 archivos y build para Pages. Se comprueban
agrupación y cobertura de todas las recetas, filtros antes de agrupar, enlaces
anteriores y creación con diferentes medidas. Los recorridos de navegador
320/390/1440 px verifican el patrón guardado, además del texto visible. La hoja
de telas queda visible al pulsar, conserva cámara/carrete y vuelve a la parte
al aplicar, cerrar o pulsar Escape. Bebé 0–6 excluye presets de adulto, también
al cambiar de destinatario después de haber seleccionado otras medidas.

Scripts: `grouped_catalog_smoke.py`, `material_picker_smoke.py` y regresiones
`simple_journey_smoke.py` / `editorial_smoke.py`, dentro de `tests/browser`.

Las tallas y los patrones conservan los límites físicos descritos en
`INTERFAZ_SIMPLE_Y_BIBLIOTECA.md`. Siguen pendientes la impresión/confección de
muestras y la prueba de cámara y hoja nativa de compartir en iPhone real.

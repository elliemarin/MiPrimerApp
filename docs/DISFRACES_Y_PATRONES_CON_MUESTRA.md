# Disfraces editables y patrones con muestras de sus autores

Entrega del 30 de octubre de 2026. La solicitud de patrones «100 % probados» se
atiende con evidencia visible de confección y una ficha detallada. Ninguna
prueba automática se presenta como una muestra cosida ni como garantía de
ajuste en todas las tallas.

## Colección Disfraces

Cuatro construcciones originales de Hilvana, con quince recetas de medidas
agrupadas en cuatro tarjetas. Sus patrones y acabados son editables:

- **Capa semicircular reversible:** dos cuartos exteriores y dos de reverso,
  costura central de espalda, escote calculado y cierre frontal. Radio interior
  = (contorno del cuello + holgura) / π; largo medido desde el escote.
- **Corona textil:** exterior, reverso y refuerzo, cinco o siete puntas y
  traslape para velcro. El contorno cerrado incluye la holgura una sola vez;
  el traslape se añade a la pieza por separado.
- **Sombrero cónico de mago:** cono, ala, forros y refuerzos. La longitud del
  sector del cono coincide con el contorno interior del ala. Dos medias alas
  cosidas forman el anillo y su abertura central real.
- **Orejas para diadema:** dos frentes, dos reversos y dos refuerzos, con costuras
  curvas y marcas de fijación. La diadema forrada se compra o reutiliza aparte.

Los cuatro motores están en `lib/pattern/generators/costumes.ts`, registrados en
`generators/index.ts`; las recetas están en `data/costumeCatalog.ts`. Los
contornos son paramétricos en milímetros, con IDs estables, márgenes por borde,
comprobaciones dimensionales, uniones, materiales y pasos de montaje. Los
refuerzos tienen sus propias piezas sin margen. Estado **Experimental**, hasta
imprimir y coser muestras.

La colección usa el recorrido existente: medidas → extras → telas/bordados →
PDF de confección. El filtro Disfraces conserva la búsqueda y los filtros
adicionales. Los dibujos vectoriales propios y las vistas de materiales no
modifican los patrones. Los accesorios se presentan como objetos; el figurín
sigue siendo ilustrativo.

## Patrones con muestra confeccionada

`data/curatedPatterns.ts` reúne diez patrones individuales, con fotos de muestras
y documentación publicadas por sus autores. Incluye disfraces y accesorios de
fantasía, prendas de Peppermint y proyectos de Choly Knight, Pompom, Motley y
Fleece Fun. Cada ficha conserva una URL de evidencia, fecha de revisión,
medidas/tallas, materiales, inventario conocido, resumen del proceso, idioma,
acceso y condiciones de uso. Las fuentes revisadas están en
`FUENTES_PATRONES_SELECCIONADOS.md`.

`CuratedPatternsPanel` permite buscar y filtrar Disfraces/Prendas/Accesorios.
El acceso superior de la biblioteca desplaza y enfoca el encabezado de la
sección. Los detalles están plegados; **Abrir patrón original** lleva al sitio
del autor. No se copian fotos, PDFs ni instrucciones extensas. Los resúmenes no
sustituyen las instrucciones originales; los inventarios no publicados se
identifican para consulta en la fuente.

**Muestra del autor** significa que se encontró documentación de un objeto
confeccionado. Hilvana no lo ha cosido ni ha verificado físicamente ese PDF.
No equivale a «100 % garantizado». Estos archivos externos todavía no son
patrones editables dentro de Hilvana y no aumentan el contador local.

## Fichas de las bases de Hilvana

`ModelPatternDetails` abre **Qué incluye el patrón**. Su helper
`patternDetailPreview.ts` calcula una referencia con el mismo motor y receta
que se usarían para crear el proyecto, indicando la talla o medidas de ejemplo.
Muestra piezas y cantidades, roles de tela, medidas/márgenes, materiales,
pasos y alcance. La comprobación geométrica refleja errores y uniones reales.
No guarda proyectos, perfiles ni cambios al abrir una ficha.

## Siguiente paso

Verificado: 2,349 pruebas en 50 archivos, TypeScript y build para Pages;
`costume_sources_smoke.py` en 320/390/1440 px. Fichas sin guardar proyectos,
filtros, evidencia, enlaces, PDF de capa de 24 páginas y sombrero de 22, con
controles de 50/100 mm y manifiestos correctos. Detalles geométricos y piezas
en [DISFRACES_ORIGINALES.md](DISFRACES_ORIGINALES.md).

Imprimir al 100 % los nuevos disfraces, comprobar controles y uniones entre
hojas, coser las cuatro construcciones y registrar medidas, telas, fotos y
correcciones. Hasta que exista esa evidencia, mantener su estado experimental.
Revisar periódicamente las URLs, condiciones y posibles correcciones publicadas
de los patrones externos. No trasladar su distintivo de muestra a una adaptación
paramétrica sin probar de nuevo la adaptación.

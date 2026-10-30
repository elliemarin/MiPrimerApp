# Patrones con muestra confeccionada

Revisión de fuentes: **30 de octubre de 2026**. Datos mantenidos en `src/data/curatedPatterns.ts`; sección de biblioteca `CuratedPatternsPanel`.

La selección contiene diez proyectos individuales con fotografías de un resultado confeccionado por sus autores y acceso a instrucciones. **No se ha confeccionado ninguno de estos patrones en Hilvana.** La etiqueta «Muestra del autor» documenta esa procedencia; no certifica el ajuste de todas las tallas, la ausencia de erratas ni la compatibilidad de cualquier tela. No hay un estado «100% probado» asignado a partir de una búsqueda web o de pruebas de software.

## Fuentes individuales

Las fichas de la app resumen medidas publicadas, materiales, partes confirmadas, formato, idioma, acceso y condiciones. Los enlaces llevan al original para consultar fotografías, instrucciones completas, tabla corporal y actualizaciones.

| Proyecto | Fuente oficial y comprobación |
| --- | --- |
| Sombrero de bruja | [Fleece Fun](https://www.fleecefun.com/how-to-make-a-witch-hat-free-pattern-child-and-adult-sizes/): muestras terminadas y montaje fotografiado. |
| Conjunto de hada | [Pompom du Monde](https://www.pompomdumonde.com/sewing-patterns/p/fairy-set): conjunto fotografiado; [tutorial de alas](https://www.pompomdumonde.com/blog/crown-tutorial-ppk8c). El slug del tutorial menciona «crown», pero su contenido corresponde a las alas. |
| Cola de dinosaurio | [Motley Costumier](https://www.motleycostumier.com/blog/params/post/5227427/how-to-sew-a-fleece-dinosaur-tail-free-pdf-pattern--video-tutorial): muestra, instrucciones y vídeo de la autora. |
| Gorguera teatral | [Motley Costumier](https://www.motleycostumier.com/blog/params/post/5277912/how-to-make-a-simple-neck-ruffle--easy-diy-sewing-tutorial): resultado confeccionado y tutorial de corte por medidas. |
| Clips alados | [Choly Knight](https://cholyknight.com/2016/10/21/winged-hair-clips/): muestras de las variantes y PDF. |
| Capucha de fantasía | [Choly Knight](https://cholyknight.com/2018/10/05/hooded-cowl/): muestras y notas de pruebas de tejidos. |
| Mochila peluche | [Choly Knight](https://cholyknight.com/2021/06/25/dragon-unicorn-backpack/): prototipos, resultados y aclaraciones de montaje. |
| Valley Jumpsuit | [Peppermint / Ready to Sew](https://peppermintmag.com/product/valley-jumpsuit/): muestra editorial sobre modelo. |
| West End Jacket | [Peppermint / Camimade](https://peppermintmag.com/product/west-end-jacket/): muestras editoriales sobre modelos. |
| Jumpsuit de escote en V | [Peppermint / In the Folds](https://peppermintmag.com/product/jumpsuit/): muestra editorial sobre modelo. |

## Alcance de la comprobación

- Se revisaron las fichas y tutoriales públicos de los diez proyectos. Las tablas o datos que una página no publica no se reconstruyen por deducción.
- Se consultaron los PDF de Choly para contrastar medidas, materiales y características: [clips](https://cholyknight.com/wp-content/uploads/2016/10/winged-hair-clips-sewing-pattern.pdf), [capucha](https://cholyknight.com/wp-content/uploads/2018/10/hooded-cowl-sewing-pattern1.pdf) y [mochila](https://cholyknight.com/wp-content/uploads/2021/06/chibi-dragon-unicorn-plush-backpack-sewing-pattern.pdf). No se auditaron físicamente sus costuras ni la totalidad de tallas.
- La mochila contiene una aclaración de la autora sobre las marcas de colocación de tirantes en los comentarios de la publicación. La ficha la menciona; consultar el original actualizado antes de cortar.
- En los tres productos de Peppermint no se completó un pedido. Sus fichas públicas respaldan formato, rango de tallas, nivel y características. Se deja `pieces: []` porque no se verificó el inventario del PDF entregado por la tienda. La interfaz debe indicar que se consulte el inventario original, nunca mostrar un número deducido de piezas.
- Las medidas aproximadas de los pequeños proyectos Choly se convierten desde pulgadas con 1 pulgada = 2.54 cm. Las cifras son dimensiones publicadas de la muestra, no medidas nuevas para generar geometría.
- `verifiedAt` fecha la revisión de la fuente. `evidence.kind: 'muestra-del-autor'` identifica quién aporta la evidencia. `editableInHilvana: false` impide confundir esta selección con patrones nativos del estudio.

## Acceso y condiciones

- [Choly Knight, FAQ](https://cholyknight.com/faq-patterns/): distingue vender artículos cosidos de redistribuir patrones, plantillas o fotografías. Consultar sus condiciones completas.
- [Peppermint, condiciones](https://peppermintmag.com/termsandconditions/): uso doméstico personal; restricciones sobre redistribución y explotación comercial. Los tres productos seleccionados muestran pago a elección con un mínimo. No se presentan como descargas gratuitas.
- Fleece Fun, Pompom du Monde y Motley Costumier se enlazan a sus páginas originales. No se encontró en la revisión una licencia que autorice integrar o redistribuir sus archivos en Hilvana; la gratuidad no se trata como esa autorización.
- No se copiaron fotografías ni PDF al repositorio, no hay hotlink de imágenes y no se reproducen tutoriales completos. Las fichas contienen descripciones breves propias. La consulta es voluntaria mediante enlaces externos; no se hace una petición a estas webs al abrir la biblioteca.

## Para quien retome el proyecto

El filtro de disfraces incluye siete fichas de fantasía y accesorios, sin duplicar una tarjeta por talla o por variante. La capucha aparece también en prendas. El catálogo externo no aumenta el recuento de patrones nativos ni ofrece un botón para crear proyectos con geometría inventada.

Para añadir más fuentes: comprobar la URL individual, una muestra real documentada, instrucciones accesibles, talla o medida publicada, restricciones de acceso y licencia. Si no hay inventario comprobado, conservarlo vacío. Mantener los datos y la evidencia juntos para evitar que una edición convierta «muestra del autor» en «probado por Hilvana».

Pendiente de un alcance futuro: confeccionar y documentar muestras propias; registrar talla, tela, escala de impresión, medidas finales y ajustes de cada prueba; estudiar adaptadores editables únicamente con licencia suficiente y geometría contrastada. No se implementó importación paramétrica de estos PDF.

Pruebas de software: `tests/curated-patterns.test.ts` verifica procedencia, estado externo, búsqueda sin acentos, intersección con categorías, formatos y ausencia de inventarios/precios inventados. Estas comprobaciones no validan confección ni ajuste corporal.

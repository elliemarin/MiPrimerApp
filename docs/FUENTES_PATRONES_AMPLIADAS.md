# Directorio ampliado de fuentes de patrones

Consulta: **30 de octubre de 2026**. Son doce fuentes primarias del autor,
editor o comunidad. La biblioteca incluye enlaces consultables, no copias de
sus archivos. El directorio no aumenta el contador de patrones disponibles
para editar en Hilvana.

## Qué se entrega

- `src/data/patternSources.ts`: doce entradas con categorías, formato,
  condiciones de acceso, nota de uso, límite de importación y fecha de consulta.
- `PatternSourcesPanel.tsx`: sección plegable de Biblioteca con búsqueda sin
  acentos y filtros por chaquetas, monos, prendas holgadas, accesorios, bolsos,
  hogar, infantil y patronaje paramétrico.
- Cada enlace abre la web del proveedor. No se envían medidas personales a
  ninguno de estos servicios desde el directorio.
- Se distingue el generador paramétrico externo, el PDF imprimible y el tutorial.
  Un PDF puede servir de referencia calibrada para trazar, pero no se transforma
  automáticamente en nodos, costuras, piquetes y reglas de talla.

## Fuentes consultadas

| Fuente primaria | Qué aporta | Acceso, edición y condiciones observadas |
| --- | --- | --- |
| [FreeSewing](https://freesewing.eu/) · [documentación](https://freesewing.dev/) | Diseños como código JavaScript, generados con medidas. | Mejor candidato a integración paramétrica. Software moderno MIT; fijar paquete/versión/autor antes de incorporar código. El adaptador todavía no está implementado. |
| [Seamly · categoría Patterns](https://forum.seamly.io/c/patterns/24) · [software](https://seamly.io/) | Comunidad de patronaje y archivos nativos compartidos por sus autores. | `.sm2d` se edita con Seamly, no directamente con Hilvana. La licencia del software no cubre automáticamente las contribuciones del foro; comprobar cada archivo. |
| [Mood Sewciety](https://blog.moodfabrics.com/Free%20Sewing%20Patterns/) | Índice organizado de chaquetas, monos, prendas y accesorios. | Descargas PDF; algunas se obtienen por correo. No se encontró en la consulta una API pública con permiso de redistribución. No se copian instrucciones, fotos ni archivos. |
| [Peppermint Sewing School](https://peppermintmag.com/sewing-school/) · [ejemplo Jumpsuit](https://peppermintmag.com/product/jumpsuit/) | Monos amplios, chaquetas y otras colaboraciones de diseñadores. | El mono consultado ofrece PDF A0 y A4/carta, con pago a elección. Las [condiciones](https://peppermintmag.com/termsandconditions/) restringen uso a confección doméstica personal y prohíben compartir archivos y uso comercial. No integrarlo masivamente. |
| [Fabrics-Store](https://fabrics-store.com/sewing-patterns) · [información de PDF](https://support.fabrics-store.com/hc/en-us/articles/360000217243-About-These-PDF-Patterns) | Catálogo de prendas, incluidas chaquetas de trabajo, y proyectos de lino. | Hay selección gratuita y prémium: no anunciar que todo es gratis. La ayuda permite confección personal o de negocio con PDF gratuitos; no equivale a redistribuirlos. La web puede requerir JavaScript y verificación antirrobot. |
| [Closet Core · Free Patterns and Resources](https://blog.closetcorepatterns.com/category/sewing-help-how-tos/free-patterns-resources/) | Fundas, riñonera, sombrero, antifaz, puf y camiseta, entre otros. | Descargas y tutoriales oficiales; la página explica que puede pedir correo. Revisar condiciones de cada recurso antes de reutilizar material. |
| [Merchant & Mills · Free Sewing Patterns](https://merchantandmills.com/collections/free-sewing-patterns) | Totes, bolsas de cordón, sombreros y fundas de iniciación. | PDF imprimibles de su colección gratuita; el sitio antiguo redirige a la colección actual. No asumir licencia abierta por precio cero. |
| [Sew Sweetness · Free Patterns](https://sewsweetness.com/product-category/patterns-2/free-patterns) · [tutoriales](https://sewsweetness.com/tutorials) | Bolsos, estuches y monederos, con proyectos de vídeo/PDF. | Selección gratuita a través de su tienda. La extracción automatizada directa devolvió 403, pero el índice oficial y tutoriales confirman el catálogo. No sortear el bloqueo ni replicar sus archivos. |
| [BERNINA · WeAllSew](https://weallsew.com/tag/free-sewing-tutorial/) | Tutoriales de totes, accesorios de viaje, aplicaciones y hogar. | No todos los artículos contienen patrón descargable; cada autor y proyecto determina los materiales. Existe contenido en español. Se enlaza el proyecto, no se redistribuyen sus fotos o plantillas. |
| [Sew Desu Ne? · Choly Knight](https://cholyknight.com/free-projects/) · [FAQ de patrones](https://cholyknight.com/faq-patterns/) | Peluches y complementos de estilo kawaii, con índices y filtros. | Conviven patrones gratuitos y de pago. La autora permite vender objetos cosidos, con condiciones indicadas en su FAQ; eso no permite vender o redistribuir el patrón. |
| [LearnMYOG](https://learnmyog.com/) · [FAQ](https://learnmyog.com/about.html) | Ropa técnica holgada, mochilas, bolsos y generadores de sacos/estuches. | Convivencia de patrones gratuitos, productos y generadores web. La FAQ limita los patrones a uso personal. Se enlaza; no se incorpora código ni patrones bajo una supuesta licencia abierta. |
| [Selfmade · Free DIY accesorios](https://www.selfmade.com/en-gb/free-diy/free-sewing-patterns/accessories) | Accesorios y enlaces a bolsas, hogar, bebés y prendas. | Comprobar precio/formato/idioma en cada ficha. La categoría gratuita y el catálogo comercial son diferentes. Solo se incluyen referencias. |

## Decisión de implementación

No se encontró en estas fuentes una API que ofrezca una gran base de datos de
patrones con permiso general para descargar, redistribuir y volver paramétricos
todos sus archivos. Esta es una conclusión de la consulta, no una afirmación de
que no exista ningún servicio posible.

Para ampliar el estudio ahora, se crean generadores originales de Hilvana con
geometría y comprobaciones propias. Para diseños externos, FreeSewing ofrece la
ruta técnica más concreta: sus diseños son código paramétrico documentado y
pueden adaptarse a nuestro modelo de piezas. El plan de adaptación y licencias
está en [FUENTES_Y_MAQUINA.md](FUENTES_Y_MAQUINA.md).

Una futura integración de Seamly necesita interpretar dependencias, fórmulas,
medidas separadas y semántica de piezas; exportar un SVG no conserva todo ese
modelo. No marcar archivos `.sm2d` o `.val` como admitidos por Hilvana hasta que
exista y se pruebe ese importador.

## Revisión y mantenimiento

- Fecha y condiciones corresponden a la consulta. El precio, formulario,
  descarga, enlace o licencia de un proveedor puede cambiar.
- Antes de añadir un patrón externo al catálogo editable, registrar autor,
  versión, licencia de ese archivo, procedencia y pruebas de geometría.
- Una referencia externa no debe tener `generatorId` ni estado «Patrón
  disponible». El contador de fuentes y el de modelos internos permanecen
  separados.
- No usar fotos de modelos de los proveedores como ilustraciones de Hilvana sin
  permiso independiente. Las vistas sobre figurín de esta entrega se dibujan
  con geometría original de la app.

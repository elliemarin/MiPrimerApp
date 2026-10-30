# Patrones gratuitos en español y archivos con permiso de redistribución

Revisión: **2026-10-30**. Datos propios en `public/pattern-library/spanish-and-open-patterns.json`, exportados por `src/data/spanishFreePatterns.ts` como `SPANISH_AND_OPEN_PATTERNS`. Esta selección aporta **42 fichas individuales** a la biblioteca gratuita: 33 de OTTOBRE y nueve prendas de Bikes & Bloomers. No se multiplican las fichas por talla ni por idioma.

## OTTOBRE design · Studio Tuumat Oy

Se recorrieron las ocho páginas de [Patrones gratis con instrucciones](https://www.ottobredesign.com/es/blogs/patrones-gratis-con-instrucciones) y sus fichas individuales. De 95 entradas se seleccionaron 33 patrones de costura de bolsos, accesorios, prendas, bebé y peluches, con PDF que contienen moldes o medidas y confección. Se verificó cada respuesta HTTP, firma PDF, número de páginas y SHA-256; se leyó el contenido para clasificar formato e idioma.

Se descartaron láminas para colorear, muñecas de papel, motivos de aplicación, instrucciones de crochet y duplicados de archivos. La ficha «Pajarita anudada» se descartó: el archivo gratuito explica cómo anudar, pero remite a una revista de pago para el patrón y la confección. No se presenta como patrón gratuito completo.

Los cuatro proyectos que requieren trazar rectángulos o cortar por medidas —Paperbag, bolsa de tela, moño de satén y manta de juegos— se marcan `format: 'tutorial'`, con PDF accesible. No se prometen plantillas a escala donde el original proporciona medidas. El cubrepañal tiene pasos fotográficos escaneados; se inspeccionaron visualmente. Los PDF multilingües se clasifican `en` solo cuando contienen inglés; la página web traducida al español no basta para clasificar el documento como español.

**No hay PDF de OTTOBRE en el repositorio.** Sus [condiciones oficiales](https://www.ottobredesign.com/es/pages/derechos-de-autor) incluyen expresamente los patrones gratuitos y prohíben su redistribución. Se guardan descripciones breves propias y enlaces oficiales. Los PDF de verificación se consultaron temporalmente fuera del repositorio.

Las dos acciones «Patrón» e «Instrucciones» apuntan al mismo PDF cuando el autor los distribuye juntos (`combinedPdf: true`); no se inventa un segundo archivo.

## Bikes & Bloomers

La [página del proyecto](https://bikesandbloomers.com/patterns/) declara nueve prendas distribuidas en seis diseños/conjuntos y permite copiar y redistribuir sus PDF bajo **CC BY-NC-SA 4.0**. Se guardan las nueve descargas sin modificar en `public/pattern-library/bikes-and-bloomers/`, con [atribución, licencia e inventario](../public/pattern-library/bikes-and-bloomers/README.md).

Cada PDF conserva su SHA-256 original, URL primaria y enlace a la página que concede el permiso. Se comprobó que las descargas respondieran 200, fueran PDF legibles por PyMuPDF y contuvieran sus páginas de patrón. Los archivos suman 45.7 MB; el mayor pesa 9.3 MB. No se incluyen en el inventario de patrones editables ni se escalan para otras tallas.

La información del autor especifica **UK 12 aproximada e instrucciones mínimas**. Las fichas lo dicen explícitamente; Hilvana no transforma estas reconstrucciones históricas en patrones revisados para todas las tallas. Los botones de patrón e instrucciones abren el mismo original; el enlace de instrucciones comienza en la página 4. Los permisos CC no convierten una comprobación digital en una prueba física de costura.

## Contrato e integración

- Las rutas de `assets` son relativas a la base de la aplicación: `pattern-library/...`, sin `/` inicial. La interfaz debe anteponer `import.meta.env.BASE_URL` para que GitHub Pages funcione bajo `/MiPrimerApp/`.
- `patternUrl`, `instructionsUrl` y `sourceUrl` conservan los originales, incluso cuando hay copia local autorizada.
- `verification` documenta la descarga revisada, no garantiza que un enlace no pueda cambiar después.
- `editableInHilvana` permanece `false` en las 42 fichas.
- `scripts/check-open-pattern-assets.py` valida las copias locales sin dependencias; `--remote` también contrasta los bytes actuales de las descargas oficiales. Un cambio de hash exige revisar la actualización del autor; no se reemplaza automáticamente.

Siguiente revisión: probar impresión de una selección, documentar confección y revisar periódicamente cambios de URL, erratas o licencias. Ninguna copia se marca como «100 % probada».

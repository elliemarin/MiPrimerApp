# Biblioteca de patrones gratuitos: revisión del 30 de octubre de 2026

La biblioteca reúne **269 diseños o proyectos individuales de siete autores/equipos**. El índice local de metadatos se encuentra en [`public/pattern-library/free-patterns.json`](../public/pattern-library/free-patterns.json) y se consume mediante `src/data/freePatternLibrary.ts`. Sus nombres y descripciones son propios, en español; `language` indica el idioma real de las instrucciones. Hay **11 fichas con instrucciones en español y 258 en inglés**. No se cuentan tallas o colores como entradas nuevas.

| Autor | Fichas | Acceso verificado |
| --- | ---: | --- |
| Choly Knight / Sew Desu Ne? | 184 | PDF directo; plantillas y guía ilustrada, salvo los bloques Power-up, cuyo montaje acompaña al artículo |
| Mood Sewciety | 39 | Patrón gratuito por correo; instrucciones públicas en la página o video enlazado |
| OTTOBRE design | 33 | PDF directo con instrucciones; once disponibles en español |
| Bikes & Bloomers | 9 | PDF directo, también alojado localmente con licencia CC BY-NC-SA 4.0 |
| Motley Costumier | 2 | Cola de dinosaurio: PDF y tutorial separados; gorguera: corte por medidas explicado en el tutorial |
| Pompom du Monde | 1 | Conjunto de hada mediante pedido gratuito; tutorial de alas separado |
| Fleece Fun | 1 | Sombrero de bruja gratuito por correo; tutorial público |

**227 fichas tienen enlace directo a un PDF** verificado mediante descarga, firma `%PDF-`, lectura estructural, recuento de páginas y SHA-256. Nueve de estos PDF se conservan en GitHub con permiso explícito; los otros se abren en la fuente. **41 fichas usan correo o pedido gratuito** y una es un tutorial de corte por medidas. No se envió ningún correo, no se registró ninguna cuenta y no se completó ningún pedido en nombre de la persona usuaria.

## Revisión de fuentes

Se revisaron los índices oficiales [gratuitos](https://cholyknight.com/free-projects/), [accesorios](https://cholyknight.com/accessories/), [bolsos](https://cholyknight.com/bagscarryalls/), [archivo](https://cholyknight.com/archive-patterns/) y [peluches](https://cholyknight.com/plushies/) de Choly Knight. Las 207 direcciones iniciales resultaron ser **197 artículos únicos**, tras normalizar barras finales. Cada artículo se descargó y se extrajeron sus enlaces reales; no se construyeron URLs de PDF suponiendo nombres de archivo.

De los 197 se admitieron 184. Las trece exclusiones y sus motivos están en [`research-exclusions.json`](../public/pattern-library/research-exclusions.json): piezas de papel, una descarga no recuperada, un proyecto por entregas sin archivo completo verificado y modificaciones que requieren comprar un patrón base. Cuando la autora publica una versión completa gratuita junto a una modificación antigua de pago, se selecciona el PDF completo, por ejemplo King, Link lobo, Godzilla y Zorua. Un archivo de ropa para muñecos (kimono/yukata) está clasificado en **Peluches**, y dice expresamente que no es ropa para personas.

Las 39 prendas de Mood se seleccionaron del [índice oficial](https://blog.moodfabrics.com/free-sewing-patterns/) y se abrió cada artículo individual. Se verificó la presencia de la oferta gratuita y del formulario de correo, así como las instrucciones de montaje. Se descartó un enlace del índice titulado Olive que redirigía al enterizo Oliver ya incluido. No se descargaron esos PDF ni se les asignaron hashes, páginas o tallas deducidas. La [capa Winterberry actualizada](https://blog.moodfabrics.com/the-updated-winterberry-cape-free-sewing-pattern/) enlaza por separado sus [instrucciones originales](https://blog.moodfabrics.com/the-winterberry-cape-free-sewing-pattern/). El sombrero pescador incluye un video de construcción en la página.

Los artículos de Mood, Motley, Pompom y Fleece Fun se consultaron con la herramienta de navegación web. Sus servidores rechazan algunas peticiones del cliente HTTP automatizado. `verification.sourceMethod: 'web'` distingue esta comprobación de una respuesta HTTP medida: no se inventa un código 200. Las descargas PDF tienen su propia verificación independiente. Choly, OTTOBRE y Bikes & Bloomers se revisaron con HTTP y lectura local de PDF.

Los datos de OTTOBRE y las nueve prendas históricas se documentan en [FUENTES_ESPANOL_Y_ABIERTAS.md](FUENTES_ESPANOL_Y_ABIERTAS.md). El índice unificado incluye esas mismas fichas; `spanish-and-open-patterns.json` es su subconjunto de investigación, no otro inventario sumable.

## Patrón e instrucciones

Cada ficha conserva `patternUrl`, `instructionsUrl` y sus tipos (`pdf` o `pagina`). `combinedPdf` solo señala que las dos partes están en el mismo documento; no crea dos archivos ficticios. Cuando el autor exige correo/pedido se abre su página y se informa del requisito. Un PDF de patrón no se presenta como editable dentro del estudio ni como generador de puntadas.

El conjunto de hada aportado por la persona usuaria tiene **seis hojas de patrón y cinco de instrucciones**. Se contrastaron las piezas y materiales con esos archivos. La [página oficial](https://www.pompomdumonde.com/sewing-patterns/p/fairy-set) entrega ambos por pedido gratuito; sus enlaces de pedido caducan a las 24 horas. No se encontraron enlaces públicos estables a esos dos PDF ni licencia de redistribución. La ficha conserva el acceso gratuito original y el [tutorial detallado de alas](https://www.pompomdumonde.com/blog/crown-tutorial-ppk8c); no se construyen URLs falsas ni se publican los adjuntos.

La [cola de dinosaurio de Motley](https://www.motleycostumier.com/blog/params/post/5227427/how-to-sew-a-fleece-dinosaur-tail-free-pdf-pattern--video-tutorial) sí ofrece un PDF oficial de cuatro páginas separado del tutorial. La [gorguera](https://www.motleycostumier.com/blog/params/post/5277912/how-to-make-a-simple-neck-ruffle--easy-diy-sewing-tutorial) se corta por medidas: su ficha lo muestra como tutorial, sin botón que prometa descargar un molde inexistente.

## Copias locales y permisos

**Gratuito no significa redistribuible.** Los PDF de Choly prohíben expresamente redistribuir el patrón; OTTOBRE impone restricciones de uso y distribución. Para Mood, Fleece Fun, Pompom y Motley no se encontró autorización de redistribución en esta revisión. Se conservan enlaces, atribución y resúmenes propios, sin copiar fotografías ni tutoriales completos.

Bikes & Bloomers publica sus archivos bajo CC BY-NC-SA. Se alojan nueve originales sin modificar en `public/pattern-library/bikes-and-bloomers/`, acompañados de manifiesto SHA-256, atribución, enlace de permiso y condiciones de la licencia. El código de la app no cambia la licencia de estos archivos. No se incluyen estos documentos pesados en la precarga de la PWA.

La lista de muestras confeccionadas sigue siendo una curaduría separada: enlazar un PDF o comprobar su estructura no demuestra que se haya cosido o que sus tallas ajusten. Las fuentes gratuitas que coinciden con la curaduría conservan la evidencia previa del autor; las demás no reciben esa etiqueta automáticamente.

## Repetir y mantener la revisión

```bash
# Metadatos y hashes de las nueve copias locales, sin red:
python scripts/research-patterns.py --output /tmp/pattern-audit.json

# Revisión puntual de las fuentes y del PDF remoto:
python scripts/research-patterns.py --network \
  --ids choly-hooded-cowl,motley-dinosaur-tail \
  --output /tmp/pattern-network-audit.json

# Descubrir artículos candidatos para una futura revisión, sin incorporarlos:
python scripts/research-patterns.py --discover-choly /tmp/choly-candidates.json
```

El script no cambia fechas de revisión ni hashes automáticamente. Un PDF modificado debe revisarse contra el original; un 403 automatizado se registra como revisión pendiente, no como certeza de que el enlace esté roto para la persona usuaria. PyMuPDF es opcional para volver a leer el número de páginas. Las peticiones respetan un máximo de tres trabajadores y un límite de 25 MiB por archivo.

`tests/free-pattern-sources.test.ts` comprueba procedencia, enlaces distintos por diseño, coherencia entre archivo/página/correo, exclusión de bases de pago y que los bytes locales coincidan con su permiso y huella. Los filtros se verifican por separado; ninguna de estas pruebas sustituye imprimir y coser muestras.

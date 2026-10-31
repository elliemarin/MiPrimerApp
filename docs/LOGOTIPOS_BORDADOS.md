# Logotipos e imágenes como bordados

Implementación de importación: `src/features/simple/embroideryImage.ts`.
El archivo se incorpora a un grupo editable de bordado; no se convierte en una
tela, una pieza de corte ni un archivo de puntadas.

## Archivo y geometría

- `importEmbroideryImage(file)` valida formato y tamaño, decodifica la imagen
  en el navegador y guarda un PNG mediante `useApp.addFile`. PNG y WebP conservan
  transparencia; la orientación de fotos JPEG queda incorporada en sus píxeles.
- Admite PNG, JPG, WebP y fotos HEIC/HEIF/AVIF que el navegador pueda decodificar.
  Un formato no compatible pide una copia PNG/JPG. SVG y PDF requieren conversión
  previa; no se aceptan como imágenes rasterizadas silenciosamente.
- Límite de entrada: 40 MB. La copia de trabajo reduce el lado mayor a un máximo
  de 2400 píxeles, sin ampliar archivos pequeños. Conserva colores y proporción;
  no se pinta un fondo blanco. No se guarda una segunda copia del original.
- Devuelve `{ fileId, name, widthPx, heightPx }`. El ID identifica un archivo PNG
  persistente en IndexedDB, con nombre, MIME, tamaño y fecha de creación.
- `createImageEmbroidery(imported, viewId, x, y, widthMm)` devuelve la misma
  estructura `EmbroideryInsertion` que motivos y letras. Sus coordenadas y
  medidas son milímetros, con altura proporcional al PNG normalizado. El ancho
  predeterminado es 70 mm; el intervalo admitido es de 5 a 1000 mm.
- El grupo lleva `embroidery.kind: 'image'`. Su hijo `kind: 'imagen'` contiene
  `image: { fileId, naturalW, naturalH }`, técnica `bordado`, relleno vacío y
  margen cero. Esta estructura permite mover y escalar ambos como un objeto.
  No se dibuja un contorno de bordado ficticio sobre el rectángulo de la imagen.

## Persistencia y referencias editoriales

La recolección de archivos y el ZIP existentes reconocen `element.image.fileId`.
Guardar, recargar y restaurar un ZIP conservan archivo, proporción, posición,
jerarquía e identidad; no dependen de una URL temporal. La sincronización
opcional usa la misma cola de archivos que las fotos existentes.

La ficha editorial incluye un solo registro de tipo `image` por grupo. No
inventa una paleta a partir de su relleno vacío. Las capturas incrustan el PNG
real y el prompt pide conservar sus colores, letras y transparencia, incluidos
los logotipos que la persona haya colocado en su prenda.

## Comprobaciones

- `tests/embroidery-image.test.ts`: validación, errores, proporción en mm,
  estructura del grupo, datos editoriales y round-trip de IndexedDB/ZIP. Una
  imagen corrupta no deja un archivo huérfano.
- `tests/browser/embroidery_image_import_smoke.py`: Chromium real con PNG/WebP
  transparentes, JPEG con orientación EXIF 6 y foto de 4200 × 2100 píxeles.
  Comprueba colores y alpha por píxel, reducción proporcional, recarga completa,
  restauración de ZIP y presencia de los colores del logo en capturas
  editoriales generadas. Ejecutado correctamente en el entorno de desarrollo.
- La decodificación de HEIC/AVIF depende del navegador. Safari/iPhone físico y
  selección desde el carrete siguen requiriendo comprobación en el dispositivo.
  Subir un logo no digitaliza puntadas ni convierte una máquina de coser en una
  bordadora; el archivo sigue siendo una referencia visual para colocar y trazar.

La interfaz, sus controles de movimiento y las guías PDF se documentan junto
al relevo principal en `ESTADO_DEL_PROYECTO.md`.

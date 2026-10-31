# Logotipos en las guías PDF y el respaldo ZIP

Implementado el 31 de octubre de 2026. Complementa el flujo de subir un logotipo en Bordados; no convierte imágenes en puntadas de máquina.

## Contrato de diseño

- Raíz `kind: 'grupo'`, `embroidery.kind: 'image'`, técnica `bordado`.
- Hijo `kind: 'imagen'`, técnica `bordado`, `image: { fileId, naturalW, naturalH }`.
- El archivo de trabajo es un PNG local con transparencia. La importación conserva la proporción y la interfaz modifica su ancho en milímetros.
- Las coordenadas, tamaño, giro y volteos viven en el diseño como para cualquier otro motivo. Ocultar el grupo también excluye la imagen de las guías.

## Exportación

`DrawImage` almacena el identificador del archivo y una matriz que lleva el cuadrado unitario, con origen superior izquierdo, a milímetros físicos. `elementImage` calcula la matriz usando las mismas transformaciones del estudio. `PdfCanvas.image` transforma esos milímetros a puntos PDF sin modificar la escala.

Los PNG se incrustan como imágenes con máscara alfa PDF; no se sustituyen por un rectángulo ni se vectorizan. JPG también es admitido por el exportador para proyectos anteriores. Los contornos de costura y corte continúan siendo vectoriales.

El PDF de confección incluye la imagen real en:

1. La ficha con las vistas y la ficha del bordado, como referencia visual.
2. La guía independiente de transferencia, en el tamaño elegido, a escala 1:1.
3. La guía de ubicación, con cuadrícula de 10 mm, referencias cada 50 mm, centro X/Y y el código B correspondiente.

Una copia de prenda en espejo invierte únicamente la imagen de la guía canónica de ubicación. Su nota indica transferir por el reverso; la guía independiente mantiene la orientación del diseño. El mosaico conserva páginas interiores de imágenes grandes aunque no contengan líneas de borde. Acomodar dibujos solo cambia su posición, nunca su escala.

Antes de entregar bytes PDF se verifica que los logos referenciados existan, sean PNG/JPG y se puedan decodificar. Un archivo ausente o corrupto detiene la exportación e indica volver a cargarlo. Las imágenes y motivos con máscaras geométricas continúan bloqueados en este exportador porque no puede garantizar el recorte del original.

`freezeDeps` registra `imageFileIds` junto con la versión congelada del diseño. El ZIP conserva las imágenes actuales y las de versiones anteriores en `diseno/imagenes`, con sus identificadores en `archivos.json`; las vistas SVG del ZIP usan rutas relativas a esos archivos. Un archivo del diseño ausente impide producir un respaldo incompleto.

## Verificación

`tests/embroidery-raster-pdf.test.ts` cubre imagen real en las tres secciones, matriz física de 50 × 25 mm con giro y volteo, canal alfa 0/128/255, paginación interior, espejo de ubicación, grupo oculto y subgrupo oculto dentro de una raíz visible, errores por archivo ausente/corrupto y presencia exacta del PNG en ZIP. La ficha de bordados y el plano de ubicación respetan la visibilidad de todos los antecesores.

Pruebas focalizadas:

```sh
PDF_OUT=/tmp/logo-pdf npx vitest run tests/embroidery-raster-pdf.test.ts tests/embroideryExport.test.ts tests/placement-guide.test.ts tests/project-pack.test.ts tests/pdf.test.ts
```

PyMuPDF comprobó en esos artefactos una calibración de 50.0 y 100.0 mm, y ejes de la imagen de 50.0 × 25.0 mm. Se inspeccionó visualmente el PNG asimétrico con giro, volteo y transparencia parcial. Esto verifica la exportación digital; imprimir una muestra al 100 % y medirla sigue siendo necesario para comprobar la impresora real.

## Límites y trabajo posterior

- El panel avanzado de SVG de bordado/DST sigue bloqueando imágenes; el PDF es la guía de referencia disponible para estos logos. No se crean rellenos, satén ni puntadas desde una foto.
- No se modificó la compatibilidad con CREATIVATE ni se validó un archivo en la Singer HD9120.
- La calidad de una imagen impresa depende de su resolución original y del tamaño escogido. Aumentarla en el estudio no agrega detalle.
- El archivo SVG del ZIP necesita conservar la carpeta `diseno/imagenes` a su lado. El respaldo editable mantiene esa estructura al importarlo.

# Fuentes de patrones y Singer Smart Heavy Duty HD9120

Investigación de relevo para Claude y otras IAs. Consulta: **30 de octubre de
2026**. Los enlaces de esta página son fuentes primarias. La investigación no
equivale a una prueba física de bordado ni a una integración ya terminada.

## Singer HD9120: lo confirmado

El [manual oficial 471138026F, serie 912X](https://svpworldwide.widen.net/content/grjpxve9ij/original/471138026F_IM_912X_EN_web.pdf?download=true&u=hcosqv),
enlazado desde el [directorio de manuales de Singer](https://www.singer.com/pages/product-manuals-for-singer-pfaff-and-husqvarna-viking-sewing-machines),
establece lo siguiente:

- Página impresa 1: las funciones de bordado se controlan mediante la app
  **CREATIVATE**, con la máquina conectada por **Wi-Fi**.
- Página 4: el bastidor de la unidad de bordado es de **170 × 100 mm**;
  la cifra representa el área máxima de bordado. La unidad y los accesorios
  pueden depender del paquete adquirido.
- Página 29: el selector ofrece **Vault**, **Design Catalog** y **Device**.
  Device permite elegir archivos de diseño compatibles guardados en el móvil.
- Página 30: el diseño se envía a la máquina desde la app.

El manual consultado **no enumera las extensiones compatibles** de Device.
No se ha demostrado que un DST generado por Hilvana se importe y se borde en
esa combinación de modelo, firmware y versión de la app.

La [FAQ oficial de CREATIVATE](https://creativate.com/pages/faqs) incluye DST,
XXX, VP3 y otros formatos en la sección de **software de bordado**. Esa lista
no demuestra por sí sola que todos sean admitidos por el controlador móvil de
la HD9120. La misma FAQ remite al manual de cada máquina para confirmar el
formato adecuado. No debe deducirse «Singer = XXX» ni prometer compatibilidad
directa con HD9120 a partir del nombre de la marca.

La [ficha publicada por VSM Group AB en Google Play](https://play.google.com/store/apps/details?id=com.mysewnet.embroidery)
también describe el control de costura y bordado de la HD9120 desde CREATIVATE.
Hilvana no usa una API de control de la máquina: no se ha encontrado ni
implementado un SDK público de conexión directa para esta tarea.

## Qué exporta Hilvana y cómo probarlo

El código existente en `src/lib/dst.ts` escribe Tajima DST con puntada recta,
saltos y cambios de bloque de color. El dibujo vectorial se convierte en
polilíneas y se remuestrea. **No digitaliza rellenos ni columnas de satén**,
no compensa tirón y no calcula una secuencia profesional de bordado. El
archivo DST tampoco contiene los valores RGB de la paleta mostrada: hay que
asignar los hilos al abrirlo en software de bordado.

El exportador de contornos bloquea vistas que incluyan texto (faltan glifos
vectoriales), imágenes, parches compuestos o recortes/máscaras de bordado que
aún no aplica. Usa figuras o trazos sin máscara en una vista independiente,
o digitaliza el diseño en un motor especializado.

Los SVG de Hilvana son dibujos a escala para transferir, recortar o digitalizar.
No contienen una programación de puntadas por el simple hecho de ser SVG.

Flujo de comprobación pendiente:

1. Tener la unidad de bordado, el bastidor correspondiente y CREATIVATE
   configurados según el manual del equipo real.
2. Crear en Hilvana una figura simple de aproximadamente 20 × 20 mm y una sola
   vista de bordado; exportar SVG y, para probar puntada recta, DST experimental.
3. Abrir el DST en software de bordado y comprobar dimensiones, bloques,
   saltos y puntadas. Para un bordado relleno, digitalizar el SVG con un motor
   de bordado y revisar el resultado; cambiar la extensión no convierte nada.
4. Guardar el archivo en el móvil e intentar cargarlo en CREATIVATE → Device.
   Si no aparece o no abre, confirmar con soporte Singer el formato de entrada
   de esa versión de la app; convertir mediante software que lo admita.
5. En CREATIVATE seleccionar el bastidor instalado, comprobar el recorrido y
   realizar una muestra en retazo con estabilizador. Documentar máquina,
   firmware, app, formato y resultado antes de declarar compatibilidad.

**Criterio de aceptación pendiente:** archivo de prueba generado por Hilvana,
importado correctamente y muestra física revisada. Hasta entonces mantener
«Experimental» y «Compatibilidad con HD9120 pendiente de comprobar».

Al modificar `CutoutsTab`, conviene exportar cada vista por separado: los
elementos del frente y la espalda tienen coordenadas locales independientes y
no deben superponerse accidentalmente en el mismo bastidor. El límite del
bastidor debe comprobarse antes de descargar, conservando la escala física.

## FreeSewing: la fuente más adecuada para ampliar patrones editables

FreeSewing proporciona un **motor JavaScript paramétrico**, con diseños
publicados como paquetes. Es una colección de diseños que se generan con
medidas y opciones; no debe presentarse como una API anónima con miles de PDFs
editables. La documentación moderna enlaza el repositorio oficial en Codeberg.
Véanse la [presentación para desarrolladores](https://freesewing.dev/), el
[Core API](https://freesewing.dev/reference/api/) y el
[índice de diseños documentados](https://freesewing.dev/reference/designs/aaron/).

La [API Pattern](https://freesewing.dev/reference/api/pattern/) expone el
patrón instanciado, sus piezas y configuración, y operaciones de generación y
renderizado. Por ejemplo, los diseños [Aaron](https://freesewing.dev/reference/designs/aaron/)
y [Brian](https://freesewing.dev/reference/designs/brian/) documentan sus
constructores y partes. Esto permite plantear un adaptador que conserve
geometría y parámetros, en lugar de escalar imágenes.

Existe además un [backend REST oficial](https://freesewing.dev/reference/backend/)
para integrar datos de la cuenta. Requiere estudiar autenticación y permisos;
el proveedor pide moderar el tráfico. **No hace falta enviar medidas corporales
a ese backend para usar paquetes locales de generación**. Para la PWA de
Hilvana es preferible primero probar paquetes locales y carga diferida.

### Licencias y atribución

El [archivo LICENSE del monorepositorio actual](https://codeberg.org/freesewing/freesewing/src/branch/develop/LICENSE)
es MIT; se comprobó también su
[versión de texto](https://codeberg.org/freesewing/freesewing/raw/branch/develop/LICENSE).
La licencia permite reutilizar y modificar el software conservando el aviso de
copyright y la licencia. El paquete
[@freesewing/core publicado por sus autores](https://www.npmjs.com/package/@freesewing/core)
también declara MIT. La
[FAQ de uso comercial de FreeSewing](https://freesewing.eu/docs/about/faq/commercial-use/)
permite utilizar sus patrones con fines comerciales.

Antes de incorporar cada diseño, registrar paquete, versión, autor, URL y
licencia del código efectivamente incluido. El permiso del software no se
debe extender automáticamente a fotos de personas usuarias, capturas de la
web, marcas, material de terceros o cualquier PDF encontrado en Internet.
Los proyectos históricos y paquetes antiguos pueden tener condiciones
diferentes: no mezclar la licencia de un repositorio antiguo con la del
paquete moderno que se vaya a distribuir.

### Plan técnico para una integración real (pendiente)

1. Elegir un solo diseño con documentación suficiente. Fijar versiones de
   todos sus paquetes, registrar licencia/atribución e importar de forma
   diferida para no aumentar la carga inicial del estudio.
2. Crear un mapa explícito entre las medidas en milímetros de Hilvana y las
   medidas exigidas por el diseño. No rellenar silenciosamente una medida
   ausente ni mezclar tallas comerciales con las tablas propias.
3. Generar sin margen de costura externo, convertir las piezas a
   `PatternPiece` conservando ids, nodos, curvas y líneas de hilo. Mapear
   piquetes, dobleces y número de corte. Aplicar los márgenes **una sola vez**
   mediante el motor de Hilvana.
4. Incorporar relaciones entre costuras y comprobaciones de medidas
   terminadas; validar varias medidas, tallas extremas y opciones. Un SVG
   importado sin semántica de costuras puede ser editable como dibujo,
   pero aún no es un patrón plenamente integrado.
5. Guardar la procedencia y versión del generador junto al proyecto para que
   la regeneración sea reproducible y los ajustes por id no se pierdan.
6. Abrir el resultado en el estudio como piezas editables, aplicar telas,
   exportar PDF/SVG 1:1 y revisar una muestra impresa y cosida. Publicar primero
   como **Experimental**; ampliar el conjunto tras superar esas pruebas.

**Estado al cerrar esta investigación:** fuentes y plan documentados. Ningún
paquete FreeSewing se ha incorporado mediante esta tarea; no marcar su catálogo
como importado ni sus patrones como disponibles dentro de Hilvana.

## Otros catálogos

El [catálogo comercial de CREATIVATE](https://creativate.com/pages/faqs)
ofrece diseños y patrones según la membresía y distingue diseños comprados,
gratuitos y prémium. Consultarlo desde su app no concede autorización para
copiarlo dentro de Hilvana. No se identificó en estas fuentes una API pública
de catálogo con licencia para redistribución y edición en nuestra app.

La búsqueda de proveedores no justifica poblar un catálogo con miles de
entradas que solo enlazan PDFs, ni anunciar que son patrones editables. La
ampliación útil combina patrones paramétricos verificados, figuras vectoriales
originales y referencias externas con procedencia visible.

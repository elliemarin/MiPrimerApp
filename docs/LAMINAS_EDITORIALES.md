# Láminas editoriales con el ChatGPT personal

Entrega del 30 de octubre de 2026. El objetivo es preparar un diseño terminado
para una imagen editorial coherente con la referencia del usuario: papel marfil,
LOOK NN, figura principal y espalda, prendas separadas, paleta y muestras textiles.

## Recorrido de la persona

1. En **Acabados**, **Ver en modelo** o **PDF de confección**, pulsar
   **Preparar lámina**.
2. Dar nombre al look y, opcionalmente, seleccionar otros proyectos. Se admite
   una prenda/accesorio o un conjunto de hasta seis proyectos explícitos.
3. Pulsar **Preparar referencias** y revisar las imágenes generadas localmente.
4. **Compartir…** abre la hoja nativa si acepta los PNG preparados. La persona
   elige ChatGPT cuando esté disponible y revisa el texto y los adjuntos.
5. Alternativa siempre disponible: descargar las imágenes, **Copiar prompt** y
   **Abrir ChatGPT**. Allí se adjuntan los PNG, se pega el texto y se envía.
   **Descargar paquete** guarda los PNG y el texto en un ZIP.

Hilvana no genera la imagen final ni la envía por cuenta de la persona. El prompt
fija la dirección de arte; un generador de imágenes puede variar la composición
y los detalles. La presentación no sustituye el PDF vectorial a escala.

## Contratos para Claude

- `features/editorial/prompt.ts`: `HILVANA_EDITORIAL_V1` es la dirección de arte
  versionada e independiente del proyecto. `buildEditorialBrief` añade las
  prendas seleccionadas, materiales usados, posiciones y dimensiones de extras,
  bordados multicolor y texto/tipografía, silueta y despiece. Conserva la escala
  visual y la calibración fotográfica cuando existen. Los elementos ocultos,
  incluidos sus ancestros, no se solicitan como detalles visibles.
- `resolveEditorialPattern` comparte una fuente validada entre texto y capturas.
  Resuelve los cortes pendientes en una copia local, respeta exclusiones y no
  presenta un despiece anterior si los cortes quedaron obsoletos. No modifica
  el proyecto ni el patrón para confección.
- `evidence.tsx`: captura las vistas reales mediante los renderizadores del
  estudio y añade la composición ilustrativa del figurín. Sus extras/bordados
  se verifican en las vistas de piezas. Incrusta fotos de IndexedDB antes de
  rasterizar; resuelve cada textura con el prefijo exacto de su vista o parche,
  incluso si varias vistas comparten un identificador de zona.
- Los PNG se agrupan en **Vistas** y **Detalles y patrones**, hasta doce tarjetas
  por página, 2400×3200 px. Se conservan todas las referencias mediante paginación.
  Cada imagen debe quedar por debajo de 19 MiB; se reduce su resolución si hace
  falta. Las miniaturas conservan los contornos reales y dicen «sin escala».
- Recursos faltantes o patrones inválidos producen avisos visibles; revisar las
  referencias antes de compartir. Las vistas físicas desactualizadas bloquean
  la preparación hasta revisarlas en Extras.
- `package.ts`: ZIP con los PNG exactos, `prompt.txt`, instrucciones y manifiesto
  de archivos/dimensiones/SHA-256. `editorialSourceKey` invalida lo preparado
  cuando cambia diseño, patrón, materiales, selección o configuración del look.
  Se bloquean los controles de transferencia hasta actualizar las referencias.
- `EditorialSheet.tsx`: carga diferida desde las tres entradas; una sola hoja
  activa. Se guarda únicamente `Project.editorial` con título, número, ambiente,
  versión del estilo e IDs seleccionados. No requiere migración destructiva.
  Al cerrar, cancela la captura y libera las URLs temporales.
- Los nombres internos de proyectos, notas, perfiles, fotos de referencia
  privadas y medidas corporales no se añaden al prompt/paquete. Se usan nombres
  de catálogo y los detalles visuales seleccionados. Las capturas sí contienen
  las imágenes que la persona colocó en el diseño.

El contrato del navegador y sus fuentes están en
[CHATGPT_PERSONAL_COMPARTIR.md](CHATGPT_PERSONAL_COMPARTIR.md). No añadir un envío
automático, una URL no documentada para adjuntar archivos ni una promesa de que
ChatGPT será un destino de la hoja de compartir.

## Verificación y próximo paso

Pruebas unitarias: dirección de arte determinista, datos reales y privados,
extras ocultos, cortes pendientes, calibración, paginación, IDs de texturas por
vista, archivos/hashes, invalidación y controles de transferencia. La suite
completa pasa con **2,294 pruebas en 45 archivos**; build con base de Pages.

`tests/browser/editorial_smoke.py` cubre 320/390/1440 px, fotos rayadas, cargo,
abeja multicolor y letras; uno/dos proyectos, archivos PNG/ZIP, estilo constante,
cancelación, copia bloqueada/manual, referencias obsoletas, persistencia y tres
entradas. Web Share se simula: se comprueba la llamada y su resultado, no una
cuenta externa. `simple_journey_smoke.py` conserva el recorrido de confección y
el PDF de 69 páginas/doce plantillas con controles de 50/100 mm.

Pendiente: probar la hoja nativa en iPhone/Safari y Android con ChatGPT instalado,
verificar qué versiones conservan juntos varios PNG y el texto, y revisar una
generación enviada por el usuario en su cuenta. No se ha generado ni enviado
una imagen automáticamente. Se mantienen las revisiones físicas de patronaje
descritas en los relevos anteriores.

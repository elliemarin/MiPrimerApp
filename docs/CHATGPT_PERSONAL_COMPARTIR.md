# Llevar la lámina al ChatGPT personal

Comprobado el 30 de octubre de 2026. Este relevo describe el contrato de
`src/features/editorial/handoff.ts`; la generación de referencias se hace antes
de estos controles, localmente en Hilvana.

## Qué se puede automatizar

La Web Share API entrega archivos PNG y texto a la hoja de compartir del sistema.
La persona elige ChatGPT si su dispositivo lo ofrece. Hilvana no elige una app
concreta ni puede confirmar qué cuenta, conversación o aplicación recibió los
datos. Que la promesa se resuelva tampoco certifica que se envió un mensaje.

Hay que comprobar `navigator.canShare({files})` con el lote real preparado y
llamar a `navigator.share` directamente desde el botón. Una operación de
renderizado o portapapeles esperada antes de compartir puede consumir el gesto
necesario en Safari. Cancelar la hoja conserva la pantalla; no abre pestañas,
descarga archivos ni intenta otro envío automáticamente.

## Recorrido alternativo

Si no hay compatibilidad o ChatGPT no aparece como destino:

1. Descargar las referencias PNG.
2. Copiar el texto preparado; si el permiso falla, seleccionarlo y copiarlo
   manualmente en el campo visible.
3. Abrir ChatGPT con un clic independiente y adjuntar las imágenes, pegar el texto
   y enviarlo desde la cuenta personal.

Se abre exclusivamente `https://chatgpt.com/`, con `noopener,noreferrer`.
No se incluyen datos del proyecto en una URL ni se usan parámetros no
documentados de autocompletado/envío. La app no puede insertar adjuntos en la
interfaz de otro dominio. No se añade una API ni se solicitan claves de OpenAI.

Los formatos alternativos del portapapeles no garantizan que la app de destino
pegue simultáneamente texto e imagen. Por eso copiar el texto es una acción
explícita e independiente; no se reemplaza silenciosamente por una imagen.

## Fuentes primarias

- [MDN: Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share):
  destinos del dispositivo, activación transitoria, resultado y cancelación.
- [MDN: Navigator.canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare):
  comprobación de compatibilidad con los archivos reales.
- [WebKit: Async Clipboard API](https://webkit.org/blog/10855/async-clipboard-api/):
  gesto del usuario, contexto seguro y representaciones del portapapeles.
- [MDN: Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText):
  confirmación asíncrona y rechazo de permisos.
- [OpenAI: ChatGPT Image Inputs FAQ](https://help.openai.com/en/articles/8400551-chatgpt-image-inputs-faq):
  adjuntar, arrastrar o pegar imágenes PNG y sus límites por cuenta.

## Pendiente de dispositivo

Probar la hoja real en iPhone/Safari y Android con ChatGPT instalado, incluyendo
si cada versión conserva el texto junto con varios PNG. Las pruebas automáticas
verifican la llamada y los fallos; no pueden garantizar los destinos del sistema
ni permisos de una cuenta externa.

# Modo proyector y PDF para proyector

Entrega de Claude del 2026-11-01. Respuesta a «patrones que se puedan proyectar
también, por si no los quieren imprimir, junto con instrucciones y calibraciones».

## Qué hace

- **Proyectar en la mesa** (`#/proyectar/:proyecto`): pantalla completa, fondo
  negro, piezas reales del patrón a escala 1:1 sobre la mesa de corte. Mover
  arrastrando (o flechas; Mayús = 10 mm), Girar 90°, Voltear (segunda pieza de un
  par en espejo), Centrar, Bloquear, Ocultar controles (tocar para volver).
  Opciones: fondo negro/blanco, grosor de línea, línea de costura y marcas,
  textos, cuadrícula de 10 cm, cuadro de control de 5 cm, pantalla completa y
  descarga del PDF para proyector. Mantiene la pantalla encendida (Wake Lock)
  donde el navegador lo permite.
- **Calibración** (por dispositivo, `localStorage` `hilvana-proyector-calibracion`):
  - *Rápida con regla*: cuadro nominal de 100 mm; se escribe lo que mide en ancho
    y alto y se corrige la escala por separado (se repite hasta 100 mm).
  - *Precisa con 4 esquinas*: rectángulo real elegido en el tapete (por defecto el
    60 % del área visible redondeado a 5 cm) y cuatro cruces arrastrables con
    ajuste fino de 1 o 10 px. Calcula una **homografía** (escala, giro e
    inclinación). Rechaza esquinas cruzadas o alineadas.
  - *Comprobar*: cuadrícula de 10 cm, cuadro de 10 cm con marcas de 1 cm y
    cuadros de 5 cm en el centro y en una orilla. Avisa si la imagen está muy
    inclinada o si cada píxel cubre demasiados milímetros.
  - Si cambia el tamaño de la ventana, la escala se adapta de forma aproximada y
    la barra pide recalibrar.
- **PDF para proyector** (`src/lib/pdf/projector.ts`): una o varias hojas grandes
  (hasta 4,8 m de alto; acomodo con el ancho de tela, 140 cm por defecto) con fondo
  negro, líneas gruesas de color, cuadrícula de 10 cm alineada al borde y un cuadro
  de calibración de 10 × 10 cm con marcas de 1 cm y cuadro interior de 5 cm.
  Escala 1:1 (`PrintScaling.None`), JSON adjunto con versiones congeladas. Se
  registra en Exportaciones como «PDF para proyector (1:1)».
- **Instrucciones**: Ayuda → «Proyectar el patrón sobre la tela (sin imprimir)»
  (`#/ayuda/proyector`) y pasos dentro de la propia pantalla de calibración.

## Archivos

- `src/lib/projector/homography.ts`: resolución exacta con 4 puntos, inversa,
  composición, escala local y comprobación de cuadrilátero convexo.
- `src/lib/projector/calibration.ts`: tipos, guardado/lectura validados,
  calibración estimada, con regla, con esquinas y notas de calidad.
- `src/lib/projector/scene.ts`: polilíneas en mm desde los `Drawable`, acomodo sin
  traslapes, colocación (mover, girar, voltear) que conserva las medidas.
- `src/lib/projector/source.ts`: qué se proyecta (patrón, aplicaciones y guías de
  bordado del paquete de confección). Solo bloquean problemas del patrón; no hace
  falta haber elegido colores.
- `src/features/projector/`: `ProjectorPage.tsx`, `render.ts` (canvas: cada punto
  se transforma con la homografía; textos demasiado pequeños para leerse a su
  tamaño real se omiten en vez de agrandarse), `projectorPdf.ts`, `projector.css`.
- Entradas: hoja «Todo listo para coser» (`SewingPackSheet.tsx`) con «Proyectar en
  la mesa» y «PDF para proyector»; ruta sin barra de navegación en `App.tsx`.
- Pruebas: `tests/projector.test.ts`.

## Verificado

- Chromium 1280 × 720: calibración con regla (92 mm → escala × 100/92), con cuatro
  esquinas (perspectiva), comprobación, proyección, piezas sueltas y opciones.
- iPhone 13 (Playwright): hoja de confección con los nuevos botones, proyección y
  ocultar controles, sin errores de consola.
- PDF para proyector de la falda de tul: 146 × 82 cm, cuadro de calibración medido
  con PyMuPDF en **100,000 mm**.

## Pendiente

1. Probar con un proyector físico y una mesa real (escala en centro y orillas,
   legibilidad sobre telas oscuras y estampadas). No se ha hecho.
2. Safari en iPhone no permite pantalla completa para páginas: hay que añadir la
   app a la pantalla de inicio. Probar duplicado AirPlay/HDMI.
3. Ideas: capas opcionales en el PDF (contenido opcional), patrón por tallas
   anidadas, guardar la colocación de cada pieza por proyecto, modo «una pieza a
   la vez» con siguiente/anterior.

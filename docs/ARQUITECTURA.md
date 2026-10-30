# Arquitectura de Hilvana

Documento técnico de referencia. Explica cómo funciona cada parte y cómo
verificarla. Mantenlo al día cuando cambies una pieza clave.

## 1. Pila

- React 18 + TypeScript estricto + Vite. Estado global con zustand.
- PWA (vite-plugin-pwa): se instala en la pantalla de inicio del iPhone y
  funciona sin conexión.
- `pdf-lib` para PDF vectorial, `pdfjs-dist` (carga diferida) para leer PDFs
  importados, `fflate` para ZIP, `idb` para IndexedDB.
- Enrutado por hash (`#/proyectos/...`) para que funcione en GitHub Pages.

## 2. Modelo de datos (`src/store/types.ts`)

- `Profile`: persona con `versions[]` de medidas (`MeasurementVersion`). Una
  versión aprobada o usada en una exportación queda bloqueada: editarla crea una
  versión nueva.
- `Project`: referencias, vínculo a perfil y versión, `pattern` (estado del
  motor), `patternVersions`, `design` (documento del estudio),
  `designVersions`, telas, materiales, guía (casillas y notas), notas de avance,
  exportaciones con sus dependencias y registro de cambios.
- `Fabric` y `Material`: biblioteca propia. Una tela está **calibrada** si tiene
  `calibration.mmPerPx`; si no, es una **textura visual**.
- Archivos (fotos, PDF, exportaciones) en el almacén `files` de IndexedDB,
  referenciados por id. `collectGarbage()` borra los que nadie usa.

### Versiones y dependencias

- `makeVersion` guarda una copia profunda y una huella (`stableHash`).
- Cada exportación llama a `freezeDeps`, que crea (si hace falta) la versión de
  patrón o diseño que corresponde al estado actual y registra
  `deps = { measurement, pattern, design }`.
- `projectAlerts` y `exportOutdated` (`src/features/projects/deps.ts`) comparan
  huellas para avisar qué documentos quedaron desactualizados.
- Las versiones aprobadas nunca se sobrescriben: guardar crea una nueva y
  reemplazar requiere confirmación explícita.

## 3. Guardado

`useApp.put/update*` marca la entidad como sucia con un contador de revisión;
`saveNow` escribe todas las sucias en **una transacción** y solo después marca
«Guardado» (si la entidad cambió durante el guardado, sigue pendiente). Ante un
error reintenta cada 15 s y la interfaz ofrece «Reintentar». También se guarda
al ocultar la pestaña.

## 4. Motor de patronaje (`src/lib/pattern`)

- `types.ts`: pieza = nodos con id + bordes (recta o cúbica) con margen y
  acabado por borde (`costura`, `dobladillo`, `jareta`, `doblez`, `orillo`,
  `sin-margen`), piquetes por distancia sobre el borde, hilo, líneas internas,
  cantidad de corte, pares simétricos o al doblez.
- `offset.ts`: contorno de corte. Paralelas por borde, ingletes con límite,
  recorte de esquinas cóncavas e **esquinas en espejo** para dobladillos y
  jaretas rectas (el margen doblado sigue al costado).
- `validate.ts`: contorno cerrado, autointersecciones de costura y corte,
  costura dentro del corte, margen uniforme por borde (detecta márgenes
  duplicados), piquetes, relaciones de costura (igual, embebido, fruncido,
  estirado) y medidas terminadas medidas sobre la geometría.
- `engine.ts`: genera, aplica ajustes manuales por id, detecta los que requieren
  revisión, estima consumo de tela (rectángulos envolventes, supuestos
  explícitos) y acomoda piezas.
- Generadores: `pants.ts` (pantalón de cintura elástica; resuelve la caída del
  tiro trasero por bisección para igualar entrepiernas), `skirt.ts`, `tote.ts`.

## 5. PDF carta a escala real (`src/lib/pdf`)

- `tile.ts`: carta 215.9 × 279.4 mm, margen no imprimible y solapamiento
  configurables, franja de pie de 13 mm. Paso = área útil − solapamiento.
- `export.ts`: portada con instrucción de imprimir al 100 %, cuadrado de 5 × 5
  cm relleno (bordes exactos), barra de 10 cm y de 3 in, leyenda de líneas, mapa
  de montaje y trazabilidad; una página por hoja con contenido, recortada al área
  útil, rombos de alineación en el solapamiento, líneas de recorte, código de
  hoja y barra de control. `PrintScaling=None` y JSON de la exportación adjunto.
- Plantillas pequeñas: `exportPackedPdf` acomoda varias por hoja sin escalar.

### Verificación manual del PDF

```bash
PDF_OUT=/tmp/pdf npx vitest run tests/pdf.test.ts
python3 -c "import pymupdf as f; d=f.open('/tmp/pdf/patron.pdf'); print([round(r['rect'].width*25.4/72,3) for r in d[0].get_drawings() if r.get('fill') is not None][:2])"
```
Debe imprimir `[50.0, 100.0]` (cuadrado y barra en mm).

## 6. Estudio de diseño (`src/features/studio`)

- `model.ts`: documento con vistas (frente, espalda, costados, parche, pieza),
  zonas (trayectos en mm), elementos con tamaño físico (`w`, `h` en mm),
  rotación, relleno (color o tela con rotación, desplazamiento y escala),
  trazo con tipo de puntada, técnica, acabado del borde, margen para el
  recorte, base o refuerzo, zona, máscara y continuidad entre vistas.
- Las plantillas salen de `src/data/flats.ts` (dibujos técnicos paramétricos),
  escaladas de forma aproximada a las medidas del perfil.

## 7. Sincronización y ZIP

- ZIP (`src/lib/zip.ts`): estructura legible con `proyecto.json`, perfiles,
  telas, referencias originales, patrón y diseño (actual y versiones), SVG de
  vistas, exportaciones, avances y `resumen.pdf`. Se importa desde Proyectos.
- GitHub (`src/lib/sync`): la persona crea un repositorio **privado** y un token
  de acceso con permiso de contenido solo para ese repositorio. Los cambios se
  encolan (`outbox`) y se reintentan sin conexión.

## 8. Pruebas

`tests/pattern.test.ts` (geometría y patrones), `tests/pdf.test.ts` (mosaico y
PDF). Ejecuta `npm test` antes de cada commit.

# Instrucciones para asistentes de IA (ChatGPT, Codex, Claude y otros)

Este archivo es el punto de partida obligatorio para cualquier IA que trabaje en
**Hilvana**. Léelo completo antes de tocar el código. Claude Code lee `CLAUDE.md`,
que remite aquí; ChatGPT/Codex leen este archivo directamente.

## 1. Qué es Hilvana

Aplicación web en español (PWA, pensada primero para iPhone) para diseño de
prendas, patronaje a medida, intervención textil y gestión de proyectos de
confección. Nivel de exigencia: geometría verificable como un software
profesional de patronaje 2D (estilo Seamly2D), pero con una interfaz muy simple.

- Publicada en GitHub Pages desde la rama `gh-pages` (la genera el flujo
  `.github/workflows/deploy.yml` en cada push a `main`).
- Sin servidor propio: los datos viven en IndexedDB del navegador, con
  exportación/importación ZIP y sincronización opcional con un repositorio
  privado de GitHub de la persona usuaria.

## 2. Protocolo de relevo entre IAs (síguelo siempre)

1. **Antes de empezar**: lee `ESTADO_DEL_PROYECTO.md` (qué está hecho, qué falta,
   decisiones tomadas) y la sección del área que vas a tocar en
   `docs/ARQUITECTURA.md`.
2. **Comprueba que todo está verde**: `npm install && npm test && npm run build`.
   Si algo falla antes de tus cambios, anótalo en el estado y arréglalo primero.
3. **Trabaja en pasos pequeños** y verificables. No reescribas módulos enteros
   sin necesidad: otra IA puede estar a mitad de una tarea relacionada.
4. **Al terminar cada tarea**:
   - `npm test` y `npm run build` deben pasar.
   - Actualiza `ESTADO_DEL_PROYECTO.md`: mueve la tarea a «Hecho», anota
     decisiones, límites conocidos y el siguiente paso sugerido.
   - Haz commit con un mensaje en español que explique el porqué.
5. **Nunca** marques como terminada una función que no funciona de verdad. Si
   algo es parcial, en la interfaz debe verse como «Experimental» o
   «Pendiente» (ver `STATUS_INFO` en `src/data/catalog.ts`).

## 3. Reglas que no se rompen (invariantes)

- **Unidad interna: milímetros** (`number`). La interfaz convierte a cm o
  pulgadas con `src/lib/units.ts`. No guardes valores redondeados.
- **Holgura una sola vez**: medida corporal + holgura = prenda terminada. Los
  márgenes de costura y dobladillos se agregan por borde, fuera de la línea de
  costura, en `src/lib/pattern/offset.ts`. Las pruebas lo verifican.
- **Ids estables**: piezas, nodos y bordes tienen ids fijos; los ajustes
  manuales se guardan por id (`overrides`) y se marcan para revisión si el
  patrón se regenera con otras medidas.
- **Nada de escalar imágenes para adaptar patrones**: los patrones se generan
  con geometría paramétrica.
- **No confundir sistemas de tallas**: las tablas de `src/lib/sizes/tables.ts`
  son propias y explícitas; no se convierten entre sistemas.
- **PDF a escala 1:1** con geometría vectorial (`src/lib/pdf/`). Si cambias el
  PDF, ejecuta la verificación descrita en `docs/ARQUITECTURA.md` (cuadrado de
  5 × 5 cm exacto y continuidad entre hojas).
- **Un PDF o SVG no es un archivo de puntadas.** La exportación DST es
  experimental y así debe indicarse.
- **3D**: no simular. Solo se implementaría con geometría y simulación reales.
- Todo el texto visible en **español**, en tono claro y directo. Botones con
  verbos («Exportar PDF», no «Enviar»).
- El nombre de la app es **Hilvana**. No cambies la identidad visual sin
  pedirlo a la persona usuaria.

## 4. Mapa rápido del código

| Carpeta | Contenido |
| --- | --- |
| `src/lib/geom` | Vectores, Bézier, homografía, acomodo |
| `src/lib/pattern` | Modelo de pieza, márgenes, validación, motor, generadores |
| `src/lib/pdf` | Mosaico carta, PDF vectorial, calibración |
| `src/lib/draw` | Trayectos, dibujables, SVG |
| `src/lib/sizes` | Medidas y tablas de tallas |
| `src/lib/db.ts` | IndexedDB |
| `src/lib/zip.ts` | Proyecto completo en ZIP |
| `src/lib/sync` | Sincronización con repositorio privado de GitHub |
| `src/store` | Estado global (zustand), tipos, versiones y exportaciones |
| `src/data` | Catálogo, dibujos técnicos paramétricos, figuras orgánicas |
| `src/features/*` | Pantallas: biblioteca, patronaje, estudio, telas, proyectos, medidas, ayuda, ajustes |
| `src/ui` | Componentes, iconos, lienzo con zoom (`Board.tsx`), historial |
| `tests` | Pruebas de geometría, PDF y persistencia (vitest) |

## 5. Cómo agregar un patrón nuevo (la tarea más común)

1. Crea `src/lib/pattern/generators/<nombre>.ts` siguiendo `pants.ts`:
   `defaults(ctx)`, `generate(ctx, params)` con piezas de ids estables,
   relaciones de costura (`seams`), comprobaciones de medidas (`checks`),
   materiales, supuestos y pasos de confección que nombren piezas reales.
2. Regístralo en `src/lib/pattern/generators/index.ts`.
3. En `src/data/catalog.ts` cambia el modelo a `status: 'experimental'` y
   `generatorId`. Solo pásalo a `'implementado'` cuando sus pruebas pasen y se
   haya revisado una muestra impresa.
4. Agrega pruebas en `tests/pattern.test.ts` (sin errores en varias tallas,
   costuras que coinciden, medidas terminadas correctas).
5. Para que aparezca bien en la biblioteca simple (ejemplo completo:
   `src/data/kidsCatalog.ts` + `src/data/kidsFlats.ts`, ver
   `docs/NINA_Y_BEBE_AMPLIADO.md`): `designGroup` y familia en
   `catalogTaxonomy.ts` (DESIGNS + `constructionFacets`), dibujo técnico cuyas
   zonas apunten a piezas reales, imagen propia en `catalogImages.ts` y conteos
   de `tests/catalog-*.test.ts` actualizados.

## 6. Comandos

```bash
npm install
npm run dev        # http://localhost:5173/
npm test
npm run build      # usa BASE_PATH=/nombre-del-repo/ para GitHub Pages
```

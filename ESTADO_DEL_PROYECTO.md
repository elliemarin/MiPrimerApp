# Estado del proyecto — Estudio de Diseño (nombre provisional)

Este documento es la **bitácora de traspaso**: describe qué está hecho, cómo está
organizado el código y qué falta. Está pensado para que cualquier persona o
asistente (Claude, ChatGPT u otro) pueda continuar el trabajo sin contexto previo.
Actualízalo cada vez que termines una tarea.

> Última actualización: 2026-10-29 — sesión inicial con Claude Code.

## Cómo trabajar en el repositorio

```bash
npm install        # instala dependencias
npm run dev        # servidor local en http://localhost:5173/MiPrimerApp/
npm test           # pruebas unitarias (vitest)
npm run build      # compila a dist/ (TypeScript estricto + Vite)
```

- Lenguaje: TypeScript + React 18, empaquetado con Vite.
- Unidad interna: **milímetros** (número decimal). La interfaz muestra cm o pulgadas.
- Todo el texto de la interfaz está en español.
- Skills de diseño descargadas en `.claude/skills/` (frontend-design y webapp-testing,
  del repositorio público `anthropics/skills`, licencia Apache 2.0).

## Hecho

### Motor geométrico y de patronaje (`src/lib/`)
- `units.ts`: conversión mm ↔ cm/in sin perder precisión, lectura de fracciones ("20 5/8").
- `geom/vec.ts`, `geom/bezier.ts`: vectores, cúbicas de Bézier (longitud por Gauss-Legendre,
  aplanado con tolerancia, parámetro por longitud de arco).
- `geom/pack.ts`: acomodo por estantes sin escalar (para aplicaciones en hojas carta y
  estimación de tela).
- `pattern/types.ts`: modelo de pieza: nodos con id estable, bordes (recta o cúbica) con
  margen y acabado por borde, piquetes, hilo, líneas internas, cantidad de corte, doblez,
  relaciones de costura.
- `pattern/offset.ts`: contorno de corte a partir del de costura. Margen por borde, ingletes
  con límite, esquinas cóncavas recortadas, **esquinas en espejo** en dobladillos y jaretas.
- `pattern/validate.ts`: contornos cerrados, autointersecciones (costura y corte), margen
  uniforme por borde (detecta márgenes duplicados), costura dentro del corte, piquetes,
  correspondencia de costuras (igual / embebido / fruncido / estirado) y medidas terminadas.
- `pattern/engine.ts`: genera piezas, aplica ajustes manuales por id estable, detecta ajustes
  que requieren revisión tras regenerar, estima consumo de tela con supuestos explícitos.
- Generadores paramétricos (`pattern/generators/`):
  - **Pantalón de cintura elástica** (recto, ancho, jogger con puño). Holgura de cadera, tiro
    y pañal; caída de tiro trasero resuelta numéricamente para igualar entrepiernas.
  - **Falda fruncida con elástico** (paneles al doblez).
  - **Bolsa tote** con base en caja, asas y forro opcional.
- `sizes/measurements.ts`: 22 medidas corporales con instrucciones de cómo medir.
- `sizes/tables.ts`: tablas explícitas de referencia propias (infantil por estatura E50–E152,
  mujer por busto M80–M128, hombre por pecho H88–H130). No equivalen a tallas comerciales.
- `tests/pattern.test.ts`: 25 pruebas (medidas, márgenes, costuras, regeneración).

## En curso / pendiente (orden sugerido)

1. Exportación PDF carta 1:1 (`src/lib/pdf/`): mosaico, códigos de hoja, marcas, mapa,
   cuadrado de 5 × 5 cm, barra de 10 cm, aplicaciones acomodadas sin escalar.
2. Persistencia: IndexedDB, guardado automático y manual, versiones, ZIP del proyecto.
3. Interfaz: biblioteca, perfiles de medidas, editor de patronaje, estudio de diseño,
   telas y materiales, proyectos, ayuda.
4. Publicación en GitHub Pages.

Las secciones siguientes se completarán a medida que avance el trabajo.

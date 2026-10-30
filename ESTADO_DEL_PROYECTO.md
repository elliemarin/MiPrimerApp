# Estado del proyecto — Hilvana

Bitácora de traspaso: qué está hecho, qué falta y en qué orden seguir. Si eres
una IA (ChatGPT, Claude u otra), **lee primero `AGENTS.md`** y luego este archivo.
Actualízalo al terminar cada tarea.

- App publicada: https://elliemarin.github.io/MiPrimerApp/ (cambia al nombre del
  repositorio si se renombra; el flujo de despliegue se adapta solo).
- Última actualización: 2026-10-30 (Claude Code).

## Cómo continuar en 5 minutos

```bash
npm install
npm test            # 33 pruebas: geometría, PDF, DST, guardado, ZIP y sincronización
npm run dev         # http://localhost:5173/
npm run build
```
Cada push a `main` ejecuta pruebas, compila y publica en GitHub Pages
(`.github/workflows/deploy.yml`).

## Hecho y verificado

### Núcleo (src/lib)
- Unidades en milímetros; vista en cm o pulgadas sin pérdida (`units.ts`).
- Geometría: vectores, Bézier (longitud por Gauss-Legendre), homografía,
  acomodo por estantes, desplazamiento robusto de polígonos con Clipper.
- Motor de patronaje: piezas con ids estables, márgenes por borde con esquinas
  en espejo en dobladillos y jaretas, validación (contornos, cruces, márgenes,
  costuras, piquetes, medidas terminadas), ajustes manuales por id con revisión
  al regenerar, anidado de tallas y comparación con versiones.
- Generadores implementados: pantalón de cintura elástica (recto, ancho,
  jogger con puño; bebé con pañal), falda fruncida, bolsa tote con base en caja.
- PDF carta 1:1 vectorial: mosaico con márgenes y solapamiento configurables,
  códigos de hoja, rombos de alineación, líneas de recorte, mapa de montaje,
  cuadrado de 5 × 5 cm y barra de 10 cm verificados al milímetro,
  `PrintScaling=None`, JSON de trazabilidad adjunto, plantillas acomodadas sin
  escalar y SVG 1:1.
- Ficha del proyecto en PDF (vistas vectoriales, medidas, materiales con
  supuestos, plano de corte estimado, pasos con casillas, técnicas, avances).
- ZIP completo del proyecto e importación (probado de ida y vuelta).
- Sincronización con repositorio privado de GitHub (probada contra una API
  simulada; **falta probar con una cuenta real** — marcada Experimental).
- DST experimental: puntada recta con verificación de bastidor (prueba de ida
  y vuelta del formato).

### Interfaz (src/features)
- Biblioteca: 44 modelos con filtros (destinatario, prenda, dificultad, talla,
  tejido, elasticidad, ajuste, técnica), dibujos técnicos paramétricos de
  frente, espalda y costados, tablas de tallas explícitas, fotos de referencia
  con permiso de uso, estado honesto (implementado / experimental / pendiente).
- Medidas: perfiles por persona, 22 medidas con guía visual, tablas de
  referencia, versiones con aprobación y bloqueo (editar una versión usada crea
  otra), comparación entre versiones.
- Patronaje: lienzo con reglas físicas, zoom y gestos; herramientas Mover,
  Puntos (nodos y tiradores), Medir, Comparar costuras, Trazar (con modo
  asistido que se ajusta a bordes), Calibrar; paneles de medidas/holguras,
  pieza (márgenes por borde, girar, reflejar, duplicar), revisión, capas de
  referencia y exportación con vista previa de hojas.
- Estudio: plantillas con zonas, fotos calibrables, parches, piezas de patrón;
  formas, 19 figuras orgánicas, lápiz, pincel, línea, pluma, texto, imágenes;
  telas con escala real, rotación y desplazamiento; técnicas y acabados;
  recorte libre, máscaras de zona, capas, grupos, alineación; continuidad entre
  vistas con comprobación de alturas; modos apariencia y técnico; comparación
  con versiones.
- Proyecto: estados (idea → terminado), referencias con corrección de
  perspectiva, análisis de prenda desde fotos (lo visto, lo medido, lo pendiente
  y propuesta de patrón compatible), medidas, telas y materiales, despiece,
  guía verificable con imágenes de piezas, versiones (aprobar, restaurar,
  reemplazar con confirmación), exportaciones con dependencias y avisos de
  desactualización, avances con fotos, duplicar, archivar, eliminar.
- Telas: recorte con perspectiva, ajustes de color sin tocar el original,
  calibración física, hilo y sentido del pelo, datos técnicos; inventario de
  materiales.
- Ajustes: unidades, tema, calibración de escala en pantalla, sincronización,
  privacidad (borrar datos, liberar espacio). Ayuda con estado real de funciones.

## Pendiente (orden sugerido)

1. **Probar la sincronización con una cuenta real de GitHub** (repo privado y
   token de grano fino). Quitar «Experimental» solo después.
2. **Más patrones** siguiendo `AGENTS.md §5`: babero y gorro (fáciles), luego
   bloque de torso y manga para camiseta, sudadera y body de bebé. Cada uno
   entra como `experimental` hasta revisar una muestra impresa.
3. **Bolsillos** como módulo reutilizable (parche, laterales, cargo) para
   pantalones y faldas.
4. **Plano de corte manual**: acomodar piezas sobre el ancho real de la tela
   (hoy se estima por rectángulos).
5. **Exportación de patrón por tallas anidadas** en un solo PDF.
6. **Bordado**: digitalización real (rellenos, satén) requiere un motor
   dedicado; hoy solo hay puntada recta experimental.
7. **3D**: no implementar sin simulación física real.
8. Pulir dibujos técnicos de prendas superiores (mangas) y bolsos.
9. Accesibilidad: pruebas con VoiceOver en iPhone.

## Decisiones tomadas

- Nombre: **Hilvana** (de hilvanar: la puntada provisional con que se prueba
  una prenda). Identidad: papel de tiza, verde de tapete de corte, amarillo de
  cinta métrica para todo lo que es medida, rojo de hilo para errores.
  Tipografías Bodoni Moda (títulos) y Figtree (interfaz).
- Sin servidor propio: datos locales (IndexedDB) + ZIP + repositorio privado de
  GitHub opcional. Así es privado por defecto y gratuito de mantener.
- Hojas carta por defecto: margen 8 mm, solapamiento 12 mm, pie de 13 mm.
- Tablas de tallas propias con códigos que no se confunden con sistemas
  comerciales (E92, M88, H100).

## Límites conocidos

- La vista de apariencia es plana: no simula caída ni ajuste.
- Las plantillas del estudio se escalan de forma aproximada a la persona.
- iOS puede borrar datos de sitios no instalados tras días sin uso: instalar
  en la pantalla de inicio y usar ZIP o sincronización.

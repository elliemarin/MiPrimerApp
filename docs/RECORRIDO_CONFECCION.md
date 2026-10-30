# Del diseño al PDF de confección

Relevo de Codex para Claude y siguientes colaboradores, 2026-10-30. Leer antes
`AGENTS.md` y `ESTADO_DEL_PROYECTO.md`.

## Recorrido de la persona usuaria

1. En Biblioteca elige una base y confirma talla/medidas, tejido y ajuste.
   Nuevo proyecto desde una base paramétrica o intervención también sirve.
2. Personalizar muestra opciones según el objeto y permite buscar/ver todas.
   Añade un bolsillo o complemento, ajusta medidas terminadas, cantidad y
   ubicación. Un cargo añade además fondo del fuelle. Puede conservar la base
   lisa y continuar. La vista permite tocar para colocar o usar coordenadas.
3. Continuar al estudio permite colorear o aplicar fotos de tela a la base,
   cuerpo/solapa del complemento, añadir figuras, dibujar, bordar o cortar
   paneles. Dibujar en estudio activa directamente Lápiz. El grupo completo
   mueve/dimensiona el complemento; sus partes permiten elegir tela/color.
4. Paso PDF o botón PDF del estudio abre la revisión y genera un solo archivo.
   Se puede regresar para corregir cualquier medida y volver a exportar.

Rutas nuevas: `#/personalizar/:projectId` y `#/confeccion/:projectId`.
`ProjectJourney` enlaza los cuatro pasos. Base lleva a las medidas del proyecto;
los ajustes de patrón siguen disponibles en Patronaje. Exportaciones y Resumen
del proyecto también enlazan al paquete PDF.

## Catálogo y motor

- `src/data/components.ts`: 27 presets propios, agrupados y filtrados por la
  familia de `CatalogModel.flat`. Incluye necesidades adicionales explícitas,
  como argolla o protector de tijeras. No se copian patrones comerciales.
- `src/lib/pattern/components.ts`: diez tipos paramétricos. `PatternComponent`
  conserva ID, kind/presetId/name, width/height/quantity, depth/allowance,
  placement, materiales por función y necesidades adicionales. Todo en mm.
- `PatternState.components?` es opcional para compatibilidad. `buildPattern`
  agrega las piezas después de los ajustes de base y antes de dividir paneles.
  Aplica ajustes de nodos/márgenes de los componentes, añade comprobaciones,
  costuras, materiales y guía. Las piezas usan `componente-${id}-${función}`.
- Cantidad se refiere a copias del mismo tamaño. Para posiciones o medidas
  independientes conviene añadir otra opción o duplicar el complemento.
- `placement.x/y` es siempre el centro. `pieceId` permite marcas exactas
  comprobadas dentro de una pieza real; `viewId` es colocación ilustrativa.
  La pantalla actual usa esta última. No confundir ambos espacios.
- Los IDs se mantienen al cambiar dimensiones; ajustes de nodos se revisan
  como los de cualquier patrón. Si un ajuste cambia las dimensiones prometidas
  del complemento, el PDF pide corregirlo, sin anunciar la medida anterior.
- Bolsillos aplicados: no se abre ni transforma la costura lateral de la base.
  Cargo: fuelle rectangular de recorrido `alto + ancho + alto`, márgenes de
  unión por fuera y dobladillos propios en los extremos; solapa de dos caras.
  Cierre: bolsillo independiente con respaldo/vistas, fijación sin cerrar su
  capacidad. Organizador: tres canales iguales marcados con pespuntes.
  Trabilla: tira de tubo con ancho doble y reservas de fijación de 20 mm.

## Vínculo con el estudio

- `features/customize/componentDesign.ts` añade un grupo con partes visibles;
  sus IDs usan `componente-${id}--${parte}` para distinguirlos de los moldes.
  Estas formas no generan un segundo aplique: su molde pertenece al motor.
- `DesignDoc.componentSelections?` guarda definiciones completas por documento
  del historial, incluso al borrar sus elementos. Esto permite Deshacer
  después de que el patrón actual ya haya eliminado el complemento.
- `syncComponentDesign` conserva materiales y elementos ajenos al actualizar
  opciones desde Personalizar. `readComponentsFromDesign/reconcileComponentDesign`
  leen dimensiones/centro del cuerpo y materiales por función; se llaman al
  guardar cambios del estudio y antes de exportar. El inventario permite
  resolver los nombres concretos de las telas.
- `normalizeComponentDesign` reconstruye detalles de la receta al dimensionar
  el conjunto: por ejemplo la altura de solapa tiene límites propios, y no se
  escala sin restricciones como si fuera una imagen. Conserva sus rellenos.
- `componentDesignIssues` rechaza recortes/cambios de forma no soportados,
  partes secundarias desplazadas por separado, componentes ocultos o sin
  definición. No entrega silenciosamente una forma diferente a la vista.
- `ops.ts` duplica hijos de grupos y sus definiciones; eliminar una parte de
  un complemento elimina su receta completa. Inspector diferencia el grupo
  dimensionable de las partes pintables. Los gestos del grupo se normalizan
  una vez al terminar y conservan un solo paso de historial.
- Geometría de vistas de prendas/fotos sigue siendo ilustrativa. Las piezas
  reales y los paneles conservan su propio espacio físico y flujo existente.

## Un archivo PDF

- `lib/pdf/projectPack.ts`: `prepareSewingPack` resuelve la definición actual,
  cortes pendientes del estudio, piezas base/complementos, apliques/refuerzos
  y motivos de bordado por vista. Devuelve bloqueos y avisos para revisar.
- `buildSewingPackPdf` combina PDFs vectoriales mediante `copyPages`, sin
  escalar sus geometrías. Incluye portada/índice con rangos de páginas, ficha,
  patrones y guías por sección, y adjunta `confeccion.json` con inventario,
  medidas, dependencias y rangos. Usa `PrintScaling=None`.
- Modo `complete` requiere base real. Modo `intervention` conserva moldes y
  paneles de los complementos y guías, pero declara la base no incluida.
- `SewingPackSheet` congela las versiones resueltas antes de generar y conserva
  la versión previa del patrón si cambió. Registra `ExportKind='pdf-confeccion'`
  sin sobrescribir ediciones realizadas mientras se genera el archivo.
- `summary.ts` lista todas las piezas con cantidades, medidas terminadas/de
  corte, márgenes por borde, instrucciones, materiales y referencias. Fotos
  y muestras son ilustrativas. `FlowDoc.table` envuelve texto y repite
  encabezados al paginar; ya no recorta instrucciones a una sola línea.
- Bordados: guías vectoriales 1:1 para transferir/digitalizar, sin añadir
  margen de corte ni afirmar que son puntadas. Texto/imagenes/máscaras no
  soportados requieren revisión. Figuras de aplicación sí producen moldes.
- Piezas ocultas/excluidas bloquean un paquete anunciado como completo; hay
  acción explícita para incluir todas. El PDF de patrón individual conserva
  sus controles avanzados y también bloquea errores de panel/componente.

## Verificación repetible

Base previa: 372 pruebas, TypeScript y build verdes. Ejecutar:

```bash
npm test
npm run typecheck
BASE_PATH=/MiPrimerApp/ npm run build
npm run dev -- --host 0.0.0.0
python3 tests/browser/guided_workflow_smoke.py
python3 tests/browser/garment_pattern_smoke.py
python3 tests/browser/panels_smoke.py
```

Los scripts de navegador requieren Python Playwright, Chromium del sistema y
PyMuPDF; usan contextos limpios y el servidor de desarrollo. No ejecutarlos sin
adaptar sus importaciones `/src` contra producción.

Las pruebas nuevas cubren las diez construcciones en diferentes dimensiones,
cantidades, costuras, márgenes, rechazo de valores inválidos, colocación real,
integración con bases/paneles, 27 presets, persistencia del vínculo, materiales,
grupos/duplicación/borrado/Deshacer y paquete PDF completo/intervención/bloqueos.
El navegador recorre creación real, medidas, cargo+cierre+organizador, dibujo,
aplique, color y descarga. PyMuPDF verifica inventario y controles de 50/100 mm
en cada sección 1:1, índice, manifiesto y preferencias de impresión.

Resultado: **450 pruebas en 28 archivos**, TypeScript y build de producción
correctos. En Chromium 390×844 y 1440×1000: nueve plantillas de confección,
un aplique y una guía de bordado producen un PDF de 47 páginas; intervención
sin base con un bolsillo produce siete. Se probó redimensionar, duplicar,
borrar/Deshacer/Rehacer, volver, guardar/recargar y recuperar exclusiones.
La interfaz también se revisó a 320 px sin desbordamiento.

Los textos largos se envuelven con métricas Helvetica reales, incluidos los
nombres de tela. Sus límites girados se incluyen en el acomodo; no se omiten
hojas que contienen solo etiquetas. El pie deja libre la barra de control.
`@pdf-lib/standard-fonts` ya era dependencia transitiva de pdf-lib y ahora se
declara directamente para usar sus métricas. La geometría nunca se escala.

Scripts adicionales: `board_gestures_smoke.py` prueba doble toque corto/cercano,
trazo seguido de clic, arrastre y ciclo de pellizco; `studio_touch.py` conserva
arrastre de tela y escalado real de una figura de 80 a 336 mm. Se corrigió
que el segundo clic rápido tras dibujar pudiera consumirse como doble toque.

## Siguientes pasos y límites

1. Imprimir y coser muestras de bolsillo aplicado, solapa, cierre, cargo y
   trabilla. Verificar giros del fuelle, movilidad, acceso y resistencia con
   el objeto real. No promover de Experimental solo por pasar geometría.
2. Probar el recorrido y gestos en Safari/iPhone físico y VoiceOver.
3. Vincular interactivamente la ubicación a piezas reales con marcas exactas.
   No proyectar automáticamente la ilustración sobre moldes de otra forma.
4. Bolsillos internos/laterales requerirán dividir y cambiar las costuras de
   la base con nuevas comprobaciones; no equivalen al bolsillo aplicado.
5. Admitir canales individuales configurables y complementos asimétricos.
   Hoy los organizadores tienen tres canales iguales y quantity son copias.
6. Diseños libres estructurales todavía necesitan trazado como pieza manual
   o cortes de panel reales. Un dibujo por sí solo no define vistas, forros,
   refuerzos o acabados constructivos.
7. Simplificar códigos visibles del inventario (P1/P2…) manteniendo IDs
   completos en el manifiesto para trazabilidad. Mejorar el acomodo manual de
   corte; el consumo actual es una estimación declarada por rectángulos.
8. Mantener pendientes anteriores: muestra física de prendas, integración de
   patrones externos con licencia y digitalización real de bordados/HD9120.

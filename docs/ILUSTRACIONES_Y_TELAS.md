# Ilustraciones, figurines y telas propias

Relevo de Codex para Claude. Entrega del 30 de octubre de 2026, posterior a la
interfaz simple de Hilvana 0.2. La petición fue mejorar la calidad de las
ilustraciones y reducir las herramientas visibles sin complicar el recorrido.

## Dirección visual

Se conserva la identidad de Hilvana: Bodoni Moda para títulos, Figtree para
controles, papel claro y verde del taller. El dibujo es el protagonista: color
por familia de material, costuras legibles, pespuntes, herrajes y sombreado
discreto. Los dibujos son vectores originales y funcionan sin conexión.

`FlatArtwork` en `src/ui/FlatArt.tsx` comparte el acabado de las prendas entre
catálogo y composición sobre figurín. Sus atributos de trazo están también en
el SVG; descargar una ilustración no debe depender del CSS de la aplicación.
Los cojines respetan las proporciones de su variante y la funda para bebida se
ilustra montada. Estos cambios afectan al dibujo, nunca al patrón de corte.

`FigureArt` en `src/ui/FigureArt.tsx` dibuja las siluetas con curvas, rasgos,
cabello, manos y pies. Conserva cuatro cuerpos, proporciones adultas/infantiles,
ocho tonos iniciales y color personalizado. La geometría y sus referencias
anatómicas viven en `lib/draw/figurine.ts`.

El detalle de prendas ofrece **Prenda / En figurín** y Acabados añade **Ver en
modelo**. `ProjectModelPreview` conserva la elección de cuerpo y piel en
`DesignDoc.figurine`. `modelMaterials.ts` relaciona materiales de piezas físicas
con las superficies del dibujo: diferencia delantero/espalda, manga/capucha,
peto/falda y exterior/asas; los acabados integrados heredan su pieza. Si una pieza
tiene paneles de materiales distintos, no se reduce a un único color inventado.

`garmentComposition.ts` acomoda la ilustración por referencias anatómicas. Une
torso/falda en cintura, lleva tirantes a hombro, reconoce la reducción original
del dibujo infantil y presenta capuchas bajadas y mangas caídas. El dibujo técnico
original sigue intacto. Los monos antiguos sin composición soportada ofrecen la
prenda plana. En el estudio, un bordado o imagen sobre una zona proyectada activa
también la vista plana, conservando sus posiciones originales.

`FigurineSheet` prioriza Vista, Silueta y Piel; Cabello y ajustes de composición
quedan plegados. Mantiene ajustes manuales anteriores. Descarga un SVG autónomo:
incrusta fotografías como `data:image/png` y conserva trazos y degradados.

## Herramientas y fotografías

La barra principal de Estudio tiene cinco controles: **Mover, Dibujar,
Bordados, Telas y Más**. Bordados abre el catálogo a color y las letras.
Más conserva las propiedades, capas, vistas, combinación de tonos y herramientas
de cortes/dibujo para proyectos existentes. Borrar y Deshacer siguen disponibles.

La acción Imagen se retira de esa barra. Las fotografías se agregan en **Telas**:
**Tomar foto** solicita la cámara trasera mediante `capture=environment`;
**Elegir del carrete** admite varias imágenes. El selector se reinicia para
poder elegir otra vez el mismo archivo. Las imágenes insertadas en proyectos
anteriores se conservan.

`lib/fabricOrder.ts` ordena las muestras por fecha de creación descendente,
con desempate estable por ID. Editar una tela antigua no desplaza las nuevas.
Página de Telas y bandeja de Estudio/Acabados usan la misma regla. Tras agregar
fotos se abre Mis telas, sin exigir calibración; las fotos son texturas visuales
hasta calibrar su escala.

El guardado se espera antes de anunciar «guardada». `lib/fabricSave.ts` centraliza
la comprobación; si falla, muestra el estado pendiente y permite reintentar.
Se guardan originales y muestras PNG separadas en IndexedDB, como antes.

## Contratos que se conservan

- El figurín es una composición 2D. No calcula caída, ajuste ni una simulación 3D.
- Las transformaciones de ilustración nunca alteran milímetros, tallas,
  márgenes, posición física de extras o geometría del PDF.
- Los extras y bordados se colocan sobre las piezas reales. Una composición
  de color sobre un figurín no añade una correspondencia de costura inventada.
- Los proyectos, vistas e imágenes anteriores no se borran ni se migran de
  forma destructiva.
- No se añade una API de IA ni se envían fotos de telas a un servicio externo.

## Verificación de esta entrega

`npm test`: **2,272 pruebas, 41 archivos**. TypeScript y
`BASE_PATH=/MiPrimerApp/ npm run build` aprobados. Nuevas pruebas relevantes:
orden estable de muestras tras recarga/edición, separación de colores y fotos
por pieza, acabados integrados, materiales de jumper/bolso, omisión de paneles
mezclados y composición por cintura/hombros sin mutar datos de origen.

`tests/browser/visual_materials_smoke.py` comprueba fotos desde cámara/carrete,
orden y guardado antes de recargar, cinco herramientas sin duplicarse a 950 px,
ausencia de desbordamiento a 320/390/950/1440 px y materiales fotográficos en
Acabados/modelo, con piel/silueta persistidas y patrón intacto. Se actualizaron
las rutas de navegación de `delete_selection_smoke.py`, `fabric_photo_smoke.py`
y `panels_smoke.py`; los tres pasan. Este último comprueba cortes, color por
panel, Deshacer, 22 piezas de chaqueta, bloqueo de patrones obsoletos y controles
de 50/100 mm del PDF.

También pasó `simple_journey_smoke.py` completo: filtros y meses de bebé,
tallas y medidas personalizadas (PDF de 32 páginas), y hoodie con cargo/cámara,
materiales explícitos y abeja/letras en móvil y escritorio (69 páginas, doce
plantillas y controles de 50/100 mm). No cambió la escala del patrón.

No se deben reintroducir controles en la barra para hacer pasar un script antiguo.
Los demás scripts históricos que buscaban Figuras/Cortar paneles directamente
necesitan navegar por Más; no todos se actualizaron en esta entrega.

## Comprobaciones pendientes de dispositivo

Probar en iPhone/Safari físico la cámara, HEIC, permisos del carrete,
VoiceOver y gestos. Chromium puede comprobar la importación y los atributos
del selector, pero no sustituye esta prueba de hardware. Las muestras de costura
de los patrones experimentales siguen pendientes según la bitácora anterior.

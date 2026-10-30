# Estado del proyecto — Hilvana

Bitácora de traspaso: qué está hecho, qué falta y en qué orden seguir. Si eres
una IA (ChatGPT, Claude u otra), **lee primero `AGENTS.md`** y luego este archivo.
Actualízalo al terminar cada tarea.

- App publicada: https://elliemarin.github.io/MiPrimerApp/ (cambia al nombre del
  repositorio si se renombra; el flujo de despliegue se adapta solo).
- Última actualización: 2026-10-30 (Codex, sobre el relevo de Claude).

## Cómo continuar en 5 minutos

```bash
npm install
npm test            # 86 pruebas: geometría, patrones, PDF, DST, guardado, ZIP, materiales y diseño
npm run dev         # http://localhost:5173/
npm run build
```
Cada push a `main` ejecuta pruebas, compila y publica en GitHub Pages
(`.github/workflows/deploy.yml`).

## Relevo de Codex · biblioteca y estudio (2026-10-30)

**Solicitud:** ampliar los recursos del estudio (telas, patrones, accesorios,
figuras de bordado), recomendaciones, categorías y tallas de bebé funcionales,
arrastrar materiales a zonas/recortes, colorimetría, figurines diversos y estudiar
la Singer Smart Heavy Duty HD9120.

### Entregado en este cambio

- **57 modelos** en biblioteca (antes 44); 29 flujos con generador o estudio.
  Se distinguen patrones de confección, diseños editables y mera inspiración.
  No se anuncian como patrones los modelos que carecen de motor.
- **10 generadores** totales: cinco nuevos motores experimentales de funda
  envolvente para bebidas (lata/vaso), cojín de sobre, dona para cabello,
  bandana reversible y textil rectangular de doble cara. Incluyen piezas,
  costuras, medidas terminadas, márgenes, materiales y pasos; los presets
  permiten individuales, posavasos, servilletas, marcapáginas y tapete de máquina.
  Delantal, antifaz y banderín tienen zonas editables en estudio, todavía sin
  patrón de confección. Se conservan todos los generadores previos.
- **54 tipos de tela + 30 materiales**: búsqueda sin acentos, familias,
  composición, rangos de gramaje/elasticidad, caída, aguja, cuidado, usos y
  motivos para evitar una tela. Son referencias editoriales que dependen del
  fabricante, no mediciones del lote ni certificaciones del material.
- Catálogo con colores y seis estampados procedurales originales. Cada muestra
  se puede guardar como PNG local y usar sin conexión. Se marca **ilustrativa,
  sin calibración ni existencias**. El inventario de insumos empieza en cero.
- Sugerencias por modelo/tejido/elasticidad, con explicación; la mezclilla se
  prioriza en pantalones compatibles. En estudio: **Telas → arrastrar al
  lienzo**, o elegir muestra y tocar zona. Funciona sobre piezas de patrón
  agregadas como vista, zonas de prenda y recortes cerrados; respeta bloqueo,
  máscaras y contorno real. Deshacer/rehacer y persistencia conservados.
- **111 figuras vectoriales originales en 11 colecciones**, buscables por
  nombre/sinónimos: hongos, insectos, animales, botánica, mar, cielo, comida,
  costura, celebración, geometría y naturaleza. Son editables con tamaño físico;
  no se presentan como bordados ya digitalizados. Se conservan los IDs previos.
- Gesto opcional del lienzo para editar con dos dedos un elemento seleccionado;
  fuera del elemento continúa el zoom normal. Los tiradores permiten escalar,
  estirar en un eje y girar; dimensiones exactas siguen en Propiedades.
- Máscaras de zona ahora recortan también la **geometría exportada** antes
  de agregar márgenes; antes solo coincidían visualmente en el lienzo.
- Categorías de destinatario efectivas; selección por meses **0–3, 0–6, etc.**
  conservada desde Biblioteca hasta las medidas del proyecto. Son intervalos
  orientativos de una tabla propia, no tallas universales. 0–3 usa B0-3 (620 mm
  de estatura), 0–6 usa B0-6 (680 mm), y se deben verificar medidas reales.
- **Círculo cromático** táctil/teclado, saturación/luminosidad, HEX y armonías
  complementaria, análoga, tríada y monocromática. Muestras del diseño y telas;
  aplicación explícita a selección o a toda la vista. Pantalla orientativa.
- **Figurines:** cuatro cuerpos × adulto/infantil, ocho tonos de piel naturales
  y color personalizado, cabello, colocación/tamaño de la prenda; preferencias
  guardadas en el diseño y SVG portátil con texturas incrustadas. Es una
  ilustración de composición plana, no prueba de ajuste ni simulación 3D.
- **HD9120:** bastidor 170 × 100 mm y guía CREATIVATE. Exportación de bordado
  por vista y posiciones relativas conservadas (se corrigió que varios motivos
  se centraban uno sobre otro). SVG vectorial y DST de puntada recta siguen
  siendo funciones diferentes; DST **experimental**, compatibilidad física con
  esta máquina todavía no comprobada. Se bloquea SVG/DST en vistas que incluyen
  textos, imágenes, parches o máscaras todavía no soportados por ese exportador
  de contornos, para no entregar cajas o trazados sin recortar como si fueran
  el bordado final.
- Investigación de fuentes y plan concreto para FreeSewing en
  [docs/FUENTES_Y_MAQUINA.md](docs/FUENTES_Y_MAQUINA.md). No hay una API externa
  integrada aún ni se han copiado catálogos comerciales. La opción recomendada
  es adaptar paquetes paramétricos locales, no importar miles de PDFs como si
  fueran geometría editable.

### Verificación

- Antes de editar: **40/40 pruebas y compilación** correctas.
- Después: **86/86 pruebas**, TypeScript y compilación de producción correctos.
- Chromium en **390 × 844**: categorías Mujer/Bebé; 0–3 y 0–6 llegan al
  patrón y se guardan; búsqueda/personalización de telas y PNG persistente;
  inventario; círculo táctil; figurín con texturas y exportación SVG sin enlaces
  blob; sin errores del navegador ni desbordamiento horizontal.
- Navegador escritorio: arrastre HTML de tela a pierna, deshacer/rehacer,
  insertar figura buscada, recargar y conservar el diseño.
- Gestos táctiles mediante CDP: arrastre de tela confirmado; el lienzo Board
  probado con captura de pellizco, fin único y zoom alternativo. En el estudio
  integrado, una estrella pasó de 80 a 336 mm con dos dedos; se corrigió que
  los avisos flotantes interceptaran los toques. Scripts repetibles en
  `tests/browser/studio_smoke.py` y `studio_touch.py` (servidor dev + Playwright).
- Navegador: descarga real DST del frente y bloqueo al elegir una espalda
  mayor al bastidor; `tests/browser/embroidery_smoke.py`.
- Pruebas numéricas nuevas: geometría de accesorios, talla/categoría,
  recomendaciones, límites de los 111 contornos, máscaras con giro/espejo/
  recorte, composición y aislamiento de vistas DST, colorimetría y figurines.

### Permisos corregidos y publicación

La primera entrega quedó bloqueada por 403 en push, API y fork. Tras el ajuste
hecho por la persona usuaria, la comprobación `git push --dry-run origin
HEAD:main` pasó y el remoto seguía en el commit base `6a5dcab`, sin avances
intermedios que integrar. Se sube el cambio de biblioteca/estudio junto con este
relevo actualizado. Consultar Actions para el resultado final de la publicación;
no confundir subida del código con despliegue terminado.

El respaldo local anterior sigue disponible, pero su nota de bloqueo describe
el intento inicial; esta bitácora del repositorio es el estado más reciente.

### Siguiente trabajo recomendado para Claude

1. Comprobar Actions/Pages tras la subida y revisar la app publicada. Conservar
   esta bitácora y los cambios posteriores de otras personas.
2. Probar Safari y VoiceOver en un iPhone físico: arrastre, pellizco, gestos
   cerca de los tiradores y zonas pequeñas. Chromium móvil no sustituye iOS.
3. Imprimir a 100 % y coser muestras de los nuevos accesorios (además de
   babero/gorro previos) antes de promoverlos de Experimental.
4. Probar CREATIVATE → Device con un motivo pequeño, confirmar formatos con
   Singer y bordar en retazo. El manual no enumera extensiones. No prometer
   conexión directa, DST/XXX/VP3 universal ni rellenos/satén automáticos.
5. Prototipo FreeSewing: un diseño con licencia/versión registradas, adaptador
   de piezas y pruebas de costuras/holgura/mm; después torso+manga, camiseta,
   sudadera y body. Véase la investigación. No confundir escala visual con
   graduación paramétrica.
6. Biblioteca más amplia de accesorios con patrón real: estuche de laptop,
   funda de libro, neceser, organizador y cesta con base. Mantener estados
   honestos y medidas del objeto, sin tablas corporales ficticias.
7. Mejorar ajuste inicial de la prenda en figurín por familia/vista y permitir
   combinar superior e inferior; hoy es la vista elegida con posición manual.
8. Editar recomendaciones y gramajes con fichas de fabricantes concretos;
   permitir vincular un tipo de catálogo con una tela física del inventario.
9. Quedan las tareas anteriores de sincronización real, bolsillos, acomodo
   manual de corte, PDF de tallas anidadas y digitalización profesional.

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
- Generadores experimentales (falta revisar una muestra impresa): babero con
  broche (escote verificado sobre la geometría) y gorro de punto.
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
- Biblioteca: 57 modelos con filtros (destinatario, prenda, dificultad, talla,
  tejido, elasticidad, ajuste, técnica), dibujos técnicos paramétricos de
  frente, espalda y costados, tablas de tallas explícitas, fotos de referencia
  con permiso de uso, estado honesto (implementado / experimental / pendiente).
- Medidas: perfiles por persona, 22 medidas con guía visual, tablas de
  referencia, versiones con aprobación y bloqueo (editar una versión usada crea
  otra), comparación entre versiones.
- Patronaje: lienzo con reglas físicas, zoom y gestos; herramientas Mover,
  Puntos (nodos y tiradores), Medir, Comparar costuras, Trazar (con modo
  asistido que se ajusta a bordes), Calibrar; paneles de medidas/holguras,
  pieza (márgenes por borde, girar, reflejar, duplicar), revisión (con
  «desenrollar costura»: ambos lados en línea con piquetes y reparto del
  embebido), capas de referencia, anidado de tallas y exportación con vista
  previa de hojas. Coordenadas físicas del cursor.
- Estudio: plantillas con zonas, fotos calibrables, parches, piezas de patrón;
  formas, 111 figuras vectoriales, lápiz, pincel, línea, pluma, texto, imágenes;
  telas con escala real, rotación y desplazamiento; técnicas y acabados;
  recorte libre (polígono o curva), máscaras de zona, capas, grupos,
  alineación, guías con imán; continuidad entre
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
2. **Imprimir y coser muestras** del babero y el gorro; si están bien, pasarlos
   a `implementado` en `src/data/catalog.ts`.
3. **Más patrones** siguiendo `AGENTS.md §5`: bloque de torso y manga para
   camiseta, sudadera y body de bebé. Cada uno entra como `experimental`.
4. **Bolsillos** como módulo reutilizable (parche, laterales, cargo) para
   pantalones y faldas.
5. **Plano de corte manual**: acomodar piezas sobre el ancho real de la tela
   (hoy se estima por rectángulos).
6. **Exportación de patrón por tallas anidadas** en un solo PDF.
7. **Bordado**: digitalización real (rellenos, satén) requiere un motor
   dedicado; hoy solo hay puntada recta experimental.
8. **3D**: no implementar sin simulación física real.
9. Pulir dibujos técnicos de abrigos (solapas) y vestidos.
10. Accesibilidad: pruebas con VoiceOver en iPhone.

## Tareas para la persona dueña del repositorio

- **Renombrar el repositorio** a `hilvana` (Settings → General → Repository
  name). El flujo de despliegue usa el nombre del repo automáticamente; después
  de renombrar, la app quedará en `https://elliemarin.github.io/hilvana/` (si no
  se actualiza sola, ejecuta Actions → «Publicar en GitHub Pages» → Run workflow).
  Actualiza también el remoto local: `git remote set-url origin https://github.com/elliemarin/hilvana`.
- **Permisos de colaboradores**: en un repositorio de cuenta personal, GitHub
  solo ofrece permiso de escritura a colaboradores. Para dar «admin» a otra
  persona hay que transferir el repositorio a una organización.

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

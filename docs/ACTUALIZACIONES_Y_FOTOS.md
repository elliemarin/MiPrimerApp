# Entrega de fotografías y versiones — 2 de noviembre de 2026

## Qué se encontró

Las capturas de iPhone mostraban cinco prendas dibujadas junto a un chaleco con
foto y el antiguo esquema «Tu prenda / La transformación». En una sesión nueva
de la web pública (`7703fac`, bundle `index-Caxp2Zvz.js`) las seis prendas ya
tenían fotografía y los paneles vaqueros mostraban sus dos fotografías IA.
El componente `TransformationDiagram` había sido eliminado en `a36ba35`.

La reproducción con dos publicaciones encontró un problema de entrega:
la app registraba el worker una vez, pero no comprobaba nuevas versiones al
volver de otra aplicación. Además, el aviso de actualización estaba dentro del
scroll: desaparecía al bajar y quedaba detrás del fondo del diálogo de prenda.

Por separado, el nuevo lote de Claude sí añadió dibujos: `lote-adultos-01` y
variantes que reutilizaban una foto de otro acabado. Se completaron sus quince
recetas con imágenes propias y dos imágenes infantiles sin cordones.

## Inventario de fotografías

- 2,074 recetas y 318 diseños: 257 con patrón, 56 de inspiración y cinco de
  estudio. Se preservan todos sus ids, tallas, medidas y estados.
- 345 celdas activas en 41 láminas locales; cero fuentes vectoriales activas,
  cero archivos ausentes y 8,304 selecciones de receta/destinatario auditadas.
- Dos atlas nuevos, 218,168 bytes. Procedencia y revisión:
  [`IMAGENES_ADULTOS_NUEVOS_A.md`](IMAGENES_ADULTOS_NUEVOS_A.md) y
  [`IMAGENES_ADULTOS_NUEVOS_B.md`](IMAGENES_ADULTOS_NUEVOS_B.md).
- `catalogImageFor` prioriza la foto infantil y la receta sobre el grupo.
  Así, culotte de encaje y picot, cuello camisero y Mao, cintura elástica y
  bragueta conservan fotografías diferentes aunque compartan tarjeta.
- Se retiró la excepción `PENDING_PHOTO_SHEETS`. Un dibujo no se convierte
  en foto cambiando su leyenda: la prueba rechaza las fuentes vectoriales.

La auditoría se regenera con `node scripts/audit-catalog-photos.mjs`; el resultado
queda versionado en [`auditoria/fotos-catalogo.csv`](auditoria/fotos-catalogo.csv).
Las imágenes ilustran el aspecto del producto; las coordenadas, costuras y
medidas siguen dependiendo de la geometría del patrón.

## Dispositivos que siguen ejecutando una versión antigua

Un cambio en GitHub no modifica el JavaScript que ya está ejecutándose en un
iPhone. Para recibir esta corrección desde una versión anterior:

1. Terminar o cancelar el formulario abierto y volver al inicio del catálogo.
2. Volver a la parte superior y pulsar **Guardar y actualizar** si aparece.
3. Si no aparece, cerrar todas las ventanas de Hilvana (incluida la aplicación
   instalada) y abrirla de nuevo con conexión. La última ventana antigua debe
   cerrarse para permitir la activación normal de un worker en espera.

No hace falta borrar los datos del sitio ni reinstalar: los proyectos y telas
personales están en IndexedDB. La corrección de detección se aplica después
de cargar la versión nueva; no puede cambiar retroactivamente una sesión vieja.

## Cómo se entrega la siguiente versión

`appUpdates.ts` mantiene un único registro nativo del service worker. Comprueba
la espera existente y busca de nuevo al volver a la app, recuperar conexión y
cada cinco minutos en primer plano. Los eventos próximos se agrupan dentro de
30 segundos; la búsqueda manual de Ajustes evita esa espera. Buscar y descargar
no activan la versión ni recargan el trabajo abierto.

El aviso vive en un portal fijo por encima de las hojas. Su altura medida deja
libres el cierre y el botón inferior del diálogo, incluso en móvil y tema
oscuro. Ajustes muestra el hash y la fecha del commit para poder identificar
la publicación que realmente se está ejecutando.

«Guardar y actualizar» bloquea brevemente la edición, guarda antes de activar
y vuelve a guardar antes de recargar. Si falla, devuelve los controles y
muestra el motivo. Los formularios que todavía requieren confirmación deben
terminarse o cancelarse antes, como indica el aviso. La app no los confirma
automáticamente ni borra su base de datos.

Si otra ventana acepta una versión, la ventana actual ofrece guardar y recargar
en vez de hacerlo sin permiso. No hay coordinación de aprobación entre ventanas:
al activar la otra, los módulos antiguos pueden dejar de estar disponibles y
requerir esa recarga. El flujo con una sola ventana conserva sus módulos mientras
la nueva versión espera. Este límite queda separado de la corrección de detección.

La regresión `tests/browser/update_delivery_smoke.py` sirve dos publicaciones
sucesivas desde un directorio temporal: todos los chunks y una foto cambian en
la segunda. Usa eventos normales de vuelta a la app, sin forzar
`registration.update()` desde la prueba. Comprueba alcance del botón bajo scroll
y diálogo, fallo de guardado, persistencia de proyecto/borrador y foto nueva
sin conexión. El catálogo completo se comprueba con
`tests/browser/catalog_photo_completeness_smoke.py` en desarrollo y producción.

**Resultado verificado:** 3,754 pruebas en 83 archivos y build de Pages verdes.
La prueba de dos publicaciones pasa sin errores de página: incluye instalación
limpia sin aviso falso, tres pantallas diferidas de la versión anterior, fallo
de guardado recuperable, recarga aceptada y conservación de datos/foto nueva
en una página abierta sin red. Evidencia local: `/tmp/hilvana-update-delivery/`.
El catálogo pasa con 257 tarjetas, 77 de bebé, 141 fichas fotográficas, 18
galerías y seis selectores de variante; las 41 láminas se sirven sin conexión.

## Revisión para el siguiente agente

- Al añadir recetas, comprobar también las variantes y cada destinatario,
  además de la portada del grupo. Revisar el recorte en tamaño de tarjeta.
- No reintroducir excepciones vectoriales para superar las pruebas de fotos.
- Mantener la activación del worker ligada a una acción explícita y guardado
  correcto. Nunca resolver una caché vieja borrando los proyectos del navegador.
- Probar dos publicaciones sucesivas: una recarga limpia no reproduce el
  problema de una app que lleva abierta desde la versión anterior.
- La muestra física de los patrones nuevos continúa pendiente; una foto IA
  atractiva no certifica ajuste ni construcción.

# Fotografías ilustrativas para todo el catálogo — 2026-11-01

La ampliación anterior agregó 90 fotos de estilos nuevos, pero dejó 46 diseños
editables antiguos con ilustraciones vectoriales y variantes sin sustituir. Se
auditó el catálogo completo, incluidas las referencias de inspiración y las
recetas que se muestran después de elegir una variante.

## Cobertura

Se generaron 123 imágenes originales mediante `image_gen`, con el mismo fondo
marfil, luz suave, textura textil y prenda completa de las fotografías existentes:

- 19 prendas y variantes adultas: pantalones, faldas, camisetas, sobrecamisas,
  bomber, chaqueta de trabajo y sombrero.
- 38 diseños y variantes infantiles: vestidos, conjuntos, blusas, pantalones,
  peleles, petos, sombreros, bonetes, patucos, baberos y accesorios.
- 66 referencias de inspiración que antes no tenían imagen propia.

Las 246 tarjetas con patrón disponible y las 66 referencias sin patrón tienen
imagen de IA. Estas últimas son 61 inspiraciones y cinco referencias solo para
el estudio. Las 2,059 recetas conservan sus IDs, tallas y disponibilidad; no se
incorporan referencias sin patrón como patrones listos a la biblioteca simple.
Generar una imagen no equivale a construir o probar un
patrón. Las vistas de colocación del estudio siguen usando geometría editable.

## Integración y mantenimiento

`catalogImages.ts` traduce cada fuente vectorial antigua (`lámina/celda`) a su
foto nueva. Así también se resuelven las variantes de manga larga, bomber y
sobrecamisa corta, pantalones de bebé y otras recetas con fuente propia. Cambiar
solo la imagen del grupo dejaba esas variantes mostrando dibujos.

El sombrero de bebé tiene una foto específica con lengüeta de broche, separada
del sombrero adulto y del de lazo. Los aliases antiguos de vestido trapecio y
cubrepañal apuntan a las mismas fotos que sus recetas vigentes. Las 90 imágenes
de estilos de la entrega anterior mantienen su prioridad.

Los registros y la procedencia detallada se dividen en cuatro lotes:

| Registro | Imágenes | Documentación |
| --- | ---: | --- |
| `src/data/completedAdultImages.ts` | 19 | [Tendencias](IMAGENES_TENDENCIAS_COMPLETADAS.md) |
| `src/data/completedInfantImages.ts` | 38 | [Infantil](IMAGENES_INFANTILES_COMPLETADAS.md) |
| `src/data/inspirationAImages.ts` | 33 | [Inspiraciones A](IMAGENES_INSPIRACION_A.md) |
| `src/data/inspirationBImages.ts` | 33 | [Inspiraciones B](IMAGENES_INSPIRACION_B.md) |

Son 16 láminas WebP locales de 1254 × 1254 px. Los recortes se revisaron por
celda para no perder bajos, mangas, tirantes o alas de sombrero. Se precargan
con la PWA y no requieren una API para mostrarse. Las láminas vectoriales
históricas permanecen en el repositorio para compatibilidad con los scripts
antiguos; el resolvedor del catálogo ya no las devuelve.

Las nuevas láminas suman 1,702,020 bytes. El catálogo completo en disco ocupa
4,643,880 bytes; el presupuesto de regresión es de 5 MB y 250 KB por lámina.
Se usan 39 láminas y 328 celdas distintas al resolver todas las recetas y sus
destinatarios; diez láminas históricas permanecen sin uso en el catálogo activo.

Para auditar futuras incorporaciones:

```bash
node scripts/audit-catalog-photos.mjs
npx vitest run tests/catalog-images.test.ts tests/catalog-photo-completeness.test.ts
```

El CSV generado en `docs/auditoria/fotos-catalogo.csv` permite localizar por
receta la imagen, su recorte y los cambios por destinatario. Las pruebas revisan
también los archivos reales, las variantes y el componente que presenta la
tarjeta; cambiar solamente el texto de la leyenda no satisface la cobertura.

`tests/browser/catalog_photo_completeness_smoke.py` comprueba las tarjetas
visibles, decodifica las imágenes y guarda capturas de los recortes en móvil.
Admite desarrollo y compilación/publicación, sin depender de módulos `/src`
para la segunda comprobación.

Validación de esta entrega: 3,689 pruebas en 80 archivos y build de Pages
correctos. Chromium móvil verificó las 246 tarjetas, el filtro de 77 diseños
para bebé, 123 detalles nuevos, 16 galerías y dos selectores de variantes.
Se repitió sobre el build y se desconectó la red en una página nueva: las 16
láminas nuevas se obtuvieron y decodificaron desde el service worker. No hubo
errores de navegador ni imágenes ausentes.

## Límites y siguiente paso

Las imágenes son ilustraciones generadas con IA, no fotos de muestras cosidas.
Los colores, tejidos y caída son orientativos; las dimensiones y la exportación
proceden del motor de patronaje. No se modificó la clasificación de patrones
experimentales ni se certificó ninguna muestra física en esta tarea.

Al agregar otro diseño o variante, generar su fotografía, registrarla y revisar
su recorte en móvil en la misma entrega; no dejar el dibujo técnico como portada
permanente. Para variantes con construcción distinta, resolver por receta, no
solo por grupo. La confección de muestras continúa pendiente según el relevo
de estilos y transformaciones.

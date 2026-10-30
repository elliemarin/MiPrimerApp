# Biblioteca: categorías visibles y filtros estrictos

Actualización: 2026-10-30.

La biblioteca tiene dos secciones excluyentes: **Patrones editables** y
**Gratis de internet**. La búsqueda de prendas nativas nunca monta tarjetas de
fuentes externas debajo de los resultados. Cada sección conserva su propio
buscador y filtros al alternar o recargar.

## Recorrido de patrones editables

- **Bebé** aparece como segundo acceso rápido, visible en una pantalla de 320 px.
  Abre todas las construcciones compatibles y limpia la búsqueda/filtros previos
  para que un filtro adulto no oculte la sección. Actualmente son seis diseños
  agrupados: pantalón recto, jogger, short, pantalón de pijama, babero y gorro.
- Al elegir bebé, **Talla por meses** aparece sobre los resultados. Su código
  se transmite en cada enlace `?para=bebe&talla=B0-6` y llega a la hoja de
  medidas antes de intervenir. La selección de edad no convierte un modelo
  adulto en un patrón infantil ni cambia las reglas del motor. Los baberos y
  gorros también aparecen al combinar Bebé con Accesorios; la edad ya no es una
  categoría de objeto que los esconda de ese filtro.
- **Hoodies** es un acceso a la familia precisa `hoodie`; **Abrigo** es una
  categoría general que contiene chaquetas, sudaderas, chalecos, capas, etc.
  Sus nombres e indicadores permiten distinguir los dos alcances.
- El panel **Filtros** ofrece persona, categoría, tipo exacto, tela y ajuste.
  **Más filtros** añade dificultad, elasticidad, técnica y colección.
- Los filtros activos aparecen como botones debajo de los accesos rápidos.
  Cada uno se puede quitar; la búsqueda también muestra su propio botón.
  **Todo**, **Quitar filtros** y **Restablecer filtros** restablecen la búsqueda
  y los filtros nativos, incluida la colección.
- Cambiar categoría borra el tipo exacto y la colección anteriores. Cambiar
  tipo exacto borra la colección. Cambiar persona/tela/ajuste no borra filtros
  visibles; una combinación incompatible informa que no tiene resultados.
- Todos los filtros se aplican a las recetas **antes de agrupar**. El dibujo,
  enlace y medidas iniciales proceden de una receta que cumple la selección.
- Los resultados muestran el tipo exacto bajo el nombre y cuentan diseños,
  no las distintas medidas de un mismo diseño.

La definición y la auditoría exhaustiva de etiquetas pertenecen a
`src/data/catalogTaxonomy.ts` y `docs/AUDITORIA_CATALOGO.md`.

## Memoria y accesibilidad

`LibraryPage` valida el estado nativo persistido con `sanitizeFilters`; descarta
colecciones y tallas de bebé desconocidas. Conserva los nombres anteriores de
almacenamiento de filtros, colección y meses. La pestaña usa la nueva clave
`hilvana-library-mode` con valores `editables` o `internet`.

Los modos y accesos rápidos exponen `aria-pressed`; los filtros activos tienen
nombres «Quitar filtro …». El enlace del final hacia patrones de internet cambia
de sección y lleva el foco al título `free-patterns-title`, respetando la
preferencia de movimiento reducido. En 320 px, el botón Filtros reduce su texto
visual para dar más espacio al buscador, pero conserva el nombre accesible y
el indicador de cantidad.

## Verificación

`tests/browser/catalog_filter_audit_smoke.py` recorre la interfaz en 320, 390 y
1440 px: hoodie/hoddies, ausencia de fuentes externas mezcladas, entrada bebé,
meses hasta la hoja de intervención, cero resultados, filtros activos,
combinaciones y recarga, memoria independiente de secciones y ausencia de
desbordamiento. Recorre también las **43 familias con patrón** seleccionando
cada una por UI y contrastando todos sus representantes y sus cuentas agrupadas
con el catálogo real. Incluye búsquedas de servilleta, banda y monedero para
impedir que un término preciso vuelva a incluir todos los artículos de una
familia más amplia. No crea proyectos para esta auditoría.

`grouped_catalog_smoke.py` conserva las regresiones de selección de medidas y
creación; `costume_sources_smoke.py` consulta ahora la biblioteca gratuita
separada y el filtro de ficha con muestra confeccionada.

La sección de internet usa un único título, sin repetir el encabezado nativo.
El primer resultado queda visible al abrirla en móvil; sus filtros secundarios
se conservan en «Más filtros» y mantienen su indicador de cantidad.

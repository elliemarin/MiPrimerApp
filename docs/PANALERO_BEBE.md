# Pañalero de bebé: construcción y verificación

El diseño agrupado `body-bebe` vuelve a la biblioteca con un motor real:
`body-bebe-broches`. La manga corta y la larga son opciones del mismo diseño,
conservando el enlace anterior. No se ha generado el mameluco con piernas:
requiere otra construcción y sigue sin motor propio.

## Qué se puede confeccionar

Body de punto, hombro caído, apertura frontal completa y dos broches en la
entrepierna. La apertura frontal facilita vestir sin tener que pasar la cabeza
por un escote cerrado. No tiene cuello sobrepuesto. Todas las piezas se calculan
en milímetros desde medidas infantiles; no se escala un patrón de adulto.

Se ofrecen las referencias de la tabla `ref-bebe-meses`: recién nacido, 0–3,
0–6, 3–6, 6–9, 9–12, 12–18 y 18–24 meses. Son referencias propias; hay que
comparar pecho, cadera sobre pañal y largo con las medidas reales. El mismo motor
acepta medidas personalizadas dentro de los límites de su bloque infantil.

Hay **9 plantillas y 17 piezas físicas**:

| ID | Corte | Función |
| --- | --- | --- |
| `delantero` | 2 en espejo | Medios delanteros con tapeta integrada |
| `espalda` | 1 completa | Espalda y lengüeta de entrepierna |
| `manga` | 2 en espejo | Corta o larga |
| `ribete-cuello-delantero` | 2 | Escotes delanteros con tapetas ya dobladas |
| `ribete-cuello-espalda` | 1 | Escote trasero |
| `ribete-inferior-delantero` | 2 | Pierna y entrepierna de cada delantero |
| `ribete-inferior-espalda` | 1 | Piernas y entrepierna de espalda |
| `refuerzo-tapeta` | 2 en entretela | Anclaje de los broches frontales |
| `refuerzo-entrepierna` | 4 en entretela | Anclaje de los dos juegos de broches |

La manga se corta completa, sin doblez; su borde de unión tiene dos mitades
iguales a la sisa delantera y trasera. El patrón exige punto con un mínimo de
20 % de elasticidad horizontal y buena recuperación. No admite tejido plano.

## Medidas y cierres

- Contorno terminado: `máximo(pecho, cadera sobre pañal) + holgura`, una sola
  vez. La holgura inicial es 30 mm. Cada medio delantero mide un cuarto del
  contorno; la espalda mide la mitad.
- Largo inicial: `talle de espalda + tiro + 30 mm`. El parámetro **Largo
  hombro–entrepierna** debe comprobarse con la persona o un body que ajuste.
  Esta suma orientativa no sustituye una medición ni valida el ajuste.
- El centro delantero es `x = 0`. La tapeta llega a `x = −36 mm`; se dobla en
  `x = −12 mm`, ocultando 24 mm de vista. La vista doblada llega a `x = 12 mm`.
  Al superponer ambos centros se obtiene un traslape de 24 mm sin aumentar el
  contorno corporal. Los broches frontales van sobre el centro marcado.
- La espalda añade un solape de entrepierna de 22 mm por defecto. Las marcas
  delantera y trasera coinciden al superponerlo; no se cuenta dos veces en el
  largo terminado. Hay dos juegos de broches en entrepierna.
- El número de broches frontales y la longitud de las seis tiras de ribete
  salen de la geometría elegida. La lista de materiales incluye esas cantidades.
- Cada tira de ribete mide cuatro veces su ancho visible. Su longitud inicial
  es el 95 % del canto terminado que bordea. Hay que probar esa proporción en
  un retazo: la recuperación cambia entre tejidos.
- El cuello, las piernas y los cantos de tapeta no reciben margen extra. Solo
  las costuras de unión, extremos de ribete y dobladillos de manga lo reciben.
  Los refuerzos se cortan a su dimensión exacta.

El PDF incluye marcas de broches, dobleces, pespuntes, hilo, cantidades de corte,
costuras relacionadas y siete pasos que mencionan las piezas reales. Los
broches requieren refuerzo, herramienta adecuada y comprobación del anclaje;
las instrucciones evitan cordones y botones sueltos para esta construcción.

## Ilustración y edición

`babyBodysuitFlat.ts` deriva la ilustración de frente/espalda del motor en la
referencia 0–3 meses. Muestra los broches delanteros y la manga correspondiente.
Oculta el sobrante de entrepierna cuando está cerrado. El motor conserva las
coordenadas físicas originales para el patrón y los extras.

Los dibujos de bebé ya tienen proporciones infantiles. `templateScaleFor`
usa las referencias pecho 450 mm y estatura 620 mm en esta familia, evitando la
reducción doble que antes aplicaban las referencias adultas 920/1680.

## Estado y siguiente verificación

**Experimental.** Las pruebas de geometría comprueban las ocho referencias de
meses con ambas mangas, contornos, solapes, marcas, correspondencia de costuras,
márgenes, ribetes y ausencia de contornos inválidos. También se comprueban
rechazos por tejido o medidas incompatibles e ilustración infantil.

Eso no equivale a una prueba física. Falta imprimir y comprobar el control
de escala, coser muestras al menos de RN, 0–3 y 18–24 meses, verificar largo
con pañal, movilidad, recuperación del ribete, comodidad del escote y anclaje
de los cierres. Registrar tejido, elasticidad, medidas usadas, ajustes y fotos
antes de considerar un patrón probado. No marcar «100 % probado» solo porque
las longitudes digitales coincidan.

### Verificación de navegador realizada

El recorrido `tests/browser/baby_bodysuit_smoke.py` pasó en Chromium con vistas
de 390 y 1440 px: una tarjeta al buscar «pañalero» dentro de Bebé, meses 0–3 y
0–6, ambas mangas, ocho creaciones en total y navegación a Intervenir sin
recargar el documento. Se comprobaron frente/espalda, superficies físicas,
elección de tela/color y llegada a la descarga del PDF sin errores de página.

Los dos PDF descargados contenían 19 páginas, las nueve plantillas y su
manifiesto completo. PyMuPDF confirmó los controles vectoriales de 50 y 100 mm
y la preferencia de imprimir sin escala. Esto verifica el archivo digital,
no una impresión en papel ni una muestra cosida. La inspección visual también
motivó corregir los recortes de pierna: deben ser cóncavos y dejar una lengüeta
de entrepierna, no un fondo convexo; hay una prueba específica para conservar
esa forma.

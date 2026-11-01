# Vestidos adultos por estilo

Ampliación de Codex del 1 de noviembre de 2026. El catálogo anterior tenía
inspiraciones adultas, pero ningún vestido adulto con patrón editable. Se
añaden **27 construcciones**; las tallas, largos personalizados y colores no
se cuentan como diseños nuevos.

## Archivos y contrato

- `src/data/dressStyleCatalog.ts`: recetas, etiquetas, familias y grupos.
- `src/lib/pattern/generators/dressStyles.ts`: motor
  `vestido-estilos-adulto`; `estilo` selecciona la construcción.
- `src/data/dressStyleFlats.ts`: frente y espalda desde las piezas reales,
  con vínculos explícitos a cada mitad y cada nivel de falda.
- `tests/dress-styles.test.ts`: 32 pruebas; barre las 11 tallas de mujer de la
  app para los 27 estilos, verifica costuras, cortes, márgenes, largo físico,
  contorno, instrucciones, tapetas, pliegues y vínculos de las vistas.

Las imágenes de catálogo se generan aparte con IA. Son referencias visuales;
no suministran medidas ni geometría al motor.

## Construcciones

Los IDs de modelo y grupo tienen prefijo `vestido-adulto-`:

| ID de estilo | Construcción |
| --- | --- |
| `trapecio-redondo` | Línea A sin mangas, cuello redondo |
| `trapecio-pico` | Evasé de escote V |
| `recto-barco` | Recto con cuello barco |
| `tunica-kimono` | Túnica con manga integrada |
| `caftan` | Caftán amplio de cuello redondo |
| `trapecio-mariposa` | Trapecio con volantes de manga |
| `imperio` | Corte alto y falda fruncida |
| `imperio-mariposa` | Imperio con volantes de manga |
| `cintura-fruncida` | Sin mangas, corte de cintura y falda fruncida |
| `cintura-manga` | Manga corta montada y falda fruncida |
| `talle-bajo` | Cuerpo hasta cadera y paño fruncido |
| `dos-pisos` | Sin mangas y dos pisos fruncidos |
| `tres-pisos` | Manga corta y tres pisos fruncidos |
| `imperio-boho` | Escote V, corte imperio y dos pisos |
| `camisero-recto` | Abotonado completo, manga corta, cuello redondo |
| `camisero-fruncido` | Abotonado completo y falda fruncida |
| `camisero-trapecio` | Abotonado completo en línea A y escote V |
| `paneles-horizontal` | Tres paños lisos en línea A, sin frunce |
| `canesu-fruncido` | Canesú alto y paño inferior fruncido |
| `tirante-ancho-trapecio` | Escote cuadrado, tirante integrado y línea A |
| `tirante-ancho-fruncido` | Escote cuadrado y falda fruncida |
| `tirante-ancho-escalonado` | Tirantes integrados y tres pisos |
| `pichi-cuadrado` | Escote cuadrado con hombros anchos de 8 cm |
| `volanton` | Cuerpo recto y volante inferior |
| `kimono-volante` | Manga integrada y volante inferior |
| `caftan-pico` | Caftán amplio con escote V |
| `manga-campana` | Manga campana montada y falda fruncida |

## Reglas físicas

- Son bloques **holgados sin pinzas de busto**. El contorno toma el mayor
  entre busto, cintura y cadera y suma la holgura una sola vez.
- El largo solicitado incluye cuerpo y todos los niveles inferiores; se
  comprueba con los nodos y las alturas de las piezas, sin contar márgenes.
- La sisa de manga montada es recta y de hombro caído. El contorno opcional
  de brazo aumenta su profundidad si necesita espacio adicional.
- Cada frunce se verifica como relación de longitudes; cada unión de paneles
  lisos se verifica como igualdad. La altura de cada paño debe ser de al menos
  9 cm; no se alarga el vestido silenciosamente para acomodarlo.
- Los frentes abotonados tienen 3 cm de cruce total y 6 cm fuera del borde
  terminado para una doble vuelta de 3 cm. Los 15 mm de cada mitad del cruce
  se unen sin fruncir entre niveles.
- Los volantes de manga delanteros y traseros son piezas diferentes, dos
  copias de cada uno. Esto permite materiales y bordados independientes en
  frente y espalda sin usar dos veces la misma superficie física.
- Las piezas al doblez se representan como dos mitades distintas en el
  estudio. Un bordado en una mitad no se replica en la otra.

## Pendientes y límites

Todos siguen en **Experimental**. Se han comprobado por software; no hay
muestras impresas ni cosidas que certifiquen ajuste, caída o comodidad. La
fotografía de IA tampoco constituye evidencia de confección.

Los abotonados no llevan cuello camisero sastre; su nombre visible lo aclara.
Los tirantes son parte del cuerpo, no tiras de largo ajustable. El pichi es
un vestido de escote cuadrado para llevar sobre otra prenda.

Las telas recomendadas son tejidos planos suaves. No se aplica holgura
negativa ni se ajusta un vestido entallado escalando este bloque. En faldas de
varios pisos puede ser necesario unir anchos de tela; las instrucciones piden
repartir esas uniones simétricamente y añadir margen a cualquier corte nuevo.
Antes de promocionar un estilo como probado, imprimir y confeccionar una
muestra, comprobar el paso de cabeza, el pecho, las axilas, los paños y el bajo.

# Disfraces originales: 40 incorporaciones

Se añadieron 36 bases de construcción y cuatro conjuntos con inventario real de piezas. Con las cuatro construcciones anteriores, la biblioteca ofrece **44 diseños de disfraces**. Los cambios de medida permanecen dentro de una tarjeta: los colores y las tallas no se cuentan como diseños nuevos.

Todos conservan estado **experimental**. Las pruebas verifican geometría, inventario, márgenes, relaciones de costura y exportación. No sustituyen una muestra cosida ni certifican ajuste corporal o seguridad de uso.

## Qué incluye

| Familia | Diseños nuevos | Construcción |
| --- | --- | --- |
| Tabardos | Medieval, heráldico en punta, almenado, robot | Delantero y espalda forrados, apertura de hombro y cintas laterales. El heráldico incluye escudo y el robot tres paneles de consola. |
| Chalecos | Pirata, duende, bolero | Dos delanteros en espejo y espalda completa; forro separado, hombros y costados compatibles. Cambian los contornos de los delanteros. |
| Faldones | Seis pétalos, ocho hojas, ocho tentáculos | Paneles de dos caras y cinturilla con traslape de velcro. Se llevan sobre otra prenda. |
| Alas | Mariposa, hada, dragón, murciélago, ángel, escarabajo | Seis contornos diferentes; dos alas en espejo, reversos, refuerzos sin margen y puente dorsal. Tirantes elásticos comprados. |
| Colas | Dinosaurio, zorro, ballena, gato, dragón | Caras compatibles y cinturilla; crestas separadas cuando corresponde y aplicaciones contrastantes en el zorro. Relleno blando. |
| Diademas | Conejo, oso, ciervo, unicornio, insecto | Orejas, astas, cono con base circular o tallos con terminales. La diadema es un soporte comprado. |
| Cuellos | Arlequín, pétalos, gorguera, vampiro | Bandas abiertas con velcro; gorguera con frunce 3:1. |
| Puños | Arlequín, dragón | Dos bandas abiertas con contornos diferentes y reversos. |
| Otros | Polainas, peto de caballero, pechera espacial, faja pirata | Polainas abiertas sin suela; pecheras textiles; consola espacial con bolsillo real; bolsón forrado con solapa y presillas en la faja. |
| Conjuntos | Hada, dragón, conejo, insecto | Combinan los inventarios correspondientes mediante IDs con prefijos estables. El conejo añade una cola redonda y cinturilla reales. |

## Contrato técnico

- Recetas: `src/lib/pattern/generators/costumeExpansion.ts`, exporta `COSTUME_RECIPES` y `COSTUME_EXPANSION_GENERATORS`.
- Generadores: `cosplay-{id}`. Modelos y grupos: `disfraz-{id}`. Cada receta corresponde a una tarjeta.
- Catálogo y etiquetas: `src/data/costumeExpansion.ts`. Las familias nuevas se integran en la taxonomía explícita, sin inferirlas de la descripción.
- Vista completa: `src/data/costumeFlats.ts`; cada zona apunta a una pieza real. Las repeticiones usan `pieza--1`, `pieza--2`; los conjuntos conservan `parte-{índice}-pieza`. `COSTUME_SURFACE_PIECES` indica pieza y espejo.
- Los reversos visibles de alas y accesorios usan sus piezas de reverso. Los refuerzos permanecen ocultos. El cono se representa como triángulo armado; el corte sigue siendo un sector circular calculado.
- Todo se expresa en milímetros. El ancho/largo son dimensiones directas de la pieza indicada; los contornos cómodos deben medirse sobre la persona. No se deducen tallas corporales ficticias ni se escalan imágenes para producir patrones.
- Márgenes: 3–10 mm, excepto astas de ciervo, 3–5 mm por sus ramificaciones estrechas. Los refuerzos no llevan margen. El margen no cambia las dimensiones terminadas.
- Las bandas añaden 40 mm de traslape, que se descuentan al comprobar el contorno cerrado. La gorguera frunce exactamente a su tramo útil; el cono coincide con su círculo de base.
- Las cantidades de tela se expresan mediante el inventario real de cortes. El metraje requiere acomodar las piezas al ancho de la tela elegida, por lo que no se inventa una cantidad universal.

## Validación y límites pendientes

`tests/costume-expansion.test.ts` cubre las 40 recetas con medidas predeterminadas, extremos de ancho/largo y márgenes, relaciones de costura, cortes cerrados, marcas e hilo dentro de las piezas, inventario, superficies, registro del motor y PDF Carta de cono, conjunto dragón y faja pirata.

Antes de promover una base a «probada», imprimir al 100 %, comprobar el cuadro de calibración, confeccionar una muestra y registrar tela, medidas finales, ajuste y cambios de instrucciones. Deben probarse especialmente la rigidez flexible de alas/astas, el peso de colas, la comodidad de cierres, la sisa de chalecos y la cobertura de faldones. No se ofrecen estos diseños para bebés.

La vista completa es una referencia plana de montaje; no simula caída, volumen, peso ni deformación del tejido. Las alas carecen de varillas rígidas y no se promete que permanezcan horizontales. Las pecheras son vestuario, no equipo de protección. Los bordados y extras conservan sus medidas físicas y se imprimen aparte.

### Evidencia de navegador

`tests/browser/costume_expansion_smoke.py` pasó en anchos de 390 y 1440 px: 44 tarjetas únicas, seis resultados al combinar Alas + Mujer, y recorrido completo de tabardo, conjunto dragón y alas de hada sin recargar. Se comprobaron ambas vistas y se descargaron seis PDF sin errores de página.

Los PDF conservan controles de 50/100 mm, manifiesto y `PrintScaling=None`: tabardo, 41 páginas y seis plantillas; conjunto dragón, 53 páginas y 15 plantillas; alas de hada, 28 páginas y seis plantillas. Las cantidades repetidas se indican en cada plantilla; no se duplican hojas por cada copia de tela.

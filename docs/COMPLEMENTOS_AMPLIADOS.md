# Complementos originales: catálogo amplio y construcciones verificables

Relevo de Codex, 2026-10-30. Mantener las reglas de `AGENTS.md`.

## Alcance

La biblioteca tiene **411 opciones de complementos** sobre once construcciones:

- 27 opciones anteriores, con IDs conservados.
- 312 configuraciones: 52 usos/objetos en seis construcciones (abierto,
  redondeado, botón, velcro, cierre y cargo).
- 48 organizadores: ocho usos con 2, 3, 4, 5, 6 u 8 canales iguales.
- 12 portacelulares con ventana de cámara ajustable.
- 12 tiras, trabillas y anclajes adicionales.

Son presets por uso y construcción, no 411 motores independientes. Algunos
objetos pueden coincidir en dimensiones; las variantes no se cuentan por color
o talla corporal. Las medidas iniciales son terminadas y orientativas: se debe
medir el objeto real, su funda, grosor y espacio para sacarlo.

Hay colecciones de tecnología, viaje, escritura, costura, arte, taller/jardín,
exterior, mascotas, diario, organizadores, cámara/teléfono y tiras/anclajes.
Los usos van desde libreta A5 o pasaporte hasta ganchillos, flexómetro, pinceles,
mapa, estuche de agujas, rollos de bolsas de mascota y cordel. Tijeras y puntas
requieren su protector, listado también como material comprado cuando aplica.

## Contrato de datos

- `src/data/componentCollections.ts` contiene los presets adicionales originales.
- `src/data/components.ts` conserva las APIs existentes; `ComponentOption`
  añade `tags`, `collection`, `defaultChannels` y `defaultCamera` opcionales.
  `searchComponents` normaliza acentos y requiere que coincidan las palabras
  en nombre, descripción, colección o etiquetas.
- `PatternComponent.channels?` controla 1–8 canales iguales. No es solo una
  etiqueta de catálogo: modifica las líneas de pespunte y las instrucciones.
- `PatternComponent.camera? = {left, top, width, height}` define en milímetros
  la abertura terminada desde la esquina superior izquierda. `cameraWindowFor`
  proporciona la configuración actual o una inicial proporcional si falta.
- `componentPaintRoles` identifica las superficies estructurales que admiten
  material; excluye líneas de costura y herrajes ilustrativos. Para la cámara
  devuelve respaldo, banda superior, bandas izquierda/derecha y frente inferior.

## Portacelular con acceso a cámara

Nuevo tipo: `porta-telefono-camara`. La cámara del teléfono se orienta al
exterior; la persona debe confirmar que la abertura deja libres ópticas, flash
y micrófono. No se infiere una configuración desde la marca o una foto.

El modelo de `Piece` no admite agujeros interiores. La construcción evita
exportar un rectángulo lleno fingiendo que tiene una ventana: entrega cinco
piezas reales, un respaldo íntegro y un frente compuesto de cuatro piezas.

```text
┌─────────────────────────────┐
│       Banda superior        │
├──────┬───────────────┬───────┤
│ Izq. │ Cámara libre  │ Der.  │
├──────┴───────────────┴───────┤
│       Frente inferior       │
└─────────────────────────────┘
          + respaldo
```

- Cuatro uniones verificadas, con ocho piquetes de correspondencia.
- Bandas laterales y superior de al menos 12 mm, frente inferior de al menos
  15 mm y abertura mínima de 10 × 10 mm.
- El área terminada de las cuatro piezas frontales es exactamente
  `ancho × alto − anchoVentana × altoVentana`.
- Los cuatro cantos de ventana son bordes terminados con bies: margen cero
  en esos bordes, sin encoger el tamaño libre de la apertura.
- La entrada superior del marco lleva 12 mm de margen para dobladillo doble
  de 6 mm; el respaldo usa el dobladillo superior habitual.
- Uniones, exteriores, hilo, cantidades y dimensiones mantienen sus IDs.
  En bandas estrechas, la guía indica marcar primero la línea terminada y
  rebajar únicamente el margen exterior a 4 mm antes de plegarlo.
- Materiales incluyen bies (perímetro de ventana + 8 cm por copia) y refuerzo
  de bandas. Cada parte conserva su tela/color al guardar y volver.
- Ventanas fuera del respaldo, bandas insuficientes, canales imposibles o
  cambios manuales que contradicen las medidas generan errores; no se
  sustituye silenciosamente por un bolsillo de otro tipo.

## Comprobaciones

`tests/component-expansion.test.ts` cubre todos los 411 presets, contornos,
costuras, medidas, búsquedas, canales, área/perímetro de la apertura, piquetes,
rechazo de valores inválidos y conservación de materiales por banda.
Las pruebas previas de componentes y vínculo con estudio siguen pasando.

Todos los complementos continúan **experimentales hasta imprimir y coser
muestras**. La comprobación matemática no verifica rigidez, facilidad para
voltear, grosor de bies o agarre del teléfono. Próximo paso: imprimir un marco
de cámara a 100 %, montar en retazo estable, probar con el dispositivo real y
anotar el ajuste antes de cortar la prenda definitiva.

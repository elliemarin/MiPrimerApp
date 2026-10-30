# Intervenir sin actualizar la página

## Causa reproducida

El 30 de octubre de 2026 se reprodujo la pantalla vacía con un build real de la
PWA. No se reprodujo en siete creaciones consecutivas con Vite: hoodie,
pantalón, tote, otro hoodie, cojín, jogger y corona aparecieron inmediatamente.

El fallo aparece cuando se publica una versión mientras la anterior sigue
abierta. `registerType: 'autoUpdate'` activaba el nuevo service worker y limpiaba
la caché anterior; la página seguía importando el chunk antiguo de
`CustomizePage` al pulsar **Intervenir**. GitHub Pages ya había retirado ese
archivo. El navegador mostraba `Failed to fetch dynamically imported module`,
dejaba la página sin dibujo y recuperaba el funcionamiento al recargar.

## Corrección

- `vite.config.ts` usa `registerType: 'prompt'`: el worker nuevo espera y la
  sesión abierta mantiene su caché de módulos consistente.
- `AppUpdateNotice` permite seguir trabajando y ofrece **Guardar y actualizar**
  cuando hay una nueva versión. Primero espera a `saveNow()`; si guardar falla,
  muestra el error y conserva la sesión y el worker anterior.
- Solo la actualización solicitada explícitamente activa el worker y recarga
  la página, ya con el proyecto guardado. Un listener nativo de
  `controllerchange` cubre también actualizaciones durante la primera sesión,
  que Workbox puede clasificar sin `isUpdate`.
- La hidratación de IndexedDB comparte una lectura concurrente y conserva los
  cambios, creaciones, borrados y ajustes hechos mientras esa lectura estaba
  pendiente, incluso cuando el autoguardado ya terminó antes de recibirla.

No se añadió ninguna recarga al botón **Intervenir**, ni se cambió la geometría
del patrón o los identificadores de proyecto.

## Verificación

```bash
npm test -- tests/hydration.test.ts tests/store.test.ts
BASE_PATH=/ npm run build
python tests/browser/upgrade_navigation_smoke.py
```

La regresión de navegador crea dos versiones en un servidor temporal y retira
todos los JS anteriores para reproducir lo que ocurre con los despliegues. Con
la versión nueva esperando, abre hoodie, pantalón y tote consecutivamente, sin
recargar. Comprueba un error deliberado de almacenamiento, confirma que no se
activa la actualización en ese caso, reintenta y verifica en IndexedDB que los
tres proyectos y el extra añadido siguen disponibles tras actualizar.

`HILVANA_BUILD_DIR` permite usar un build aislado. La prueba copia los archivos a
una carpeta temporal y no modifica el build original. Se ejecutó en Chromium
con viewport móvil de 390 × 844; la instalación PWA y la transición entre
versiones en Safari de un iPhone físico siguen pendientes de revisión manual.

Al probar a mano, mantener la biblioteca abierta durante una publicación, abrir
un diseño y pulsar **Intervenir**. Debe aparecer sin actualizar. Después añadir
un bolsillo, pulsar **Guardar y actualizar** y comprobar que sigue colocado.

## Primera migración desde la versión antigua

También se comprobó la transición desde el build de `595a813`, que todavía no
incluía el aviso de actualización. Con una pestaña antigua abierta, el worker
corregido se instala y espera: la pestaña anterior sigue pudiendo intervenir y
guardar sin fallar. Recargar esa pestaña conserva la versión anterior y el
worker en espera; no garantiza instalar la mejora.

Para entrar en esta primera versión corregida, cerrar todas las pestañas y
ventanas de Hilvana —incluida la app instalada si está abierta— y volver a
abrirla. En Chromium, ese cierre activó el worker nuevo y el proyecto guardado
volvió a aparecer con su patrón. No es necesario borrar datos ni cachés. Las
siguientes actualizaciones ya muestran **Guardar y actualizar**.

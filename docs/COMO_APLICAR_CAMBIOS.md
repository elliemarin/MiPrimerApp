# Aplicar el relevo de biblioteca y estudio

Esta entrega conserva los cambios en un commit local de la rama
`codex/biblioteca-estudio`. El remoto de Ellie rechazó la escritura con 403;
no está publicada. Lee primero `AGENTS.md` y `ESTADO_DEL_PROYECTO.md`.

## Desde el bundle Git

En un clon del repositorio de Ellie, con tu trabajo propio ya guardado:

```bash
git fetch origin
git switch main
git merge --ff-only origin/main
git fetch /ruta/hilvana-biblioteca-estudio.bundle codex/biblioteca-estudio
git merge --no-ff FETCH_HEAD
npm ci
npm test
BASE_PATH=/MiPrimerApp/ npm run build
git push origin main
```

Si hay conflictos con avances posteriores de Claude, revísalos y conserva ambos
trabajos; no uses force push ni reemplaces el árbol completo. El workflow del
repositorio publica GitHub Pages al recibir el push a `main`.

## Desde el parche

También se entrega un parche de commit aplicable con `git am --3way` en un
checkout limpio. El ZIP contiene la fuente completa de la entrega, sin
`node_modules` ni credenciales; sirve como referencia y respaldo. Para conservar
el historial conviene usar el bundle o el parche en vez de reemplazar archivos.

## Escritura a GitHub

Las dos vías de esta sesión fueron rechazadas:

- Push Git: `Permission to elliemarin/MiPrimerApp.git denied to PaulHRios`.
- API de la app GitHub: `403 Resource not accessible by integration`.

Revisar la invitación aceptada, la cuenta utilizada y el acceso efectivo de la
app/conexión al repositorio. Que la lectura pública funcione o que los metadatos
muestren `push:true` no confirma que esa conexión pueda escribir.

## Comprobación rápida de la entrega

- `npm test`: 86 casos.
- `npm run build`: TypeScript + Vite + PWA.
- `npm run dev`, y en otra terminal (Python Playwright + Chromium disponibles):
  `python tests/browser/studio_smoke.py` y
  `python tests/browser/studio_touch.py`.
- En iPhone físico: arrastrar material, tocar para aplicar, pellizcar una figura,
  calibrar PDF impreso y probar CREATIVATE siguen siendo revisiones necesarias.

Las funciones experimentales mantienen su etiqueta hasta sus pruebas físicas.
La investigación de fuentes y máquina está en `FUENTES_Y_MAQUINA.md`.

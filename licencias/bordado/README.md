# Tipografías de los dibujos de letras

Hilvana incluye contornos de letras, números y signos latinos de cinco familias
publicadas con SIL Open Font License 1.1: Figtree, Bodoni Moda, Pacifico,
IBM Plex Mono y Bangers. Sus licencias y avisos originales están en esta carpeta.

Los contornos se obtienen de los archivos oficiales del repositorio Google
Fonts. `src/data/letteringFonts.json` conserva para cada archivo la URL de
origen y su SHA-256. `scripts/build_lettering_fonts.py` permite reproducir la
conversión usando fontTools; la aplicación funciona sin conexión y no envía
los textos de las personas a ningún servicio.

Los glifos conservan curvas y contraformas. Este recurso es un dibujo vectorial
para transferir o digitalizar; no es una digitalización de puntadas automática.

/**
 * Láminas 3 × 3 del catálogo para la colección Niña y la ampliación de Bebé.
 *
 * Son ilustraciones vectoriales dibujadas desde el dibujo técnico real de cada
 * diseño (src/data/kidsFlats.ts), con textura de tela y sombra suave para
 * acompañar a las láminas existentes. No aportan geometría ni escala.
 *
 * Las celdas `model` se dibujan desde el dibujo técnico del catálogo (buildFlat).
 *
 * Uso (requiere Playwright con Chromium instalado en la máquina):
 *   npx vite-node scripts/render-kids-sheets.ts            # todas las láminas
 *   npx vite-node scripts/render-kids-sheets.ts tendencia-01
 * Escribe public/catalog-images/<lámina>.webp.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { buildKidsFlat } from '../src/data/kidsFlats';
import { buildFlat, type FlatView } from '../src/data/flats';
import { findModel } from '../src/data/catalog';

interface Cell { key: string; color: string; accents?: Record<string, string>; view?: 'frente' | 'espalda'; /** Catalog model drawn from its own technical drawing. */ model?: boolean }
const SHEETS: Record<string, Cell[]> = {
  'ninas-01': [
    { key: 'vestido-trapecio-volante', color: '#d8a79d', accents: { 'volante--1': '#e2b9b0', 'volante--2': '#e2b9b0' } },
    { key: 'vestido-tirantes', color: '#a9b99c', accents: { 'tirante--1': '#97a98a', 'tirante--2': '#97a98a', 'cuerpo-delantero': '#b4c3a7' } },
    { key: 'falda-tul', color: '#e9c3c6', accents: { pretina: '#dcaeb3' } },
    { key: 'falda-olanes', color: '#d9b67b', accents: { 'olan-2': '#e0c08d', 'olan-3': '#d2ab6c' } },
    { key: 'falda-circular', color: '#8fa5bf', accents: { pretina: '#7f96b1' } },
    // Variant cells (5, 6): shown for the exact recipe, not as group cards.
    { key: 'vestido-trapecio', color: '#d8a79d' },
    { key: 'falda-medio-circulo', color: '#8fa5bf', accents: { pretina: '#7f96b1' } }
  ],
  'bebe-02': [
    { key: 'cubrepanal-olanes', view: 'espalda', color: '#e7dccb', accents: { 'olan-1': '#d9c7ab', 'olan-2': '#e2d3bb', 'olan-3': '#d9c7ab' } },
    { key: 'bonete', color: '#cf8f74', accents: { trasera: '#c78368', lengueta: '#d89d84' } },
    { key: 'patucos', color: '#c9b79a', accents: { 'suela--1': '#8f7a60', 'suela--2': '#8f7a60', 'talonera--1': '#d6c6aa', 'talonera--2': '#d6c6aa' } },
    { key: 'saco-dormir', color: '#a8bccb' },
    { key: 'toalla', color: '#ecd9a2', accents: { capucha: '#e5cd8d' } },
    { key: 'babero-bandana', color: '#e2b3a6' },
    // Variant cell (6): plain diaper cover, front view.
    { key: 'cubrepanal', color: '#e7dccb' }
  ],
  'tendencia-01': [
    { key: 'jeans-recto', model: true, color: '#5f7fa6', accents: { pretina: '#56769c' } },
    { key: 'pantalon-pitillo', model: true, color: '#4a4f58', accents: { pretina: '#43474f' } },
    { key: 'jeans-mom', model: true, color: '#8fa9c7', accents: { pretina: '#86a0bf' } },
    { key: 'pantalon-acampanado', model: true, color: '#6c88ad', accents: { pretina: '#627ea3' } },
    { key: 'jeans-ancho', model: true, color: '#d9cfbd', accents: { pretina: '#d0c5b1' } },
    { key: 'pantalon-baggy', model: true, color: '#7d95b5', accents: { pretina: '#738bab' } },
    { key: 'pantalon-barrel', model: true, color: '#9db3cf', accents: { pretina: '#93a9c5' } },
    { key: 'pantalon-cargo', model: true, color: '#b5a27c', accents: { pretina: '#aa9771' } },
    { key: 'camiseta-oversize', model: true, color: '#bdbcb5' }
  ],
  'tendencia-02': [
    { key: 'sobrecamisa-leñadora', model: true, color: '#b5654a' },
    { key: 'chaqueta-trabajo', model: true, color: '#c8a25a' },
    { key: 'bomber-clasica', model: true, color: '#6f7a52' },
    { key: 'peto-corto', color: '#c98f6e', accents: { 'tirante--1': '#b97f5e', 'tirante--2': '#b97f5e' } },
    { key: 'gorro-oso', color: '#e3c9a8', accents: { 'oreja--1': '#d8b892', 'oreja--2': '#d8b892' } },
    { key: 'sombrero-pescador', model: true, color: '#a8bccb', accents: { ala: '#9cb1c1' } },
    { key: 'conjunto-verano', color: '#e2b3a6', accents: { 'sombrero-copa': '#a8bccb', 'sombrero-banda': '#a8bccb', 'sombrero-ala': '#9cb1c1' } },
    // Variant cells (7, 8): baby barrel with elastic waist and the long overall.
    { key: 'barrel-bebe', model: true, color: '#e7dccb', accents: { pretina: '#ddd0bb' } },
    { key: 'peto-largo', color: '#8fa5bf', accents: { 'tirante--1': '#7f96b1', 'tirante--2': '#7f96b1' } }
  ],
  // Variant-only sheet: each cell is the exact recipe of a card variant.
  'tendencia-03': [
    { key: 'sobrecamisa-corta', model: true, color: '#7f8f6a', accents: { cuello: '#76855f' } },
    { key: 'bomber-corta', model: true, color: '#4f5d73', accents: { 'puno-a': '#46536a', 'puno-b': '#46536a', cuello: '#46536a', pretina: '#46536a' } },
    { key: 'camiseta-oversize-larga', model: true, color: '#e3dacb' },
    { key: 'gorro-gato', color: '#c9c3bd', accents: { 'oreja--1': '#bab3ac', 'oreja--2': '#bab3ac' } },
    { key: 'gorro-conejo', color: '#efd9dc', accents: { 'oreja--1': '#e5c8cc', 'oreja--2': '#e5c8cc' } },
    { key: 'conjunto-invierno', color: '#8fa5bf', accents: { 'overol-tirante--1': '#7f96b1', 'overol-tirante--2': '#7f96b1', 'gorro-gorro': '#e3c9a8', 'gorro-oreja--1': '#d8b892', 'gorro-oreja--2': '#d8b892' } },
    { key: 'conjunto-recien-nacido', color: '#f1e4d3', accents: { 'babero-babero': '#d9e3d4', 'bonete-banda': '#e8d6bf' } },
    { key: 'baggy-bebe', model: true, color: '#9db3cf', accents: { pretina: '#93a9c5' } }
  ]
};
const viewFor = (cell: Cell): FlatView => {
  const views = cell.model ? buildFlat(cell.key, findModel(cell.key)!.flat).views : buildKidsFlat(cell.key, cell.key).views;
  return views.find(v => v.key === (cell.view ?? 'frente'))!;
};

const CELL = 418, SIZE = CELL * 3, BG = '#f3eee5';
const shade = (hex: string, f: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join('');

function cellSvg(view: FlatView, cell: Cell, index: number): string {
  const box = 330, s = Math.min(box / view.width, box / view.height);
  const tx = (index % 3) * CELL + CELL / 2 - (view.minX + view.width / 2) * s, ty = Math.floor(index / 3) * CELL + CELL / 2 - (view.minY + view.height / 2) * s + 4;
  const stroke = 1.3 / s;
  const zones = view.zones.map(z => { const fill = cell.accents?.[z.id] ?? cell.color; return `<path d="${z.d}" fill="${fill}" stroke="${shade(fill, .72)}" stroke-width="${stroke}" stroke-linejoin="round" filter="url(#tela)"/>`; }).join('');
  const details = view.details.map(d => {
    const dash = d.style === 'pespunte' ? ` stroke-dasharray="${4 / s} ${3 / s}"` : '';
    const opacity = d.style === 'pliegue' ? .28 : d.style === 'pespunte' ? .45 : .5;
    return `<path d="${d.d}" fill="none" stroke="#3b3029" stroke-opacity="${opacity}" stroke-width="${(d.style === 'pliegue' ? .9 : 1.1) / s}" stroke-linecap="round"${dash}/>`;
  }).join('');
  const dots = view.dots.map(d => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="#f7f2ea" stroke="#6d5f53" stroke-width="${1 / s}"/>`).join('');
  return `<g transform="translate(${tx} ${ty}) scale(${s})"><g filter="url(#sombra)">${zones}</g>${details}${dots}</g>`;
}

function sheetSvg(cells: Cell[]): string {
  const body = cells.map((cell, index) => cellSvg(viewFor(cell), cell, index)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<defs>
  <filter id="tela" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="ruido"/>
    <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 .2  0 0 0 0 .16  0 0 0 0 .12  0 0 0 .22 0" result="grano"/>
    <feComposite in="grano" in2="SourceGraphic" operator="in" result="trama"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="trama"/></feMerge>
  </filter>
  <filter id="sombra" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#5a4636" flood-opacity=".16"/></filter>
  <radialGradient id="luz" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#f8f4ec"/><stop offset="1" stop-color="${BG}"/></radialGradient>
</defs>
<rect width="${SIZE}" height="${SIZE}" fill="url(#luz)"/>${body}</svg>`;
}

const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as typeof import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
const only = process.argv.slice(2).filter(arg => SHEETS[arg]);
for (const [sheet, cells] of Object.entries(SHEETS).filter(([name]) => !only.length || only.includes(name))) {
  const data: string = await page.evaluate(async ({ svg, size }) => {
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    return canvas.toDataURL('image/webp', .82);
  }, { svg: sheetSvg(cells), size: SIZE });
  const out = resolve('public/catalog-images', `${sheet}.webp`);
  writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(sheet, out);
}
await browser.close();

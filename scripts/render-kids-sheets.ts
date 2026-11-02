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
// flats.ts loads first: the baby style drawings call buildKidsFlat while their module initialises.
import { buildFlat, type FlatView } from '../src/data/flats';
import { findModel } from '../src/data/catalog';
import { buildKidsFlat } from '../src/data/kidsFlats';

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
  ],
  // Designs digitized from reference photos (2026-11-01).
  'infantil-01': [
    { key: 'chaleco-borrego', model: true, color: '#efe6d6' },
    { key: 'chaqueta-polar-cierre', model: true, color: '#cbbbe2', accents: { cuello: '#c2b1da', pretina: '#c2b1da', 'puno-a': '#c2b1da', 'puno-b': '#c2b1da' } },
    { key: 'chaqueta-acolchada-reversible', model: true, color: '#3f5f4a' },
    { key: 'chaqueta-capucha-botones', model: true, color: '#3d4f73', accents: { capucha: '#b5643c', 'bolsillo-a': '#b5643c', 'bolsillo-b': '#b5643c' } },
    { key: 'sudadera-canguro-infantil', model: true, color: '#4a6f9c', accents: { pretina: '#41648f', 'puno-a': '#41648f', 'puno-b': '#41648f' } },
    { key: 'blusa-campesina', model: true, color: '#e7a3a3', accents: { volante: '#e09797' } },
    { key: 'blusa-botones-infantil', model: true, color: '#e6c3a8' },
    { key: 'pantalon-bombacho-infantil', model: true, color: '#d9a07e' },
    { key: 'vestido-jareta', model: true, color: '#f0c6cf', accents: { lazo: '#e8a9b6' } }
  ],
  'infantil-02': [
    { key: 'pelele-volantes', model: true, color: '#8a6047', accents: { 'lazo--1': '#f2b49b', 'lazo--2': '#f2b49b', 'tirante--1': '#7a5340', 'tirante--2': '#7a5340', 'volante--1': '#93694f', 'volante--2': '#93694f' } },
    { key: 'diadema-lazo', model: true, color: '#f2b49b', accents: { lazo: '#efa688' } },
    { key: 'gorro-duende', model: true, color: '#c94b4b' },
    { key: 'gorro-orejeras-gato', model: true, color: '#a8d5c4', accents: { oreja: '#98c9b6' } },
    // Variant cells (4–8).
    { key: 'chaleco-ribeteado', model: true, color: '#e3d9c7' },
    { key: 'blusa-campesina-larga', model: true, color: '#b6cfe6', accents: { volante: '#a9c4de' } },
    { key: 'barrel-infantil', model: true, color: '#d8a53a', accents: { pretina: '#cd9a30' } },
    { key: 'cubrepanal-tirantes', model: true, color: '#b9c9b0', accents: { 'tirante--1': '#a9bba0', 'tirante--2': '#a9bba0' } },
    { key: 'sombrero-pescador-lazo', model: true, color: '#f1e6d0', accents: { lazo: '#e9b7a4', ala: '#e9ddc5' } }
  ],
  'infantil-03': [
    { key: 'gorro-orejeras-oso', model: true, color: '#e8d2b4', accents: { oreja: '#dcc29f' } },
    { key: 'gorro-duende-fieltro', model: true, color: '#d65a5a' },
    { key: 'conjunto-vestido', model: true, color: '#f0c6cf', accents: { 'vestido-lazo': '#e8a9b6', 'cubrepanal-delantero': '#e9b7c0' } },
    { key: 'conjunto-pelele-diadema', model: true, color: '#8a6047', accents: { 'pelele-lazo--1': '#f2b49b', 'pelele-lazo--2': '#f2b49b', 'diadema-banda': '#8a6047', 'diadema-lazo': '#f2b49b' } },
    { key: 'conjunto-campesino', model: true, color: '#e7a3a3' },
    { key: 'conjunto-rayas', model: true, color: '#d9a07e', accents: { 'blusa-delantero--1': '#e6c3a8', 'blusa-delantero--2': '#e6c3a8', 'pantalon-pretina': '#cf9573', 'pantalon-puno-a': '#cf9573', 'pantalon-puno-b': '#cf9573' } }
  ],
  // Second digitized batch (2026-11-01).
  'infantil-04': [
    { key: 'bonete-volante', model: true, color: '#efe5d3', accents: { volante: '#f6efe2', barbiquejo: '#e6dac4' } },
    { key: 'delantal-pichi', model: true, color: '#e8a3a8', accents: { 'volante-bajo': '#f3ead9', 'volante-hombro--1': '#f3ead9', 'volante-hombro--2': '#f3ead9', bolsillo: '#e09398' } },
    { key: 'mono-pichi-bolsillos', model: true, color: '#7f8a55', accents: { 'tirante--1': '#737d4b', 'tirante--2': '#737d4b', 'bolsillo--1': '#78834f', 'bolsillo--2': '#78834f' } },
    { key: 'peto-infantil-largo', model: true, color: '#86a477', accents: { 'tirante--1': '#7a9a6b', 'tirante--2': '#7a9a6b', bolsillo: '#7d9b6e' } },
    { key: 'blusa-trapecio', model: true, color: '#9ec0e3' },
    { key: 'pantalon-capri-infantil', model: true, color: '#bcc9a0', accents: { pretina: '#b0bf93' } },
    // Variant cells (6–8).
    { key: 'bonete-volante-doble', model: true, color: '#2f6b4f', accents: { volante: '#e8c15a', barbiquejo: '#3a5d8f' } },
    { key: 'delantal-pichi-liso', model: true, color: '#d9b343' },
    { key: 'mono-pico-volantes', model: true, color: '#b8c97b', accents: { 'volante--1': '#adbf70', 'volante--2': '#adbf70', 'lazo--1': '#a6b86a', 'lazo--2': '#a6b86a' } }
  ],
  'infantil-05': [
    { key: 'bonete-encaje', model: true, color: '#c9643f' },
    { key: 'blusa-trapecio-volante', model: true, color: '#c4cfae', accents: { 'volante-bajo': '#b9c5a1' } },
    { key: 'conjunto-trapecio', model: true, color: '#9ec0e3', accents: { 'cubrepanal-delantero': '#94b6da' } },
    { key: 'conjunto-vichy', model: true, color: '#c4cfae', accents: { 'blusa-volante-bajo': '#b9c5a1', 'pantalon-pretina': '#b9c5a1' } }
  ],
  // Third and fourth digitized batches (adults): new constructions without an AI photo yet.
  'lote-adultos-01': [
    { key: 'pantalon-volante', model: true, color: '#e3d3b8', accents: { 'volante-a': '#dac8aa', 'volante-b': '#dac8aa', pretina: '#dac8aa' } },
    { key: 'chaqueta-ranglan', model: true, color: '#5b6b4e', accents: { 'manga-delantera--1': '#c9b48a', 'manga-delantera--2': '#c9b48a', 'manga-trasera--1': '#c9b48a', 'manga-trasera--2': '#c9b48a', cuello: '#4f5e43', banda: '#4f5e43', 'puno--1': '#4f5e43', 'puno--2': '#4f5e43' } },
    { key: 'sudadera-bloques', model: true, color: '#ece3d3', accents: { 'delantero-inferior': '#7d8f6b', 'manga-inferior--1': '#7d8f6b', 'manga-inferior--2': '#7d8f6b', cuello: '#e3d8c5' } },
    { key: 'buzo-murcielago', model: true, color: '#c4c6c8', accents: { 'lateral--1': '#f4f1ea', 'lateral--2': '#f4f1ea', 'puno--1': '#d8bd98', 'puno--2': '#d8bd98', banda: '#f4f1ea' } },
    { key: 'culotte-encaje', model: true, color: '#b54a5d' },
    { key: 'palazzo-botones-laterales', model: true, color: '#e8dfcc', accents: { pretina: '#dfd4bd' } },
    // Variant cells (6–7).
    { key: 'sudadera-media-cremallera-lisa', model: true, color: '#8ea5bb', accents: { cuello: '#859cb2' } },
    { key: 'chaqueta-campo', model: true, color: '#3f6b4c' }
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

import { isChild, num, str, round1, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Piece, SeamRelation, SewingStep } from '../types';
import { P, bindingStrip, cm, edge, equal, invalid, len, lens, outline, ratio, rectangle } from './kidsShared';

/** Adult loose dresses. Every advertised style changes a seam, opening,
 * neckline or silhouette. Sizes and colours never create another style. */
export interface DressStyle {
  id: string; name: string;
  neck: 'redondo' | 'pico' | 'barco' | 'cuadrado';
  sleeve: 'sin' | 'volante' | 'corta' | 'campana' | 'integrada';
  cut: 'continuo' | 'imperio' | 'cintura' | 'cadera' | 'canesu' | 'volanton' | 'paneles';
  tiers: number; flare: number; length: number;
  buttons?: boolean; wide?: boolean; broadStrap?: boolean;
  description: string;
}
const style = (id: string, name: string, neck: DressStyle['neck'], sleeve: DressStyle['sleeve'], cut: DressStyle['cut'], tiers: number, flare: number, length: number, description: string, extra: Partial<DressStyle> = {}): DressStyle =>
  ({ id, name, neck, sleeve, cut, tiers, flare, length, description, ...extra });

export const ADULT_DRESS_STYLES: readonly DressStyle[] = [
  style('trapecio-redondo', 'Vestido trapecio', 'redondo', 'sin', 'continuo', 0, 1.42, .57, 'Línea A sin mangas, escote redondo y abertura de espalda. El vuelo nace desde la sisa.'),
  style('trapecio-pico', 'Vestido evasé de escote V', 'pico', 'sin', 'continuo', 0, 1.5, .68, 'Escote delantero en V y falda evasé continua, sin costura de cintura.'),
  style('recto-barco', 'Vestido recto de cuello barco', 'barco', 'sin', 'continuo', 0, 1, .57, 'Silueta recta holgada con escote ancho y hombros estrechos.'),
  style('tunica-kimono', 'Vestido túnica de manga integrada', 'redondo', 'integrada', 'continuo', 0, 1.04, .57, 'Mangas cortas cortadas junto con el cuerpo y silueta de túnica.'),
  style('caftan', 'Caftán de escote redondo', 'redondo', 'integrada', 'continuo', 0, 1.15, .83, 'Paños amplios con manga integrada y caída larga; sin cintura entallada.', { wide: true }),
  style('trapecio-mariposa', 'Vestido trapecio con mangas de volante', 'redondo', 'volante', 'continuo', 0, 1.4, .58, 'Línea A con dos volantes fruncidos alrededor de las sisas.'),
  style('imperio', 'Vestido imperio', 'redondo', 'sin', 'imperio', 1, 1, .69, 'Costura alta bajo el busto y falda fruncida; cuerpo holgado sin pinzas.'),
  style('imperio-mariposa', 'Vestido imperio con mangas de volante', 'redondo', 'volante', 'imperio', 1, 1, .69, 'Corte bajo el busto, falda fruncida y volantes independientes en las sisas.'),
  style('cintura-fruncida', 'Vestido de cintura fruncida', 'redondo', 'sin', 'cintura', 1, 1, .59, 'Cuerpo sin mangas y falda fruncida en la línea de cintura; ajuste suelto.'),
  style('cintura-manga', 'Vestido de manga corta y falda fruncida', 'redondo', 'corta', 'cintura', 1, 1, .59, 'Hombro caído, mangas cortas montadas y falda fruncida a la cintura.'),
  style('talle-bajo', 'Vestido de talle bajo', 'redondo', 'sin', 'cadera', 1, 1, .61, 'Cuerpo recto hasta la cadera y falda fruncida inferior, inspirado en los años veinte.'),
  style('dos-pisos', 'Vestido de dos pisos', 'redondo', 'sin', 'cintura', 2, 1, .72, 'Cuerpo sin mangas y dos niveles de falda; cada piso se frunce al anterior.'),
  style('tres-pisos', 'Vestido de tres pisos con mangas', 'redondo', 'corta', 'cintura', 3, 1, .84, 'Mangas cortas de hombro caído y tres pisos fruncidos hasta el tobillo.'),
  style('imperio-boho', 'Vestido boho de corte imperio', 'pico', 'sin', 'imperio', 2, 1, .83, 'Escote V, corte alto y dos niveles amplios de falda fruncida.'),
  style('camisero-recto', 'Vestido abotonado de manga corta', 'redondo', 'corta', 'continuo', 0, 1.04, .59, 'Frente abierto con botones, manga corta y cuello redondo ribeteado; no lleva cuello camisero.', { buttons: true }),
  style('camisero-fruncido', 'Vestido abotonado de falda fruncida', 'redondo', 'sin', 'cintura', 1, 1, .7, 'Botones de escote a bajo, cuerpo sin mangas y falda fruncida a la cintura.', { buttons: true }),
  style('camisero-trapecio', 'Vestido abotonado de escote V', 'pico', 'sin', 'continuo', 0, 1.4, .59, 'Frente abotonado completo, escote V y silueta evasé sin corte de cintura.', { buttons: true }),
  style('paneles-horizontal', 'Vestido de paneles horizontales', 'redondo', 'sin', 'paneles', 2, 1.45, .59, 'Tres paños horizontales lisos que forman una línea A continua. Las uniones no llevan frunce.'),
  style('canesu-fruncido', 'Vestido de canesú fruncido', 'redondo', 'sin', 'canesu', 1, 1, .59, 'Canesú alto justo bajo las sisas y paño inferior fruncido de gran amplitud.'),
  style('tirante-ancho-trapecio', 'Vestido evasé de tirantes anchos', 'cuadrado', 'sin', 'continuo', 0, 1.45, .7, 'Escote cuadrado y tirantes de 4 cm integrados en el cuerpo; caída evasé.'),
  style('tirante-ancho-fruncido', 'Vestido de tirantes y falda fruncida', 'cuadrado', 'sin', 'cintura', 1, 1, .7, 'Tirantes integrados de 4 cm, escote cuadrado y falda fruncida a la cintura.'),
  style('tirante-ancho-escalonado', 'Vestido de tirantes de tres pisos', 'cuadrado', 'sin', 'cintura', 3, 1, .84, 'Escote cuadrado, tirantes integrados de 4 cm y tres niveles fruncidos.'),
  style('pichi-cuadrado', 'Vestido pichi de escote cuadrado', 'cuadrado', 'sin', 'continuo', 0, 1.3, .59, 'Pichi holgado para llevar sobre una blusa, con hombros anchos de 8 cm y escote cuadrado.', { broadStrap: true }),
  style('volanton', 'Vestido recto con volantón', 'redondo', 'sin', 'volanton', 1, 1, .7, 'Cuerpo recto sin mangas terminado con un volante ancho independiente.'),
  style('kimono-volante', 'Vestido túnica con volante', 'redondo', 'integrada', 'volanton', 1, 1, .7, 'Manga corta integrada, cuerpo túnica y volante fruncido inferior.'),
  style('caftan-pico', 'Caftán de escote V', 'pico', 'integrada', 'continuo', 0, 1.15, .83, 'Caftán amplio de manga integrada con escote delantero en V.', { wide: true }),
  style('manga-campana', 'Vestido de mangas campana', 'redondo', 'campana', 'cintura', 1, 1, .72, 'Manga montada de hombro caído que se abre en campana y falda fruncida a la cintura.')
];

export function adultDressStyle(value: string): DressStyle | undefined { return ADULT_DRESS_STYLES.find(item => item.id === value); }
export function adultDressDefaults(ctx: GeneratorContext): Params {
  return { estilo: 'trapecio-redondo', largo: round1((ctx.body.estatura ?? 1640) * .57), holgura: 140, fruncido: 1.5, anchoVolante: 90, margen: 10, dobladillo: 20 };
}

export interface AdultDressGeometry {
  style: DressStyle; q: number; shoulder: number; neckX: number; arm: number; bodyHeight: number;
  length: number; hemWidth: number; lowerHeights: number[]; lowerWidths: number[]; ease: number; base: number;
}
export function adultDressGeometry(ctx: GeneratorContext, p: Params): AdultDressGeometry {
  const s = adultDressStyle(str(p, 'estilo')) ?? ADULT_DRESS_STYLES[0];
  const base = Math.max(ctx.body.pecho ?? 920, ctx.body.cadera ?? 1000, ctx.body.cintura ?? 740);
  const ease = num(p, 'holgura', s.wide ? 360 : 140), q = (base + ease) / 4;
  const arm = Math.max(205, (ctx.body.pecho ?? 920) / 6 + 65, ctx.body.brazo ? (ctx.body.brazo + 40) / 1.6 : 0);
  const length = num(p, 'largo', (ctx.body.estatura ?? 1640) * s.length), talle = ctx.body.talleEspalda ?? 420;
  const shoulder = ['corta', 'campana', 'integrada'].includes(s.sleeve) ? q : Math.min((ctx.body.hombros ?? 380) / 2, q - 30);
  const neckX = s.neck === 'cuadrado' ? shoulder - (s.broadStrap ? 80 : 40) : s.neck === 'barco' ? Math.min(shoulder - 30, 145) : Math.min(shoulder - 55, 100);
  const bodyHeight = s.cut === 'imperio' ? Math.max(arm + 60, talle * .78) : s.cut === 'cintura' ? Math.max(arm + 100, talle + 15)
    : s.cut === 'cadera' ? talle + 170 : s.cut === 'canesu' ? arm + 35 : s.cut === 'volanton' ? length - 220 : s.cut === 'paneles' ? Math.max(arm + 60, length * .4) : length;
  const lowerHeights = Array.from({ length: s.tiers }, () => (length - bodyHeight) / s.tiers);
  const hemWidth = s.cut === 'paneles' ? q + (q * (s.flare - 1)) * (bodyHeight - arm) / (length - arm) : s.cut === 'continuo' ? q * s.flare : q;
  const lowerWidths = lowerHeights.map((_, i) => s.cut === 'paneles'
    ? q + q * (s.flare - 1) * (bodyHeight + lowerHeights[0] * (i + 1) - arm) / (length - arm)
    : q * num(p, 'fruncido', 1.5) ** (i + 1));
  return { style: s, q, shoulder, neckX, arm, bodyHeight, length, hemWidth, lowerHeights, lowerWidths, ease, base };
}

/** Seam geometry of the upper section, with a slit in the centre back or a
 * 30 mm front overlap. Placket fold allowances are outside the seam line. */
function bodice(g: AdultDressGeometry, back: boolean, sa: number, hem: number, slit: number): Piece {
  const s = g.style, open = !!s.buttons && !back, centre = open ? -15 : 0;
  const depth = s.neck === 'cuadrado' ? (back ? 125 : 155) : s.neck === 'barco' ? (back ? 40 : 70) : back ? 30 : s.neck === 'pico' ? 185 : 110;
  const pts = [P(centre, depth)], edges = [] as ReturnType<typeof edge>[];
  if (s.neck === 'cuadrado') {
    pts.push(P(g.neckX, depth), P(g.neckX, 0));
    edges.push(edge('escote-base', 'Escote cuadrado (bies)', 'sin-margen', 0), edge('escote-lado', 'Escote cuadrado (bies)', 'sin-margen', 0));
  } else {
    pts.push(P(g.neckX, 0));
    edges.push(s.neck === 'pico' && !back ? edge('escote', 'Escote V (bies)', 'sin-margen', 0)
      : edge('escote', 'Escote (bies)', 'sin-margen', 0, P(centre + (g.neckX - centre) * .65, depth), P(g.neckX, depth * .45)));
  }
  const integrated = s.sleeve === 'integrada', mounted = s.sleeve === 'corta' || s.sleeve === 'campana';
  const shoulderY = mounted || integrated || s.neck === 'cuadrado' ? 0 : 22;
  const extension = integrated ? (s.wide ? 150 : 100) : 0;
  pts.push(P(g.shoulder + extension, shoulderY)); edges.push(edge('hombro', 'Hombro', 'costura', sa));
  if (integrated) {
    pts.push(P(g.shoulder + extension, g.arm - 45)); edges.push(edge('boca-manga', 'Boca de manga integrada', 'dobladillo', 12));
    pts.push(P(g.q, g.arm)); edges.push(edge('axila', 'Costura bajo manga', 'costura', sa));
  } else {
    pts.push(P(g.q, g.arm));
    edges.push(mounted ? edge('sisa', 'Sisa recta de hombro caído', 'costura', sa)
      : edge('sisa', 'Sisa (bies)', 'sin-margen', 0, P(g.shoulder, g.arm * .67), P(g.q - 35, g.arm)));
  }
  pts.push(P(g.hemWidth, g.bodyHeight)); edges.push(edge('costado', 'Costado', 'costura', sa));
  pts.push(P(0, g.bodyHeight)); edges.push(edge('bajo', s.tiers ? 'Unión con paño inferior' : 'Bajo', s.tiers ? 'costura' : 'dobladillo', s.tiers ? sa : hem));
  if (open) {
    pts.push(P(-15, g.bodyHeight)); edges.push(edge('tapeta-bajo', 'Unión de la tapeta', s.tiers ? 'costura' : 'dobladillo', s.tiers ? sa : hem));
    edges.push(edge('frente', 'Tapeta: doble vuelta de 3 cm', 'dobladillo', 60));
  } else if (back && !s.buttons) {
    pts.push(P(0, depth + slit));
    edges.push(edge('centro-espalda', 'Centro espalda', 'costura', sa), edge('abertura', 'Abertura (bies)', 'sin-margen', 0));
  } else edges.push(edge('centro', 'Centro al doblez', 'doblez', 0));
  const id = back ? 'espalda' : 'delantero';
  const result = outline(id, back ? (s.buttons ? 'Espalda al doblez' : 'Espalda en par con abertura') : (open ? 'Delantero en par con tapeta' : 'Delantero al doblez'), pts, edges,
    open || back && !s.buttons ? { qty: 2, mirrorPairs: true } : { onFold: true });
  if (open) {
    result.lines.push({ id: 'centro-frente', kind: 'referencia', a: P(0, depth + 15), b: P(0, g.bodyHeight - 15), label: 'Centro de botones / cruce de 3 cm' });
    for (let y = depth + 25, i = 0; y < g.bodyHeight - 25; y += 90, i++) result.marks.push({ id: `boton-${i}`, kind: 'boton', at: P(0, y), label: 'Botón a un lado, ojal al otro' });
  }
  if (back && !s.buttons) result.marks.push({ id: 'fin-abertura', kind: 'cruz', at: P(0, depth + slit), label: 'Fin de abertura: reforzar' });
  return result;
}

/** One skirt half, front and back have identical side lengths. In open-front
 * dresses the overlap remains 15 mm wide instead of being gathered. */
function lowerPanel(id: string, name: string, top: number, bottom: number, h: number, sa: number, hem: number, last: boolean, frontOpen: boolean): Piece {
  const pts = frontOpen ? [P(-15, 0), P(0, 0), P(top, 0), P(bottom, h), P(0, h), P(-15, h)] : [P(0, 0), P(top, 0), P(bottom, h), P(0, h)];
  const edges = [
    ...(frontOpen ? [edge('tapeta-arriba', 'Unión de tapeta', 'costura', sa)] : []),
    edge('union', 'Unión superior', 'costura', sa), edge('costado', 'Costado', 'costura', sa),
    edge('bajo', last ? 'Bajo' : 'Unión inferior', last ? 'dobladillo' : 'costura', last ? hem : sa),
    ...(frontOpen ? [edge('tapeta-bajo', last ? 'Bajo de tapeta' : 'Unión inferior de tapeta', last ? 'dobladillo' : 'costura', last ? hem : sa), edge('frente', 'Tapeta: doble vuelta de 3 cm', 'dobladillo', 60)] : [edge('centro', 'Centro al doblez', 'doblez', 0)])
  ];
  const piece = outline(id, name, pts, edges, frontOpen ? { qty: 2, mirrorPairs: true } : { onFold: true });
  if (frontOpen) {
    piece.lines.push({ id: 'centro-frente', kind: 'referencia', a: P(0, 15), b: P(0, h - 15), label: 'Centro de botones; no fruncir la tapeta' });
    for (let y = 45, i = 0; y < h - 20; y += 90, i++) piece.marks.push({ id: `boton-${i}`, kind: 'boton', at: P(0, y), label: 'Ajustar separación con los botones del cuerpo' });
  }
  piece.notches.push({ id: 'cuarto', edgeId: 'union', s: top / 2, count: 1, label: 'Mitad del paño: repartir el frunce' });
  return piece;
}

export function generateAdultDress(ctx: GeneratorContext, params: Params): GeneratorResult {
  const selected = adultDressStyle(str(params, 'estilo', 'trapecio-redondo'));
  if (!selected) return invalid('vestido-estilo', 'Elige un estilo de vestido disponible.');
  const p = { ...adultDressDefaults(ctx), largo: round1((ctx.body.estatura ?? 1640) * selected.length), holgura: selected.wide ? 360 : 140, ...params };
  const g = adultDressGeometry(ctx, p), s = g.style, sa = num(p, 'margen'), hem = num(p, 'dobladillo'), gather = num(p, 'fruncido'), flutterH = num(p, 'anchoVolante');
  if (isChild(ctx.kind)) return invalid('vestido-adulto-talla', 'Este bloque es para personas adultas. Para niñas elige los vestidos de la colección infantil.');
  const needed = ['pecho', 'cadera', 'cintura', 'hombros', 'talleEspalda', 'cabeza'] as const;
  if (needed.some(key => !ctx.body[key] || !Number.isFinite(ctx.body[key])) || [g.length, g.ease, sa, hem, gather, flutterH].some(value => !Number.isFinite(value))
    || g.base < 650 || g.base > 1800 || g.ease < 80 || g.ease > 600 || g.length < 650 || g.length > 1550 || sa < 5 || sa > 15 || hem < 8 || hem > 35
    || gather < 1.2 || gather > 1.8 || flutterH < 45 || flutterH > 150 || g.bodyHeight <= g.arm + 25 || g.lowerHeights.some(h => h < 90) || g.neckX < 55)
    return invalid('vestido-adulto-medidas', 'Revisa las medidas: largo de 65–155 cm, holgura de 8–60 cm, paños de al menos 9 cm y cuerpo que cubra la sisa. Usa medidas adultas reales.');
  const slit = Math.min(180, g.bodyHeight - 120), front = bodice(g, false, sa, hem, slit), back = bodice(g, true, sa, hem, slit);
  const pieces: Piece[] = [front, back], seams: SeamRelation[] = [
    equal('hombros', 'Hombros delantero y espalda', [{ pieceId: 'delantero', edgeIds: ['hombro'] }], [{ pieceId: 'espalda', edgeIds: ['hombro'] }]),
    equal('costados-cuerpo', 'Costados del cuerpo', [{ pieceId: 'delantero', edgeIds: ['costado'] }], [{ pieceId: 'espalda', edgeIds: ['costado'] }])
  ];
  if (s.sleeve === 'integrada') seams.push(equal('axilas', 'Bajo de manga integrada', [{ pieceId: 'delantero', edgeIds: ['axila'] }], [{ pieceId: 'espalda', edgeIds: ['axila'] }]));
  const neckEdges = front.edges.filter(e => e.id.startsWith('escote')).map(e => e.id);
  const neckline = 2 * lens(front, neckEdges) + 2 * lens(back, neckEdges);
  const boundOpening = s.buttons ? 0 : 2 * slit;
  pieces.push(bindingStrip('bies-escote', 'Bies del escote', neckline, 8, 1, 10));
  seams.push(equal('ribete-escote', 'Bies y escote completo', [{ pieceId: 'bies-escote', edgeIds: ['largo-superior'] }], [{ pieceId: 'delantero', edgeIds: neckEdges, factor: 2 }, { pieceId: 'espalda', edgeIds: neckEdges, factor: 2 }]));
  if (!s.buttons) pieces.push(bindingStrip('bies-abertura', 'Bies de la abertura trasera', boundOpening, 6, 1, 10));
  let armhole = 0;
  if (s.sleeve !== 'integrada') {
    armhole = len(front, 'sisa') + len(back, 'sisa');
    if (s.sleeve === 'sin' || s.sleeve === 'volante') {
      pieces.push(bindingStrip('bies-sisa', 'Bies de sisa', armhole, 8, 2, 10));
      seams.push(equal('ribete-sisa', 'Cada bies con la sisa completa', [{ pieceId: 'bies-sisa', edgeIds: ['largo-superior'] }], [{ pieceId: 'delantero', edgeIds: ['sisa'] }, { pieceId: 'espalda', edgeIds: ['sisa'] }]));
      if (s.sleeve === 'volante') {
        for (const body of [front, back]) {
          const frill = rectangle(`volante-${body.id}`, `Volante de manga: ${body.id}`, len(body, 'sisa') * 1.6, flutterH, [edge('union', 'Fruncir a media sisa', 'sin-margen', 0), edge('extremo-a', 'Unión en hombro', 'costura', sa), edge('bajo', 'Bajo del volante', 'dobladillo', 8), edge('extremo-b', 'Unión en axila', 'costura', sa)], { qty: 2 }, true);
          frill.notches.push({ id: 'mitad', edgeId: 'union', s: len(body, 'sisa') * .8, count: 1, label: 'Repartir el frunce' });
          pieces.push(frill);
          seams.push(ratio(`volante-${body.id}`, `Fruncir cada volante a la sisa de ${body.id}`, 'fruncido', [{ pieceId: frill.id, edgeIds: ['union'] }], [{ pieceId: body.id, edgeIds: ['sisa'] }], 1.6));
        }
        seams.push(equal('cerrar-volantes', 'Extremos delantero y trasero de cada volante', [{ pieceId: 'volante-delantero', edgeIds: ['extremo-a', 'extremo-b'] }], [{ pieceId: 'volante-espalda', edgeIds: ['extremo-a', 'extremo-b'] }]));
      }
    } else {
      const L = s.sleeve === 'campana' ? 360 : 180, cuff = s.sleeve === 'campana' ? armhole * 1.4 : armhole * .8, half = armhole / 2;
      const sleeve = outline('manga', s.sleeve === 'campana' ? 'Manga campana de hombro caído' : 'Manga corta de hombro caído', [P(0, 0), P(L, half - cuff / 2), P(L, half + cuff / 2), P(0, armhole), P(0, half)], [
        edge('inferior-a', 'Costura bajo manga A', 'costura', sa), edge('puno', 'Bajo de manga', 'dobladillo', 12), edge('inferior-b', 'Costura bajo manga B', 'costura', sa), edge('copa-espalda', 'Sisa de espalda', 'costura', sa), edge('copa-delantero', 'Sisa del delantero', 'costura', sa)
      ], { qty: 2, mirrorPairs: true });
      sleeve.grain = { a: P(L * .2, half), b: P(L * .8, half) };
      sleeve.notches.push({ id: 'hombro', edgeId: 'copa-delantero', s: 0, count: 1, label: 'Hombro' });
      pieces.push(sleeve);
      seams.push(equal('manga-delantero', 'Manga con sisa delantera', [{ pieceId: 'manga', edgeIds: ['copa-delantero'] }], [{ pieceId: 'delantero', edgeIds: ['sisa'] }]),
        equal('manga-espalda', 'Manga con sisa trasera', [{ pieceId: 'manga', edgeIds: ['copa-espalda'] }], [{ pieceId: 'espalda', edgeIds: ['sisa'] }]),
        equal('cerrar-manga', 'Costura inferior de manga', [{ pieceId: 'manga', edgeIds: ['inferior-a'] }], [{ pieceId: 'manga', edgeIds: ['inferior-b'] }]));
    }
  }
  for (let i = 0; i < s.tiers; i++) {
    const last = i === s.tiers - 1, previousWidth = i ? g.lowerWidths[i - 1] : g.hemWidth;
    const top = s.cut === 'paneles' ? previousWidth : g.lowerWidths[i], bottom = g.lowerWidths[i];
    const fId = `falda-delantera-${i + 1}`, bId = `falda-espalda-${i + 1}`;
    pieces.push(lowerPanel(fId, `Paño delantero ${i + 1}${s.buttons ? ' en par con tapeta' : ' al doblez'}`, top, bottom, g.lowerHeights[i], sa, hem, last, !!s.buttons),
      lowerPanel(bId, `Paño trasero ${i + 1} al doblez`, top, bottom, g.lowerHeights[i], sa, hem, last, false));
    seams.push(equal(`costados-falda-${i + 1}`, `Costados del paño ${i + 1}`, [{ pieceId: fId, edgeIds: ['costado'] }], [{ pieceId: bId, edgeIds: ['costado'] }]));
    for (const [pieceId, previousId] of [[fId, i ? `falda-delantera-${i}` : 'delantero'], [bId, i ? `falda-espalda-${i}` : 'espalda']]) {
      const a = [{ pieceId, edgeIds: ['union'] }], b = [{ pieceId: previousId, edgeIds: ['bajo'] }];
      seams.push(s.cut === 'paneles' ? equal(`union-${pieceId}`, `Unir ${pieceId} al paño superior`, a, b)
        : ratio(`union-${pieceId}`, `Fruncir ${pieceId} al paño superior`, 'fruncido', a, b, gather, .01));
      if (s.buttons && pieceId === fId) seams.push(equal(`tapeta-${i + 1}`, 'Continuidad de tapeta sin fruncir', [{ pieceId, edgeIds: ['tapeta-arriba'] }], [{ pieceId: previousId, edgeIds: ['tapeta-bajo'] }]));
    }
  }
  const cutText = pieces.map(piece => `${piece.name}: ${piece.cut.qty}${piece.cut.onFold ? ' al doblez' : piece.cut.mirrorPairs ? ' en espejo' : ''}`).join('. ');
  const lowerIds = pieces.filter(piece => piece.id.startsWith('falda-')).map(piece => piece.id);
  const steps: SewingStep[] = [
    { id: 'cortar', title: 'Corta y marca cada pieza', detail: `${cutText}. El patrón ya incluye los márgenes. Marca los centros, piquetes, abertura y botones antes de retirar el papel.`, pieces: pieces.map(piece => piece.id) },
    ...(!s.buttons ? [{ id: 'espalda', title: 'Cierra la espalda y prepara la abertura', detail: `Une las dos espaldas desde abajo hasta la marca. Deja abiertos ${cm(slit)} desde el escote; ribetea esa abertura con su bies. Forma una pequeña presilla con un sobrante de bies y coloca un botón en el extremo opuesto.`, pieces: ['espalda', 'bies-abertura'] }] : []),
    { id: 'hombros', title: 'Une los hombros', detail: 'Coloca derecho con derecho, cose los hombros y termina los márgenes. Prueba la abertura antes de continuar.', pieces: ['delantero', 'espalda'], seams: ['hombros'] },
    ...(s.sleeve === 'corta' || s.sleeve === 'campana' ? [{ id: 'mangas', title: 'Monta las mangas en plano', detail: 'El piquete de mitad de manga coincide con el hombro. Une cada mitad a su sisa delantera o trasera. Después cierra el bajo de cada manga derecho con derecho.', pieces: ['delantero', 'espalda', 'manga'], seams: ['manga-delantero', 'manga-espalda', 'cerrar-manga'] }] : []),
    { id: 'costados', title: 'Cierra los costados del cuerpo', detail: s.sleeve === 'integrada' ? 'Cose el bajo de la manga integrada y continúa por el costado. Recorta solo el exceso de margen en la axila, sin cortar la costura. Termina la boca de manga con doble vuelta estrecha.' : 'Une delantero y espalda desde la sisa hasta el bajo del cuerpo. Termina y plancha los márgenes.', pieces: ['delantero', 'espalda'], seams: ['costados-cuerpo', ...(s.sleeve === 'integrada' ? ['axilas'] : [])] },
    ...(s.sleeve === 'volante' ? [{ id: 'volantes', title: 'Frunce los volantes de las mangas', detail: 'Une un volante delantero con uno trasero por sus extremos de hombro y axila para formar cada aro. Haz el dobladillo de 8 mm y frunce cada mitad a la medida exacta de su media sisa. Las costuras del aro coinciden con hombro y costado; sujeta con hilván sobre la sisa ya cerrada antes del bies.', pieces: ['volante-delantero', 'volante-espalda', 'delantero', 'espalda'], seams: ['volante-delantero', 'volante-espalda', 'cerrar-volantes'] }] : []),
    ...(s.tiers ? [{ id: 'panos', title: s.cut === 'paneles' ? 'Une los paneles lisos' : 'Monta la falda por niveles', detail: s.cut === 'paneles' ? 'Une los costados de cada nivel. Enfrenta los derechos de los niveles consecutivos, haciendo coincidir centros y costados: las líneas de unión tienen la misma longitud y no llevan frunce.' : `Cierra los costados de cada nivel. Frunce su canto superior a ${cm(iWidth(g, 0) * 4)} en el primer nivel y a la medida del bajo anterior en los siguientes. Une primero el nivel superior al cuerpo, luego los demás. ${s.buttons ? 'En los delanteros, no frunzas los 15 mm de cruce: las tapetas continúan rectas de un nivel a otro.' : 'Reparte el frunce por centros, costados y piquetes.'}`, pieces: ['delantero', 'espalda', ...lowerIds], seams: seams.filter(seam => seam.id.startsWith('union-') || seam.id.startsWith('tapeta-') || seam.id.startsWith('costados-falda')).map(seam => seam.id) }] : []),
    ...(s.buttons ? [{ id: 'tapetas', title: 'Dobla las tapetas y marca los cierres', detail: 'En ambos frentes dobla hacia dentro 3 cm y otros 3 cm usando los 6 cm añadidos fuera de la línea de borde. Pespuntea la vista. Superpone los centros marcados: el cruce total es de 3 cm. Distribuye botones y ojales cada 8–10 cm evitando las costuras horizontales. Refuerza el tramo a la altura del busto.', pieces: ['delantero', ...lowerIds.filter(id => id.includes('delantera'))] }] : []),
    { id: 'ribetes', title: 'Ribetea el escote y termina las sisas', detail: `Ribetea el escote sin añadir otro margen; ingleta las esquinas ${s.neck === 'cuadrado' ? 'del escote cuadrado' : s.neck === 'pico' ? 'del pico delantero' : 'si las hubiera'}. Deja el bies de escote abierto y dobla 1 cm en cada extremo para rematarlo junto a ${s.buttons ? 'las tapetas delanteras' : 'la abertura trasera'}. ${s.sleeve === 'sin' || s.sleeve === 'volante' ? `Aplica los bies de sisas cerrados en aro.${s.sleeve === 'volante' ? ' El volante queda atrapado debajo del ribete.' : ''}` : s.sleeve === 'integrada' ? 'La boca de manga integrada ya se terminó al cerrar los costados.' : 'Las mangas montadas se terminan con el dobladillo indicado.'}`, pieces: ['delantero', 'espalda', 'bies-escote', ...((s.sleeve === 'sin' || s.sleeve === 'volante') ? ['bies-sisa'] : [])], seams: ['ribete-escote', ...((s.sleeve === 'sin' || s.sleeve === 'volante') ? ['ribete-sisa'] : [])] },
    { id: 'probar', title: 'Prueba y termina el bajo', detail: `Prueba en tela económica: verifica paso de cabeza, busto, axilas, cadera y largo. Deja colgar 24 horas antes de nivelar los bajos con vuelo. Dobla el margen de ${cm(hem)} en dos pasos y pespuntea. Guarda tus ajustes antes de cortar la tela definitiva.`, pieces: s.tiers ? lowerIds.slice(-2) : ['delantero', 'espalda'] }
  ];
  const minimumHeadOpening = neckline + boundOpening;
  const underarm = (piece: Piece) => piece.nodes.find(node => node.id === piece.edges.find(edge => edge.id === 'costado')!.from)!;
  const bodyEnd = back.nodes.find(node => node.id === back.edges.find(edge => edge.id === 'costado')!.to)!.y;
  const lowerLength = pieces.filter(piece => piece.id.startsWith('falda-espalda-')).reduce((sum, piece) => sum + Math.max(...piece.nodes.map(node => node.y)) - Math.min(...piece.nodes.map(node => node.y)), 0);
  return { pieces, seams, checks: [
    { key: 'contorno-cuerpo', label: 'Contorno holgado del cuerpo', body: g.base, ease: g.ease, target: g.base + g.ease, measured: 2 * underarm(front).x + 2 * underarm(back).x, tolerance: .5 },
    { key: 'largo-total', label: 'Largo terminado desde hombro, incluidos todos los paños', target: g.length, measured: bodyEnd + lowerLength, tolerance: .5 }
  ], notices: [
    { level: 'aviso', code: 'vestido-adulto-experimental', message: 'Patrón experimental de vestido holgado: imprime a escala y cose una muestra antes de cortar la tela definitiva.' },
    ...(!s.buttons && minimumHeadOpening < (ctx.body.cabeza ?? 560) + 20 ? [{ level: 'error' as const, code: 'vestido-paso-cabeza', message: 'La abertura no permite el paso de la cabeza con holgura. Revisa las medidas y el escote.' }] : [])
  ], materials: [
    { id: 'tela', label: 'Tela de caída suave', qty: 'Según el acomodo real y el ancho de tu tela', note: s.wide || s.tiers > 1 ? 'Los paños anchos pueden necesitar uniones adicionales; distribúyelas simétricamente y añade margen solo a esos nuevos cortes.' : 'Prelava lino ligero, viscosa, algodón o chambray; prueba antes de cortar.' },
    { id: 'bies', label: 'Bies de algodón para escote, sisas y abertura', qty: cm(neckline + boundOpening + ((s.sleeve === 'sin' || s.sleeve === 'volante') ? 2 * armhole : 0) + 150) },
    { id: 'botones', label: s.buttons ? 'Botones y refuerzo para tapetas' : 'Botón plano para abertura de espalda', qty: s.buttons ? `${Math.ceil((g.length - 130) / 90)} botones de 12–15 mm; entretela ligera opcional` : '1 botón de 12 mm' },
    { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete' }
  ], assumptions: [
    s.description,
    `Bloque adulto holgado sin pinzas de busto ni entalle de cintura. Usa el mayor contorno entre busto, cintura y cadera (${cm(g.base)}) más ${cm(g.ease)} de holgura una sola vez.`,
    `El largo ${cm(g.length)} incluye cuerpo y todos los paños. El corte ${s.cut} se sitúa a ${cm(g.bodyHeight)} desde el hombro.`,
    s.buttons ? 'Tapeta integrada: cruce de 3 cm y 6 cm de margen para doble vuelta en cada frente. La zona de cruce no se frunce.' : 'La espalda se corta en dos mitades con abertura superior y botón; las faldas inferiores se cortan al doblez.',
    'El dibujo muestra la construcción en plano. No simula caída ni ajuste de busto. Para un vestido entallado se necesita otro bloque y una prueba física.',
    'No se reducen contornos por elasticidad; usa tejido plano flexible. Escotes y sisas al bies tienen margen cero; los demás márgenes se añaden por borde.'
  ], steps };
}
function iWidth(g: AdultDressGeometry, i: number): number { return i ? g.lowerWidths[i - 1] : g.hemWidth; }

export const adultDressGenerator: PatternGenerator = {
  id: 'vestido-estilos-adulto', name: 'Vestidos holgados por estilo', status: 'experimental',
  summary: 'Vestidos adultos con cuello, mangas, cortes, tapetas y paños calculados para cada construcción.',
  requiredMeasures: ['pecho', 'cadera', 'cintura', 'hombros', 'talleEspalda', 'cabeza'], optionalMeasures: ['estatura', 'brazo'],
  defaults: adultDressDefaults, generate: generateAdultDress,
  params: [
    { key: 'estilo', label: 'Construcción del vestido', group: 'diseno', type: 'choice', choices: ADULT_DRESS_STYLES.map(s => ({ value: s.id, label: s.name })) },
    { key: 'largo', label: 'Largo total desde el hombro, incluidos los paños', group: 'diseno', type: 'length', min: 650, max: 1550 },
    { key: 'fruncido', label: 'Frunce de cada nivel', group: 'diseno', type: 'ratio', min: 1.2, max: 1.8, when: p => { const s = adultDressStyle(str(p, 'estilo')); return !!s?.tiers && s.cut !== 'paneles'; } },
    { key: 'anchoVolante', label: 'Ancho de volante de manga', group: 'diseno', type: 'length', min: 45, max: 150, when: p => adultDressStyle(str(p, 'estilo'))?.sleeve === 'volante' },
    { key: 'holgura', label: 'Holgura sobre el mayor contorno corporal', group: 'holgura', type: 'length', min: 80, max: 600 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 15 },
    { key: 'dobladillo', label: 'Dobladillo del vestido', group: 'margenes', type: 'length', min: 8, max: 35 }
  ]
};
export const DRESS_STYLE_GENERATORS: PatternGenerator[] = [adultDressGenerator];

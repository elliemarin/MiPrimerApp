// Dibujos técnicos paramétricos (planos) en milímetros, talla de referencia adulta.
// Cada vista define zonas editables (para máscaras y relaciones), detalles de
// construcción, una línea de referencia compartida y la posición de los costados.
import type { Zone, ZoneType } from '../features/studio/model';

export type FlatViewKey = 'frente' | 'espalda' | 'costado-der' | 'costado-izq';

export interface FlatView {
  key: FlatViewKey;
  width: number;
  height: number;
  minX: number;
  minY: number;
  zones: Zone[];
  details: { d: string; style: 'costura' | 'pespunte' | 'doblez' | 'pliegue' }[];
  /** Puntos decorativos (botones, broches): centro y radio. */
  dots: { x: number; y: number; r: number }[];
  refY: number;
  refLabel: string;
  seams: { left?: number; right?: number; center?: number };
}

export interface FlatDef {
  id: string;
  views: FlatView[];
}

type P = [number, number];
const f = (n: number) => Math.round(n * 10) / 10;
const M = (p: P) => `M${f(p[0])} ${f(p[1])}`;
const Lp = (p: P) => `L${f(p[0])} ${f(p[1])}`;
const Q = (c: P, p: P) => `Q${f(c[0])} ${f(c[1])} ${f(p[0])} ${f(p[1])}`;
const C = (a: P, b: P, p: P) => `C${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])} ${f(p[0])} ${f(p[1])}`;
const poly = (pts: P[]) => pts.map((p, i) => (i ? Lp(p) : M(p))).join(' ') + ' Z';
const line = (a: P, b: P) => `${M(a)} ${Lp(b)}`;
const mx = (p: P): P => [-p[0], p[1]];
const rect = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)} a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`;

function zone(id: string, label: string, type: ZoneType, d: string): Zone {
  return { id, label, type, d };
}

function finishView(key: FlatViewKey, zones: Zone[], details: FlatView['details'], dots: FlatView['dots'], refY: number, refLabel: string, seams: FlatView['seams'], pad = 20): FlatView {
  // Caja aproximada a partir de los números de los trayectos.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const z of zones) {
    const nums = z.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    // Solo coordenadas absolutas (M, L, Q, C): pares x,y.
    if (/[a-z]/.test(z.d.replace(/e/g, ''))) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]);
      maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]);
      maxY = Math.max(maxY, nums[i + 1]);
    }
  }
  return { key, zones, details, dots, refY, refLabel, seams, minX: minX - pad, minY: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
}

// ---------------------------------------------------------------- Pantalones
export type LegStyle = 'recto' | 'ancho' | 'baggy' | 'barrel' | 'jogger' | 'palazzo' | 'pitillo' | 'cargo' | 'pinzas' | 'acampanado';
export interface PantsOpts {
  leg: LegStyle;
  length: 'largo' | 'tobillo' | 'capri' | 'short' | 'bermuda';
  waist: 'elastica' | 'pretina';
  bib?: boolean;
  pockets?: 'ninguno' | 'laterales' | 'cargo' | 'parche';
}

function pantsGeometry(o: PantsOpts) {
  const wb = o.waist === 'elastica' ? 45 : 38;
  const Hh = 265;
  const hipY = 200;
  const crotchY = 300;
  const L = { largo: 1020, tobillo: 940, capri: 760, bermuda: 560, short: 430 }[o.length];
  const legCenter = 140;
  const hemHalf = { recto: 105, ancho: 150, baggy: 140, barrel: 98, jogger: 82, palazzo: 205, pitillo: 72, cargo: 112, pinzas: 108, acampanado: 160 }[o.leg];
  const kneeHalf = { recto: 112, ancho: 140, baggy: 150, barrel: 150, jogger: 100, palazzo: 175, pitillo: 82, cargo: 118, pinzas: 115, acampanado: 102 }[o.leg];
  const waistHalf = o.waist === 'elastica' ? Hh - 18 : Hh - 40;
  const kneeY = crotchY + (L - crotchY) * 0.48;
  return { wb, Hh, hipY, crotchY, L, legCenter, hemHalf, kneeHalf, waistHalf, kneeY };
}

/** Pierna del lado izquierdo de la vista (x negativa). */
function legPath(o: PantsOpts, g: ReturnType<typeof pantsGeometry>): string {
  const { wb, Hh, hipY, crotchY, L, legCenter, hemHalf, kneeHalf, waistHalf, kneeY } = g;
  const outerHem: P = [-(legCenter + hemHalf), L];
  const innerHem: P = [-Math.max(8, legCenter - hemHalf), L];
  const shortLeg = L - crotchY < 300;
  const outerKnee: P = [-(legCenter + kneeHalf), kneeY];
  const innerKnee: P = [-Math.max(10, legCenter - kneeHalf), kneeY];
  let side: string;
  let inseam: string;
  if (shortLeg) {
    side = `${Lp([-waistHalf, wb])} ${Q([-Hh - 4, hipY - 60], [-Hh, hipY])} ${Lp(outerHem)}`;
    inseam = `${Lp(innerHem)} ${Lp([-6, crotchY])}`;
  } else if (o.leg === 'barrel' || o.leg === 'baggy') {
    side = `${Lp([-waistHalf, wb])} ${Q([-Hh - 4, hipY - 60], [-Hh, hipY])} ${C([-Hh - 30, kneeY - 120], [outerKnee[0] - 30, kneeY + 120], outerHem)}`;
    inseam = `${Lp(innerHem)} ${C([innerKnee[0] + 30, kneeY + 120], [-10, crotchY + 160], [-6, crotchY])}`;
  } else {
    side = `${Lp([-waistHalf, wb])} ${Q([-Hh - 4, hipY - 60], [-Hh, hipY])} ${Q([outerKnee[0] - 6, (hipY + kneeY) / 2], outerKnee)} ${Lp(outerHem)}`;
    inseam = `${Lp(innerHem)} ${Lp(innerKnee)} ${Q([-12, crotchY + 70], [-6, crotchY])}`;
  }
  return `${M([0, wb])} ${side} ${inseam} ${Q([-2, crotchY - 50], [0, crotchY - 80])} Z`;
}

function pantsView(key: FlatViewKey, o: PantsOpts): FlatView {
  const g = pantsGeometry(o);
  const { wb, waistHalf, Hh, L, legCenter, hemHalf, crotchY } = g;
  const leftLeg = legPath(o, g);
  const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(-Number(x))} ${y}`);
  const rightLeg = mirror(leftLeg);
  const back = key === 'espalda';
  const zones: Zone[] = [
    zone('pierna-a', back ? 'Pierna izquierda (espalda)' : 'Pierna derecha (frente)', 'pierna', leftLeg),
    zone('pierna-b', back ? 'Pierna derecha (espalda)' : 'Pierna izquierda (frente)', 'pierna', rightLeg),
    zone('pretina', 'Pretina', 'pretina', rect(-waistHalf, 0, waistHalf * 2, wb))
  ];
  const details: FlatView['details'] = [];
  details.push({ d: line([0, wb], [0, crotchY - 80]), style: 'costura' });
  if (o.waist === 'elastica') {
    for (let x = -waistHalf + 18; x < waistHalf - 10; x += 26) details.push({ d: line([x, 8], [x + 3, wb - 8]), style: 'pliegue' });
    if (!back) {
      details.push({ d: `${M([-14, wb])} ${Q([-24, wb + 50], [-40, wb + 80])}`, style: 'costura' });
      details.push({ d: `${M([14, wb])} ${Q([24, wb + 50], [40, wb + 80])}`, style: 'costura' });
    }
  } else {
    details.push({ d: line([-waistHalf, wb - 6], [waistHalf, wb - 6]), style: 'pespunte' });
    if (!back) details.push({ d: `${M([0, wb])} ${Lp([30, wb])} ${Lp([30, wb + 150])} ${Q([30, wb + 175], [0, wb + 190])}`, style: 'pespunte' });
    for (const x of [-waistHalf + 60, waistHalf - 60, -40, 40]) details.push({ d: rect(x - 5, 2, 10, wb - 4), style: 'costura' });
  }
  const shortLeg = L - crotchY < 300;
  if (!shortLeg || o.length === 'bermuda') {
    for (const s of [-1, 1]) {
      const outer = s * (legCenter + hemHalf);
      const inner = s * Math.max(8, legCenter - hemHalf);
      if (o.leg === 'jogger') {
        zones.push(zone(s < 0 ? 'puno-a' : 'puno-b', s < 0 ? 'Puño (vista izquierda)' : 'Puño (vista derecha)', 'puno', poly([[outer, L - 60], [inner, L - 60], [inner, L], [outer, L]])));
        for (let k = 0; k < 6; k++) {
          const t = (k + 1) / 7;
          const x = outer + (inner - outer) * t;
          details.push({ d: line([x, L - 54], [x, L - 6]), style: 'pliegue' });
        }
      } else details.push({ d: line([outer + s * -1, L - 25], [inner + s * 1, L - 25]), style: 'pespunte' });
    }
  }
  if (o.pockets === 'laterales' && !back) {
    for (const s of [-1, 1]) details.push({ d: `${M([s * (waistHalf - 75), wb])} ${Q([s * (waistHalf - 60), wb + 90], [s * (Hh - 2), 190])}`, style: 'costura' });
  }
  if ((o.pockets === 'parche' || o.pockets === 'laterales' || o.waist === 'pretina') && back) {
    for (const s of [-1, 1]) {
      const cx = s * 125;
      zones.push(zone(s < 0 ? 'bolsillo-a' : 'bolsillo-b', s < 0 ? 'Bolsillo trasero izquierdo' : 'Bolsillo trasero derecho', 'bolsillo', poly([[cx - 70, 95], [cx + 70, 95], [cx + 62, 225], [cx, 250], [cx - 62, 225]])));
    }
  }
  if (o.pockets === 'cargo' || o.leg === 'cargo') {
    for (const s of [-1, 1]) {
      const cx = s * (legCenter + 70);
      zones.push(zone(s < 0 ? 'cargo-a' : 'cargo-b', s < 0 ? 'Bolsillo cargo (vista izquierda)' : 'Bolsillo cargo (vista derecha)', 'bolsillo', rect(cx - 70, 470, 140, 170)));
      details.push({ d: line([cx - 70, 510], [cx + 70, 510]), style: 'costura' });
      details.push({ d: line([cx, 470], [cx, 640]), style: 'pliegue' });
    }
  }
  if (o.leg === 'pinzas' && !back) for (const s of [-1, 1]) details.push({ d: line([s * 70, wb], [s * 78, wb + 130]), style: 'pliegue' }, { d: line([s * 115, wb], [s * 120, wb + 110]), style: 'pliegue' });
  if (o.bib) {
    const top = -260;
    zones.push(zone('peto', back ? 'Espalda del peto' : 'Peto', back ? 'espalda' : 'delantero', poly([[-150, top], [150, top], [170, 0], [-170, 0]])));
    if (!back) zones.push(zone('bolsillo-peto', 'Bolsillo del peto', 'bolsillo', rect(-70, top + 50, 140, 120)));
    zones.push(zone('tirante-a', 'Tirante izquierdo de la vista', 'otra', poly([[-150, top], [-110, top], [-90, top - 140], [-130, top - 140]])));
    zones.push(zone('tirante-b', 'Tirante derecho de la vista', 'otra', poly([[150, top], [110, top], [90, top - 140], [130, top - 140]])));
    if (!back) for (const s of [-1, 1]) details.push({ d: circle(s * 130, top + 14, 9), style: 'costura' });
  }
  return finishView(key, zones, details, [], 0, 'Cintura', { left: -Hh, right: Hh, center: 0 });
}

function pantsSide(key: 'costado-der' | 'costado-izq', o: PantsOpts): FlatView {
  const g = pantsGeometry(o);
  const { wb, L } = g;
  const front = 150;
  const backD = 175;
  const hemHalf = g.hemHalf;
  const s = key === 'costado-der' ? 1 : -1; // delantero hacia x positiva en el costado derecho
  const P2 = (x: number, y: number): P => [s * x, y];
  const frontD = `${M(P2(0, wb))} ${Lp(P2(front - 8, wb))} ${Q(P2(front + 6, 160), P2(front - 4, 290))} ${Lp(P2(hemHalf, L))} ${Lp(P2(0, L))} Z`;
  const backPart = `${M(P2(0, wb))} ${Lp(P2(-backD + 20, wb - 4))} ${Q(P2(-backD - 25, 160), P2(-backD + 10, 300))} ${Lp(P2(-hemHalf, L))} ${Lp(P2(0, L))} Z`;
  const zones = [
    zone('lado-delantero', 'Costado (parte delantera)', 'costado', frontD),
    zone('lado-trasero', 'Costado (parte trasera)', 'costado', backPart),
    zone('pretina', 'Pretina', 'pretina', poly([P2(-backD + 20, -4), P2(front - 8, 0), P2(front - 8, wb), P2(-backD + 20, wb - 4)]))
  ];
  const details: FlatView['details'] = [{ d: line([0, wb], [0, L]), style: 'costura' }];
  if (o.leg === 'jogger') zones.push(zone('puno', 'Puño', 'puno', poly([P2(-hemHalf, L - 60), P2(hemHalf, L - 60), P2(hemHalf, L), P2(-hemHalf, L)])));
  if (o.pockets === 'cargo' || o.leg === 'cargo') zones.push(zone('cargo', 'Bolsillo cargo', 'bolsillo', rect(-70, 470, 140, 170)));
  return finishView(key, zones, details, [], 0, 'Cintura', { center: 0 });
}

// ---------------------------------------------------------------- Prendas superiores
export type TopType = 'camiseta' | 'camisa' | 'blusa' | 'sudadera' | 'hoodie' | 'chaleco' | 'chaqueta' | 'abrigo' | 'pijama';
export interface TopOpts {
  type: TopType;
  sleeve: 'sin' | 'corta' | 'tres-cuartos' | 'larga';
  neck: 'redondo' | 'v' | 'camisa' | 'capucha' | 'solapa' | 'alto';
  closure: 'ninguno' | 'botones' | 'cierre';
  length: number;
  cuffs?: boolean;
  pocket?: 'ninguno' | 'pecho' | 'canguro' | 'parche';
  hemBand?: boolean;
  fit?: number;
}

function topView(key: FlatViewKey, o: TopOpts): FlatView {
  const back = key === 'espalda';
  const fit = o.fit ?? 1;
  const neckHalf = 82;
  const shoulderX = 205 * fit;
  const shoulderY = 42;
  const chestHalf = 255 * fit;
  const armY = 235;
  const hemY = o.length;
  const hemHalf = chestHalf + (o.type === 'abrigo' ? 30 : o.type === 'blusa' ? 15 : 0);
  const neckDrop = back ? 22 : o.neck === 'v' ? 210 : o.neck === 'camisa' || o.neck === 'alto' ? 55 : o.neck === 'solapa' ? 260 : 85;
  const zones: Zone[] = [];
  const details: FlatView['details'] = [];
  const dots: FlatView['dots'] = [];
  // Cuerpo (mitad izquierda de la vista y espejo).
  const half: P[] = [
    [0, neckDrop],
    [-neckHalf, 0],
    [-shoulderX, shoulderY],
    [-chestHalf, armY],
    [-hemHalf, hemY]
  ];
  const neckCurve = (side: 1 | -1) => (back ? Q([side * neckHalf * 0.6, neckDrop], [side * neckHalf, 0]) : o.neck === 'v' || o.neck === 'solapa' ? Lp([side * neckHalf, 0]) : Q([side * neckHalf, neckDrop], [side * neckHalf, 0]));
  const bodyD = `${M([0, neckDrop])} ${neckCurve(-1)} ${Lp(half[2])} ${Q([-chestHalf + 10, (shoulderY + armY) / 2 + 20], half[3])} ${Lp(half[4])} ${Lp(mx(half[4]))} ${Lp(mx(half[3]))} ${Q([chestHalf - 10, (shoulderY + armY) / 2 + 20], mx(half[2]))} ${Lp(mx(half[1]))} ${back ? Q([neckHalf * 0.6 * -1 + neckHalf * 1.2, neckDrop], [0, neckDrop]) : o.neck === 'v' || o.neck === 'solapa' ? Lp([0, neckDrop]) : Q([neckHalf, neckDrop], [0, neckDrop])} Z`;
  if (o.closure !== 'ninguno' && !back) {
    zones.push(zone('delantero-a', 'Delantero derecho', 'delantero', `${M([0, neckDrop])} ${neckCurve(-1)} ${Lp(half[2])} ${Q([-chestHalf + 10, (shoulderY + armY) / 2 + 20], half[3])} ${Lp(half[4])} ${Lp([0, hemY])} Z`));
    const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(-Number(x))} ${y}`);
    zones.push(zone('delantero-b', 'Delantero izquierdo', 'delantero', mirror(zones[0].d)));
  } else zones.push(zone(back ? 'espalda' : 'delantero', back ? 'Espalda' : 'Delantero', back ? 'espalda' : 'delantero', bodyD));
  // Mangas: la sisa va del hombro (S) a la axila (U). En manga corta el bajo es
  // perpendicular a la manga; en larga la manga cuelga sobre el costado.
  if (o.sleeve !== 'sin' && o.type !== 'chaleco') {
    const S: P = [-shoulderX, shoulderY];
    const U: P = [-chestHalf, armY];
    const short = o.sleeve === 'corta';
    const len = { corta: 230, 'tres-cuartos': 470, larga: 620, sin: 0 }[o.sleeve];
    const theta = short ? 0.95 : o.sleeve === 'tres-cuartos' ? 0.3 : 0.24;
    const dir: P = [-Math.sin(theta), Math.cos(theta)];
    const inward: P = [Math.cos(theta), Math.sin(theta)];
    const outerEnd: P = [S[0] + dir[0] * len, S[1] + dir[1] * len];
    let innerEnd: P;
    if (short) {
      const proj = (U[0] - S[0]) * dir[0] + (U[1] - S[1]) * dir[1];
      const lenIn = Math.max(25, len - proj);
      innerEnd = [U[0] + dir[0] * lenIn, U[1] + dir[1] * lenIn];
    } else {
      const hemW = o.sleeve === 'tres-cuartos' ? 125 : 110;
      innerEnd = [outerEnd[0] + inward[0] * hemW, outerEnd[1] + inward[1] * hemW];
    }
    const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(-Number(x))} ${y}`);
    const sleeveL = `${M(S)} ${Lp(outerEnd)} ${Lp(innerEnd)} ${Lp(U)} ${Q([-chestHalf + 12, (shoulderY + armY) / 2 + 20], S)} Z`;
    zones.push(zone('manga-a', back ? 'Manga izquierda' : 'Manga derecha', 'manga', sleeveL));
    zones.push(zone('manga-b', back ? 'Manga derecha' : 'Manga izquierda', 'manga', mirror(sleeveL)));
    const hemDir: P = [innerEnd[0] - outerEnd[0], innerEnd[1] - outerEnd[1]];
    const hl = Math.hypot(hemDir[0], hemDir[1]) || 1;
    // Dirección a lo largo de la manga, hacia el hombro, para el puño o el dobladillo.
    const up: P = [-dir[0], -dir[1]];
    if (o.cuffs || o.type === 'sudadera' || o.type === 'hoodie' || (o.type === 'camisa' && o.sleeve === 'larga')) {
      const cuffH = o.type === 'camisa' ? 60 : 65;
      const a1: P = [outerEnd[0] + up[0] * cuffH, outerEnd[1] + up[1] * cuffH];
      const a2: P = [innerEnd[0] + up[0] * cuffH, innerEnd[1] + up[1] * cuffH];
      const cuffL = poly([a1, outerEnd, innerEnd, a2]);
      zones.push(zone('puno-a', back ? 'Puño izquierdo' : 'Puño derecho', 'puno', cuffL));
      zones.push(zone('puno-b', back ? 'Puño derecho' : 'Puño izquierdo', 'puno', mirror(cuffL)));
    } else {
      const h1: P = [outerEnd[0] + up[0] * 22, outerEnd[1] + up[1] * 22];
      const h2: P = [innerEnd[0] + up[0] * 22, innerEnd[1] + up[1] * 22];
      void hl;
      details.push({ d: line(h1, h2), style: 'pespunte' }, { d: line(mx(h1), mx(h2)), style: 'pespunte' });
    }
  }
  // Cuello y capucha
  if (o.neck === 'camisa' && !back) {
    zones.push(zone('cuello', 'Cuello', 'cuello', `${M([-neckHalf - 6, -6])} ${Q([0, 20], [neckHalf + 6, -6])} ${Lp([neckHalf - 20, 70])} ${Lp([4, neckDrop + 6])} ${Lp([-4, neckDrop + 6])} ${Lp([-neckHalf + 20, 70])} Z`));
  } else if (o.neck === 'camisa' && back) {
    zones.push(zone('cuello', 'Cuello', 'cuello', poly([[-neckHalf - 6, -14], [neckHalf + 6, -14], [neckHalf + 12, 40], [-neckHalf - 12, 40]])));
  } else if (o.neck === 'capucha') {
    if (back) {
      zones.push(zone('capucha', 'Capucha', 'capucha', `${M([-neckHalf - 40, 40])} ${C([-175, -110], [-120, -230], [0, -232])} ${C([120, -230], [175, -110], [neckHalf + 40, 40])} ${Q([0, 70], [-neckHalf - 40, 40])} Z`));
      details.push({ d: `${M([0, -230])} ${Lp([0, 52])}`, style: 'costura' });
    } else {
      zones.push(zone('capucha', 'Capucha', 'capucha', `${M([-neckHalf - 45, 45])} ${C([-180, -100], [-125, -225], [0, -228])} ${C([125, -225], [180, -100], [neckHalf + 45, 45])} ${Lp([0, neckDrop])} Z`));
      // Abertura de la cara y cordón.
      details.push({ d: `${M([0, neckDrop])} ${C([-70, 40], [-115, -60], [-78, -150])} ${C([-50, -200], [50, -200], [78, -150])} ${C([115, -60], [70, 40], [0, neckDrop])}`, style: 'costura' });
      details.push({ d: `${M([-14, neckDrop - 10])} ${Lp([-22, neckDrop + 70])} M14 ${f(neckDrop - 10)} ${Lp([22, neckDrop + 70])}`, style: 'costura' });
      dots.push({ x: -16, y: neckDrop - 6, r: 4 }, { x: 16, y: neckDrop - 6, r: 4 });
    }
  } else if (o.neck === 'solapa' && !back) {
    zones.push(zone('solapa-a', 'Solapa derecha', 'cuello', poly([[-neckHalf, 0], [-neckHalf - 30, -10], [-150, 160], [-60, 230], [0, neckDrop]])));
    zones.push(zone('solapa-b', 'Solapa izquierda', 'cuello', poly([[neckHalf, 0], [neckHalf + 30, -10], [150, 160], [60, 230], [0, neckDrop]])));
  } else if (o.neck === 'alto') {
    zones.push(zone('cuello', 'Cuello alto', 'cuello', poly([[-neckHalf - 4, -60], [neckHalf + 4, -60], [neckHalf + 4, back ? 22 : 50], [-neckHalf - 4, back ? 22 : 50]])));
  } else if (!back) {
    details.push({ d: `${M([-neckHalf, 0])} ${Q([-neckHalf, neckDrop + 22], [0, neckDrop + 22])} ${Q([neckHalf, neckDrop + 22], [neckHalf, 0])}`, style: 'pespunte' });
  }
  // Cierre
  if (o.closure === 'botones' && !back) {
    details.push({ d: line([-18, neckDrop], [-18, hemY]), style: 'pespunte' }, { d: line([18, neckDrop], [18, hemY]), style: 'pespunte' });
    const top = neckDrop + 40;
    const n = Math.max(3, Math.round((hemY - top) / 95));
    for (let i = 0; i < n; i++) dots.push({ x: 0, y: top + ((hemY - 60 - top) * i) / (n - 1), r: 8 });
  }
  if (o.closure === 'cierre' && !back) {
    details.push({ d: line([0, neckDrop], [0, hemY]), style: 'costura' }, { d: line([-7, neckDrop], [-7, hemY]), style: 'pespunte' }, { d: line([7, neckDrop], [7, hemY]), style: 'pespunte' });
  }
  // Bolsillos
  if (!back && o.pocket === 'pecho') zones.push(zone('bolsillo', 'Bolsillo de pecho', 'bolsillo', poly([[-170, 300], [-80, 300], [-80, 400], [-125, 415], [-170, 400]])));
  if (!back && o.pocket === 'canguro') zones.push(zone('bolsillo', 'Bolsillo canguro', 'bolsillo', `${M([-150, hemY - 270])} ${Lp([150, hemY - 270])} ${Lp([195, hemY - 70])} ${Lp([-195, hemY - 70])} Z`));
  if (!back && o.pocket === 'parche') for (const s of [-1, 1]) zones.push(zone(`bolsillo-${s < 0 ? 'a' : 'b'}`, s < 0 ? 'Bolsillo derecho' : 'Bolsillo izquierdo', 'bolsillo', rect(s * 150 - 70, hemY - 250, 140, 150)));
  if (o.hemBand || o.type === 'sudadera' || o.type === 'hoodie') zones.push(zone('pretina', 'Pretina inferior', 'pretina', rect(-hemHalf + 6, hemY - 70, (hemHalf - 6) * 2, 70)));
  else details.push({ d: line([-hemHalf + 2, hemY - 24], [hemHalf - 2, hemY - 24]), style: 'pespunte' });
  if (o.type === 'camisa' && back) zones.push(zone('canesu', 'Canesú', 'canesu', `${M([-shoulderX, shoulderY])} ${Lp([shoulderX, shoulderY])} ${Lp([chestHalf - 25, 130])} ${Lp([-chestHalf + 25, 130])} Z`));
  return finishView(key, zones, details, dots, 0, 'Hombro', { left: -chestHalf, right: chestHalf, center: 0 });
}

function topSide(key: 'costado-der' | 'costado-izq', o: TopOpts): FlatView {
  const s = key === 'costado-der' ? 1 : -1;
  const P2 = (x: number, y: number): P => [s * x, y];
  const depthF = 135;
  const depthB = 125;
  const hemY = o.length;
  const body = `${M(P2(-60, 0))} ${Lp(P2(40, 0))} ${Q(P2(depthF + 25, 120), P2(depthF, 300))} ${Lp(P2(depthF + 10, hemY))} ${Lp(P2(-depthB - 10, hemY))} ${Lp(P2(-depthB, 300))} ${Q(P2(-depthB - 10, 100), P2(-60, 0))} Z`;
  const zones = [zone('costado', 'Costado', 'costado', body)];
  if (o.sleeve !== 'sin' && o.type !== 'chaleco') {
    const len = { corta: 200, 'tres-cuartos': 460, larga: 610, sin: 0 }[o.sleeve];
    zones.push(zone('manga', 'Manga', 'manga', `${M(P2(-55, 30))} ${Q(P2(0, 0), P2(55, 30))} ${Lp(P2(50, 30 + len))} ${Lp(P2(-50, 30 + len))} Z`));
  }
  if (o.neck === 'capucha') zones.push(zone('capucha', 'Capucha', 'capucha', `${M(P2(30, 10))} ${C(P2(80, -170), P2(-170, -200), P2(-150, 40))} Z`));
  return finishView(key, zones, [{ d: line(P2(0, 240), P2(0, hemY)), style: 'costura' }], [], 0, 'Hombro', { center: 0 });
}

// ---------------------------------------------------------------- Faldas y vestidos
export interface SkirtOpts {
  shape: 'recta' | 'a' | 'fruncida' | 'circular' | 'tableada';
  length: number;
  waist: 'elastica' | 'pretina';
  yTop?: number;
}

function skirtZones(o: SkirtOpts, back: boolean): { zones: Zone[]; details: FlatView['details'] } {
  const y0 = o.yTop ?? 0;
  const wb = o.waist === 'elastica' ? 40 : 34;
  const W = o.waist === 'elastica' ? 190 : 175;
  const hipY = y0 + 190;
  const hip = 245;
  const L = y0 + o.length;
  const hem = { recta: 230, a: 330, fruncida: 360, circular: 470, tableada: 380 }[o.shape];
  const zones: Zone[] = [];
  const details: FlatView['details'] = [];
  let body: string;
  if (o.shape === 'circular') body = `${M([-W, y0 + wb])} ${Lp([W, y0 + wb])} ${Q([hip + 60, hipY], [hem, L - 30])} ${Q([hem * 0.5, L + 18], [0, L - 10])} ${Q([-hem * 0.5, L + 18], [-hem, L - 30])} ${Q([-hip - 60, hipY], [-W, y0 + wb])} Z`;
  else if (o.shape === 'recta') body = `${M([-W, y0 + wb])} ${Lp([W, y0 + wb])} ${Q([hip + 8, hipY - 70], [hip, hipY])} ${Lp([hem, L])} ${Lp([-hem, L])} ${Lp([-hip, hipY])} ${Q([-hip - 8, hipY - 70], [-W, y0 + wb])} Z`;
  else body = `${M([-W, y0 + wb])} ${Lp([W, y0 + wb])} ${Q([W + 60, hipY], [hem, L])} ${Lp([-hem, L])} ${Q([-W - 60, hipY], [-W, y0 + wb])} Z`;
  zones.push(zone(back ? 'falda-espalda' : 'falda-delantera', back ? 'Falda (espalda)' : 'Falda (delantero)', back ? 'espalda' : 'delantero', body));
  zones.push(zone('pretina', 'Pretina', 'pretina', rect(-W, y0, W * 2, wb)));
  if (o.waist === 'elastica') for (let x = -W + 16; x < W - 10; x += 24) details.push({ d: line([x, y0 + 8], [x + 2, y0 + wb - 8]), style: 'pliegue' });
  if (o.shape === 'fruncida') for (let x = -W + 20; x < W; x += 34) details.push({ d: line([x, y0 + wb], [x * (hem / W) * 0.95, y0 + wb + (L - y0) * 0.35]), style: 'pliegue' });
  if (o.shape === 'tableada') for (let x = -W + 30; x < W; x += 52) details.push({ d: line([x, y0 + wb], [x * (hem / W), L]), style: 'pliegue' });
  details.push({ d: line([-hem + 4, L - 22], [hem - 4, L - 22]), style: 'pespunte' });
  return { zones, details };
}

function skirtView(key: FlatViewKey, o: SkirtOpts): FlatView {
  const { zones, details } = skirtZones(o, key === 'espalda');
  return finishView(key, zones, details, [], 0, 'Cintura', { left: -245, right: 245, center: 0 });
}

export interface DressOpts {
  sleeve: TopOpts['sleeve'];
  neck: 'redondo' | 'v' | 'camisa';
  skirt: SkirtOpts['shape'];
  length: number;
}

function dressView(key: FlatViewKey, o: DressOpts): FlatView {
  const back = key === 'espalda';
  const top = topView(key, { type: 'blusa', sleeve: o.sleeve, neck: o.neck, closure: 'ninguno', length: 400, fit: 0.92 });
  const sk = skirtZones({ shape: o.skirt, length: o.length - 400, waist: 'pretina', yTop: 386 }, back);
  const bodice = top.zones.filter((z) => z.type !== 'pretina');
  const zones = [...bodice, ...sk.zones.map((z) => (z.type === 'pretina' ? { ...z, id: 'cinturilla', label: 'Cinturilla', d: z.d } : z))];
  const details = [...top.details.filter((d) => !d.d.includes(' 376')), ...sk.details];
  return finishView(key, zones, details, top.dots, 0, 'Hombro', { left: -235, right: 235, center: 0 });
}

// ---------------------------------------------------------------- Bebé
function babyBodyView(key: FlatViewKey, o: { legs: 'body' | 'mameluco'; sleeve: TopOpts['sleeve'] }): FlatView {
  const back = key === 'espalda';
  const s = 0.42;
  const top = topView(key, { type: 'camiseta', sleeve: o.sleeve, neck: 'redondo', closure: 'ninguno', length: 700, fit: 1 });
  const scale = (d: string) => d.replace(/-?\d+(?:\.\d+)?/g, (n) => f(Number(n) * s).toString());
  const zones = top.zones.filter((z) => z.type === 'manga' || z.type === 'puno').map((z) => ({ ...z, d: scale(z.d) }));
  const W = 255 * s;
  const neck = 82 * s;
  const sh = 205 * s;
  const shY = 42 * s;
  const arm = 235 * s;
  const drop = back ? 10 : 36;
  let body: string;
  if (o.legs === 'body') {
    body = `${M([0, drop])} ${Q([-neck, drop], [-neck, 0])} ${Lp([-sh, shY])} ${Lp([-W, arm])} ${Lp([-W, 230])} ${Q([-W + 4, 300], [-38, 320])} ${Lp([38, 320])} ${Q([W - 4, 300], [W, 230])} ${Lp([W, arm])} ${Lp([sh, shY])} ${Lp([neck, 0])} ${Q([neck, drop], [0, drop])} Z`;
  } else {
    body = `${M([0, drop])} ${Q([-neck, drop], [-neck, 0])} ${Lp([-sh, shY])} ${Lp([-W, arm])} ${Lp([-W - 4, 260])} ${Lp([-112, 560])} ${Lp([-28, 560])} ${Lp([-12, 330])} ${Lp([12, 330])} ${Lp([28, 560])} ${Lp([112, 560])} ${Lp([W + 4, 260])} ${Lp([W, arm])} ${Lp([sh, shY])} ${Lp([neck, 0])} ${Q([neck, drop], [0, drop])} Z`;
  }
  zones.unshift(zone(back ? 'espalda' : 'delantero', back ? 'Espalda' : 'Delantero', back ? 'espalda' : 'delantero', body));
  const details: FlatView['details'] = [];
  const dots: FlatView['dots'] = [];
  if (o.legs === 'body') for (const x of [-20, 0, 20]) dots.push({ x, y: 312, r: 3.5 });
  else {
    details.push({ d: line([-12, 330], [-28, 560]), style: 'pespunte' });
    if (!back) for (let i = 0; i < 6; i++) dots.push({ x: 0, y: 70 + i * 42, r: 3.5 });
  }
  return finishView(key, zones, details, dots, 0, 'Hombro', { left: -W, right: W, center: 0 });
}

// ---------------------------------------------------------------- Bolsos y accesorios
function bagView(key: FlatViewKey, kind: 'tote' | 'neceser' | 'bandolera'): FlatView {
  const back = key === 'espalda';
  const zones: Zone[] = [];
  const details: FlatView['details'] = [];
  if (kind === 'tote') {
    zones.push(zone(back ? 'espalda' : 'delantero', back ? 'Cara trasera' : 'Cara delantera', back ? 'espalda' : 'delantero', rect(-190, 0, 380, 400)));
    zones.push(zone('asa', 'Asa', 'otra', `${M([-120, 0])} ${C([-120, -250], [120, -250], [120, 0])} ${Lp([88, 0])} ${C([88, -205], [-88, -205], [-88, 0])} Z`));
    zones.push(zone('asa-costado-a', 'Unión del asa', 'otra', rect(-122, 0, 34, 70)));
    zones.push(zone('asa-costado-b', 'Unión del asa', 'otra', rect(88, 0, 34, 70)));
    details.push({ d: line([-190, 30], [190, 30]), style: 'pespunte' });
    if (!back) zones.push(zone('bolsillo', 'Bolsillo exterior', 'bolsillo', rect(-110, 170, 220, 170)));
  } else if (kind === 'neceser') {
    zones.push(zone(back ? 'espalda' : 'delantero', back ? 'Cara trasera' : 'Cara delantera', back ? 'espalda' : 'delantero', `${M([-130, 20])} ${Lp([130, 20])} ${Q([140, 20], [140, 30])} ${Lp([140, 170])} ${Q([140, 180], [130, 180])} ${Lp([-130, 180])} ${Q([-140, 180], [-140, 170])} ${Lp([-140, 30])} ${Q([-140, 20], [-130, 20])} Z`));
    details.push({ d: line([-128, 20], [128, 20]), style: 'costura' }, { d: line([-128, 28], [128, 28]), style: 'pespunte' });
    zones.push(zone('tirador', 'Tirador', 'otra', rect(118, 8, 40, 22)));
  } else {
    zones.push(zone(back ? 'espalda' : 'delantero', back ? 'Cara trasera' : 'Cara delantera', back ? 'espalda' : 'delantero', rect(-130, 0, 260, 200)));
    if (!back) zones.push(zone('solapa', 'Solapa', 'otra', `${M([-130, 0])} ${Lp([130, 0])} ${Lp([130, 110])} ${Q([0, 150], [-130, 110])} Z`));
    zones.push(zone('correa', 'Correa', 'otra', `${M([-130, 10])} ${C([-140, -420], [140, -420], [130, 10])} L112 10 ${C([120, -390], [-120, -390], [-112, 10])} Z`));
  }
  return finishView(key, zones, details, [], 0, 'Boca', { center: 0 });
}

function accessoryView(key: FlatViewKey, kind: 'babero' | 'gorro' | 'parche' | 'cojin' | 'funda-bebida' | 'dona' | 'bandana' | 'rectangulo' | 'delantal' | 'antifaz' | 'banderin', object?: { width: number; height: number; label: string }): FlatView {
  const zones: Zone[] = [];
  const details: FlatView['details'] = [];
  if (kind === 'babero') {
    zones.push(zone('base', 'Babero', 'base', `${M([-40, 0])} ${Q([-40, 50], [0, 52])} ${Q([40, 50], [40, 0])} ${Lp([70, -10])} ${Q([120, 40], [120, 130])} ${Q([110, 240], [0, 250])} ${Q([-110, 240], [-120, 130])} ${Q([-120, 40], [-70, -10])} Z`));
    details.push({ d: `${M([-100, 140])} ${Q([-90, 220], [0, 228])} ${Q([90, 220], [100, 140])}`, style: 'pespunte' });
  } else if (kind === 'gorro') {
    zones.push(zone('base', 'Gorro', 'base', `${M([-120, 220])} ${Lp([-120, 120])} ${C([-120, -20], [120, -20], [120, 120])} ${Lp([120, 220])} Z`));
    zones.push(zone('pretina', 'Doblez', 'pretina', rect(-124, 160, 248, 70)));
  } else if (kind === 'rectangulo') {
    const w = object?.width ?? 300, h = object?.height ?? 200;
    zones.push(zone('base', object?.label ?? 'Base rectangular', 'base', rect(-w / 2, 0, w, h)));
    details.push({ d: rect(-w / 2 + 5, 5, w - 10, h - 10), style: 'pespunte' });
  } else if (kind === 'delantal') {
    zones.push(zone('cuerpo', 'Cuerpo del delantal', 'base', 'M-120 0 L120 0 Q120 180 290 240 L300 780 L-300 780 L-290 240 Q-120 180 -120 0 Z'));
    zones.push(zone('bolsillo', 'Bolsillo frontal', 'base', rect(-150, 380, 300, 200)));
    zones.push(zone('cuello', 'Cinta de cuello', 'base', 'M-120 0 L-120 -130 Q0 -250 120 -130 L120 0 L95 0 L95 -110 Q0 -205 -95 -110 L-95 0 Z'));
    zones.push(zone('lazo-a', 'Lazo izquierdo', 'base', rect(-560, 240, 270, 35)));
    zones.push(zone('lazo-b', 'Lazo derecho', 'base', rect(290, 240, 270, 35)));
  } else if (kind === 'antifaz') {
    zones.push(zone('base', 'Cara del antifaz', 'base', 'M-100 0 C-100 -55 -50 -60 0 -35 C50 -60 100 -55 100 0 C100 55 35 50 15 20 Q0 0 -15 20 C-35 50 -100 55 -100 0 Z'));
  } else if (kind === 'banderin') {
    const w = object?.width ?? 180, h = object?.height ?? 240;
    zones.push(zone('base', 'Banderín', 'base', poly([[-w / 2, 0], [w / 2, 0], [0, h]])));
    details.push({ d: line([-w / 2, 15], [w / 2, 15]), style: 'doblez' });
  } else if (kind === 'funda-bebida') {
    zones.push(zone('base', 'Exterior de la funda abierta', 'base', rect(-120, 0, 240, 110)));
    zones.push(zone('cierre', 'Traslape de velcro', 'base', rect(95, 0, 25, 110)));
    details.push({ d: rect(-115, 5, 230, 100), style: 'pespunte' });
  } else if (kind === 'bandana') {
    zones.push(zone('base', 'Cara de la bandana', 'base', poly([[-350, 0], [350, 0], [0, 300]])));
    details.push({ d: poly([[-330, 7], [330, 7], [0, 287]]), style: 'pespunte' });
  } else if (kind === 'dona') {
    // Continuous ring in absolute cubic coordinates, including the inner opening.
    zones.push(zone('base', 'Dona de tela', 'base', 'M-85 0 C-85 -48 -48 -85 0 -85 C48 -85 85 -48 85 0 C85 48 48 85 0 85 C-48 85 -85 48 -85 0 Z M-25 0 C-25 14 -14 25 0 25 C14 25 25 14 25 0 C25 -14 14 -25 0 -25 C-14 -25 -25 -14 -25 0 Z'));
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; details.push({ d: line([Math.cos(a) * 32, Math.sin(a) * 32], [Math.cos(a + 0.08) * 78, Math.sin(a + 0.08) * 78]), style: 'pliegue' }); }
  } else if (kind === 'cojin') {
    zones.push(zone('base', 'Funda', 'base', rect(-200, -200, 400, 400)));
  } else {
    zones.push(zone('base', 'Base del parche', 'base', `${M([0, -50])} ${C([28, -50], [50, -28], [50, 0])} ${C([50, 28], [28, 50], [0, 50])} ${C([-28, 50], [-50, 28], [-50, 0])} ${C([-50, -28], [-28, -50], [0, -50])} Z`));
    details.push({ d: `${M([0, -44])} ${C([24, -44], [44, -24], [44, 0])} ${C([44, 24], [24, 44], [0, 44])} ${C([-24, 44], [-44, 24], [-44, 0])} ${C([-44, -24], [-24, -44], [0, -44])} Z`, style: 'pespunte' });
  }
  return finishView(key, zones, details, [], 0, 'Borde superior', { center: 0 });
}

// ---------------------------------------------------------------- Registro
export interface FlatSpec {
  family: 'pantalon' | 'top' | 'falda' | 'vestido' | 'bebe' | 'bolso' | 'accesorio';
  pants?: PantsOpts;
  top?: TopOpts;
  skirt?: SkirtOpts;
  dress?: DressOpts;
  baby?: { legs: 'body' | 'mameluco'; sleeve: TopOpts['sleeve'] };
  bag?: 'tote' | 'neceser' | 'bandolera';
  accessory?: 'babero' | 'gorro' | 'parche' | 'cojin' | 'funda-bebida' | 'dona' | 'bandana' | 'rectangulo' | 'delantal' | 'antifaz' | 'banderin';
  object?: { width: number; height: number; label: string };
  /** Pijama: conjunto de superior y pantalón. */
  set?: boolean;
}

export function buildFlat(id: string, spec: FlatSpec): FlatDef {
  const views: FlatView[] = [];
  const keys: FlatViewKey[] = ['frente', 'espalda'];
  switch (spec.family) {
    case 'pantalon':
      for (const k of keys) views.push(pantsView(k, spec.pants!));
      views.push(pantsSide('costado-der', spec.pants!), pantsSide('costado-izq', spec.pants!));
      break;
    case 'top':
      for (const k of keys) views.push(topView(k, spec.top!));
      views.push(topSide('costado-der', spec.top!), topSide('costado-izq', spec.top!));
      break;
    case 'falda':
      for (const k of keys) views.push(skirtView(k, spec.skirt!));
      break;
    case 'vestido':
      for (const k of keys) views.push(dressView(k, spec.dress!));
      break;
    case 'bebe':
      for (const k of keys) views.push(babyBodyView(k, spec.baby!));
      break;
    case 'bolso':
      for (const k of keys) views.push(bagView(k, spec.bag!));
      break;
    case 'accesorio':
      views.push(accessoryView('frente', spec.accessory!, spec.object));
      break;
  }
  return { id, views };
}

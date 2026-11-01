import { Pt, add, mul, norm, sub, dist } from '../../geom/vec';
import { cubicLength } from '../../geom/bezier';
import { formatLength } from '../../units';
import type { Issue, MeasureCheck, Notch, PEdge, Piece, PNode, SeamRelation } from '../types';
import { GeneratorContext, GeneratorResult, Params, PatternGenerator, isChild, num, round1, str } from '../generator';

type Style = 'recto' | 'ancho' | 'jogger' | 'bombacho';

const EASE_FACTOR: Record<'plano' | 'punto', Record<string, number>> = {
  plano: { ajustado: 0.06, regular: 0.1, holgado: 0.16, oversize: 0.24 },
  punto: { ajustado: 0.0, regular: 0.05, holgado: 0.1, oversize: 0.18 }
};

function legWidthEstimate(he: number) {
  return he * (0.5 + 1 / 16 + 1 / 10);
}

export function pantsDefaults(ctx: GeneratorContext): Params {
  const b = ctx.body;
  const H = b.cadera ?? 900;
  const kind = ctx.kind;
  const child = isChild(kind);
  const diaper = kind === 'bebe' ? 25 : kind === 'toddler' ? 15 : 0;
  const hipEase = round1(H * EASE_FACTOR[ctx.fabric][ctx.fit]);
  const fitRise = { ajustado: -5, regular: 0, holgado: 5, oversize: 10 }[ctx.fit];
  const baseRise = kind === 'bebe' ? 10 : child ? 15 : 20;
  const riseEase = Math.max(0, (ctx.fabric === 'punto' ? baseRise * 0.5 : baseRise) + fitRise);
  const length = b.largoExterior ?? (b.tiro ?? 0) + (b.entrepierna ?? 0);
  const he = H + hipEase + diaper * 1.2;
  const legW = legWidthEstimate(he);
  const ankle = b.tobillo;
  return {
    estilo: 'recto',
    largo: round1(length),
    bajo: round1(legW * 0.62),
    bajoJogger: round1(Math.max(ankle ? ankle * 1.45 : 0, legW * 0.42)),
    holguraCadera: hipEase,
    holguraTiro: riseEase,
    panal: diaper,
    anchoElastico: kind === 'bebe' ? 15 : child ? 20 : 25,
    margen: 10,
    dobladillo: kind === 'bebe' ? 20 : child ? 25 : 30,
    altoPuno: kind === 'bebe' ? 35 : child ? 45 : 60,
    holguraPuno: child ? 10 : 20,
    volantito: 0,
    corte: 'completo',
    cintura: 'elastica',
    anchoPretina: child ? 30 : 40,
    amplitudBajo: 0,
    bolsillos: 'ninguno',
    cordon: 'no',
    volante: 'no',
    altoVolante: round1((b.entrepierna ?? 500) * (child ? 0.2 : 0.17)),
    fruncidoVolante: 1.6,
    alforzas: 0,
    proporcionElastico: kind === 'bebe' ? 0.95 : child ? 0.92 : 0.9
  };
}

interface Leg {
  nodes: PNode[];
  edges: PEdge[];
  knee: boolean;
}

/** Construye la parte de la pierna: entrepierna, bajo y costado inferior. */
function buildLeg(opts: {
  tip: Pt;
  sideAtCrotch: Pt;
  crease: number;
  yCrotch: number;
  L: number;
  hemW: number;
  kneeW: number | null;
  /** Both legs share the same finished knee level, despite back crotch drop. */
  kneeY?: number;
  seam: number;
  hemAllowance: number;
  hemFinish: 'dobladillo' | 'costura' | 'jareta';
}): Leg {
  const { tip, sideAtCrotch, crease, yCrotch, L, hemW, kneeW, seam, hemAllowance, hemFinish } = opts;
  const hIn: Pt = { x: crease + hemW / 2, y: L };
  const hOut: Pt = { x: crease - hemW / 2, y: L };
  const nodes: PNode[] = [];
  const edges: PEdge[] = [];
  const seamEdge = (id: string, label: string, from: string, to: string, extra: Partial<PEdge> = {}): PEdge => ({
    id,
    label,
    from,
    to,
    kind: 'line',
    allowance: seam,
    finish: 'costura',
    ...extra
  });
  if (kneeW !== null) {
    const yK = opts.kneeY ?? yCrotch + (L - yCrotch) * 0.45;
    const kIn: Pt = { x: crease + kneeW / 2, y: yK };
    const kOut: Pt = { x: crease - kneeW / 2, y: yK };
    const run = yK - yCrotch;
    const dirIn = norm(sub(hIn, kIn));
    const dirOut = norm(sub(kOut, hOut));
    nodes.push({ id: 'rodilla-int', ...kIn }, { id: 'bajo-int', ...hIn }, { id: 'bajo-ext', ...hOut }, { id: 'rodilla-ext', ...kOut });
    edges.push(
      seamEdge('entrepierna-sup', 'Entrepierna (tiro a rodilla)', 'tiro-punta', 'rodilla-int', {
        kind: 'cubic',
        c1: { x: tip.x - (tip.x - kIn.x) * 0.15, y: tip.y + run * 0.35 },
        c2: sub(kIn, mul(dirIn, run * 0.35))
      }),
      seamEdge('entrepierna-inf', 'Entrepierna (rodilla a bajo)', 'rodilla-int', 'bajo-int'),
      seamEdge('bajo', 'Bajo', 'bajo-int', 'bajo-ext', { allowance: hemAllowance, finish: hemFinish }),
      seamEdge('lateral-inf', 'Costado (bajo a rodilla)', 'bajo-ext', 'rodilla-ext'),
      seamEdge('lateral-med', 'Costado (rodilla a tiro)', 'rodilla-ext', 'cadera-lateral', {
        kind: 'cubic',
        c1: add(kOut, mul(dirOut, run * 0.35)),
        c2: { x: sideAtCrotch.x, y: sideAtCrotch.y + run * 0.35 }
      })
    );
    return { nodes, edges, knee: true };
  }
  const run = L - yCrotch;
  const dirIn = norm(sub(hIn, tip));
  nodes.push({ id: 'bajo-int', ...hIn }, { id: 'bajo-ext', ...hOut });
  edges.push(
    seamEdge('entrepierna', 'Entrepierna', 'tiro-punta', 'bajo-int', {
      kind: 'cubic',
      c1: { x: tip.x - (tip.x - hIn.x) * 0.1, y: tip.y + run * 0.3 },
      c2: sub(hIn, mul(dirIn, run * 0.3))
    }),
    seamEdge('bajo', 'Bajo', 'bajo-int', 'bajo-ext', { allowance: hemAllowance, finish: hemFinish }),
    seamEdge('lateral-inf', 'Costado (bajo a tiro)', 'bajo-ext', 'cadera-lateral', {
      kind: 'cubic',
      c1: add(hOut, mul(norm(sub(sideAtCrotch, hOut)), run * 0.3)),
      c2: { x: sideAtCrotch.x, y: sideAtCrotch.y + run * 0.3 }
    })
  );
  return { nodes, edges, knee: false };
}

function lenOf(piece: { nodes: PNode[] }, e: PEdge): number {
  const a = piece.nodes.find((n) => n.id === e.from)!;
  const b = piece.nodes.find((n) => n.id === e.to)!;
  if (e.kind === 'cubic' && e.c1 && e.c2) return cubicLength({ p0: a, c1: e.c1, c2: e.c2, p3: b });
  return dist(a, b);
}

const inseamIds = (knee: boolean) => (knee ? ['entrepierna-sup', 'entrepierna-inf'] : ['entrepierna']);
const sideIds = (knee: boolean) => (knee ? ['lateral-inf', 'lateral-med', 'lateral-sup'] : ['lateral-inf', 'lateral-sup']);

export function generatePants(ctx: GeneratorContext, P: Params): GeneratorResult {
  const b = ctx.body;
  const H = b.cadera!;
  const W = b.cintura!;
  const CD = b.tiro!;
  const style = str(P, 'estilo', 'recto') as Style;
  const D = num(P, 'panal');
  const SA = num(P, 'margen', 10);
  const hemA = num(P, 'dobladillo', 30);
  const elastic = num(P, 'anchoElastico', 25);
  const casingDepth = elastic + 5;
  const casingAllowance = casingDepth + 10;
  const largoParam = num(P, 'largo');
  let hemCirc = style === 'jogger' ? num(P, 'bajoJogger') : num(P, 'bajo');

  // Holgura aplicada una sola vez: medida terminada = cuerpo + holgura (+ pañal).
  const hipEase = num(P, 'holguraCadera') + D * 1.2;
  const He = H + hipEase;
  const riseEase = num(P, 'holguraTiro') + D;
  const R = CD + riseEase;
  // Cropped cuts follow the body: the leg below the crotch is a share of the inseam.
  const corte = str(P, 'corte', 'completo');
  const CUT_SHARE: Record<string, number> = { capri: 0.62, bermuda: 0.38, short: 0.2 };
  const Lfin = corte in CUT_SHARE ? R + Math.max(45, (b.entrepierna ?? largoParam - CD) * CUT_SHARE[corte]) : largoParam;
  // A hem ruffle replaces the bottom of the leg; pintucks (5 mm deep) need extra cut length.
  const ruffle = str(P, 'volante', 'no') === 'si' && style !== 'jogger', ruffleH = ruffle ? num(P, 'altoVolante', 120) : 0;
  const tucks = Math.round(Math.max(0, Math.min(4, num(P, 'alforzas', 0)))), tuckDepth = 5;
  const L = Lfin - ruffleH + tucks * 2 * tuckDepth;
  const fitted = str(P, 'cintura', 'elastica') === 'pretina';
  const Hq = He / 4;
  const shift = He * 0.01;
  const Fw = Hq - shift;
  const Bw = Hq + shift;
  const Fe = He / 16;
  const Be = He / 10 + D * 0.3;
  // Palazzo flare: the hem as a multiple of the leg width at the crotch.
  const amp = num(P, 'amplitudBajo', 0);
  if (amp > 0 && style !== 'jogger') hemCirc = (Fw + Fe + Bw + Be) * amp;
  const backRise = He * 0.025 + D * 0.8;
  const tilt = He * 0.02;
  const hemOffset = Math.min(10, hemCirc * 0.03);
  const hemWF = hemCirc / 2 - hemOffset;
  const hemWB = hemCirc / 2 + hemOffset;
  // Bermudas and shorts have no knee line: it would land on the hem.
  const hasKnee = style !== 'ancho' && L - R > 200 && corte !== 'bermuda' && corte !== 'short';
  const legWF = Fw + Fe;
  const kneeFor = (legW: number, hemW: number): number | null => {
    if (!hasKnee) return null;
    if (style === 'jogger') return hemW + (legW - hemW) * 0.45;
    if (style === 'bombacho') return hemW + (legW - hemW) * 0.6;
    return Math.min(hemW, legW);
  };
  // Bombacho: the hem folds into a casing for an elastic; an optional frill stays below it.
  const frill = style === 'bombacho' ? num(P, 'volantito', 0) : 0;
  const ankleElastic = 6;
  const hemFinish = style === 'jogger' || ruffle ? 'costura' : style === 'bombacho' ? 'jareta' : 'dobladillo';
  const hemAllowance = style === 'jogger' || ruffle ? SA : style === 'bombacho' ? frill + ankleElastic + 4 + 10 : hemA;

  // ---------- Delantero ----------
  const hF = Math.min(Fe * 1.3, R * 0.45);
  const xcF = (Fw + Fe) / 2;
  const frontTip: Pt = { x: Fw + Fe, y: R };
  const frontLeg = buildLeg({
    tip: frontTip,
    sideAtCrotch: { x: 0, y: R },
    crease: xcF,
    yCrotch: R,
    L,
    hemW: hemWF,
    kneeW: kneeFor(legWF, hemWF),
    seam: SA,
    hemAllowance,
    hemFinish
  });
  const k = 0.55;
  const front: Piece = {
    id: 'delantero',
    name: 'Delantero',
    source: 'generada',
    nodes: [
      { id: 'cintura-lateral', x: 0, y: 0 },
      { id: 'cintura-centro', x: Fw, y: 0 },
      { id: 'tiro-inicio', x: Fw, y: R - hF },
      { id: 'tiro-punta', ...frontTip },
      ...frontLeg.nodes,
      { id: 'cadera-lateral', x: 0, y: R }
    ],
    edges: [
      { id: 'cintura', label: 'Cintura (jareta)', from: 'cintura-lateral', to: 'cintura-centro', kind: 'line', allowance: casingAllowance, finish: 'jareta' },
      { id: 'centro', label: 'Centro delantero', from: 'cintura-centro', to: 'tiro-inicio', kind: 'line', allowance: SA, finish: 'costura' },
      {
        id: 'tiro',
        label: 'Curva de tiro delantero',
        from: 'tiro-inicio',
        to: 'tiro-punta',
        kind: 'cubic',
        c1: { x: Fw, y: R - hF + hF * k },
        c2: { x: Fw + Fe - Fe * k, y: R },
        allowance: SA,
        finish: 'costura'
      },
      ...frontLeg.edges,
      { id: 'lateral-sup', label: 'Costado (tiro a cintura)', from: 'cadera-lateral', to: 'cintura-lateral', kind: 'line', allowance: SA, finish: 'costura' }
    ],
    grain: { a: { x: xcF, y: R * 0.35 }, b: { x: xcF, y: L - Math.min(80, (L - R) * 0.3) } },
    cut: { qty: 2, mirrorPairs: true, onFold: false, fabric: 'principal' },
    notches: [],
    lines: [
      { id: 'linea-tiro', kind: 'referencia', a: { x: 0, y: R }, b: { x: Fw + Fe, y: R }, label: 'Línea de tiro' },
      { id: 'pespunte-jareta', kind: 'pespunte', a: { x: 0, y: casingDepth }, b: { x: Fw, y: casingDepth }, label: 'Pespunte de jareta' }
    ],
    marks: []
  };

  // ---------- Trasero ----------
  const hB = Math.min(Be * 0.95, R * 0.5);
  const T: Pt = { x: Bw - tilt, y: -backRise };
  const S: Pt = { x: Bw, y: R - hB };
  const cbDir = norm(sub(S, T));
  // The outside seam is one construction line shared by front and back. Put
  // the extra back width toward the inseam, preserving both requested hems.
  const frontHemOuter = frontLeg.nodes.find(node=>node.id==='bajo-ext')!;
  const xcB = frontHemOuter.x + hemWB / 2;
  const legWB = Bw + Be;

  const frontInseam = frontLeg.edges.filter((e) => inseamIds(frontLeg.knee).includes(e.id)).reduce((s, e) => s + lenOf(front, e), 0);

  const buildBack = (drop: number): Piece => {
    const tip: Pt = { x: Bw + Be, y: R + drop };
    const leg = buildLeg({
      tip,
      sideAtCrotch: { x: 0, y: R },
      crease: xcB,
      yCrotch: R + drop,
      L,
      hemW: hemWB,
      kneeW: kneeFor(legWB, hemWB),
      kneeY: frontLeg.nodes.find(node=>node.id==='rodilla-ext')?.y,
      seam: SA,
      hemAllowance,
      hemFinish
    });
    // Reusing only the outer nodes/curves keeps side seams equal independently
    // of the separate back-crotch solver. Hip, waist, hem width and length do
    // not move; the back's inner leg retains its own width and crotch curve.
    for(const id of ['bajo-ext','rodilla-ext']) {
      const template=frontLeg.nodes.find(node=>node.id===id), node=leg.nodes.find(node=>node.id===id);
      if(template&&node) {node.x=template.x;node.y=template.y;}
    }
    for(const edge of leg.edges.filter(edge=>edge.id.startsWith('lateral-'))) {
      const template=frontLeg.edges.find(candidate=>candidate.id===edge.id);
      if(template) {edge.kind=template.kind;edge.c1=template.c1?{...template.c1}:undefined;edge.c2=template.c2?{...template.c2}:undefined;}
    }
    const curveRun = tip.y - S.y;
    return {
      id: 'trasero',
      name: 'Trasero',
      source: 'generada',
      nodes: [
        { id: 'cintura-lateral', x: 0, y: 0 },
        { id: 'cintura-centro', ...T },
        { id: 'tiro-inicio', ...S },
        { id: 'tiro-punta', ...tip },
        ...leg.nodes,
        { id: 'cadera-lateral', x: 0, y: R }
      ],
      edges: [
        { id: 'cintura', label: 'Cintura (jareta)', from: 'cintura-lateral', to: 'cintura-centro', kind: 'line', allowance: casingAllowance, finish: 'jareta' },
        { id: 'centro', label: 'Centro trasero', from: 'cintura-centro', to: 'tiro-inicio', kind: 'line', allowance: SA, finish: 'costura' },
        {
          id: 'tiro',
          label: 'Curva de tiro trasero',
          from: 'tiro-inicio',
          to: 'tiro-punta',
          kind: 'cubic',
          c1: add(S, mul(cbDir, curveRun * 0.6)),
          c2: { x: tip.x - Be * 0.55, y: tip.y },
          allowance: SA,
          finish: 'costura'
        },
        ...leg.edges,
        { id: 'lateral-sup', label: 'Costado (tiro a cintura)', from: 'cadera-lateral', to: 'cintura-lateral', kind: 'line', allowance: SA, finish: 'costura' }
      ],
      grain: { a: { x: xcB, y: R * 0.35 }, b: { x: xcB, y: L - Math.min(80, (L - R) * 0.3) } },
      cut: { qty: 2, mirrorPairs: true, onFold: false, fabric: 'principal' },
      notches: [],
      lines: [{ id: 'linea-tiro', kind: 'referencia', a: { x: 0, y: R }, b: { x: Bw + Be, y: R }, label: 'Línea de tiro' }],
      marks: []
    };
  };

  const backInseam = (pc: Piece) =>
    pc.edges.filter((e) => inseamIds(frontLeg.knee).includes(e.id)).reduce((s, e) => s + lenOf(pc, e), 0);

  // Se resuelve la caída del tiro trasero para que ambas entrepiernas midan igual.
  let lo = -Be * 0.3;
  let hi = Be * 0.6;
  let drop = 0;
  const f = (d: number) => backInseam(buildBack(d)) - frontInseam;
  const notices: Issue[] = [];
  if (f(lo) * f(hi) > 0) {
    drop = Math.abs(f(lo)) < Math.abs(f(hi)) ? lo : hi;
    notices.push({ level: 'aviso', code: 'entrepierna-sin-solucion', message: 'No fue posible igualar las entrepiernas solo con la caída del tiro trasero; revisa el bajo.' });
  } else {
    for (let i = 0; i < 60; i++) {
      drop = (lo + hi) / 2;
      const v = f(drop);
      if (Math.abs(v) < 0.01) break;
      if (v > 0) lo = drop;
      else hi = drop;
    }
  }
  const back = buildBack(drop);

  // Pespunte de jareta trasero: paralelo a la cintura inclinada.
  {
    const w0: Pt = { x: 0, y: 0 };
    const dir = norm(sub(T, w0));
    const inward: Pt = { x: -dir.y, y: dir.x };
    const inw = inward.y > 0 ? inward : mul(inward, -1);
    const a0 = add(w0, mul(inw, casingDepth));
    const a1 = add(T, mul(inw, casingDepth));
    // Ajustar el extremo del costado a x = 0.
    const tA = (0 - a0.x) / (a1.x - a0.x || 1);
    const startPt = add(a0, mul(sub(a1, a0), tA));
    back.lines.push({ id: 'pespunte-jareta', kind: 'pespunte', a: startPt, b: a1, label: 'Pespunte de jareta' });
  }

  // ---------- Piquetes ----------
  const addNotch = (pc: Piece, edgeId: string, s: number, count: 1 | 2, label?: string) => {
    const e = pc.edges.find((x) => x.id === edgeId);
    if (!e) return;
    const L2 = lenOf(pc, e);
    const n: Notch = { id: `${edgeId}-${pc.notches.length}`, edgeId, s: Math.max(0, Math.min(L2, s)), count, label };
    pc.notches.push(n);
  };
  const tiroF = front.edges.find((e) => e.id === 'tiro')!;
  const tiroB = back.edges.find((e) => e.id === 'tiro')!;
  addNotch(front, 'tiro', lenOf(front, tiroF) * 0.35, 1, 'Tiro delantero');
  addNotch(back, 'tiro', lenOf(back, tiroB) * 0.35, 2, 'Tiro trasero');
  addNotch(front, 'lateral-sup', R * 0.5, 1, 'Costado');
  addNotch(back, 'lateral-sup', R * 0.5, 2, 'Costado');
  if (frontLeg.knee) {
    const fSideLow = lenOf(front, front.edges.find((e) => e.id === 'lateral-inf')!);
    const fInLow = lenOf(front, front.edges.find((e) => e.id === 'entrepierna-inf')!);
    const bInLow = lenOf(back, back.edges.find((e) => e.id === 'entrepierna-inf')!);
    addNotch(front, 'lateral-inf', fSideLow, 1, 'Rodilla');
    addNotch(front, 'entrepierna-inf', 0, 1, 'Rodilla');
    addNotch(back, 'lateral-inf', fSideLow, 2, 'Rodilla');
    addNotch(back, 'entrepierna-inf', bInLow - fInLow, 2, 'Rodilla');
    const kf = frontLeg.nodes.find((n) => n.id === 'rodilla-ext')!;
    const kfi = frontLeg.nodes.find((n) => n.id === 'rodilla-int')!;
    front.lines.push({ id: 'linea-rodilla', kind: 'referencia', a: { x: kf.x, y: kf.y }, b: { x: kfi.x, y: kfi.y }, label: 'Rodilla' });
    const kb = back.nodes.find((n) => n.id === 'rodilla-ext')!;
    const kbi = back.nodes.find((n) => n.id === 'rodilla-int')!;
    back.lines.push({ id: 'linea-rodilla', kind: 'referencia', a: { x: kb.x, y: kb.y }, b: { x: kbi.x, y: kbi.y }, label: 'Rodilla' });
  }

  const pieces: Piece[] = [front, back];
  const knee = frontLeg.knee;
  const seams: SeamRelation[] = [
    {
      id: 'costado',
      label: 'Costado: delantero con trasero',
      kind: 'igual',
      a: [{ pieceId: 'delantero', edgeIds: sideIds(knee) }],
      b: [{ pieceId: 'trasero', edgeIds: sideIds(knee) }],
      ratioMin: 0.99,
      ratioMax: 1.01,
      tolerance: 3
    },
    {
      id: 'entrepierna',
      label: 'Entrepierna: delantero con trasero',
      kind: 'igual',
      a: [{ pieceId: 'delantero', edgeIds: inseamIds(knee) }],
      b: [{ pieceId: 'trasero', edgeIds: inseamIds(knee) }],
      ratioMin: 0.99,
      ratioMax: 1.01,
      tolerance: 2
    }
  ];

  // ---------- Puño (jogger) ----------
  const cuffH = num(P, 'altoPuno', 60);
  const ankle = b.tobillo;
  let cuffLen = 0;
  if (style === 'jogger') {
    cuffLen = (ankle ?? hemCirc / 1.45) + num(P, 'holguraPuno', 20);
    const h2 = cuffH * 2;
    const cuff: Piece = {
      id: 'puno',
      name: 'Puño',
      source: 'generada',
      nodes: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: cuffLen, y: 0 },
        { id: 'c', x: cuffLen, y: h2 },
        { id: 'd', x: 0, y: h2 }
      ],
      edges: [
        { id: 'union-1', label: 'Unión al bajo (capa 1)', from: 'a', to: 'b', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'cierre-1', label: 'Costura del puño', from: 'b', to: 'c', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'union-2', label: 'Unión al bajo (capa 2)', from: 'c', to: 'd', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'cierre-2', label: 'Costura del puño', from: 'd', to: 'a', kind: 'line', allowance: SA, finish: 'costura' }
      ],
      grain: { a: { x: cuffLen * 0.2, y: h2 * 0.15 }, b: { x: cuffLen * 0.2, y: h2 * 0.85 } },
      cut: { qty: 2, mirrorPairs: false, onFold: false, fabric: 'punto-elastico' },
      notches: [
        { id: 'u1-mitad', edgeId: 'union-1', s: cuffLen / 2, count: 1, label: 'Mitad' },
        { id: 'u2-mitad', edgeId: 'union-2', s: cuffLen / 2, count: 1, label: 'Mitad' }
      ],
      lines: [{ id: 'doblez', kind: 'doblez', a: { x: 0, y: cuffH }, b: { x: cuffLen, y: cuffH }, label: 'Doblar a lo largo' }],
      marks: [],
      notes: ['La elasticidad del tejido va a lo largo del puño (alrededor del tobillo).']
    };
    pieces.push(cuff);
    seams.push({
      id: 'bajo-puno',
      label: 'Bajo de la pierna con puño (estirado)',
      kind: 'estirado',
      a: [
        { pieceId: 'delantero', edgeIds: ['bajo'] },
        { pieceId: 'trasero', edgeIds: ['bajo'] }
      ],
      b: [{ pieceId: 'puno', edgeIds: ['union-1'] }],
      ratioMin: 1.1,
      ratioMax: 1.7,
      note: 'El puño se estira al coserlo al bajo.'
    });
  }

  // ---------- Comprobaciones de medidas (sobre la línea de costura) ----------
  const nd = (pc: Piece, id: string) => pc.nodes.find((n) => n.id === id)!;
  const measuredHip = 2 * (nd(front, 'tiro-inicio').x - nd(front, 'cadera-lateral').x + (nd(back, 'tiro-inicio').x - nd(back, 'cadera-lateral').x));
  const hemMeasured = lenOf(front, front.edges.find((e) => e.id === 'bajo')!) + lenOf(back, back.edges.find((e) => e.id === 'bajo')!);
  const checks: MeasureCheck[] = [
    { key: 'cadera', label: 'Cadera de la prenda terminada', body: H, ease: hipEase, target: H + hipEase, measured: measuredHip, tolerance: 0.5 },
    { key: 'tiro', label: 'Tiro de la prenda terminada', body: CD, ease: riseEase, target: CD + riseEase, measured: nd(front, 'tiro-punta').y - nd(front, 'cintura-centro').y, tolerance: 0.5 },
    { key: 'largo', label: 'Largo terminado (vertical)', target: L, measured: nd(front, 'bajo-ext').y - nd(front, 'cintura-lateral').y, tolerance: 0.5 },
    { key: 'bajo', label: 'Contorno de bajo terminado', target: hemCirc, measured: hemMeasured, tolerance: 0.5 }
  ];

  // ---------- Avisos de construcción ----------
  const waistOpening = 2 * (lenOf(front, front.edges[0]) + lenOf(back, back.edges[0]));
  const minOpening = ctx.fabric === 'punto' ? H * (1 - Math.min(ctx.stretch, 40) / 200) : H + 20;
  if (fitted) {
    notices.push({ level: 'ok', code: 'pasa-cadera', message: 'Cintura ajustada con pretina: se pone abriendo la abertura lateral con botones.' });
  } else if (waistOpening < minOpening) {
    notices.push({
      level: 'error',
      code: 'no-pasa-cadera',
      message: `La abertura de cintura (${formatLength(waistOpening, 'cm')}) no pasa por la cadera. Aumenta la holgura de cadera.`
    });
  } else {
    notices.push({ level: 'ok', code: 'pasa-cadera', message: `La abertura de cintura (${formatLength(waistOpening, 'cm')}) pasa por la cadera.` });
  }
  const legCirc = legWF + legWB;
  if (b.muslo) {
    const minLeg = ctx.fabric === 'punto' ? b.muslo * 0.95 : b.muslo + 20;
    notices.push(
      legCirc < minLeg
        ? { level: 'error', code: 'muslo-justo', message: `El contorno de pierna en el tiro (${formatLength(legCirc, 'cm')}) es menor que el muslo más su holgura mínima.` }
        : { level: 'ok', code: 'muslo', message: `Holgura en muslo: ${formatLength(legCirc - b.muslo, 'cm')}.` }
    );
  } else {
    notices.push({ level: 'aviso', code: 'sin-muslo', message: 'Sin medida de muslo: no se puede comprobar la holgura de la pierna.' });
  }
  if (style === 'jogger') {
    if (ctx.fabric !== 'punto') notices.push({ level: 'aviso', code: 'puno-punto', message: 'El puño debe cortarse en un punto elástico (rib), aunque el pantalón sea de tela plana.' });
    if (b.talon) {
      const maxStretch = cuffLen * 1.5;
      if (maxStretch < b.talon) notices.push({ level: 'error', code: 'puno-talon', message: 'El puño no pasará por el talón con un rib de 50 % de elasticidad.' });
    } else {
      notices.push({ level: 'aviso', code: 'sin-talon', message: 'Sin medida de talón–empeine: comprueba que el puño pase por el pie.' });
    }
  }
  const hemElastic = hasKnee ? (b.tobillo ?? hemCirc / 1.6) + 25 : (b.muslo ?? hemCirc / 1.3) + 30;
  if (style === 'bombacho') {
    const foot = b.talon ?? (b.tobillo ? b.tobillo * 1.45 : 0);
    if (hasKnee && foot && hemCirc < foot + 10) notices.push({ level: 'error', code: 'bombacho-pie', message: `El bajo (${formatLength(hemCirc, 'cm')}) no deja pasar el pie. Aumenta el contorno de bajo.` });
    else notices.push({ level: 'ok', code: 'bombacho-elastico', message: `Bajo de ${formatLength(hemCirc, 'cm')} recogido con ${formatLength(hemElastic, 'cm')} de elástico.` });
  }
  if (!hasKnee && style !== 'ancho') notices.push({ level: 'aviso', code: 'corto', message: 'Largo corto: se construye sin línea de rodilla (short).' });

  const elasticLen = W * num(P, 'proporcionElastico', 0.9) + 20;
  const materials = [
    { id: 'elastico', label: `Elástico de ${formatLength(elastic, 'cm')}`, qty: formatLength(elasticLen, 'cm'), note: `Cintura × ${num(P, 'proporcionElastico', 0.9)} + 2 cm de traslape. Pruébalo sobre el cuerpo antes de cerrarlo.` },
    { id: 'hilo', label: 'Hilo de coser', qty: '1 carrete', note: 'Del color de la tela principal.' }
  ];
  if (style === 'bombacho') materials.push({ id: 'elastico-bajo', label: `Elástico de ${formatLength(ankleElastic, 'cm')} para los bajos`, qty: `2 × ${formatLength(hemElastic + 20, 'cm')}`, note: 'Pruébalo: no debe marcar la piel.' });
  if (style === 'jogger') materials.push({ id: 'rib', label: 'Punto elástico (rib) para puños', qty: `2 × ${formatLength(cuffLen + 2 * SA, 'cm')} × ${formatLength(cuffH * 2 + 2 * SA, 'cm')}`, note: 'Elasticidad a lo largo del puño.' });

  const assumptions = [
    'Medida terminada = medida corporal + holgura; la holgura se aplica una sola vez y los márgenes no se incluyen.',
    `Cadera de la prenda: cadera ${formatLength(H, 'cm')} + holgura ${formatLength(hipEase, 'cm')}${D ? ' (incluye pañal)' : ''}.`,
    `Extensión de tiro: delantero = cadera terminada / 16 y trasero = cadera terminada / 10${D ? ' + pañal' : ''}.`,
    `Tiro trasero elevado ${formatLength(backRise, 'cm')} e inclinado ${formatLength(tilt, 'cm')}; caída del tiro trasero ${formatLength(drop, 'cm')} calculada para igualar entrepiernas.`,
    'El delantero y el trasero comparten el trazado exterior del costado y la altura de rodilla. La anchura adicional del trasero se distribuye hacia la entrepierna sin alterar cadera, largo ni contorno de bajo.',
    'Es una propuesta de patrón: confirma el ajuste con una muestra de confección antes de cortar la tela definitiva.'
  ];

  const steps = [
    { id: 'cortar', title: 'Corta las piezas', detail: pieces.map((p) => `${p.name}: ${p.cut.qty}${p.cut.mirrorPairs ? ' (en pares simétricos)' : ''}`).join('; ') + '. Traslada piquetes y la línea de pespunte de jareta.', pieces: pieces.map((p) => p.id) },
    { id: 'costados', title: 'Cose los costados', detail: 'Derecho con derecho, une cada delantero con su trasero por el costado haciendo coincidir los piquetes. Termina los márgenes.', pieces: ['delantero', 'trasero'], seams: ['costado'] },
    { id: 'entrepiernas', title: 'Cose las entrepiernas', detail: 'Une delantero y trasero por la entrepierna, de la punta del tiro al bajo, con los piquetes de rodilla coincidiendo.', pieces: ['delantero', 'trasero'], seams: ['entrepierna'] },
    { id: 'tiro', title: 'Une las piernas por el tiro', detail: 'Voltea una pierna al derecho y métela dentro de la otra. Cose la curva de tiro del centro delantero al centro trasero, haciendo coincidir las costuras de entrepierna. Refuerza la curva con una segunda pasada.', pieces: ['delantero', 'trasero'] },
    { id: 'jareta', title: 'Haz la jareta de la cintura', detail: `Dobla 1 cm hacia el revés y luego por la línea de cintura. Pespuntea sobre la línea marcada dejando 3 cm abiertos. Pasa ${formatLength(elasticLen, 'cm')} de elástico, cóselo traslapado y cierra la abertura.`, pieces: ['delantero', 'trasero'] },
    style === 'bombacho'
      ? { id: 'bajo', title: 'Jareta del bajo', detail: `Dobla 1 cm y luego el resto del margen del bajo. Pespuntea a ${formatLength(frill, 'cm')} y a ${formatLength(frill + ankleElastic + 4, 'cm')} del doblez${frill ? ' (el volantito queda debajo)' : ''}, dejando una abertura junto a la entrepierna. Pasa el elástico, únelo y cierra.`, pieces: ['delantero', 'trasero'] }
      : style === 'jogger'
      ? { id: 'punos', title: 'Coloca los puños', detail: 'Cierra cada puño en anillo, dóblalo a lo largo y cóselo al bajo estirándolo de piquete a piquete.', pieces: ['puno', 'delantero', 'trasero'], seams: ['bajo-puno'] }
      : { id: 'bajo', title: 'Haz el dobladillo', detail: `Dobla el margen de ${formatLength(hemA, 'cm')} por la línea de bajo (las esquinas en espejo coinciden con el costado) y cose.`, pieces: ['delantero', 'trasero'] },
    { id: 'prueba', title: 'Prueba y revisa', detail: 'Comprueba tiro, cadera y largo con la persona. Anota los cambios en el proyecto antes de cortar la versión definitiva.', pieces: [] }
  ];

  applyPantsOptions({ ctx, P, pieces, seams, checks, materials, assumptions, steps, notices, front, back, Fw, R, CD, W, H, SA, casingDepth, fitted, ruffle, ruffleH, tucks, tuckDepth, L, Lfin, style });
  return { pieces, seams, checks, materials, assumptions, steps, notices };
}

/** Optional constructions shared by all pants styles: fitted waistband with a
 * buttoned side opening, in-seam side pockets, drawstring, hem ruffle and pintucks. */
function applyPantsOptions(o: {
  ctx: GeneratorContext; P: Params; pieces: Piece[]; seams: SeamRelation[]; checks: MeasureCheck[]; materials: { id: string; label: string; qty: string; note?: string }[];
  assumptions: string[]; steps: { id: string; title: string; detail: string; pieces: string[]; seams?: string[] }[]; notices: Issue[];
  front: Piece; back: Piece; Fw: number; R: number; CD: number; W: number; H: number; SA: number; casingDepth: number; fitted: boolean; ruffle: boolean; ruffleH: number; tucks: number; tuckDepth: number; L: number; Lfin: number; style: Style;
}) {
  const { ctx, P, pieces, seams, checks, materials, assumptions, steps, notices, front, back, SA } = o;
  const s = Math.max(0.45, Math.min(1.3, o.H / 1000)), cm = (v: number) => formatLength(v, 'cm');
  const node = (pc: Piece, id: string) => pc.nodes.find((n) => n.id === id)!;
  const edgeOf = (pc: Piece, id: string) => pc.edges.find((e) => e.id === id)!;
  const hipY = Math.min(o.CD * 0.6, o.R - 20);
  let sideEdges = ['lateral-sup'];
  if (o.fitted) {
    // Waist suppression per half garment: side seams, centre back, then darts.
    const We = o.W + (isChild(ctx.kind) ? 15 : 20), T0 = node(back, 'cintura-centro');
    const E = o.Fw + Math.hypot(T0.x, T0.y) - We / 2;
    const side = Math.max(0, Math.min(E * 0.3, 30 * s)), cbSup = Math.max(0, Math.min(E * 0.1, 20 * s));
    T0.x -= cbSup;
    for (const pc of [front, back]) {
      node(pc, 'cintura-lateral').x = side;
      pc.nodes.push({ id: 'cadera-costado', x: 0, y: hipY });
      const i = pc.edges.findIndex((e) => e.id === 'lateral-sup');
      pc.edges.splice(i, 1,
        { id: 'lateral-cadera', label: 'Costado (tiro a cadera)', from: 'cadera-lateral', to: 'cadera-costado', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'lateral-sup', label: 'Costado (cadera a cintura)', from: 'cadera-costado', to: 'cintura-lateral', kind: 'cubic', c1: { x: 0, y: hipY * 0.45 }, c2: { x: side * 0.75, y: hipY * 0.12 }, allowance: SA, finish: 'costura' });
      const w = edgeOf(pc, 'cintura');
      w.finish = 'costura'; w.allowance = SA; w.label = 'Cintura (une la pretina)';
      pc.lines = pc.lines.filter((l) => l.id !== 'pespunte-jareta');
    }
    sideEdges = ['lateral-cadera', 'lateral-sup'];
    // Darts take whatever the shaped waist edges still exceed (the back waist is slanted).
    const darts = Math.max(0, lenOf(front, edgeOf(front, 'cintura')) + lenOf(back, edgeOf(back, 'cintura')) - We / 2), dF = darts * 0.4, dB = darts * 0.6;
    const dart = (pc: Piece, id: string, a: { x: number; y: number }, intake: number, length: number) => {
      const apex = { x: a.x, y: a.y + length };
      pc.lines.push({ id: `${id}-a`, kind: 'pespunte', a: { x: a.x - intake / 2, y: a.y }, b: apex, label: `Pinza de ${cm(intake)}` }, { id: `${id}-b`, kind: 'pespunte', a: { x: a.x + intake / 2, y: a.y }, b: apex, label: 'Pinza' });
    };
    const nF = dF > 30 * s ? 2 : dF > 4 ? 1 : 0, nB = dB > 30 * s ? 2 : dB > 4 ? 1 : 0;
    for (let i = 0; i < nF; i++) dart(front, `pinza-${i + 1}`, { x: side + (o.Fw - side) * (0.45 + i * 0.2), y: 0 }, dF / nF, 85 * s);
    const T = node(back, 'cintura-centro');
    for (let i = 0; i < nB; i++) { const t = 0.4 + i * 0.25, x = side + (T.x - side) * t; dart(back, `pinza-${i + 1}`, { x, y: T.y * t }, dB / nB, 120 * s); }
    const waistEdges = 2 * (lenOf(front, edgeOf(front, 'cintura')) + lenOf(back, edgeOf(back, 'cintura')));
    const bh = num(P, 'anchoPretina', isChild(ctx.kind) ? 30 : 40), overlap = 35 * s, bandL = We + overlap;
    const band: Piece = {
      id: 'pretina', name: 'Pretina doblada', source: 'generada',
      nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: bandL, y: 0 }, { id: 'c', x: bandL, y: 2 * bh }, { id: 'd', x: 0, y: 2 * bh }],
      edges: [
        { id: 'union-1', label: 'Unión a la cintura', from: 'a', to: 'b', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'extremo-1', label: 'Extremo con botón', from: 'b', to: 'c', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'union-2', label: 'Canto interior', from: 'c', to: 'd', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'extremo-2', label: 'Extremo con ojal (cruce)', from: 'd', to: 'a', kind: 'line', allowance: SA, finish: 'costura' }
      ],
      grain: { a: { x: bandL * 0.2, y: bh }, b: { x: bandL * 0.8, y: bh } }, cut: { qty: 1, mirrorPairs: false, onFold: false, fabric: 'principal' },
      notches: [{ id: 'centro-delantero', edgeId: 'union-1', s: overlap + We / 4, count: 1, label: 'Centro delantero' }, { id: 'centro-trasero', edgeId: 'union-1', s: overlap + We * 0.75, count: 2, label: 'Centro trasero' }],
      lines: [{ id: 'doblez', kind: 'doblez', a: { x: 0, y: bh }, b: { x: bandL, y: bh }, label: 'Doblar a lo largo (entretela en una mitad)' }],
      marks: [{ id: 'ojal', kind: 'ojal', at: { x: overlap / 2, y: bh / 2 }, label: 'Ojal' }, { id: 'boton', kind: 'boton', at: { x: bandL - overlap / 2, y: bh / 2 }, label: 'Botón' }]
    };
    const opening = Math.min(180 * s, hipY + 20);
    const placket = (id: string, name: string, w: number): Piece => ({
      id, name, source: 'generada',
      nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: w, y: 0 }, { id: 'c', x: w, y: opening + 20 }, { id: 'd', x: 0, y: opening + 20 }],
      edges: [{ id: 'superior', label: 'Une la pretina', from: 'a', to: 'b', kind: 'line', allowance: SA, finish: 'costura' }, { id: 'interior', label: 'Canto interior (sobrehilar)', from: 'b', to: 'c', kind: 'line', allowance: 0, finish: 'sin-margen' },
        { id: 'inferior', label: 'Bajo de la vista', from: 'c', to: 'd', kind: 'line', allowance: 0, finish: 'sin-margen' }, { id: 'costado', label: 'Une la abertura', from: 'd', to: 'a', kind: 'line', allowance: SA, finish: 'costura' }],
      grain: { a: { x: w / 2, y: 10 }, b: { x: w / 2, y: opening } }, cut: { qty: 1, mirrorPairs: false, onFold: false, fabric: 'principal' }, notches: [], lines: [], marks: []
    });
    pieces.push(band, placket('vista-abertura', 'Vista de la abertura (delantero izquierdo)', 40 * s), placket('tapeta-abertura', 'Cartera de la abertura (trasero izquierdo, doblada)', 2 * 35 * s));
    const nButtons = Math.max(2, Math.round(opening / (45 * s)));
    for (let i = 0; i < nButtons; i++) front.marks.push({ id: `boton-lateral-${i + 1}`, kind: 'boton', at: { x: 12 * s, y: 25 * s + (opening - 35 * s) * i / Math.max(1, nButtons - 1) }, label: 'Botón de la abertura (solo lado izquierdo)' });
    const sideLen = lenOf(front, edgeOf(front, 'lateral-sup'));
    front.notches.push({ id: 'fin-abertura', edgeId: 'lateral-sup', s: Math.max(0, sideLen - opening), count: 1, label: 'Fin de la abertura (lado izquierdo)' });
    back.notches.push({ id: 'fin-abertura', edgeId: 'lateral-sup', s: Math.max(0, sideLen - opening), count: 1, label: 'Fin de la abertura (lado izquierdo)' });
    seams.push({ id: 'pretina', label: 'Pretina con la cintura (pinzas cerradas, más el cruce)', kind: 'embebido', a: [{ pieceId: 'delantero', edgeIds: ['cintura'], factor: 2 }, { pieceId: 'trasero', edgeIds: ['cintura'], factor: 2 }], b: [{ pieceId: 'pretina', edgeIds: ['union-1'] }], ratioMin: waistEdges / bandL - 0.005, ratioMax: waistEdges / bandL + 0.005 });
    checks.push({ key: 'cintura', label: 'Cintura terminada (con pinzas cerradas)', body: o.W, ease: We - o.W, target: We, measured: waistEdges - 2 * (dF + dB), tolerance: 1 });
    const iEl = materials.findIndex((m) => m.id === 'elastico');
    if (iEl >= 0) materials.splice(iEl, 1);
    materials.push({ id: 'botones', label: 'Botones de 12–15 mm', qty: `${nButtons + 1}` }, { id: 'entretela', label: 'Entretela para pretina y vista', qty: `${cm(bandL)} × ${cm(bh)}` });
    const iJ = steps.findIndex((st) => st.id === 'jareta');
    steps.splice(iJ, 1,
      { id: 'pinzas', title: 'Pinzas', detail: `Cose las pinzas del delantero (${cm(dF)} en total por lado) y del trasero (${cm(dB)}), planchando las delanteras hacia el centro y las traseras hacia el centro trasero.`, pieces: ['delantero', 'trasero'] },
      { id: 'abertura', title: 'Abertura lateral', detail: `En el costado izquierdo deja abiertos ${cm(opening)} desde la cintura. Cose la vista al delantero y la cartera doblada al trasero; haz los ojales en la vista y los botones en la cartera.`, pieces: ['delantero', 'trasero', 'vista-abertura', 'tapeta-abertura'] },
      { id: 'pretina', title: 'Pretina', detail: 'Entretela media pretina, cósela a la cintura empezando con el cruce en el lado izquierdo, dóblala y ciérrala por dentro. Haz el ojal y cose el botón.', pieces: ['pretina', 'delantero', 'trasero'], seams: ['pretina'] });
    assumptions.push(`Cintura ajustada de ${cm(We)} (cintura + ${cm(We - o.W)}): la diferencia con la cadera se reparte entre costados (${cm(side)} por pieza), centro trasero (${cm(cbSup)}) y pinzas.`);
  }
  const cost = seams.find((r) => r.id === 'costado');
  if (cost && o.fitted) for (const sd of [...cost.a, ...cost.b]) sd.edgeIds = [...sd.edgeIds.filter((id) => id !== 'lateral-sup'), ...sideEdges];

  if (str(P, 'bolsillos', 'ninguno') === 'costado') {
    const top = (o.fitted ? 0 : o.casingDepth) + 30 * s, open = 150 * s, bw = 130 * s, bd = open + 110 * s, r = 45 * s;
    const bag: Piece = {
      id: 'bolsillo', name: 'Bolsa del bolsillo de costado (2 pares)', source: 'generada',
      nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: bw, y: 0 }, { id: 'c', x: bw, y: bd - r }, { id: 'd', x: bw - r, y: bd }, { id: 'e', x: 0, y: bd - 20 * s }],
      edges: [{ id: 'superior', label: 'Canto superior', from: 'a', to: 'b', kind: 'line', allowance: SA, finish: 'costura' }, { id: 'interior', label: 'Canto interior', from: 'b', to: 'c', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'curva', label: 'Fondo curvo', from: 'c', to: 'd', kind: 'cubic', c1: { x: bw, y: bd - r * 0.45 }, c2: { x: bw - r * 0.45, y: bd }, allowance: SA, finish: 'costura' },
        { id: 'fondo', label: 'Fondo', from: 'd', to: 'e', kind: 'line', allowance: SA, finish: 'costura' }, { id: 'costado', label: 'Une el costado (boca)', from: 'e', to: 'a', kind: 'line', allowance: SA, finish: 'costura' }],
      grain: { a: { x: bw / 2, y: 15 }, b: { x: bw / 2, y: bd - 30 } }, cut: { qty: 4, mirrorPairs: true, onFold: false, fabric: 'forro' }, notches: [], lines: [], marks: []
    };
    pieces.push(bag);
    for (const pc of [front, back]) {
      const e = edgeOf(pc, 'lateral-sup'), l = lenOf(pc, e);
      if (top + open < l) pc.notches.push({ id: 'bolsillo-arriba', edgeId: 'lateral-sup', s: l - top, count: 1, label: 'Boca del bolsillo' }, { id: 'bolsillo-abajo', edgeId: 'lateral-sup', s: l - top - open, count: 1, label: 'Fin de la boca' });
      else {
        const e2 = edgeOf(pc, o.fitted ? 'lateral-cadera' : 'lateral-sup'), l2 = lenOf(pc, e2);
        pc.notches.push({ id: 'bolsillo-arriba', edgeId: 'lateral-sup', s: Math.max(0, l - top), count: 1, label: 'Boca del bolsillo' }, { id: 'bolsillo-abajo', edgeId: e2.id, s: Math.max(0, l2 - (top + open - l)), count: 1, label: 'Fin de la boca' });
      }
    }
    steps.splice(1, 0, { id: 'bolsillos', title: 'Bolsillos de costado', detail: `Cose una bolsa a cada costado del delantero y del trasero entre los piquetes (boca de ${cm(open)}), plánchalas hacia fuera y, al cerrar el costado, rodea la bolsa y deja abierta la boca.`, pieces: ['bolsillo', 'delantero', 'trasero'] });
  }
  if (str(P, 'cordon', 'no') === 'si' && !o.fitted) {
    if (isChild(ctx.kind)) notices.push({ level: 'aviso', code: 'sin-cordon-infantil', message: 'En tallas infantiles no se pone cordón: solo elástico.' });
    else {
      front.marks.push({ id: 'ojal-cordon', kind: 'ojal', at: { x: o.Fw - 22 * s, y: o.casingDepth / 2 }, label: 'Ojal del cordón (uno en cada delantero, antes de doblar la jareta)' });
      materials.push({ id: 'cordon', label: 'Cordón plano o tubular', qty: cm(o.W + 800) });
      steps.push({ id: 'cordon', title: 'Cordón', detail: 'Haz un ojal vertical en cada delantero junto al centro antes de cerrar la jareta. Pasa el cordón junto al elástico y anuda sus puntas.', pieces: ['delantero'] });
    }
  }
  if (o.tucks > 0) {
    for (const pc of [front, back]) {
      const be = node(pc, 'bajo-ext'), bi = node(pc, 'bajo-int');
      for (let i = 0; i < o.tucks; i++) {
        const y = o.L - (o.ruffle ? 30 : 60) * s - i * 2 * (o.tuckDepth + 12 * s);
        pc.lines.push({ id: `alforza-${i + 1}`, kind: 'doblez', a: { x: be.x + 8, y }, b: { x: bi.x - 8, y }, label: `Alforza ${i + 1}: doblar y pespuntear a ${o.tuckDepth} mm` });
      }
    }
    assumptions.push(`${o.tucks} alforzas de ${o.tuckDepth} mm sobre el bajo: la pierna se corta ${cm(o.tucks * 2 * o.tuckDepth)} más larga.`);
    steps.push({ id: 'alforzas', title: 'Alforzas', detail: 'Antes de cerrar la entrepierna, dobla por cada línea de alforza, pespuntea a 5 mm del doblez y plancha hacia el bajo.', pieces: ['delantero', 'trasero'] });
  }
  if (o.ruffle) {
    const hem = lenOf(front, edgeOf(front, 'bajo')) + lenOf(back, edgeOf(back, 'bajo')), gather = num(P, 'fruncidoVolante', 1.6);
    const rp: Piece = {
      id: 'volante', name: 'Volante del bajo (anillo por pierna)', source: 'generada',
      nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: hem * gather, y: 0 }, { id: 'c', x: hem * gather, y: o.ruffleH }, { id: 'd', x: 0, y: o.ruffleH }],
      edges: [{ id: 'union', label: 'Unión al bajo (fruncir)', from: 'a', to: 'b', kind: 'line', allowance: SA, finish: 'costura' }, { id: 'lado-a', label: 'Costura del anillo', from: 'b', to: 'c', kind: 'line', allowance: SA, finish: 'costura' },
        { id: 'bajo', label: 'Bajo', from: 'c', to: 'd', kind: 'line', allowance: 20, finish: 'dobladillo' }, { id: 'lado-b', label: 'Costura del anillo', from: 'd', to: 'a', kind: 'line', allowance: SA, finish: 'costura' }],
      grain: { a: { x: hem * gather * 0.2, y: o.ruffleH / 2 }, b: { x: hem * gather * 0.8, y: o.ruffleH / 2 } }, cut: { qty: 2, mirrorPairs: false, onFold: false, fabric: 'principal' }, notches: [], lines: [], marks: []
    };
    pieces.push(rp);
    seams.push({ id: 'volante', label: 'Volante fruncido al bajo', kind: 'fruncido', a: [{ pieceId: 'volante', edgeIds: ['union'] }], b: [{ pieceId: 'delantero', edgeIds: ['bajo'] }, { pieceId: 'trasero', edgeIds: ['bajo'] }], ratioMin: gather - 0.05, ratioMax: gather + 0.05 });
    const iB = steps.findIndex((st) => st.id === 'bajo');
    const st = { id: 'volante', title: 'Volante del bajo', detail: `Cierra cada volante en anillo, dobladilla su bajo, frúncelo ${gather.toFixed(1)} veces y cóselo al bajo de la pierna.`, pieces: ['volante', 'delantero', 'trasero'], seams: ['volante'] };
    if (iB >= 0) steps.splice(iB, 1, st); else steps.push(st);
    assumptions.push(`Volante de ${cm(o.ruffleH)}: el largo terminado (${cm(o.Lfin)}) incluye el volante.`);
    const lc = checks.find((c) => c.key === 'largo');
    if (lc) lc.label = 'Largo de la pierna sin el volante (vertical)';
  }
  const lc = checks.find((c) => c.key === 'largo');
  if (lc && o.tucks) lc.label = `${lc.label} · cortado con alforzas`;
}

export const pantsGenerator: PatternGenerator = {
  id: 'pantalon-cintura-elastica',
  name: 'Pantalón de cintura elástica',
  summary: 'Pantalón sin cierre con jareta y elástico. Delantero y trasero por pierna; puño opcional en versión jogger.',
  status: 'experimental',
  requiredMeasures: ['cintura', 'cadera', 'tiro', 'entrepierna'],
  optionalMeasures: ['muslo', 'tobillo', 'talon', 'largoExterior'],
  params: [
    {
      key: 'estilo',
      label: 'Pierna',
      group: 'diseno',
      type: 'choice',
      choices: [
        { value: 'recto', label: 'Recta' },
        { value: 'ancho', label: 'Ancha' },
        { value: 'jogger', label: 'Jogger con puño' },
        { value: 'bombacho', label: 'Bombacho (elástico en el bajo)' }
      ]
    },
    { key: 'corte', label: 'Corte', group: 'diseno', type: 'choice', choices: [{ value: 'completo', label: 'Largo completo (eliges el largo)' }, { value: 'capri', label: 'Capri / culotte' }, { value: 'bermuda', label: 'Bermuda' }, { value: 'short', label: 'Short' }] },
    { key: 'largo', label: 'Largo terminado (cintura a bajo)', group: 'diseno', type: 'length', min: 80, max: 1400, when: (p) => !p.corte || p.corte === 'completo' },
    { key: 'bajo', label: 'Contorno de bajo terminado', group: 'diseno', type: 'length', min: 100, max: 1200, when: (p) => p.estilo !== 'jogger' },
    { key: 'bajoJogger', label: 'Contorno de bajo antes del puño', group: 'diseno', type: 'length', min: 100, max: 800, when: (p) => p.estilo === 'jogger' },
    { key: 'altoPuno', label: 'Alto del puño terminado', group: 'diseno', type: 'length', min: 15, max: 150, when: (p) => p.estilo === 'jogger' },
    { key: 'holguraPuno', label: 'Holgura del puño sobre tobillo', group: 'holgura', type: 'length', min: -40, max: 80, when: (p) => p.estilo === 'jogger' },
    { key: 'holguraCadera', label: 'Holgura de cadera', group: 'holgura', type: 'length', min: -50, max: 400, help: 'Se suma una vez a la cadera corporal.' },
    { key: 'holguraTiro', label: 'Holgura de tiro', group: 'holgura', type: 'length', min: -20, max: 80, help: 'Espacio adicional para sentarse y moverse.' },
    { key: 'panal', label: 'Espacio para pañal', group: 'holgura', type: 'length', min: 0, max: 60, help: 'Aumenta tiro, cadera y tiro trasero. Solo para quien usa pañal.' },
    { key: 'anchoElastico', label: 'Ancho del elástico', group: 'diseno', type: 'length', min: 5, max: 60 },
    { key: 'proporcionElastico', label: 'Largo de elástico / cintura', group: 'diseno', type: 'ratio', min: 0.7, max: 1 },
    { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 0, max: 30 },
    { key: 'cintura', label: 'Cintura', group: 'diseno', type: 'choice', choices: [{ value: 'elastica', label: 'Elástica con jareta' }, { value: 'pretina', label: 'Pretina con abertura lateral y botones' }] },
    { key: 'anchoPretina', label: 'Alto de la pretina', group: 'diseno', type: 'length', min: 20, max: 90, when: (p) => p.cintura === 'pretina' },
    { key: 'amplitudBajo', label: 'Vuelo del bajo (0 = usar contorno de bajo)', group: 'diseno', type: 'ratio', min: 0, max: 2.5 },
    { key: 'bolsillos', label: 'Bolsillos', group: 'diseno', type: 'choice', choices: [{ value: 'ninguno', label: 'Sin bolsillos' }, { value: 'costado', label: 'En las costuras de costado' }] },
    { key: 'cordon', label: 'Cordón en la cintura (solo adulto)', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí' }], when: (p) => p.cintura !== 'pretina' },
    { key: 'volante', label: 'Volante en el bajo', group: 'diseno', type: 'choice', choices: [{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí' }] },
    { key: 'altoVolante', label: 'Alto del volante', group: 'diseno', type: 'length', min: 40, max: 300, when: (p) => p.volante === 'si' },
    { key: 'alforzas', label: 'Alforzas sobre el bajo', group: 'diseno', type: 'length', min: 0, max: 4 },
    { key: 'volantito', label: 'Volantito bajo el elástico', group: 'diseno', type: 'length', min: 0, max: 40, when: (p) => p.estilo === 'bombacho' },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 0, max: 80, when: (p) => p.estilo !== 'jogger' && p.estilo !== 'bombacho' }
  ],
  defaults: pantsDefaults,
  generate: generatePants
};

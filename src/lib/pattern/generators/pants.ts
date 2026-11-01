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
  const L = num(P, 'largo');
  const hemCirc = style === 'jogger' ? num(P, 'bajoJogger') : num(P, 'bajo');

  // Holgura aplicada una sola vez: medida terminada = cuerpo + holgura (+ pañal).
  const hipEase = num(P, 'holguraCadera') + D * 1.2;
  const He = H + hipEase;
  const riseEase = num(P, 'holguraTiro') + D;
  const R = CD + riseEase;
  const Hq = He / 4;
  const shift = He * 0.01;
  const Fw = Hq - shift;
  const Bw = Hq + shift;
  const Fe = He / 16;
  const Be = He / 10 + D * 0.3;
  const backRise = He * 0.025 + D * 0.8;
  const tilt = He * 0.02;
  const hemOffset = Math.min(10, hemCirc * 0.03);
  const hemWF = hemCirc / 2 - hemOffset;
  const hemWB = hemCirc / 2 + hemOffset;
  const hasKnee = style !== 'ancho' && L - R > 200;
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
  const hemFinish = style === 'jogger' ? 'costura' : style === 'bombacho' ? 'jareta' : 'dobladillo';
  const hemAllowance = style === 'jogger' ? SA : style === 'bombacho' ? frill + ankleElastic + 4 + 10 : hemA;

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
  if (waistOpening < minOpening) {
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

  return { pieces, seams, checks, materials, assumptions, steps, notices };
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
    { key: 'largo', label: 'Largo terminado (cintura a bajo)', group: 'diseno', type: 'length', min: 80, max: 1400 },
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
    { key: 'volantito', label: 'Volantito bajo el elástico', group: 'diseno', type: 'length', min: 0, max: 40, when: (p) => p.estilo === 'bombacho' },
    { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 0, max: 80, when: (p) => p.estilo !== 'jogger' && p.estilo !== 'bombacho' }
  ],
  defaults: pantsDefaults,
  generate: generatePants
};

import { num, round1, str, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Issue, Piece, SeamRelation } from '../types';
import { P, bindingStrip, clamp, cm, copyPiece, edge, equal, finite, invalid, len, outline, ratio, rectangle, solve } from './kidsShared';
import { armhole, bodiceGeometry, bodicePiece, bodySeams, bowPieces, buttonMarks, experimentalNotice, foldedBand, frontFacing, hoodPiece, isKid, kidBody, neckLen, setInSleeve, sleeveSeams } from './kidsBlocks';

/* Abrigos infantiles digitalizados desde referencias fotográficas y
 * reconstruidos desde medidas: chaleco de borreguito, chaqueta polar con
 * cuello alto y cierre, chaqueta acolchada reversible, chaqueta con capucha
 * forrada y botones, y sudadera con bolsillo canguro. Sin cordones. */

const notKid = (code: string) => invalid(code, 'Este patrón usa proporciones infantiles. Elige una talla de bebé, 1–4 años o niñas y niños.');
const margin = { key: 'margen', label: 'Margen de costura', group: 'margenes' as const, type: 'length' as const, min: 5, max: 15 };

// ------------------------------------------------------------------ Chaleco de borreguito
export function vestDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx);
  return { escote: 'pico', acabado: 'forro', cierre: 'broches', lazo: 'si', largo: round1(k.talle * 1.38), holgura: round1(clamp(k.chest * .16 + 25, 80, 140)), anchoBies: 10, margen: 10, dobladillo: 15 };
}

export function generateVest(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('chaleco-talla');
  const p = { ...vestDefaults(ctx), ...params }, k = kidBody(ctx);
  const vNeck = str(p, 'escote') === 'pico', lined = str(p, 'acabado') === 'forro', snaps = str(p, 'cierre') === 'broches', bow = str(p, 'lazo') === 'si';
  const L = num(p, 'largo'), ease = num(p, 'holgura'), bias = num(p, 'anchoBies'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(L, ease, bias, sa, hem) || ease < 50 || ease > 220 || bias < 6 || bias > 15 || sa < 5 || sa > 15 || !['pico', 'redondo'].includes(str(p, 'escote')) || !['forro', 'ribete'].includes(str(p, 'acabado')) || !['broches', 'abierto'].includes(str(p, 'cierre')))
    return invalid('chaleco-medidas', 'Revisa largo, holgura, ribete y márgenes.');
  const s0 = clamp(k.chest / 560, .7, 1.45), g0 = bodiceGeometry(ctx, { ease, length: L, armExtra: 12 * s0, neckWiden: 4 * s0 });
  const g = bodiceGeometry(ctx, { ease, length: L, armExtra: 12 * s0, neckWiden: 4 * s0, ext: snaps ? 10 * s0 : 0, ...(vNeck ? { vDepth: g0.ad * .78 } : {}) });
  if (L < g.ad + 60 * g.s || L > k.talle * 2.2) return invalid('chaleco-largo', `El largo debe pasar al menos ${cm(60 * g.s)} de la sisa y no superar ${cm(k.talle * 2.2)}.`);
  const edgeFinish = lined ? 'costura' as const : 'sin-margen' as const;
  const finish = { sa, hem: lined ? sa : 0, neck: edgeFinish, arm: edgeFinish, hemFinish: edgeFinish, centre: edgeFinish, labels: lined ? {} : { cuello: 'Escote (ribete)', sisa: 'Sisa con ribete', bajo: 'Bajo (ribete)', centro: 'Canto delantero (ribete)' } };
  const front = bodicePiece('delantero', 'Delantero (par en espejo)', g, false, finish, { qty: 2, mirrorPairs: true });
  const back = bodicePiece('espalda', 'Espalda al doblez', g, true, { ...finish, centre: 'doblez' });
  const pieces: Piece[] = [front, back];
  const seams: SeamRelation[] = bodySeams('delantero', 'espalda');
  if (lined) {
    pieces.push(copyPiece(front, 'forro-delantero', 'Forro delantero (par en espejo)', { fabric: 'forro' }), copyPiece(back, 'forro-espalda', 'Forro de espalda al doblez', { fabric: 'forro' }));
    seams.push(...bodySeams('forro-delantero', 'forro-espalda').map(r => ({ ...r, id: `forro-${r.id}`, label: `Forro · ${r.label}` })));
  }
  const contour = 2 * (len(front, 'cuello') + len(front, 'centro') + len(front, 'bajo') + len(back, 'cuello') + len(back, 'bajo')), arm = armhole(front) + armhole(back);
  if (!lined) {
    pieces.push(bindingStrip('bies-contorno', 'Ribete del contorno (escote, delanteros y bajo)', contour, bias, 1, 10), bindingStrip('bies-sisa', 'Ribete de sisa', arm, bias, 2, 0));
    seams.push(equal('ribete-sisa', 'Cada sisa con su ribete', [{ pieceId: 'delantero', edgeIds: ['sisa-superior', 'sisa-inferior'] }, { pieceId: 'espalda', edgeIds: ['sisa-superior', 'sisa-inferior'] }], [{ pieceId: 'bies-sisa', edgeIds: ['largo-superior'] }]));
  }
  const bowW = 42 * g.s, bowH = 14 * g.s;
  if (bow) pieces.push(...bowPieces('', bowW, bowH, 6));
  if (snaps) buttonMarks(front, 0, g.fd + 12 * g.s, Math.min(g.L - 40 * g.s, g.fd + (g.L - g.fd) * .55), 2, 'boton', 'Broche de presión (macho en el derecho, hembra en el izquierdo)');
  if (bow) front.marks.push({ id: 'lazo', kind: 'cruz', at: P(0, g.fd + 12 * g.s), label: 'Lazo decorativo cosido fijo (solo delantero derecho)' });
  return {
    pieces, seams,
    notices: [experimentalNotice('chaleco-experimental', 'Chaleco infantil'), { level: 'ok', code: 'chaleco-sin-cintas', message: 'El lazo es decorativo y va cosido fijo; el chaleco se cierra con broches, sin cintas largas.' }],
    checks: [
      { key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 },
      { key: 'largo', label: 'Largo de espalda desde el hombro', target: L, measured: back.nodes[6].y, tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Borreguito (sherpa), polar o pana', qty: 'Según acomodo', note: 'En borreguito corta con el pelo hacia abajo, con cúter o puntas de tijera para no rasurar el pelo.' },
      ...(lined ? [{ id: 'forro', label: 'Forro de algodón o polar fino', qty: 'Mismas piezas que el exterior' }] : [{ id: 'bies', label: `Bies de ${cm(bias)} (o tiras de punto)`, qty: cm(contour + 2 * arm + 40) }]),
      ...(snaps ? [{ id: 'broches', label: 'Broches de presión infantiles', qty: '2 juegos' }] : []),
      ...(bow ? [{ id: 'lazo', label: 'Retazo de algodón para el lazo', qty: '20 × 20 cm' }] : []),
      { id: 'hilo', label: 'Hilo de poliéster', qty: '1 carrete' }
    ],
    assumptions: [
      `Contorno de pecho = pecho + ${cm(ease)} de holgura para llevar encima de otra prenda; la sisa baja ${cm(12 * g.s)} más que en una blusa.`,
      vNeck ? 'Escote en pico hasta poco más arriba de la sisa.' : 'Escote redondo.',
      lined ? 'Forrado: exterior y forro se cosen derecho con derecho por todo el contorno y las sisas, y se voltea por un costado.' : 'Todos los cantos se rematan con ribete al bies: esos bordes no llevan margen.',
      'Las medidas de la imagen de referencia no coincidían con un cuerpo infantil; el patrón se reconstruyó desde las medidas de la talla elegida.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta las piezas', detail: `Delantero: 2 en espejo. Espalda: 1 al doblez.${lined ? ' Repite en forro.' : ' Corta las tiras de ribete al bies.'}${bow ? ' Corta las piezas del lazo.' : ''}`, pieces: pieces.map(x => x.id) },
      { id: 'hombros', title: 'Une los hombros', detail: `Une delanteros y espalda por los hombros${lined ? ' y repite en el forro' : ''}. En borreguito abre y aplana los márgenes con los dedos (no planches el pelo).`, pieces: ['delantero', 'espalda'], seams: ['hombros'] },
      lined
        ? { id: 'forrar', title: 'Forra el chaleco', detail: 'Coloca exterior y forro derecho con derecho. Cose el contorno (bajo de espalda, bajos y cantos delanteros, escote) y las dos sisas. Recorta los márgenes en curvas, voltea sacando los delanteros por los hombros, y cose los costados del exterior y del forro en una sola pasada dejando 8 cm abiertos en el forro. Cierra a mano.', pieces: ['delantero', 'espalda', 'forro-delantero', 'forro-espalda'], seams: ['costados', 'forro-costados'] }
        : { id: 'ribetear', title: 'Cose los costados y ribetea', detail: 'Cose los costados. Ribetea las sisas y luego todo el contorno en una sola tira, empezando en el costado.', pieces: ['delantero', 'espalda', 'bies-contorno', 'bies-sisa'], seams: ['costados', 'ribete-sisa'] },
      ...(snaps ? [{ id: 'broches', title: 'Coloca los broches', detail: 'Coloca los broches sobre el centro delantero marcado, comprobando que los delanteros se crucen sin tirar.', pieces: ['delantero'] }] : []),
      ...(bow ? [{ id: 'lazo', title: 'Lazo decorativo', detail: 'Cose la lazada en tubo, voltea y cierra en anillo; colócala sobre las colas, envuelve el centro con el nudo y cóselo a mano sobre la marca. No lo uses como cierre.', pieces: ['lazo', 'lazo-colas', 'lazo-nudo', 'delantero'] }] : [])
    ]
  };
}

export const vestGenerator: PatternGenerator = {
  id: 'chaleco-infantil', name: 'Chaleco infantil de borreguito', status: 'experimental',
  summary: 'Chaleco con escote en pico o redondo, forrado o ribeteado, broches y lazo decorativo cosido.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda'], optionalMeasures: ['estatura'],
  defaults: vestDefaults, generate: generateVest,
  params: [
    { key: 'escote', label: 'Escote', group: 'diseno', type: 'choice', choices: [{ value: 'pico', label: 'En pico' }, { value: 'redondo', label: 'Redondo' }] },
    { key: 'acabado', label: 'Acabado', group: 'diseno', type: 'choice', choices: [{ value: 'forro', label: 'Forrado' }, { value: 'ribete', label: 'Ribete al bies' }] },
    { key: 'cierre', label: 'Cierre', group: 'diseno', type: 'choice', choices: [{ value: 'broches', label: 'Broches (cruce de 2 cm)' }, { value: 'abierto', label: 'Abierto, sin cierre' }] },
    { key: 'lazo', label: 'Lazo decorativo', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí, cosido fijo' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo de espalda', group: 'diseno', type: 'length', min: 150, max: 650 },
    { key: 'anchoBies', label: 'Ancho del ribete', group: 'diseno', type: 'length', min: 6, max: 15, when: p => p.acabado === 'ribete' },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 50, max: 220 },
    margin
  ]
};

// ------------------------------------------------------------------ Chaqueta con cuello alto y cierre
export function zipJacketDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  return { largo: round1(k.talle * 1.38), holgura: round1(clamp(k.chest * .24 + 20, 110, 200)), largoManga: round1(k.sleeve), altoCuello: round1(clamp(40 * s, 28, 55)), altoBanda: round1(clamp(42 * s, 28, 60)), altoPuno: round1(clamp(38 * s, 25, 55)), margen: 10 };
}

export function generateZipJacket(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('chaqueta-cierre-talla');
  const p = { ...zipJacketDefaults(ctx), ...params }, k = kidBody(ctx);
  const L = num(p, 'largo'), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), ch = num(p, 'altoCuello'), bh = num(p, 'altoBanda'), cuffH = num(p, 'altoPuno'), sa = num(p, 'margen');
  if (!finite(L, ease, SL, ch, bh, cuffH, sa) || ease < 80 || ease > 280 || ch < 20 || ch > 70 || bh < 20 || bh > 80 || cuffH < 20 || cuffH > 70 || sa < 5 || sa > 15)
    return invalid('chaqueta-cierre-medidas', 'Revisa largo, holgura, cuello, banda, puños y márgenes.');
  const s0 = clamp(k.chest / 560, .7, 1.45), drop = 10 * s0;
  const g = bodiceGeometry(ctx, { ease, length: L - bh, neckWiden: 6 * s0, frontDepthExtra: 4 * s0, dropShoulder: drop, armExtra: 15 * s0 });
  if (g.L < g.ad + 50 * g.s || SL < cuffH + 80 * g.s) return invalid('chaqueta-cierre-largo', 'El cuerpo o la manga quedan demasiado cortos para la banda y los puños.');
  const fin = { sa, hem: sa, neck: 'costura' as const, arm: 'costura' as const, hemFinish: 'costura' as const, centre: 'costura' as const, labels: { centro: 'Canto delantero (cierre)', bajo: 'Bajo (une la banda)' } };
  const front = bodicePiece('delantero', 'Delantero (par en espejo)', g, false, fin, { qty: 2, mirrorPairs: true });
  const back = bodicePiece('espalda', 'Espalda al doblez', g, true, { ...fin, centre: 'doblez' });
  const cuffBand = Math.max(k.wrist * 1.45, k.wrist + 55 * g.s), sleeveHem = cuffBand * 1.25;
  const { piece: sleeve } = setInSleeve('manga', 'Manga (par en espejo)', armhole(front) + armhole(back), { capH: (g.ad - g.sy) * .5, length: SL - drop - cuffH + 10 * g.s, cuff: sleeveHem, capEase: 0, sa, hemFinish: 'costura', hem: sa, armMin: k.arm + 55 * g.s, hemLabel: 'Bajo (une el puño, fruncido)' });
  const neckline = 2 * (neckLen(front) + neckLen(back)), hemLen = 2 * (len(front, 'bajo') + len(back, 'bajo'));
  const collar = rectangle('cuello', 'Cuello alto (exterior e interior)', neckline, ch, [edge('union', 'Unión al escote', 'costura', sa), edge('extremo-der', 'Extremo (cierre)', 'costura', sa), edge('canto', 'Canto superior (une las dos capas)', 'costura', sa), edge('extremo-izq', 'Extremo (cierre)', 'costura', sa)], { qty: 2 }, true);
  collar.notches.push({ id: 'hombro-1', edgeId: 'union', s: neckLen(front), count: 1, label: 'Hombro' }, { id: 'hombro-2', edgeId: 'union', s: neckline - neckLen(front), count: 1, label: 'Hombro' });
  const band = foldedBand('banda', 'Banda del bajo', hemLen * .94, bh, sa, 1, 'principal');
  const cuff = foldedBand('puno', 'Puño', cuffBand, cuffH, sa, 2, 'principal');
  const zip = L + ch, guard = rectangle('tapa-cierre', 'Tapa interior del cierre', 30 * g.s, zip, [edge('canto', 'Canto doblado', 'sin-margen', 0), edge('superior', 'Superior', 'costura', sa), edge('union', 'Unión al cierre', 'costura', sa), edge('inferior', 'Inferior', 'costura', sa)], { qty: 2, fabric: 'contraste' });
  guard.notes = ['Dobla a lo largo; cubre la cinta del cierre por dentro para que no roce.'];
  const pieces: Piece[] = [front, back, sleeve, collar, band, cuff, guard];
  const seams: SeamRelation[] = [...bodySeams('delantero', 'espalda'), ...sleeveSeams('manga', 'delantero', 'espalda', 0),
    equal('cuello-escote', 'Cuello con el escote completo', [{ pieceId: 'cuello', edgeIds: ['union'] }], [{ pieceId: 'delantero', edgeIds: ['cuello'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], 1),
    ratio('banda-bajo', 'Bajo del cuerpo con la banda (estirar la banda)', 'estirado', [{ pieceId: 'delantero', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['bajo'], factor: 2 }], [{ pieceId: 'banda', edgeIds: ['union-1'] }], 1 / .94, .02),
    ratio('puno-manga', 'Bajo de manga con el puño (fruncir la manga)', 'fruncido', [{ pieceId: 'manga', edgeIds: ['puno'] }], [{ pieceId: 'puno', edgeIds: ['union-1'] }], 1.25, .04)];
  const notices: Issue[] = [experimentalNotice('chaqueta-cierre-experimental', 'Chaqueta con cierre'),
    cuffBand < k.wrist * 1.4 ? { level: 'error', code: 'puno-mano', message: 'El puño no deja pasar la mano. Aumenta su contorno.' } : { level: 'ok', code: 'puno-mano', message: `Puño de ${cm(cuffBand)}: pasa la mano con una muñeca de ${cm(k.wrist)}.` },
    { level: 'aviso', code: 'cierre-mentón', message: 'Coloca un protector (tapa del cierre y garaje) en el extremo superior para que el cierre no roce la barbilla.' }];
  return {
    pieces, seams, notices,
    checks: [
      { key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 },
      { key: 'cuello', label: 'Cuello sobre el escote', target: neckline, measured: len(collar, 'union'), tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Borreguito, polar o felpa gruesa', qty: 'Según acomodo', note: 'Corta todas las piezas con el pelo en la misma dirección.' },
      { id: 'cierre', label: 'Cierre separable de plástico', qty: `${Math.ceil(zip / 10)} cm`, note: 'Mide del bajo de la banda al canto del cuello.' },
      { id: 'forro-tapa', label: 'Retazo de algodón para la tapa del cierre', qty: `2 tiras de ${cm(30 * g.s + 2 * sa)} × ${cm(zip + 2 * sa)}` },
      { id: 'hilo', label: 'Hilo de poliéster', qty: '1 carrete' }
    ],
    assumptions: [
      `Chaqueta holgada: pecho + ${cm(ease)}; hombro caído ${cm(drop)} y manga de copa baja que mide exactamente la sisa.`,
      'Banda del bajo y puños de la misma tela, doblados; la banda se estira un 6 % y la manga se frunce dentro del puño.',
      'Los apliques (nubes, flores) se añaden en Bordados sobre las piezas abiertas, antes de unir costados.',
      'Las medidas de la imagen de referencia no eran coherentes (por ejemplo, un delantero de 36 cm de ancho para 4–5 años); el patrón sale de las medidas de la talla.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta y aplica', detail: 'Corta delanteros, espalda, mangas, dos cuellos, banda, puños y tapas. Cose los apliques con zigzag sobre las piezas abiertas.', pieces: pieces.map(x => x.id) },
      { id: 'hombros', title: 'Hombros y mangas', detail: 'Une los hombros. Monta cada manga en plano haciendo coincidir el piquete del hombro.', pieces: ['delantero', 'espalda', 'manga'], seams: ['hombros', 'manga-sisa'] },
      { id: 'costados', title: 'Costados', detail: 'Cose de puño a bajo en una sola pasada por cada lado.', pieces: ['delantero', 'espalda', 'manga'], seams: ['costados', 'manga-costura'] },
      { id: 'punos', title: 'Puños', detail: 'Cierra cada puño en anillo, dóblalo y cóselo al bajo de la manga frunciendo la manga de piquete a piquete.', pieces: ['puno', 'manga'], seams: ['puno-manga'] },
      { id: 'banda', title: 'Banda del bajo', detail: 'Dobla la banda a lo largo y cóselo al bajo estirándola ligeramente, de canto delantero a canto delantero.', pieces: ['banda', 'delantero', 'espalda'], seams: ['banda-bajo'] },
      { id: 'cuello', title: 'Cuello', detail: 'Cose el cuello exterior al escote haciendo coincidir los piquetes de hombro.', pieces: ['cuello', 'delantero', 'espalda'], seams: ['cuello-escote'] },
      { id: 'cierre', title: 'Cierre y tapas', detail: 'Hilvana el cierre derecho con derecho en cada canto delantero, de la banda al canto del cuello. Coloca encima el cuello interior y cose su canto superior y extremos. Voltea, cubre la cinta con la tapa doblada y pespuntea a 5 mm del cierre. Cierra el cuello interior a mano o en la zanja.', pieces: ['delantero', 'cuello', 'tapa-cierre'] }
    ]
  };
}

export const zipJacketGenerator: PatternGenerator = {
  id: 'chaqueta-cierre-infantil', name: 'Chaqueta infantil con cuello alto y cierre', status: 'experimental',
  summary: 'Chaqueta holgada de borreguito o polar con cuello alto, cierre separable, banda en el bajo y puños fruncidos.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga'], optionalMeasures: ['estatura', 'muneca', 'brazo'],
  defaults: zipJacketDefaults, generate: generateZipJacket,
  params: [
    { key: 'largo', label: 'Largo total de espalda (con banda)', group: 'diseno', type: 'length', min: 180, max: 700 },
    { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 150, max: 650 },
    { key: 'altoCuello', label: 'Alto del cuello', group: 'diseno', type: 'length', min: 20, max: 70 },
    { key: 'altoBanda', label: 'Alto de la banda', group: 'diseno', type: 'length', min: 20, max: 80 },
    { key: 'altoPuno', label: 'Alto del puño', group: 'diseno', type: 'length', min: 20, max: 70 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 80, max: 280 },
    margin
  ]
};

// ------------------------------------------------------------------ Chaqueta acolchada reversible
export function quiltedDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  return { bolsillos: 'si', largo: round1(k.talle * 1.45), holgura: round1(clamp(k.chest * .14 + 15, 70, 140)), largoManga: round1(k.sleeve), vuelta: round1(clamp(35 * s, 20, 55)), anchoBies: 10, margen: 10 };
}

export function generateQuilted(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('acolchada-talla');
  const p = { ...quiltedDefaults(ctx), ...params }, k = kidBody(ctx);
  const pockets = str(p, 'bolsillos') === 'si', L = num(p, 'largo'), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), turn = num(p, 'vuelta'), bias = num(p, 'anchoBies'), sa = num(p, 'margen');
  if (!finite(L, ease, SL, turn, bias, sa) || ease < 50 || ease > 220 || turn < 0 || turn > 80 || bias < 6 || bias > 15 || sa < 5 || sa > 15)
    return invalid('acolchada-medidas', 'Revisa largo, holgura, manga, vuelta del puño y ribete.');
  const s0 = clamp(k.chest / 560, .7, 1.45);
  const g = bodiceGeometry(ctx, { ease, length: L, neckWiden: 4 * s0, frontDepthExtra: 4 * s0, armExtra: 10 * s0, ext: 12 * s0 });
  if (L < g.ad + 60 * g.s || SL < 120 * g.s) return invalid('acolchada-largo', 'El cuerpo o la manga quedan demasiado cortos.');
  const fin = { sa, hem: 0, neck: 'sin-margen' as const, arm: 'costura' as const, hemFinish: 'sin-margen' as const, centre: 'sin-margen' as const, labels: { cuello: 'Escote (ribete)', bajo: 'Bajo (ribete)', centro: 'Canto delantero (ribete)' } };
  const front = bodicePiece('delantero', 'Delantero (par en espejo)', g, false, fin, { qty: 2, mirrorPairs: true });
  const back = bodicePiece('espalda', 'Espalda al doblez', g, true, { ...fin, centre: 'doblez' });
  const hemW = Math.max(k.wrist * 1.9, k.arm * .95);
  const { piece: sleeve } = setInSleeve('manga', 'Manga (par en espejo)', armhole(front) + armhole(back), { capH: (g.ad - g.sy) * .62, length: SL + turn, cuff: hemW, capEase: .01, sa, hemFinish: 'sin-margen', hem: 0, armMin: k.arm + 60 * g.s, hemLabel: 'Bajo de manga (ribete)' });
  sleeve.lines.push({ id: 'vuelta', kind: 'doblez', a: P(-hemW / 2, SL), b: P(hemW / 2, SL), label: `Vuelta del puño: doblar ${cm(turn)} hacia fuera` });
  const pieces: Piece[] = [front, back, sleeve];
  const seams: SeamRelation[] = [...bodySeams('delantero', 'espalda'), ...sleeveSeams('manga', 'delantero', 'espalda', .01)];
  const contour = 2 * (len(front, 'cuello') + len(front, 'centro') + len(front, 'bajo') + len(back, 'cuello') + len(back, 'bajo'));
  pieces.push(bindingStrip('bies-contorno', 'Ribete del contorno (escote, delanteros y bajo)', contour, bias, 1, 10), bindingStrip('bies-manga', 'Ribete del bajo de manga', len(sleeve, 'puno'), bias, 2, 10));
  seams.push(equal('ribete-manga', 'Bajo de manga con su ribete', [{ pieceId: 'manga', edgeIds: ['puno'] }], [{ pieceId: 'bies-manga', edgeIds: ['largo-superior'] }]));
  if (pockets) {
    const pw = clamp(g.q * .48, 45, 110), ph = pw * 1.07, r = pw * .22;
    const pocket = outline('bolsillo', 'Bolsillo de parche', [P(0, 0), P(pw, 0), P(pw, ph - r), P(pw - r, ph), P(r, ph), P(0, ph - r)], [
      edge('boca', 'Boca (ribete)', 'sin-margen', 0), edge('lado-der', 'Lado (doblar hacia dentro)', 'costura', 7), edge('curva-der', 'Esquina redonda', 'costura', 7, P(pw, ph - r * .45), P(pw - r * .45, ph)),
      edge('fondo', 'Fondo (doblar hacia dentro)', 'costura', 7), edge('curva-izq', 'Esquina redonda', 'costura', 7, P(r * .45, ph), P(0, ph - r * .45)), edge('lado-izq', 'Lado (doblar hacia dentro)', 'costura', 7)], { qty: 2 });
    const top = g.ad + (g.L - g.ad) * .32, x0 = Math.max(18 * g.s, (g.q - pw) * .45);
    front.lines.push({ id: 'bolsillo', kind: 'colocacion', a: P(x0, top), b: P(x0 + pw, top), label: 'Bolsillo: canto superior' });
    pieces.push(pocket, bindingStrip('bies-bolsillo', 'Ribete de la boca del bolsillo', pw, bias, 2, 10));
  }
  buttonMarks(front, 0, g.fd + 12 * g.s, g.L - 45 * g.s, g.L > 300 ? 5 : 4, 'boton', 'Broche de presión');
  return {
    pieces, seams,
    notices: [experimentalNotice('acolchada-experimental', 'Chaqueta acolchada')],
    checks: [
      { key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 },
      { key: 'largo', label: 'Largo de espalda', target: L, measured: back.nodes[6].y, tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Tela acolchada reversible (exterior + guata fina + forro)', qty: 'Según acomodo + 10 %', note: 'Si acolchas tú: une las tres capas, pespuntea rombos de 4 cm y después corta las piezas (el acolchado encoge).' },
      { id: 'bies', label: `Bies de ${cm(bias)} en contraste`, qty: cm(contour + 2 * len(sleeve, 'puno') + (pockets ? 2 * 100 : 0) + 60) },
      { id: 'broches', label: 'Broches de presión', qty: g.L > 300 ? '5 juegos' : '4 juegos' }, { id: 'hilo', label: 'Hilo', qty: '1 carrete' }
    ],
    assumptions: [
      `Chaqueta acolchada sin forro aparte: se corta del acolchado ya hecho. Pecho + ${cm(ease)}; cruce de ${cm(2 * g.ext)} para los broches.`,
      `La manga lleva ${cm(turn)} más para doblar el puño y mostrar el reverso.`,
      'Costuras interiores ribeteadas o sobrehiladas para que sea reversible. Escote, delanteros, bajo y puños llevan ribete sin margen.',
      'Medidas de la referencia comprobadas: para 3–4 años daba 64 cm de pecho, 36 cm de largo y 33 cm de manga; el patrón calcula valores parecidos desde las medidas.'
    ],
    steps: [
      { id: 'acolchar', title: 'Acolcha y corta', detail: 'Acolcha la tela en rombos antes de cortar. Corta delanteros, espalda, mangas y bolsillos; corta el bies.', pieces: pieces.map(x => x.id) },
      ...(pockets ? [{ id: 'bolsillos', title: 'Bolsillos', detail: 'Ribetea la boca, dobla el margen de lados y fondo, y cose cada bolsillo sobre su línea.', pieces: ['bolsillo', 'bies-bolsillo', 'delantero'] }] : []),
      { id: 'cuerpo', title: 'Hombros, mangas y costados', detail: 'Une hombros, monta las mangas en plano y cierra costados y mangas. Ribetea o sobrehila los márgenes interiores.', pieces: ['delantero', 'espalda', 'manga'], seams: ['hombros', 'manga-sisa', 'costados', 'manga-costura'] },
      { id: 'ribetes', title: 'Ribetes', detail: 'Ribetea los bajos de manga y después todo el contorno en una sola tira, empezando en un costado del bajo.', pieces: ['bies-contorno', 'bies-manga', 'delantero', 'espalda', 'manga'], seams: ['ribete-manga'] },
      { id: 'broches', title: 'Broches y puños', detail: 'Coloca los broches sobre el centro delantero. Dobla la vuelta del puño hacia fuera.', pieces: ['delantero', 'manga'] }
    ]
  };
}

export const quiltedJacketGenerator: PatternGenerator = {
  id: 'chaqueta-acolchada-infantil', name: 'Chaqueta acolchada reversible infantil', status: 'experimental',
  summary: 'Chaqueta de cuello redondo en tela acolchada, ribete en contraste, bolsillos de parche, broches y puño vuelto.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga'], optionalMeasures: ['estatura', 'muneca', 'brazo'],
  defaults: quiltedDefaults, generate: generateQuilted,
  params: [
    { key: 'bolsillos', label: 'Bolsillos de parche', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo de espalda', group: 'diseno', type: 'length', min: 180, max: 700 },
    { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 150, max: 650 },
    { key: 'vuelta', label: 'Vuelta del puño', group: 'diseno', type: 'length', min: 0, max: 80 },
    { key: 'anchoBies', label: 'Ancho del ribete', group: 'diseno', type: 'length', min: 6, max: 15 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 50, max: 220 },
    margin
  ]
};

// ------------------------------------------------------------------ Chaqueta con capucha forrada y botones
export function hoodedJacketDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  return { bolsillos: 'si', largo: round1(k.talle * 1.42), holgura: round1(clamp(k.chest * .2 + 20, 100, 180)), largoManga: round1(k.sleeve), vuelta: round1(clamp(30 * s, 20, 50)), margen: 10, dobladillo: 10 };
}

export function generateHoodedJacket(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('capucha-botones-talla');
  const p = { ...hoodedJacketDefaults(ctx), ...params }, k = kidBody(ctx);
  const pockets = str(p, 'bolsillos') === 'si', L = num(p, 'largo'), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), turn = num(p, 'vuelta'), sa = num(p, 'margen');
  if (!finite(L, ease, SL, turn, sa) || ease < 70 || ease > 260 || turn < 15 || turn > 70 || sa < 5 || sa > 15)
    return invalid('capucha-botones-medidas', 'Revisa largo, holgura, manga, vuelta y márgenes.');
  const s0 = clamp(k.chest / 560, .7, 1.45), ext = 15 * s0;
  const g = bodiceGeometry(ctx, { ease, length: L, neckWiden: 5 * s0, frontDepthExtra: 4 * s0, armExtra: 14 * s0, ext });
  if (L < g.ad + 70 * g.s || SL < 120 * g.s) return invalid('capucha-botones-largo', 'El cuerpo o la manga quedan demasiado cortos.');
  const fin = { sa, hem: sa, neck: 'costura' as const, arm: 'costura' as const, hemFinish: 'costura' as const, centre: 'costura' as const, labels: { centro: 'Canto delantero (une la vista)', bajo: 'Bajo (une la vista del bajo)' } };
  const front = bodicePiece('delantero', 'Delantero (par en espejo)', g, false, fin, { qty: 2, mirrorPairs: true });
  const back = bodicePiece('espalda', 'Espalda al doblez', g, true, { ...fin, centre: 'doblez' });
  const hemW = Math.max(k.wrist * 1.85, k.arm * .9);
  const { piece: sleeve } = setInSleeve('manga', 'Manga (par en espejo)', armhole(front) + armhole(back), { capH: (g.ad - g.sy) * .58, length: SL + turn, cuff: hemW, capEase: .02, sa, hemFinish: 'costura', hem: sa, armMin: k.arm + 60 * g.s, hemLabel: 'Bajo de manga (une la vista del puño)' });
  const facingW = ext + 40 * g.s, hf = 40 * g.s;
  const facing = frontFacing(front, 'vista-delantera', 'Vista delantera (par en espejo)', facingW, sa, 'costura', sa, 'contraste');
  const hemFront = rectangle('vista-bajo-delantero', 'Vista del bajo delantero (par en espejo)', len(front, 'bajo') - facingW, hf, [edge('superior', 'Canto superior (doblar)', 'dobladillo', 8), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo (une al delantero)', 'costura', sa), edge('vista', 'Une la vista delantera', 'costura', sa)], { qty: 2, mirrorPairs: true, fabric: 'contraste' }, true);
  const hemBack = rectangle('vista-bajo-espalda', 'Vista del bajo de espalda al doblez', len(back, 'bajo'), hf, [edge('superior', 'Canto superior (doblar)', 'dobladillo', 8), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Bajo (une a la espalda)', 'costura', sa), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true, fabric: 'contraste' }, true);
  const cuffFacing = rectangle('vista-puno', 'Vista del puño (se ve al doblar)', len(sleeve, 'puno'), 2 * turn, [edge('union', 'Unión al bajo de manga', 'costura', sa), edge('extremo-1', 'Costura del anillo', 'costura', sa), edge('canto', 'Canto interior (doblar)', 'dobladillo', 8), edge('extremo-2', 'Costura del anillo', 'costura', sa)], { qty: 2, fabric: 'contraste' }, true);
  const baseLen = neckLen(front) + neckLen(back);
  const hood = hoodPiece('capucha', 'Capucha exterior (par en espejo)', baseLen, k.head, sa, { finish: 'costura', allowance: sa, label: 'Boca (une el forro)' });
  const hoodLining = copyPiece(hood, 'forro-capucha', 'Forro de capucha (par en espejo)', { fabric: 'contraste' });
  const pieces: Piece[] = [front, back, sleeve, facing, hemFront, hemBack, cuffFacing, hood, hoodLining];
  const seams: SeamRelation[] = [...bodySeams('delantero', 'espalda'), ...sleeveSeams('manga', 'delantero', 'espalda', .02),
    equal('capucha-escote', 'Base de capucha con el escote (por lado)', [{ pieceId: 'capucha', edgeIds: ['base-cuello'] }], [{ pieceId: 'delantero', edgeIds: ['cuello'] }, { pieceId: 'espalda', edgeIds: ['cuello'] }]),
    equal('capucha-centro', 'Centro y coronilla de la capucha', [{ pieceId: 'capucha', edgeIds: ['centro-espalda', 'coronilla'] }], [{ pieceId: 'capucha', edgeIds: ['centro-espalda', 'coronilla'] }]),
    equal('vista-canto', 'Vista con el canto delantero', [{ pieceId: 'vista-delantera', edgeIds: ['canto'] }], [{ pieceId: 'delantero', edgeIds: ['centro'] }]),
    equal('vista-puno', 'Vista del puño con el bajo de manga', [{ pieceId: 'vista-puno', edgeIds: ['union'] }], [{ pieceId: 'manga', edgeIds: ['puno'] }]),
    equal('vista-bajo', 'Vistas del bajo con el bajo del cuerpo', [{ pieceId: 'vista-bajo-delantero', edgeIds: ['bajo'] }, { pieceId: 'vista-delantera', edgeIds: ['bajo'] }, { pieceId: 'vista-bajo-espalda', edgeIds: ['bajo'] }], [{ pieceId: 'delantero', edgeIds: ['bajo'] }, { pieceId: 'espalda', edgeIds: ['bajo'] }], 1)];
  if (pockets) {
    const pw = clamp(g.q * .52, 45, 115), ph = pw * 1.05, r = pw * .3;
    const pocket = outline('bolsillo', 'Bolsillo de parche', [P(0, 0), P(pw, 0), P(pw, ph - r), P(pw - r, ph), P(r, ph), P(0, ph - r)], [
      edge('boca', 'Boca (doble doblez)', 'dobladillo', 20), edge('lado-der', 'Lado (doblar)', 'costura', 7), edge('curva-der', 'Curva', 'costura', 7, P(pw, ph - r * .45), P(pw - r * .45, ph)),
      edge('fondo', 'Fondo (doblar)', 'costura', 7), edge('curva-izq', 'Curva', 'costura', 7, P(r * .45, ph), P(0, ph - r * .45)), edge('lado-izq', 'Lado (doblar)', 'costura', 7)], { qty: 2, fabric: 'contraste' });
    const top = g.ad + (g.L - g.ad) * .3, x0 = Math.max(facingW - ext + 10 * g.s, (g.q - pw) * .55);
    front.lines.push({ id: 'bolsillo', kind: 'colocacion', a: P(x0, top), b: P(x0 + pw, top), label: 'Bolsillo: canto superior' });
    pieces.push(pocket);
  }
  const count = g.L > 330 ? 5 : 4;
  buttonMarks(front, 0, g.fd + 14 * g.s, g.L - 50 * g.s, count, 'boton', 'Botón (delantero derecho) · ojal horizontal (delantero izquierdo)');
  const notices: Issue[] = [experimentalNotice('capucha-botones-experimental', 'Chaqueta con capucha'), { level: 'ok', code: 'capucha-sin-cordon', message: 'La capucha no lleva cordón (norma de seguridad infantil para cuello y capucha).' }];
  if (ctx.kind === 'bebe') notices.push({ level: 'aviso', code: 'botones-bebe', message: 'En bebés cose los botones con hilo doble y revísalos antes de cada uso, o cámbialos por broches de presión.' });
  return {
    pieces, seams, notices,
    checks: [
      { key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .5 },
      { key: 'capucha', label: 'Base de capucha (por lado)', target: baseLen, measured: len(hood, 'base-cuello'), tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Paño ligero, pana o lona suave para el exterior', qty: 'Según acomodo', note: 'Para combinar colores (cuerpo, mangas, capucha, bolsillos) asígnalos en Telas y colores.' },
      { id: 'contraste', label: 'Algodón (vichy) para forro de capucha y vistas', qty: 'Según acomodo' },
      { id: 'botones', label: `Botones de 15–18 mm`, qty: `${count}` }, { id: 'entretela', label: 'Entretela ligera para la vista delantera', qty: 'Lo que mida la vista' }, { id: 'hilo', label: 'Hilo', qty: '1 carrete' }
    ],
    assumptions: [
      `Pecho + ${cm(ease)}; cruce de botones de ${cm(ext)} a cada lado del centro.`,
      'Capucha de dos piezas forrada; su base mide exactamente el escote de cada lado. Sin cordones.',
      `Vistas en contraste: delantera, bajo y puños. La manga lleva ${cm(turn)} extra para doblar el puño y mostrar la vista.`,
      'La referencia era una ilustración sin medidas; las piezas se trazaron desde las medidas de la talla.'
    ],
    steps: [
      { id: 'cortar', title: 'Corta y entretela', detail: 'Corta exterior y contrastes. Entretela las vistas delanteras.', pieces: pieces.map(x => x.id) },
      ...(pockets ? [{ id: 'bolsillos', title: 'Bolsillos', detail: 'Dobla la boca dos veces y pespuntea; dobla el contorno y cose cada bolsillo sobre su línea.', pieces: ['bolsillo', 'delantero'] }] : []),
      { id: 'cuerpo', title: 'Hombros, mangas y costados', detail: 'Une hombros, monta las mangas en plano y cierra costados y mangas.', pieces: ['delantero', 'espalda', 'manga'], seams: ['hombros', 'manga-sisa', 'costados', 'manga-costura'] },
      { id: 'capucha', title: 'Capucha forrada', detail: 'Cose centro y coronilla de la capucha y de su forro. Une ambas por la boca derecho con derecho, voltea y pespuntea. Hilvana la base de las dos capas juntas y cósela al escote de piquete a piquete.', pieces: ['capucha', 'forro-capucha', 'delantero', 'espalda'], seams: ['capucha-centro', 'capucha-escote'] },
      { id: 'vistas', title: 'Vistas', detail: 'Une las vistas del bajo a las vistas delanteras. Cose todo el conjunto al canto delantero y al bajo derecho con derecho, atrapando la base de la capucha en el escote. Voltea y pespuntea.', pieces: ['vista-delantera', 'vista-bajo-delantero', 'vista-bajo-espalda', 'delantero', 'espalda'], seams: ['vista-canto', 'vista-bajo'] },
      { id: 'punos', title: 'Puños', detail: 'Cierra cada vista de puño en anillo y cóselo al bajo de la manga; voltéala hacia dentro, pespuntea y dobla la vuelta hacia fuera.', pieces: ['vista-puno', 'manga'], seams: ['vista-puno'] },
      { id: 'botones', title: 'Ojales y botones', detail: 'Haz ojales horizontales en el delantero izquierdo y cose los botones en el derecho, sobre el centro delantero.', pieces: ['delantero'] }
    ]
  };
}

export const hoodedJacketGenerator: PatternGenerator = {
  id: 'chaqueta-capucha-infantil', name: 'Chaqueta infantil con capucha forrada y botones', status: 'experimental',
  summary: 'Chaqueta abotonada con capucha forrada, bolsillos de parche y vistas en contraste en puños y bajo.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga', 'cabeza'], optionalMeasures: ['estatura', 'muneca', 'brazo'],
  defaults: hoodedJacketDefaults, generate: generateHoodedJacket,
  params: [
    { key: 'bolsillos', label: 'Bolsillos de parche', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo de espalda', group: 'diseno', type: 'length', min: 180, max: 700 },
    { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 150, max: 650 },
    { key: 'vuelta', label: 'Vuelta del puño', group: 'diseno', type: 'length', min: 15, max: 70 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 70, max: 260 },
    margin
  ]
};

// ------------------------------------------------------------------ Sudadera con bolsillo canguro
export function kangarooDefaults(ctx: GeneratorContext): Params {
  const k = kidBody(ctx), s = clamp(k.chest / 560, .7, 1.45);
  return { bolsillo: 'si', largo: round1(k.talle * 1.5), holgura: round1(clamp(k.chest * .12 + 25, 70, 140)), largoManga: round1(k.sleeve), altoBanda: round1(clamp(38 * s, 25, 55)), altoPuno: round1(clamp(35 * s, 22, 50)), margen: 8, dobladillo: 15 };
}

export function generateKangaroo(ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!isKid(ctx)) return notKid('sudadera-canguro-talla');
  const p = { ...kangarooDefaults(ctx), ...params }, k = kidBody(ctx);
  const pocket = str(p, 'bolsillo') === 'si', L = num(p, 'largo'), ease = num(p, 'holgura'), SL = num(p, 'largoManga'), bh = num(p, 'altoBanda'), cuffH = num(p, 'altoPuno'), sa = num(p, 'margen'), hem = num(p, 'dobladillo');
  if (!finite(L, ease, SL, bh, cuffH, sa, hem) || ease < 50 || ease > 220 || bh < 15 || bh > 80 || cuffH < 15 || cuffH > 70 || sa < 5 || sa > 12 || hem < 8 || hem > 30)
    return invalid('sudadera-canguro-medidas', 'Revisa largo, holgura, bandas y márgenes.');
  const s0 = clamp(k.chest / 560, .7, 1.45), stretch = ctx.fabric === 'punto' ? Math.min(ctx.stretch, 40) : 0;
  // Pull-over: the neckline (front + back) must pass the head. A knit sewn with a
  // stretch stitch gives about three quarters of its stretch at the hood seam.
  const factor = 1 + stretch * .0075, need = (k.head + 20) / factor;
  const g0 = bodiceGeometry(ctx, { ease, length: L - bh, neckWiden: 10 * s0, dropShoulder: 8 * s0, armExtra: 12 * s0 });
  const widenRoom = Math.max(0, g0.sh - 30 * g0.s - g0.nw);
  const geo = (t: number) => bodiceGeometry(ctx, { ease, length: L - bh, neckWiden: 10 * s0 + Math.min(t * .7, widenRoom), frontDepthExtra: t, dropShoulder: 8 * s0, armExtra: 12 * s0 });
  const fin = { sa, hem: sa, neck: 'costura' as const, arm: 'costura' as const, hemFinish: 'costura' as const, centre: 'doblez' as const, labels: { bajo: 'Bajo (une la banda)' } };
  const neckFor = (t: number) => { const g = geo(t); return 2 * (neckLen(bodicePiece('f', 'f', g, false, fin)) + neckLen(bodicePiece('b', 'b', g, true, fin))); };
  const t = neckFor(0) >= need ? 0 : solve(neckFor, need, 0, k.head * .3);
  const g = geo(Math.ceil(t * 10) / 10);
  if (g.L < g.ad + 50 * g.s || SL < cuffH + 80 * g.s || g.fd > g.ad * .8) return invalid('sudadera-canguro-largo', 'El cuerpo, la manga o el escote no caben con estas medidas: la cabeza necesita un escote demasiado profundo para esta talla.');
  const front = bodicePiece('delantero', 'Delantero al doblez', g, false, fin), back = bodicePiece('espalda', 'Espalda al doblez', g, true, fin);
  const cuffBand = Math.max(k.wrist * 1.05, k.wrist + 12 * g.s), sleeveHem = cuffBand * 1.35;
  const { piece: sleeve } = setInSleeve('manga', 'Manga (par en espejo)', armhole(front) + armhole(back), { capH: (g.ad - g.sy) * .48, length: SL - 8 * s0 - cuffH + 10 * g.s, cuff: sleeveHem, capEase: 0, sa, hemFinish: 'costura', hem: sa, armMin: k.arm + 50 * g.s, hemLabel: 'Bajo (une el puño de rib)' });
  const neckline = 2 * (neckLen(front) + neckLen(back)), hemLen = 4 * (len(front, 'bajo') + len(back, 'bajo')) / 2;
  const hood = hoodPiece('capucha', 'Capucha (par en espejo)', neckLen(front) + neckLen(back), k.head, sa, { finish: 'dobladillo', allowance: hem, label: 'Boca de capucha (doble doblez)' });
  const band = foldedBand('banda', 'Banda de rib del bajo', hemLen * .85, bh, sa, 1, 'punto-elastico');
  const cuff = foldedBand('puno', 'Puño de rib', cuffBand, cuffH, sa, 2, 'punto-elastico');
  const pieces: Piece[] = [front, back, sleeve, hood, band, cuff];
  const seams: SeamRelation[] = [...bodySeams('delantero', 'espalda'), ...sleeveSeams('manga', 'delantero', 'espalda', 0),
    equal('capucha-escote', 'Base de capucha con el escote (por lado)', [{ pieceId: 'capucha', edgeIds: ['base-cuello'] }], [{ pieceId: 'delantero', edgeIds: ['cuello'] }, { pieceId: 'espalda', edgeIds: ['cuello'] }]),
    equal('capucha-centro', 'Centro y coronilla de la capucha', [{ pieceId: 'capucha', edgeIds: ['centro-espalda', 'coronilla'] }], [{ pieceId: 'capucha', edgeIds: ['centro-espalda', 'coronilla'] }]),
    ratio('banda-bajo', 'Bajo con la banda de rib (estirar el rib)', 'estirado', [{ pieceId: 'delantero', edgeIds: ['bajo'], factor: 2 }, { pieceId: 'espalda', edgeIds: ['bajo'], factor: 2 }], [{ pieceId: 'banda', edgeIds: ['union-1'] }], 1 / .85, .02),
    ratio('puno-manga', 'Bajo de manga con el puño de rib (estirar el rib)', 'estirado', [{ pieceId: 'manga', edgeIds: ['puno'] }], [{ pieceId: 'puno', edgeIds: ['union-1'] }], 1.35, .04)];
  if (pocket) {
    const pw = g.q * .62, ph = Math.max(50, (g.L - g.ad) * .58), tw = pw * .5, oh = ph * .6;
    const kp = outline('bolsillo', 'Bolsillo canguro al doblez', [P(0, 0), P(tw, 0), P(pw, oh), P(pw, ph), P(0, ph)], [
      edge('superior', 'Canto superior (doblar y pespuntear)', 'costura', 8), edge('boca', 'Boca (doblar 5 mm dos veces)', 'costura', 10), edge('lado', 'Lado (doblar y pespuntear)', 'costura', 8),
      edge('inferior', 'Canto inferior (entra en la costura de la banda)', 'costura', sa), edge('centro', 'Centro (al doblez)', 'doblez', 0)], { onFold: true });
    front.lines.push({ id: 'bolsillo', kind: 'colocacion', a: P(0, g.L - ph), b: P(tw, g.L - ph), label: 'Bolsillo canguro: canto superior' });
    pieces.push(kp);
  }
  return {
    pieces, seams,
    notices: [experimentalNotice('sudadera-canguro-experimental', 'Sudadera infantil'),
      { level: 'ok', code: 'sin-cordon', message: 'Sin cordón en la capucha: la norma de seguridad infantil no los permite en cuello y capucha.' },
      neckline * factor < k.head + 20 - .5 ? { level: 'error', code: 'paso-cabeza', message: 'El escote no deja pasar la cabeza. Aumenta la profundidad del escote.' } : { level: 'ok', code: 'paso-cabeza', message: `Escote de ${cm(neckline)}${stretch ? ` con ${stretch} % de elasticidad` : ''}: pasa una cabeza de ${cm(k.head)}.` }],
    checks: [
      { key: 'pecho', label: 'Contorno de pecho terminado', body: k.chest, ease, target: k.chest + ease, measured: 4 * front.nodes[4].x, tolerance: .5 },
      { key: 'capucha', label: 'Base de capucha (por lado)', target: neckline / 2, measured: len(hood, 'base-cuello'), tolerance: .5 }
    ],
    materials: [
      { id: 'tela', label: 'Felpa, sudadera perchada o borreguito fino', qty: 'Según acomodo' },
      { id: 'rib', label: 'Rib 2×2 o 1×1 con buena recuperación', qty: `${cm(hemLen * .85 + 2 * sa)} × ${cm(2 * bh + 2 * sa)} y 2 × ${cm(cuffBand + 2 * sa)} × ${cm(2 * cuffH + 2 * sa)}` },
      { id: 'hilo', label: 'Hilo para punto', qty: '1 carrete' }
    ],
    assumptions: [`Pecho + ${cm(ease)}; hombro ligeramente caído. Banda de rib al 85 % y puños de rib estirados.`, 'Escote calculado para pasar la cabeza: con capucha no se nota su anchura. Sin cordón.', 'La referencia daba 60 cm de pecho y 36 cm de largo para 12–18 meses; el patrón calcula valores similares desde las medidas.'],
    steps: [
      { id: 'cortar', title: 'Corta', detail: 'Corta delantero y espalda al doblez, mangas, capucha, bolsillo, banda y puños (el rib con la elasticidad a lo largo).', pieces: pieces.map(x => x.id) },
      ...(pocket ? [{ id: 'bolsillo', title: 'Bolsillo canguro', detail: 'Dobladilla las bocas, dobla canto superior y lados, y pespuntea el bolsillo sobre el delantero dejando abiertas las bocas; el canto inferior queda hilvanado al bajo.', pieces: ['bolsillo', 'delantero'] }] : []),
      { id: 'cuerpo', title: 'Hombros, mangas y costados', detail: 'Une hombros, monta mangas y cierra costados con puntada elástica.', pieces: ['delantero', 'espalda', 'manga'], seams: ['hombros', 'manga-sisa', 'costados', 'manga-costura'] },
      { id: 'capucha', title: 'Capucha', detail: 'Dobladilla la boca, une centro y coronilla y cose la capucha al escote, con los extremos de la boca juntos en el centro delantero.', pieces: ['capucha', 'delantero', 'espalda'], seams: ['capucha-centro', 'capucha-escote'] },
      { id: 'rib', title: 'Banda y puños', detail: 'Cierra banda y puños en anillo, dóblalos y cóselos estirando el rib de piquete a piquete.', pieces: ['banda', 'puno', 'delantero', 'espalda', 'manga'], seams: ['banda-bajo', 'puno-manga'] }
    ]
  };
}

export const kangarooHoodieGenerator: PatternGenerator = {
  id: 'sudadera-canguro-infantil', name: 'Sudadera infantil con capucha y bolsillo canguro', status: 'experimental',
  summary: 'Sudadera de manga montada con capucha sin cordón, bolsillo canguro y banda y puños de rib.',
  requiredMeasures: ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga', 'cabeza'], optionalMeasures: ['estatura', 'muneca', 'brazo'],
  defaults: kangarooDefaults, generate: generateKangaroo,
  params: [
    { key: 'bolsillo', label: 'Bolsillo canguro', group: 'diseno', type: 'choice', choices: [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] },
    { key: 'largo', label: 'Largo total (con banda)', group: 'diseno', type: 'length', min: 180, max: 700 },
    { key: 'largoManga', label: 'Largo de manga (hombro a muñeca)', group: 'diseno', type: 'length', min: 150, max: 650 },
    { key: 'altoBanda', label: 'Alto de la banda', group: 'diseno', type: 'length', min: 15, max: 80 },
    { key: 'altoPuno', label: 'Alto del puño', group: 'diseno', type: 'length', min: 15, max: 70 },
    { key: 'holgura', label: 'Holgura de pecho', group: 'holgura', type: 'length', min: 50, max: 220 },
    margin, { key: 'dobladillo', label: 'Dobladillo de la capucha', group: 'margenes', type: 'length', min: 8, max: 30 }
  ]
};

export const KIDS_OUTERWEAR_GENERATORS = [vestGenerator, zipJacketGenerator, quiltedJacketGenerator, hoodedJacketGenerator, kangarooHoodieGenerator];

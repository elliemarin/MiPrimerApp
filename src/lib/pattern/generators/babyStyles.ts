import { num, round1, type GeneratorContext, type GeneratorResult, type Params, type PatternGenerator } from '../generator';
import type { Piece } from '../types';
import { panelizePattern, pieceGeometryHash } from '../panels';
import { P, bindingStrip, cm, edge, equal, invalid, len, outline, ratio, rectangle } from './kidsShared';
import { armhole, bodiceGeometry, bodicePiece, bodySeams, buttonMarks, isSmall, kidBody, setInSleeve, sleeveSeams } from './kidsBlocks';
import { babyBodysuitGenerator, generateBabyBodysuit } from './babyBodysuit';
import { generateOverall, overallGenerator } from './babyMore';
import { bonnetGenerator, generateBonnet } from './babyPlus';
import { generatePants, pantsGenerator } from './pants';
import { generatePoncho, ponchoGenerator } from './relaxed';

/** New constructions, not a multiplication of sizes or colour recipes. */
export const BABY_STYLES = [
  ['bebe-body-sin-mangas', 'Pañalero sin mangas', 'body'],
  ['bebe-body-mariposa', 'Pañalero de mangas mariposa', 'body'],
  ['bebe-body-falda', 'Pañalero con faldita', 'body'],
  ['bebe-body-canesu', 'Pañalero con canesú', 'body'],
  ['bebe-cardigan-cruzado', 'Chaquetita cruzada con broches', 'top'],
  ['bebe-cardigan-pico', 'Cárdigan de cuello en V', 'top'],
  ['bebe-blusa-peplum', 'Blusita de peplum', 'top'],
  ['bebe-camisa-globo', 'Camisita de mangas globo', 'top'],
  ['bebe-peto-canesu', 'Pelele con canesú', 'peto'],
  ['bebe-peto-falda', 'Pelele con sobrefalda', 'peto'],
  ['bebe-peto-cargo', 'Pelele con bolsillos cargo', 'peto'],
  ['bebe-pantalon-rodilleras', 'Pantaloncito con rodilleras', 'pantalon'],
  ['bebe-pantalon-panel-lateral', 'Pantaloncito con paneles laterales', 'pantalon'],
  ['bebe-pantalon-punos-extensibles', 'Pantaloncito de puños extensibles', 'pantalon'],
  ['bebe-babero-mangas', 'Babero con mangas', 'top'],
  ['bebe-poncho-bano', 'Poncho de baño con broches', 'poncho'],
  ['bebe-bolero-redondo', 'Bolerito de frentes redondeados', 'top'],
  ['bebe-bonete-visera', 'Bonete con visera suave', 'bonete'],
] as const;
export type BabyStyle = typeof BABY_STYLES[number][0];
const lookup = (id: string) => BABY_STYLES.find(s => s[0] === id);
const piece = (r: GeneratorResult, id: string) => r.pieces.find(p => p.id === id)!;
const seamEdges = (sa: number) => [edge('superior', 'Canto superior', 'costura', sa), edge('derecho', 'Canto derecho', 'costura', sa), edge('inferior', 'Canto inferior', 'costura', sa), edge('izquierdo', 'Canto izquierdo', 'costura', sa)] as const;

function removePiece(r: GeneratorResult, id: string) {
  r.pieces = r.pieces.filter(p => p.id !== id);
  const removed = r.seams.filter(s => [...s.a, ...s.b].some(side => side.pieceId === id)).map(s => s.id);
  r.seams = r.seams.filter(s => !removed.includes(s.id));
  r.steps = r.steps.map(s => ({ ...s, pieces: s.pieces?.filter(p => p !== id), seams: s.seams?.filter(id => !removed.includes(id)) }));
}

/** Panel IDs are named by construction, keeping persisted surfaces independent of geometry hashes. */
function split(r: GeneratorResult, ids: string[], at: (p: Piece) => { x: number; y: number }[], label: string, sa: number) {
  const result = panelizePattern(r.pieces, r.seams, ids.map(id => ({ id: `${label}-${id}`, pieceId: id, points: at(piece(r, id)), allowance: sa, baseHash: pieceGeometryHash(piece(r, id)) })));
  if (result.issues.some(i => i.level === 'error')) { r.notices.push(...result.issues); return; }
  const renamed: Record<string, string> = {};
  for (const id of ids) {
    const panels = result.mapping[id].map(pid => result.pieces.find(p => p.id === pid)!);
    panels.sort((a, b) => label === 'lateral' ? Math.min(...a.nodes.map(n => n.x)) - Math.min(...b.nodes.map(n => n.x)) : Math.min(...a.nodes.map(n => n.y)) - Math.min(...b.nodes.map(n => n.y)));
    panels.forEach((p, index) => { renamed[p.id] = `${id}-${index === 0 ? label : 'base'}`; p.name = `${piece(r, id).name}: ${index === 0 ? label : 'cuerpo inferior'}`; });
  }
  const map = (id: string) => renamed[id] ?? id;
  result.pieces.forEach(p => { p.id = map(p.id); });
  result.seams.forEach(s => { s.a = s.a.map(side => ({ ...side, pieceId: map(side.pieceId) })); s.b = s.b.map(side => ({ ...side, pieceId: map(side.pieceId) })); });
  r.steps = r.steps.map(s => ({ ...s, pieces: s.pieces?.flatMap(id => (result.mapping[id] ?? [id]).map(map)) }));
  r.steps.splice(1, 0, { id: 'armar-paneles', title: `Une los paneles de ${label}`, detail: 'Antes de montar la prenda, une cada par de paneles por sus piquetes. Los bordes C1 llevan el mismo margen a ambos lados: no añadas otro margen. Conserva la orientación del hilo y plancha sin estirar.', pieces: Object.values(renamed), seams: result.seams.filter(s => s.id.startsWith('panel-union')).map(s => s.id) });
  r.pieces = result.pieces; r.seams = result.seams; r.notices.push(...result.issues);
}

function gatheredSkirt(r: GeneratorResult, frontId: string, backId: string, y: number, height: number, frontWidth: number, backWidth: number, sa: number) {
  for (const [id, source, width] of [['falda-delantera', frontId, frontWidth], ['falda-trasera', backId, backWidth]] as const) {
    const openFront = id === 'falda-delantera' && !piece(r, source).cut.onFold;
    const skirt = rectangle(id, `Sobrefalda ${id === 'falda-delantera' ? 'delantera' : 'trasera'} ${openFront ? '(dos mitades abiertas)' : 'al doblez'}`, width * 1.6 / 2, height, [edge('union', 'Fruncir a la línea marcada', 'costura', sa), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Dobladillo', 'dobladillo', 12), edge('centro', openFront ? 'Centro abierto: dobladillo' : 'Al doblez', openFront ? 'dobladillo' : 'doblez', openFront ? 12 : 0)], { onFold: !openFront, qty: openFront ? 2 : 1, mirrorPairs: openFront });
    r.pieces.push(skirt);
    const target = piece(r, source), xmin = Math.min(...target.nodes.map(n => n.x)), xmax = Math.max(...target.nodes.map(n => n.x));
    target.lines.push({ id: 'colocacion-falda', kind: 'colocacion', a: P(Math.max(0, xmin), y), b: P(Math.min(xmax, width / 2), y), label: `Sobrefalda: fruncir este paño completo a ${cm(width)}` });
    r.checks.push({ key: id, label: `Ancho de ${skirt.name} antes de fruncir`, target: width * 1.6, measured: 2 * len(skirt, 'union'), tolerance: .1 });
  }
  r.seams.push(equal('costados-falda', 'Costados de la sobrefalda', [{ pieceId: 'falda-delantera', edgeIds: ['costado'] }], [{ pieceId: 'falda-trasera', edgeIds: ['costado'] }]));
  r.steps.splice(1, 0, { id: 'sobrefalda', title: 'Prepara y coloca la sobrefalda', detail: `Une los costados de la sobrefalda, dobladilla y frunce el borde superior a ${cm(frontWidth + backWidth)} en total. Plancha el margen hacia dentro y pespuntea sobre la línea marcada a ${cm(y)} del origen del cuerpo. En la apertura frontal deja libre la tapeta y remata los dos extremos de falda; no bloquees los broches.`, pieces: [frontId, backId, 'falda-delantera', 'falda-trasera'] });
  r.materials.push({ id: 'sobrefalda', label: 'Tela ligera para la sobrefalda', qty: `Contorno de corte ${cm((frontWidth + backWidth) * 1.6 + sa * 4)}; alto ${cm(height + sa + 12)}` });
}

function bodyStyle(style: BabyStyle, ctx: GeneratorContext, p: Params): GeneratorResult {
  const r = generateBabyBodysuit(ctx, p); if (!r.pieces.length) return r;
  const sa = num(p, 'margen', 7), front = piece(r, 'delantero'), back = piece(r, 'espalda');
  if (style === 'bebe-body-sin-mangas' || style === 'bebe-body-mariposa') {
    removePiece(r, 'manga'); r.checks = r.checks.filter(c => c.key !== 'hombro-total');
    for (const pc of [front, back]) pc.edges.filter(e => e.id.startsWith('sisa')).forEach(e => { e.allowance = 0; e.finish = 'sin-margen'; e.label = 'Sisa ribeteada, sin margen'; });
    const arm = len(front, 'sisa') + len(back, 'sisa-der');
    const armBinding = bindingStrip('ribete-sisa', 'Ribete de cada sisa', arm, 8, 2, sa, 'punto-elastico');
    armBinding.notes = ['Cortar el largo en la dirección de mayor elasticidad del punto. Doblar en cuatro: 32 mm de corte para 8 mm visibles. Probar recuperación y comodidad en un retazo.'];
    r.pieces.push(armBinding);
    r.seams.push(equal('ribete-sisa', 'Sisa completa con ribete', [{ pieceId: 'delantero', edgeIds: ['sisa'] }, { pieceId: 'espalda', edgeIds: ['sisa-der'] }], [{ pieceId: 'ribete-sisa', edgeIds: ['largo-superior'] }]));
    r.steps = r.steps.filter(s => !['hombros', 'costados'].includes(s.id));
    r.steps = r.steps.map(s => s.id === 'preparar' ? { ...s, detail: 'Mide pecho y cadera sobre pañal y verifica largo hombro–entrepierna. Imprime al 100 % y comprueba la escala. Corta dos delanteros en espejo, una espalda completa y todos los ribetes y refuerzos indicados. Este estilo no lleva mangas.' } : s);
    r.steps.splice(3, 0, { id: 'hombros-sin-manga', title: 'Une los hombros', detail: 'Une cada delantero con la espalda derecho con derecho por el hombro. Deja abiertos los costados para terminar las sisas en plano.', pieces: ['delantero', 'espalda'], seams: ['hombros'] }, { id: 'ribetear-sisas', title: 'Ribetea sisas y cierra costados', detail: 'Envuelve cada sisa abierta con su ribete doblado en cuatro, sin estirar el cuerpo. Después une los costados, atrapando los extremos del ribete. No hay mangas ni dobladillos de manga.', pieces: ['delantero', 'espalda', 'ribete-sisa'], seams: ['ribete-sisa', 'costados'] });
    if (style === 'bebe-body-mariposa') {
      const width = arm * .7, height = Math.max(32, ctx.body.pecho! * .08);
      const flutter = rectangle('volante-sisa', 'Volante de mariposa, par', width * 1.7, height, [edge('union', 'Fruncir para la parte alta de la sisa', 'costura', sa), edge('extremo-a', 'Extremo', 'dobladillo', 8), edge('bajo', 'Bajo', 'dobladillo', 8), edge('extremo-b', 'Extremo', 'dobladillo', 8)], { qty: 2 });
      r.pieces.push(flutter);
      for (const pc of [front, back]) pc.lines.push({ id: 'limite-volante', kind: 'colocacion', a: P(pc === front ? front.nodes[2].x : back.nodes[4].x, arm * .35), b: P((pc === front ? front.nodes[2].x : back.nodes[4].x) - 10, arm * .35), label: 'Final del volante: repartir desde el hombro' });
      back.lines.push({ id: 'limite-volante-izq', kind: 'colocacion', a: P(0, arm * .35), b: P(10, arm * .35), label: 'Final del volante izquierdo' });
      r.steps.splice(4, 0, { id: 'volantes-sisa', title: 'Frunce las mariposas en los hombros', detail: `Con los hombros ya unidos, remata los tres cantos libres de cada volante. Frunce el canto de unión a ${cm(width)}, céntralo sobre el hombro y cóselo desde la marca delantera a la trasera antes de colocar el ribete. Queda libre el 30 % inferior de la sisa.`, pieces: ['volante-sisa', 'delantero', 'espalda'] });
      r.checks.push({ key: 'volante', label: 'Largo antes de fruncir cada mariposa', target: width * 1.7, measured: len(flutter, 'union'), tolerance: .1 });
    }
  }
  if (style === 'bebe-body-falda') gatheredSkirt(r, 'delantero', 'espalda', front.nodes[3].y + (front.nodes[4].y - front.nodes[3].y) * .58, num(p, 'altoFalda', 95), front.nodes[2].x * 2, back.nodes[4].x, sa);
  if (style === 'bebe-body-canesu') split(r, ['delantero', 'espalda'], pc => { const y = front.nodes[3].y + 18; return [P(-100, y), P(Math.max(...pc.nodes.map(n => n.x)) + 100, y)]; }, 'canesu', sa);
  return r;
}

function topDefaults(style: BabyStyle, ctx: GeneratorContext): Params {
  const k = kidBody(ctx), short = style === 'bebe-bolero-redondo';
  return { largo: round1(k.talle * (short ? 1.05 : style === 'bebe-babero-mangas' ? 1.65 : 1.35)), holgura: round1(k.chest * (style === 'bebe-babero-mangas' ? .35 : .18) + 25), largoManga: round1(k.sleeve * (['bebe-camisa-globo', 'bebe-bolero-redondo'].includes(style) ? .48 : 1)), margen: 8, dobladillo: 12, altoPeplum: round1(k.talle * .4) };
}
function topStyle(style: BabyStyle, ctx: GeneratorContext, p: Params): GeneratorResult {
  const k = kidBody(ctx), sa = num(p, 'margen'), hem = num(p, 'dobladillo'), total = num(p, 'largo'), ease = num(p, 'holgura');
  const wrap = style === 'bebe-cardigan-cruzado', peplum = style === 'bebe-blusa-peplum', smock = style === 'bebe-babero-mangas', bolero = style === 'bebe-bolero-redondo', puff = style === 'bebe-camisa-globo';
  const sleeveless = peplum, ph = peplum ? num(p, 'altoPeplum') : 0, L = total - ph;
  const g = bodiceGeometry(ctx, { ease, length: L, armExtra: 8, ext: wrap ? k.chest * .16 : 12, ...(wrap || style === 'bebe-cardigan-pico' ? { vDepth: k.talle * .65 } : {}) });
  if (![sa, hem, total, ease, ph, num(p, 'largoManga')].every(Number.isFinite) || sa < 5 || sa > 12 || hem < 8 || hem > 25 || ease < 50 || ease > 260 || L < g.ad + (bolero ? 25 : 35) || total > k.talle * 2.2 || ph < 0 || ph > total * .5) return invalid('bebe-top-medidas', 'Revisa largo, holgura, manga y márgenes; el cuerpo debe quedar al menos 3,5 cm por debajo de la sisa.');
  const fin = { sa, hem, neck: 'sin-margen' as const, arm: sleeveless ? 'sin-margen' as const : 'costura' as const, hemFinish: peplum ? 'costura' as const : 'dobladillo' as const, centre: 'sin-margen' as const };
  const front = bodicePiece('delantero', smock ? 'Espalda abierta del babero (par)' : 'Delantero (par en espejo)', g, false, fin, { qty: 2, mirrorPairs: true });
  const back = bodicePiece('espalda', smock ? 'Pecho completo del babero al doblez' : 'Espalda al doblez', g, true, { ...fin, centre: 'doblez' });
  if (peplum) { front.edges.find(e => e.id === 'bajo')!.allowance = sa; back.edges.find(e => e.id === 'bajo')!.allowance = sa; }
  if (bolero) {
    const center = front.nodes[6], side = front.nodes[5]; center.y -= Math.min(35, (L - g.ad) * .55);
    const e = front.edges.find(e => e.id === 'bajo')!; e.kind = 'cubic'; e.c1 = P(side.x * .5, side.y); e.c2 = P(center.x, center.y + 20); e.finish = 'sin-margen'; e.allowance = 0;
  }
  const pieces = [front, back], seams = bodySeams('delantero', 'espalda');
  const neckline = 2 * (len(front, 'cuello') + len(front, 'centro') + len(back, 'cuello') + (bolero ? len(front, 'bajo') : 0));
  pieces.push(bindingStrip('ribete-apertura', 'Ribete de escote y apertura', neckline, 8, 1, sa));
  seams.push(equal('ribete-apertura', 'Escote y apertura con ribete', [{ pieceId: 'delantero', edgeIds: ['cuello', 'centro', ...(bolero ? ['bajo'] : [])], factor: 2 }, { pieceId: 'espalda', edgeIds: ['cuello'], factor: 2 }], [{ pieceId: 'ribete-apertura', edgeIds: ['largo-superior'] }]));
  if (sleeveless) {
    pieces.push(bindingStrip('ribete-sisa', 'Ribetes de sisas', armhole(front) + armhole(back), 8, 2, sa));
    seams.push(equal('ribete-sisa', 'Sisa con su ribete', [{ pieceId: 'delantero', edgeIds: ['sisa-superior', 'sisa-inferior'] }, { pieceId: 'espalda', edgeIds: ['sisa-superior', 'sisa-inferior'] }], [{ pieceId: 'ribete-sisa', edgeIds: ['largo-superior'] }]));
  } else {
    const length = num(p, 'largoManga'), cap = puff ? .18 : 0;
    const sleeve = setInSleeve('manga', puff ? 'Mangas globo (par)' : 'Mangas (par)', armhole(front) + armhole(back), { capH: (g.ad - g.sy) * .55, length, cuff: puff ? k.arm * 1.7 : k.wrist * (smock ? 1.9 : 1.55), capEase: cap, sa, hemFinish: puff || smock ? 'jareta' : 'dobladillo', hem: puff || smock ? 20 : hem, armMin: k.arm + 35 });
    if (length < sleeve.capH + 25) return invalid('bebe-top-manga', 'La manga debe terminar al menos 2,5 cm después de la copa.');
    pieces.push(sleeve.piece);
    seams.push(...sleeveSeams('manga', 'delantero', 'espalda', 0));
    seams[seams.length - 2] = cap ? ratio('manga-sisa', 'Copa abullonada fruncida a la sisa', 'fruncido', [{ pieceId: 'manga', edgeIds: ['copa-delantera', 'copa-trasera'] }], [{ pieceId: 'delantero', edgeIds: ['sisa-superior', 'sisa-inferior'] }, { pieceId: 'espalda', edgeIds: ['sisa-superior', 'sisa-inferior'] }], 1 + cap, .005) : seams[seams.length - 2];
  }
  if (peplum) for (const body of [front, back]) {
    const width = len(body, 'bajo');
    const skirt = rectangle(`peplum-${body.id}`, `Peplum de ${body.name}`, width * 1.6, ph, [edge('union', 'Fruncir al bajo del cuerpo', 'costura', sa), edge('costado', 'Costado', 'costura', sa), edge('bajo', 'Dobladillo', 'dobladillo', hem), edge('centro', body.cut.onFold ? 'Al doblez' : 'Dobladillo del frente', body.cut.onFold ? 'doblez' : 'dobladillo', body.cut.onFold ? 0 : hem)], { ...body.cut });
    pieces.push(skirt); seams.push(ratio(`union-${skirt.id}`, `Peplum con ${body.name}`, 'fruncido', [{ pieceId: skirt.id, edgeIds: ['union'] }], [{ pieceId: body.id, edgeIds: ['bajo'] }], 1.6, .005));
  }
  const count = bolero ? 1 : wrap ? 3 : 4;
  buttonMarks(front, wrap ? -g.ext + 10 : 0, g.fd + 12, Math.max(g.fd + 12, L - 20), count, 'boton', wrap ? 'Broche del cruce; prueba la otra mitad sobre el cuerpo' : 'Broche de presión, emparejar centros');
  const reinf = rectangle('refuerzos-broches', 'Refuerzos suaves de los broches', 20, 20, [edge('a', 'Corte', 'sin-margen', 0), edge('b', 'Corte', 'sin-margen', 0), edge('c', 'Corte', 'sin-margen', 0), edge('d', 'Corte', 'sin-margen', 0)], { qty: count * 2, fabric: 'entretela' }); pieces.push(reinf);
  return { pieces, seams, checks: [{ key: 'pecho', label: 'Contorno de torso sin duplicar el cruce', body: k.chest, ease, target: k.chest + ease, measured: 2 * front.nodes[4].x + 2 * back.nodes[4].x, tolerance: .1 }, { key: 'largo', label: 'Largo terminado de espalda', target: total, measured: back.nodes[6].y + ph, tolerance: .1 }],
    materials: [{ id: 'tela', label: smock ? 'Tejido laminado suave apto para babero' : style === 'bebe-cardigan-pico' ? 'Interlock o punto estable' : 'Algodón suave, muselina o batista', qty: 'Según el acomodo y el ancho de tela' }, { id: 'bies', label: 'Bies suave de 8 mm terminado', qty: cm(neckline + (sleeveless ? 2 * (armhole(front) + armhole(back)) : 0) + 60) }, { id: 'broches', label: 'Broches infantiles y entretela de refuerzo', qty: `${count} juegos completos`, note: 'Sin cordones. Comprueba el anclaje antes de cada uso.' }, ...(puff || smock ? [{ id: 'elastico', label: 'Elástico de 6 mm para puños', qty: `2 × ${cm((puff ? k.arm : k.wrist) + 25)}`, note: 'Incluye 15 mm de unión; comprueba comodidad y paso de la mano.' }] : [])],
    assumptions: [`Torso + ${cm(ease)} de holgura aplicada una vez; superponer centros al cerrar, sin sumar las vistas.`, smock ? 'Babero de uso vigilado: la pieza llamada espalda es el pecho cerrado y el par de delanteros se lleva detrás. No es una prenda para dormir.' : 'Apertura completa con broches para vestir sin pasar la cabeza por un escote cerrado.', wrap ? 'Cruce diagonal con dos frentes que se superponen; prueba las mitades interiores del broche sobre la prenda armada. No lleva lazos.' : 'Manga montada resuelta a la sisa; el peplum se añade por una costura independiente.'],
    steps: [
      { id: 'cortar', title: 'Corta y marca', detail: 'Corta las cantidades indicadas, conserva los pares en espejo y marca centros, hilo y broches. Prelava la tela. Comprueba la escala del PDF al 100 %.', pieces: pieces.map(p => p.id) },
      { id: 'hombros', title: 'Une los hombros', detail: 'Une hombros derecho con derecho, sin estirar el escote. En el babero, el paño completo se llevará en el pecho y la apertura detrás.', pieces: ['delantero', 'espalda'], seams: ['hombros'] },
      ...(sleeveless ? [{ id: 'sisas', title: 'Ribetea las sisas', detail: 'Dobla los ribetes en cuatro y envuelve los cantos sin añadir margen. Cierra los costados atrapando los extremos.', pieces: ['delantero', 'espalda', 'ribete-sisa'], seams: ['ribete-sisa', 'costados'] }] : [{ id: 'mangas', title: 'Monta mangas y cierra costados', detail: puff ? 'Frunce únicamente la copa hasta que mida la sisa, entre piquetes. Cose las mangas en plano y cierra desde puño hasta bajo.' : 'Monta cada manga entre piquetes, sin fruncir. Cierra de puño a bajo por cada costado.', pieces: ['delantero', 'espalda', 'manga'], seams: ['manga-sisa', 'manga-costura', 'costados'] }]),
      ...(peplum ? [{ id: 'peplum', title: 'Frunce y une el peplum', detail: 'Cose los costados de los peplums. Remata sus dos extremos delanteros sin cerrar el frente. Frunce cada tramo al bajo de su cuerpo, une derecho con derecho y plancha hacia arriba. El ancho sobrante se absorbe en frunce, no en la tapeta.', pieces: ['peplum-delantero', 'peplum-espalda', 'delantero', 'espalda'], seams: ['union-peplum-delantero', 'union-peplum-espalda'] }] : []),
      { id: 'acabados', title: 'Ribetea, dobladilla y coloca broches', detail: `Envuelve escote y apertura ${peplum ? 'del cuerpo, solo hasta la costura del peplum,' : ''} con el ribete, doblado en cuatro. ${peplum ? 'Los dos frentes del peplum se dobladillan con su margen; no llevan este ribete. ' : ''}Dobladilla los bajos${puff || smock ? '; en cada manga forma una jareta de 10 mm más un doblez de 10 mm, introduce el elástico y cierra' : ''}. Coloca refuerzos bajo ambos lados de cada broche y prueba las posiciones sobre la prenda cerrada.`, pieces: pieces.map(p => p.id), seams: ['ribete-apertura'] },
      { id: 'probar', title: 'Comprueba movilidad y cierre', detail: 'Cose una muestra: revisa que brazos, cuello y pecho queden libres, que los broches no tiren ni se desprendan y que no queden hilos sueltos. Ajusta largo y holgura antes de cortar la tela definitiva.', pieces: ['delantero', 'espalda'] }
    ], notices: [{ level: 'aviso', code: 'bebe-estilo-experimental', message: 'Construcción experimental: comprobar una muestra impresa y cosida, comodidad y anclaje de los broches.' }] };
}

function petoStyle(style: BabyStyle, ctx: GeneratorContext, p: Params): GeneratorResult {
  const r = generateOverall(ctx, { ...p, largo: 'corto' }); if (!r.pieces.length) return r;
  const front = piece(r, 'delantero'), back = piece(r, 'espalda'), sa = num(p, 'margen', 8), y = front.nodes[2].y + 12;
  if (style === 'bebe-peto-canesu') split(r, ['delantero', 'espalda'], pc => [P(-50, y), P(Math.max(...pc.nodes.map(n => n.x)) + 50, y)], 'canesu', sa);
  if (style === 'bebe-peto-falda') gatheredSkirt(r, 'delantero', 'espalda', y, num(p, 'altoFalda', 95), front.nodes[2].x * 2, back.nodes[2].x * 2, sa);
  if (style === 'bebe-peto-cargo') {
    const w = Math.max(45, ctx.body.cadera! * .13), h = w * 1.05, depth = 12;
    const pocket = rectangle('bolsillo-cargo', 'Bolsa cargo con fuelle integrado, par', w + 2 * depth, h + depth, [edge('boca', 'Boca', 'dobladillo', 20), edge('derecho', 'Doblar fuelle', 'costura', sa), edge('fondo', 'Doblar fuelle', 'costura', sa), edge('izquierdo', 'Doblar fuelle', 'costura', sa)], { qty: 2 });
    pocket.lines.push({ id: 'pliegue-izq', kind: 'doblez', a: P(depth, 0), b: P(depth, h + depth) }, { id: 'pliegue-der', kind: 'doblez', a: P(w + depth, 0), b: P(w + depth, h + depth) }, { id: 'pliegue-fondo', kind: 'doblez', a: P(0, h), b: P(w + 2 * depth, h) });
    const flap = rectangle('solapa-cargo', 'Solapa cargo doblada, par', w + 6, 50, [...seamEdges(sa)], { qty: 2 }); flap.lines.push({ id: 'doblez', kind: 'doblez', a: P(0, 25), b: P(w + 6, 25) });
    r.pieces.push(pocket, flap);
    front.lines.push({ id: 'bolsillo-cargo', kind: 'colocacion', a: P(front.nodes[2].x * .4, y + 20), b: P(front.nodes[2].x * .4 + w, y + 20), label: 'Boca de bolsa cargo; comprobar sobre el pelele armado' });
    r.steps.splice(2, 0, { id: 'cargo', title: 'Arma las bolsas cargo', detail: `Dobladilla las bocas. Plancha los fuelles laterales de ${cm(depth)} y el del fondo por las marcas, cierra sus esquinas y vuelve los márgenes hacia dentro. Pespuntea lados y fondo sobre las guías. Dobla cada solapa, cose lados, voltea y coloca 5 mm por encima de la boca. No añadas botones pequeños ni cordones.`, pieces: ['delantero', 'bolsillo-cargo', 'solapa-cargo'] });
    r.checks.push({ key: 'bolsa-cargo', label: 'Ancho útil de la bolsa, sin fuelles', target: w, measured: len(pocket, 'boca') - 2 * depth, tolerance: .1 });
  }
  return r;
}

function pantsStyle(style: BabyStyle, ctx: GeneratorContext, p: Params): GeneratorResult {
  const extensible = style === 'bebe-pantalon-punos-extensibles';
  const requestedLength = num(p, 'largo'), cuffHeight = num(p, 'altoPuno');
  const legLength = extensible ? requestedLength - cuffHeight / 2 : requestedLength;
  if (extensible && (cuffHeight < 30 || cuffHeight > 100 || legLength < (ctx.body.tiro ?? 0) + num(p, 'holguraTiro') + num(p, 'panal') + 30)) return invalid('bebe-puno-largo', 'El puño debe medir 3–10 cm desplegado y dejar al menos 3 cm de pierna debajo del tiro. Reduce el puño o aumenta el largo.');
  const r = generatePants(ctx, { ...p, largo: legLength, estilo: extensible ? 'jogger' : 'recto', corte: 'completo' }); if (!r.pieces.length) return r;
  if (extensible) {
    const cuff = piece(r, 'puno');
    const lengthCheck = r.checks.find(c => c.key === 'largo')!;
    lengthCheck.label = 'Largo total con puños doblados para la talla elegida'; lengthCheck.target = requestedLength; lengthCheck.measured += cuffHeight / 2;
    r.checks.push({ key: 'largo-desplegado', label: 'Largo total con puños extendidos para crecer', target: requestedLength + cuffHeight / 2, measured: lengthCheck.measured + cuffHeight / 2, tolerance: .1 });
    r.assumptions.push(`El largo solicitado (${cm(requestedLength)}) INCLUYE el puño doblado. Al desplegarlo se ganan ${cm(cuffHeight / 2)}: largo total ${cm(requestedLength + cuffHeight / 2)}. La pierna se acorta antes de añadir el puño para no contar su alto dos veces.`);
    if (cuff) { cuff.notes = [...(cuff.notes ?? []), 'Puño largo de crecimiento: doblar hacia fuera a la mitad del alto visible. Al desplegarlo aumenta el largo, no el ancho.']; r.steps.push({ id: 'puno-crecimiento', title: 'Dobla los puños para crecer', detail: `Monta los puños como indica la costura. Dobla hacia fuera la mitad del alto visible (${cm(num(p, 'altoPuno') / 2)}). Extiéndelos cuando necesites ese largo adicional. Comprueba que la abertura estirada pase por el talón.`, pieces: ['puno'] }); }
  } else if (style === 'bebe-pantalon-rodilleras') {
    const front = piece(r, 'delantero'), R = front.nodes.find(n => n.id === 'tiro-punta')?.y ?? ctx.body.tiro! + 30, L = num(p, 'largo'), w = ctx.body.cadera! * .16, h = w * 1.15, q = .55228475;
    const pad = outline('rodillera', 'Rodilleras ovaladas, par', [P(w / 2, 0), P(w, h / 2), P(w / 2, h), P(0, h / 2)], [edge('a', 'Borde', 'costura', 6, P(w / 2 + w / 2 * q, 0), P(w, h / 2 - h / 2 * q)), edge('b', 'Borde', 'costura', 6, P(w, h / 2 + h / 2 * q), P(w / 2 + w / 2 * q, h)), edge('c', 'Borde', 'costura', 6, P(w / 2 - w / 2 * q, h), P(0, h / 2 + h / 2 * q)), edge('d', 'Borde', 'costura', 6, P(0, h / 2 - h / 2 * q), P(w / 2 - w / 2 * q, 0))], { qty: 2, fabric: 'contraste' });
    r.pieces.push(pad);
    front.marks.push({ id: 'centro-rodillera', kind: 'cruz', at: P(front.grain!.a.x, R + (L - R) * .45), label: 'Centro de rodillera: comprobar altura de rodilla con una muestra' });
    r.steps.splice(1, 0, { id: 'rodilleras', title: 'Coloca las rodilleras antes de cerrar las piernas', detail: 'Vuelve 6 mm el contorno de cada rodillera con ayuda de un hilván. Centra cada una sobre la cruz y pespuntea a 2 mm del canto. Prueba primero la altura de la rodilla sobre el cuerpo; no uses espuma rígida.', pieces: ['delantero', 'rodillera'] });
  } else {
    // Both intersections lie on straight waist/hem edges. Keep the crotch
    // cubics exact: flattening them before offsetting creates tiny cut loops.
    const mapping: Record<string, string[]> = {};
    for (const id of ['delantero', 'trasero']) {
      const source = piece(r, id), waist = source.edges.find(e => e.id === 'cintura')!, hem = source.edges.find(e => e.id === 'bajo')!;
      const n = (id: string) => source.nodes.find(n => n.id === id)!;
      const a = n(waist.from), b = n(waist.to), c = n(hem.from), d = n(hem.to);
      const x = Math.max(a.x, d.x) + (Math.min(b.x, c.x) - Math.max(a.x, d.x)) * .27;
      const top = { id: 'panel-superior', x, y: a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x) }, bottom = { id: 'panel-inferior', x, y: d.y + (c.y - d.y) * (x - d.x) / (c.x - d.x) };
      const wi = source.edges.indexOf(waist), hi = source.edges.indexOf(hem), inner = source.edges.slice(wi + 1, hi), outer = source.edges.slice(hi + 1);
      const join = { id: 'union-panel', label: 'Unión de panel lateral', kind: 'line' as const, allowance: num(p, 'margen', 10), finish: 'costura' as const };
      const make = (suffix: string, edges: Piece['edges']): Piece => {
        const nodes = edges.map(e => [top, bottom, ...source.nodes].find(n => n.id === e.from)!);
        const minX = Math.min(...nodes.map(n => n.x)), maxX = Math.max(...nodes.map(n => n.x));
        return { ...structuredClone(source), id: `${id}-${suffix}`, name: `${source.name}: ${suffix === 'lateral' ? 'panel lateral' : 'panel central'}`, nodes, edges,
          grain: { a: P((minX + maxX) / 2, top.y + 30), b: P((minX + maxX) / 2, bottom.y - 30) },
          notches: source.notches.filter(notch => edges.some(e => e.id === notch.edgeId && e.id !== 'cintura' && e.id !== 'bajo')),
          marks: source.marks.filter(mark => mark.at.x >= minX && mark.at.x <= maxX), lines: [] };
      };
      const central = make('base', [{ ...waist, from: top.id }, ...inner, { ...hem, to: bottom.id }, { ...join, from: bottom.id, to: top.id }]);
      const lateral = make('lateral', [{ ...waist, to: top.id }, { ...join, from: top.id, to: bottom.id }, { ...hem, from: bottom.id }, ...outer]);
      mapping[id] = [central.id, lateral.id];
      for (const seam of r.seams) for (const key of ['a', 'b'] as const) seam[key] = seam[key].flatMap(side => side.pieceId !== id ? [side] : [central, lateral].flatMap(pc => { const edgeIds = side.edgeIds.filter(edge => pc.edges.some(e => e.id === edge)); return edgeIds.length ? [{ ...side, pieceId: pc.id, edgeIds }] : []; }));
      r.pieces = r.pieces.flatMap(pc => pc.id === id ? [central, lateral] : [pc]);
      r.seams.push(equal(`panel-${id}`, `Panel lateral con ${source.name}`, [{ pieceId: central.id, edgeIds: ['union-panel'] }], [{ pieceId: lateral.id, edgeIds: ['union-panel'] }]));
    }
    r.steps = r.steps.map(s => ({ ...s, pieces: s.pieces?.flatMap(id => mapping[id] ?? [id]) }));
    r.steps.splice(1, 0, { id: 'paneles-laterales', title: 'Arma las piernas por paneles', detail: 'Une cada panel lateral con su panel central por la costura vertical. Plancha sin estirar; después monta las piernas siguiendo las instrucciones. El corte conserva las curvas originales del tiro y los márgenes se añaden una sola vez.', pieces: Object.values(mapping).flat(), seams: ['panel-delantero', 'panel-trasero'] });
  }
  return r;
}

function ponchoStyle(ctx: GeneratorContext, p: Params): GeneratorResult {
  const r = generatePoncho(ctx, { ...p, aperturaFrente: 'si' }); if (!r.pieces.length || r.notices.some(n => n.level === 'error')) return r;
  const front = piece(r, 'delantero'), length = len(front, 'frente'), sa = num(p, 'margen', 10);
  const placket = rectangle('tapeta', 'Tapeta de broches doblada, par', 40, length, [edge('superior', 'Extremo', 'costura', sa), edge('union-a', 'Unión al frente', 'costura', sa), edge('inferior', 'Extremo', 'costura', sa), edge('union-b', 'Unión al frente', 'costura', sa)], { qty: 2 });
  placket.lines.push({ id: 'doblez', kind: 'doblez', a: P(20, 0), b: P(20, length) });
  front.edges.find(e => e.id === 'frente')!.finish = 'costura'; front.edges.find(e => e.id === 'frente')!.allowance = sa;
  for (let i = 0; i < 3; i++) placket.marks.push({ id: `broche-${i}`, kind: 'boton', at: P(10, 20 + (length - 40) * i / 2), label: 'Broche; superponer ambas tapetas' });
  r.pieces.push(placket); r.seams.push(equal('tapeta-frente', 'Cada tapeta con su frente', [{ pieceId: 'delantero', edgeIds: ['frente'] }], [{ pieceId: 'tapeta', edgeIds: ['union-a'] }]));
  r.assumptions = r.assumptions.filter(s => !s.includes('sin cierre')); r.assumptions.push('Poncho abierto de baño con tapetas y broches; lados libres, sin capucha ni cintas. No usar para dormir ni dejar al bebé sin supervisión.');
  r.steps = r.steps.map(s => s.id === 'escote' ? { ...s, detail: 'Ribetea solamente el escote; los cantos centrales se terminan con las tapetas de broches.' } : s);
  r.steps.push({ id: 'tapetas', title: 'Coloca las tapetas y los broches', detail: 'Dobla cada tapeta longitudinalmente, cierra extremos y vuelve. Cose una capa al frente; vuelve el margen de la otra y pespuntea. Superpone 20 mm las tapetas, refuerza cada marca con entretela suave y coloca los broches. Comprueba que el escote no tire al cerrar.', pieces: ['delantero', 'tapeta'], seams: ['tapeta-frente'] });
  r.materials.push({ id: 'broches', label: 'Broches de presión infantiles con refuerzos', qty: '3 juegos completos' }, { id: 'rizo', label: 'Rizo absorbente suave', qty: 'Según el acomodo' });
  return r;
}

function bonnetStyle(ctx: GeneratorContext, p: Params): GeneratorResult {
  const r = generateBonnet(ctx, p); if (!r.pieces.length) return r;
  const band = piece(r, 'banda'), w = len(band, 'rostro') * .7, h = num(p, 'anchoVisera', 45), sa = num(p, 'margen', 6);
  const visor = outline('visera', 'Visera suave, exterior y reverso', [P(0, 0), P(w, 0), P(w / 2, h)], [edge('union', 'Unión al bonete', 'costura', sa), edge('curva-der', 'Borde exterior', 'costura', sa, P(w, h * .6), P(w * .75, h)), edge('curva-izq', 'Borde exterior', 'costura', sa, P(w * .25, h), P(0, h * .6))], { qty: 2 });
  band.notches.push({ id: 'visera-inicio', edgeId: 'rostro', s: (len(band, 'rostro') - w) / 2, count: 1, label: 'Inicio de visera' }, { id: 'visera-fin', edgeId: 'rostro', s: (len(band, 'rostro') + w) / 2, count: 2, label: 'Fin de visera' });
  r.pieces.push(visor); r.checks.push({ key: 'visera', label: 'Visera centrada sobre el 70 % superior de la cara', target: w, measured: len(visor, 'union'), tolerance: .1 });
  r.steps.splice(1, 0, { id: 'visera', title: 'Monta la visera entre banda y forro', detail: 'Une las dos viseras por sus curvas exteriores, piquetea, vuelve y pespuntea. Centra el borde recto entre los dos piquetes del rostro y sujétalo con hilván antes de unir banda y forro. No añadas cartón, alambre ni entretela rígida; la visera debe poder doblarse suavemente.', pieces: ['banda', 'banda-forro', 'visera'] });
  r.materials.push({ id: 'visera', label: 'Algodón para visera suave de doble capa', qty: 'Las dos piezas de visera incluidas', note: 'No es un equipo certificado de protección solar.' });
  return r;
}

export function babyStyleDefaults(style: BabyStyle, ctx: GeneratorContext): Params {
  const kind = lookup(style)![2];
  if (kind === 'body') return { ...babyBodysuitGenerator.defaults(ctx), altoFalda: round1((ctx.body.talleEspalda ?? 180) * .55) };
  if (kind === 'top') return topDefaults(style, ctx);
  if (kind === 'peto') return { ...overallGenerator.defaults(ctx), largo: 'corto', altoFalda: round1((ctx.body.talleEspalda ?? 180) * .55) };
  if (kind === 'pantalon') return { ...pantsGenerator.defaults(ctx), ...(style === 'bebe-pantalon-punos-extensibles' ? { estilo: 'jogger', altoPuno: round1(Math.min(70, (ctx.body.entrepierna ?? 150) * .35)) } : {}) };
  if (kind === 'bonete') return { ...bonnetGenerator.defaults(ctx), anchoVisera: 45 };
  return { ...ponchoGenerator.defaults(ctx), aperturaFrente: 'si' };
}
export function generateBabyStyle(style: BabyStyle, ctx: GeneratorContext, params: Params): GeneratorResult {
  if (!lookup(style)) return invalid('bebe-estilo', 'Elige un estilo de bebé disponible.');
  if (!isSmall(ctx)) return invalid('bebe-estilo-talla', 'Estos estilos usan medidas de bebé o primera infancia. Elige meses o medidas infantiles.');
  const p = { ...babyStyleDefaults(style, ctx), ...params }, kind = lookup(style)![2];
  if (['bebe-body-falda', 'bebe-peto-falda'].includes(style) && (num(p, 'altoFalda') < 50 || num(p, 'altoFalda') > 180)) return invalid('bebe-falda-largo', 'El alto de la sobrefalda debe quedar entre 5 y 18 cm.');
  if (kind === 'bonete' && (num(p, 'anchoVisera') < 25 || num(p, 'anchoVisera') > 70)) return invalid('bebe-visera-ancho', 'La visera suave debe medir entre 2,5 y 7 cm de profundidad.');
  if (kind === 'body') return bodyStyle(style, ctx, p);
  if (kind === 'top') return topStyle(style, ctx, p);
  if (kind === 'peto') return petoStyle(style, ctx, p);
  if (kind === 'pantalon') return pantsStyle(style, ctx, p);
  if (kind === 'bonete') return bonnetStyle(ctx, p);
  return ponchoStyle(ctx, p);
}

export const BABY_STYLE_GENERATORS: PatternGenerator[] = BABY_STYLES.map(([id, name, kind]) => {
  const base = kind === 'body' ? babyBodysuitGenerator : kind === 'peto' ? overallGenerator : kind === 'pantalon' ? pantsGenerator : kind === 'bonete' ? bonnetGenerator : ponchoGenerator;
  return { id, name, status: 'experimental', summary: 'Construcción infantil con piezas propias, broches seguros e instrucciones de armado.',
    requiredMeasures: kind === 'top' ? ['pecho', 'cuello', 'hombros', 'talleEspalda', 'largoManga'] : base.requiredMeasures,
    optionalMeasures: kind === 'top' ? ['brazo', 'muneca', 'estatura', 'cadera', 'cabeza'] : base.optionalMeasures,
    defaults: ctx => babyStyleDefaults(id, ctx), generate: (ctx, params) => generateBabyStyle(id, ctx, params),
    params: kind === 'top' ? [
      { key: 'largo', label: 'Largo terminado desde hombro', group: 'diseno', type: 'length', min: 140, max: 650 },
      ...(id === 'bebe-blusa-peplum' ? [{ key: 'altoPeplum', label: 'Alto del peplum, incluido en el largo', group: 'diseno' as const, type: 'length' as const, min: 35, max: 160 }] : [{ key: 'largoManga', label: 'Largo de manga', group: 'diseno' as const, type: 'length' as const, min: 70, max: 500 }]),
      { key: 'holgura', label: 'Holgura total de torso', group: 'holgura', type: 'length', min: 50, max: 260 },
      { key: 'margen', label: 'Margen de costura', group: 'margenes', type: 'length', min: 5, max: 12 },
      { key: 'dobladillo', label: 'Dobladillo', group: 'margenes', type: 'length', min: 8, max: 25 },
    ] : [...base.params.filter(p => !['estilo', 'corte', 'aperturaFrente', ...(kind === 'peto' ? ['largo'] : []), ...(id === 'bebe-body-sin-mangas' || id === 'bebe-body-mariposa' ? ['tipoManga', 'largoMangaCorta', 'largoMangaLarga', 'contornoPuno', 'dobladilloManga'] : [])].includes(p.key)).map(p => id === 'bebe-pantalon-punos-extensibles' && p.key === 'largo' ? { ...p, label: 'Largo total con puños doblados', help: 'Incluye el puño doblado. Al extenderlo se gana la mitad de su alto.' } : id === 'bebe-pantalon-punos-extensibles' && p.key === 'altoPuno' ? { ...p, min: 30, max: 100, label: 'Alto del puño desplegado' } : p),
      ...(['bebe-body-falda', 'bebe-peto-falda'].includes(id) ? [{ key: 'altoFalda', label: 'Alto de la sobrefalda', group: 'diseno' as const, type: 'length' as const, min: 50, max: 180 }] : []),
      ...(kind === 'bonete' ? [{ key: 'anchoVisera', label: 'Ancho visible de visera', group: 'diseno' as const, type: 'length' as const, min: 25, max: 70 }] : [])]
  };
});

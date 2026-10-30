import { Pt, Mat, matApply, add, mul, norm, sub, BBox, bboxOf, IDENTITY } from '../geom/vec';
import { CutOutline } from '../pattern/offset';
import { edgeCmds, PathCmd, polylineCmds, transformCmds, cmdsBBox } from './paths';
import { orientation, outwardNormal, pointOnEdge } from '../pattern/outline';
import type { Piece } from '../pattern/types';
import { Font, Encodings } from '@pdf-lib/standard-fonts';
import { pdfSafe } from '../pdf/canvas';

/** Estilos de línea distinguibles en blanco y negro. */
export type LineStyle = 'corte' | 'costura' | 'doblez' | 'final' | 'pespunte' | 'referencia' | 'colocacion' | 'hilo' | 'piquete' | 'bordado';

export interface DrawPath {
  cmds: PathCmd[];
  style: LineStyle;
}

export interface DrawLabel {
  text: string;
  at: Pt;
  size: number; // mm de altura aproximada
  angle?: number; // grados
  bold?: boolean;
}

export interface Drawable {
  id: string;
  name: string;
  paths: DrawPath[];
  labels: DrawLabel[];
  /** Flechas de hilo (doble punta). */
  grains: { a: Pt; b: Pt }[];
  bbox: BBox;
}

export const STYLE_LABEL: Record<LineStyle, string> = {
  corte: 'Línea de corte',
  costura: 'Línea de costura',
  doblez: 'Doblez',
  final: 'Tamaño final',
  pespunte: 'Pespunte',
  referencia: 'Referencia',
  colocacion: 'Colocación',
  hilo: 'Hilo de la tela',
  piquete: 'Piquete',
  bordado: 'Dibujo de bordado'
};

const labelFonts={regular:Font.load('Helvetica'),bold:Font.load('Helvetica-Bold')};

/** Same Helvetica metrics, kerning and 1.38 size factor as PdfCanvas.text. */
export function labelTextWidth(text:string,size:number,bold=false):number {
  const font=bold?labelFonts.bold:labelFonts.regular;
  const glyphs=Array.from(pdfSafe(text),char=>Encodings.WinAnsi.encodeUnicodeCodePoint(char.codePointAt(0)!).name);
  let width=0;
  for(let index=0;index<glyphs.length;index++) width+=(font.getWidthOfGlyph(glyphs[index])??0)+(index+1<glyphs.length?font.getXAxisKerningForPair(glyphs[index],glyphs[index+1])??0:0);
  return width*size*1.38/1000;
}

/** Bounds of the actual rotated text box, including font bearing/ascender room. */
export function labelBounds(label:DrawLabel):BBox {
  const font=label.bold?labelFonts.bold:labelFonts.regular;
  const width=labelTextWidth(label.text,label.size,!!label.bold);
  const em=label.size*1.38;
  const pad=em*.2;
  const top=em*(.34-font.FontBBox[3]/1000);
  const bottom=em*(.34-font.FontBBox[1]/1000);
  const angle=(label.angle??0)*Math.PI/180, c=Math.cos(angle),s=Math.sin(angle);
  return bboxOf([[-width/2-pad,top],[width/2+pad,top],[width/2+pad,bottom],[-width/2-pad,bottom]].map(([x,y])=>({x:label.at.x+c*x-s*y,y:label.at.y+s*x+c*y})));
}

/** Wrap at words and split a single overlong token without losing characters. */
export function wrapLabelText(text:string,size:number,width:number,bold=false):string[] {
  const lines:string[]=[];
  let current='';
  for(const word of text.trim().split(/\s+/)) {
    if(!word) continue;
    const candidate=current?`${current} ${word}`:word;
    if(labelTextWidth(candidate,size,bold)<=width) {current=candidate;continue;}
    if(current) {lines.push(current);current='';}
    for(const char of word) {
      if(current && labelTextWidth(current+char,size,bold)>width) {lines.push(current);current='';}
      current+=char;
    }
  }
  if(current) lines.push(current);
  return lines;
}

export function drawableBBox(paths: DrawPath[], labels: DrawLabel[]): BBox {
  const pts: Pt[] = [];
  for (const p of paths) {
    const b = cmdsBBox(p.cmds);
    if (Number.isFinite(b.minX)) pts.push({ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY });
  }
  for (const l of labels) {
    const box=labelBounds(l);
    pts.push({x:box.minX,y:box.minY},{x:box.maxX,y:box.maxY});
  }
  return bboxOf(pts);
}

export interface PieceDrawMeta {
  subtitle?: string;
  version?: string;
}

const CUT_LABEL = (p: Piece) => {
  const q = p.cut.qty;
  const fab = { principal: 'tela principal', contraste: 'tela de contraste', forro: 'forro', entretela: 'entretela', 'punto-elastico': 'punto elástico' }[p.cut.fabric];
  if (p.cut.onFold) return `Cortar ${q} al doblez · ${fab}`;
  return `Cortar ${q}${p.cut.mirrorPairs ? ' (en par simétrico)' : ''} · ${fab}`;
};

/** Convierte una pieza de patrón en elementos dibujables con su colocación. */
export function pieceDrawable(piece: Piece, cut: CutOutline, m: Mat = IDENTITY, meta: PieceDrawMeta = {}): Drawable {
  const paths: DrawPath[] = [];
  // Línea de corte: se interrumpe en los bordes que van al doblez de la tela.
  const foldIdx = piece.edges.map((e, i) => (e.finish === 'doblez' ? i : -1)).filter((i) => i >= 0);
  if (!foldIdx.length) {
    paths.push({ cmds: transformCmds(polylineCmds(cut.points, true), m), style: 'corte' });
  } else {
    const n = piece.edges.length;
    const start = (foldIdx[0] + 1) % n;
    let cur: Pt[] = [];
    const flush = () => {
      if (cur.length > 1) paths.push({ cmds: transformCmds(polylineCmds(cur, false), m), style: 'corte' });
      cur = [];
    };
    for (let k = 0; k < n; k++) {
      const idx = (start + k) % n;
      if (piece.edges[idx].finish === 'doblez') {
        flush();
        continue;
      }
      for (const p of cut.edgeOffsets[idx].points) {
        const last = cur[cur.length - 1];
        if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) cur.push(p);
      }
    }
    flush();
  }
  for (const e of piece.edges) {
    const style = e.finish === 'doblez' ? 'doblez' : e.finish === 'dobladillo' || e.finish === 'jareta' ? 'doblez' : 'costura';
    if (e.allowance === 0 && e.finish !== 'doblez') continue; // coincide con el corte
    paths.push({ cmds: transformCmds(edgeCmds(piece, e), m), style });
  }
  const orient = orientation(piece);
  for (const n of piece.notches) {
    const e = piece.edges.find((x) => x.id === n.edgeId);
    if (!e) continue;
    const at = pointOnEdge(piece, e, n.s);
    const nrm = outwardNormal(at.tangent, orient);
    const depth = Math.max(4, Math.min(6, e.allowance || 5));
    const offsets = n.count === 2 ? [-2, 2] : [0];
    for (const o of offsets) {
      const base = add(at.p, mul(at.tangent, o));
      const outer = add(base, mul(nrm, e.allowance));
      const inner = add(outer, mul(nrm, -depth));
      paths.push({ cmds: transformCmds(polylineCmds([outer, inner], false), m), style: 'piquete' });
    }
  }
  for (const l of piece.lines) {
    const style: LineStyle = l.kind === 'doblez' ? 'doblez' : l.kind === 'pespunte' ? 'pespunte' : l.kind === 'colocacion' ? 'colocacion' : 'referencia';
    paths.push({ cmds: transformCmds(polylineCmds([l.a, l.b], false), m), style });
  }
  for (const mk of piece.marks) {
    const r = 3;
    paths.push({ cmds: transformCmds(polylineCmds([{ x: mk.at.x - r, y: mk.at.y }, { x: mk.at.x + r, y: mk.at.y }], false), m), style: 'colocacion' });
    paths.push({ cmds: transformCmds(polylineCmds([{ x: mk.at.x, y: mk.at.y - r }, { x: mk.at.x, y: mk.at.y + r }], false), m), style: 'colocacion' });
  }
  const ga = matApply(m, piece.grain.a);
  const gb = matApply(m, piece.grain.b);
  const gdir = norm(sub(gb, ga));
  const gAngle = (Math.atan2(gdir.y, gdir.x) * 180) / Math.PI;
  const mid = matApply(m, { x: (piece.grain.a.x + piece.grain.b.x) / 2, y: (piece.grain.a.y + piece.grain.b.y) / 2 });
  const side = { x: -gdir.y, y: gdir.x };
  const labels: DrawLabel[] = [{ text: 'HILO', at: add(mid, mul(side, -3)), size: 3.2, angle: gAngle }];
  const available=Math.max(18,Math.hypot(gb.x-ga.x,gb.y-ga.y)-6);
  let offset=8;
  const block=(text:string,size:number,bold=false)=>{
    const fitted=Math.max(2.4,Math.min(size,available/24));
    const lines=wrapLabelText(text,fitted,available,bold);
    for(const line of lines) {
      labels.push({text:line,at:add(mid,mul(side,offset)),size:fitted,angle:gAngle,bold});
      offset+=fitted*1.75;
    }
    offset+=2;
  };
  block(piece.name,7,true);
  block(CUT_LABEL(piece),4);
  if(meta.subtitle) block(meta.subtitle,3.2);
  if(meta.version) block(meta.version,3);
  for (const e of piece.edges) {
    if (e.finish !== 'doblez') continue;
    const L = pointOnEdge(piece, e, 0);
    const a = matApply(m, L.p);
    const b = matApply(m, pointOnEdge(piece, e, 1e9).p);
    const d = norm(sub(b, a));
    const inward = outwardNormal(d, orientationAfter(m, orient));
    const midE = add(mul(add(a, b), 0.5), mul(inward, -6));
    const lines=wrapLabelText('COLOCAR AL DOBLEZ DE LA TELA',3.2,Math.max(18,Math.hypot(b.x-a.x,b.y-a.y)-8));
    lines.forEach((text,index)=>labels.push({text,at:add(midE,mul(inward,-index*5.6)),size:3.2,angle:normalizeAngle((Math.atan2(d.y,d.x)*180)/Math.PI)}));
  }
  for (const l of piece.lines) if (l.label) {
    const d = norm(sub(l.b, l.a));
    const ang = (Math.atan2(d.y, d.x) * 180) / Math.PI;
    const at = matApply(m, mul(add(l.a,l.b),.5));
    const labelAngle=normalizeAngle(ang+angleOf(m));
    const normal={x:-Math.sin(labelAngle*Math.PI/180),y:Math.cos(labelAngle*Math.PI/180)};
    const lines=wrapLabelText(l.label,2.8,Math.max(18,Math.hypot(l.b.x-l.a.x,l.b.y-l.a.y)-8));
    lines.forEach((text,index)=>labels.push({text,at:add(at,mul(normal,-1.5-index*4.9)),size:2.8,angle:labelAngle}));
  }
  return { id: piece.id, name: piece.name, paths, labels, grains: [{ a: ga, b: gb }], bbox: drawableBBox(paths, labels) };
}

function orientationAfter(m: Mat, orient: 1 | -1): 1 | -1 {
  const det = m[0] * m[3] - m[1] * m[2];
  return (det < 0 ? -orient : orient) as 1 | -1;
}

function angleOf(m: Mat): number {
  return (Math.atan2(m[1], m[0]) * 180) / Math.PI;
}

function normalizeAngle(a: number): number {
  let x = a % 360;
  if (x > 90) x -= 180;
  if (x < -90) x += 180;
  return x;
}

export function translateDrawable(d: Drawable, dx: number, dy: number): Drawable {
  const m: Mat = [1, 0, 0, 1, dx, dy];
  return {
    ...d,
    paths: d.paths.map((p) => ({ ...p, cmds: transformCmds(p.cmds, m) })),
    labels: d.labels.map((l) => ({ ...l, at: { x: l.at.x + dx, y: l.at.y + dy } })),
    grains: d.grains.map((g) => ({ a: { x: g.a.x + dx, y: g.a.y + dy }, b: { x: g.b.x + dx, y: g.b.y + dy } })),
    bbox: { minX: d.bbox.minX + dx, minY: d.bbox.minY + dy, maxX: d.bbox.maxX + dx, maxY: d.bbox.maxY + dy }
  };
}

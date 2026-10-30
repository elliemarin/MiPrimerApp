export type FigureBody = 'recto' | 'curvas' | 'amplio' | 'petite';
export type FigureAge = 'adulto' | 'infantil';
export interface FigurineOptions {
  /** Absent on older saved compositions, which retain their manual placement. */
  placement?: 'auto' | 'manual';
  body: FigureBody;
  age: FigureAge;
  skin: string;
  hair: 'corto' | 'largo' | 'rizado' | 'sin';
  hairColor: string;
  /** Placement changes only the illustration, never pattern measurements. */
  garmentWidth: number;
  garmentY: number;
  garmentX: number;
}

export const SKIN_TONES = ['#f6deca', '#edc1a1', '#d99c73', '#bc8055', '#9e6547', '#80503b', '#603d2f', '#432b23'];
export const FIGURE_BODY_LABEL: Record<FigureBody, string> = { recto: 'Recto', curvas: 'Con curvas', amplio: 'Amplio', petite: 'Petite' };

/** Original fashion croquis in a 400 × 680 artboard. Anatomical landmarks are
 * composition guides only; they never scale a sewing pattern or imply fit. */
export function figureGeometry(body: FigureBody, age: FigureAge) {
  const child = age === 'infantil';
  const dimensions = {
    recto: { shoulder: 53, waist: 35, hip: 48, thigh: 28 },
    curvas: { shoulder: 54, waist: 34, hip: 65, thigh: 36 },
    amplio: { shoulder: 72, waist: 59, hip: 75, thigh: 41 },
    petite: { shoulder: 47, waist: 30, hip: 43, thigh: 25 }
  }[body];
  const shoulder = dimensions.shoulder * (child ? 0.82 : 1);
  const waist = dimensions.waist * (child ? 0.95 : 1);
  const hip = dimensions.hip * (child ? 0.88 : 1);
  const thigh = dimensions.thigh * (child ? 0.85 : 1);
  const top = child ? 191 : 159;
  const waistY = child ? 295 : 283;
  const hipY = child ? 350 : 345;
  const crotch = child ? 401 : 390;
  const ankle = body === 'petite' ? 597 : 627;
  const head = child ? { cx: 200, cy: 109, rx: 32, ry: 40 } : { cx: 200, cy: 83, rx: 25, ry: 34 };
  const neckWidth = child ? 12 : 13;
  const torso = `M${200 - neckWidth} ${top - 24} C${200 - neckWidth - 1} ${top - 11} ${200 - shoulder + 22} ${top - 2} ${200 - shoulder} ${top + 4} C${200 - shoulder - 9} ${top + 29} ${200 - shoulder + 4} ${top + 58} ${200 - waist - 7} ${waistY - 24} C${200 - waist} ${waistY - 2} ${200 - waist - 1} ${waistY + 12} ${200 - waist - 6} ${waistY + 27} C${200 - hip} ${hipY - 14} ${200 - hip - 5} ${hipY + 12} ${200 - hip + 1} ${hipY + 35} C${200 - hip + 5} ${crotch + 5} ${200 - thigh} ${crotch + 14} 200 ${crotch + 9} C${200 + thigh} ${crotch + 14} ${200 + hip - 5} ${crotch + 5} ${200 + hip - 1} ${hipY + 35} C${200 + hip + 5} ${hipY + 12} ${200 + hip} ${hipY - 14} ${200 + waist + 6} ${waistY + 27} C${200 + waist + 1} ${waistY + 12} ${200 + waist} ${waistY - 2} ${200 + waist + 7} ${waistY - 24} C${200 + shoulder - 4} ${top + 58} ${200 + shoulder + 9} ${top + 29} ${200 + shoulder} ${top + 4} C${200 + shoulder - 22} ${top - 2} ${200 + neckWidth + 1} ${top - 11} ${200 + neckWidth} ${top - 24} Z`;
  const arm = (sign: number) => {
    const x = (v: number) => 200 + sign * v;
    const handY = top + (child ? 180 : 203);
    return `M${x(shoulder - 6)} ${top + 5} C${x(shoulder + 8)} ${top + 1} ${x(shoulder + 18)} ${top + 15} ${x(shoulder + 21)} ${top + 40} C${x(shoulder + 25)} ${top + 64} ${x(shoulder + 23)} ${top + 85} ${x(shoulder + 29)} ${top + 104} C${x(shoulder + 35)} ${top + 126} ${x(shoulder + 35)} ${handY - 46} ${x(shoulder + 38)} ${handY - 31} C${x(shoulder + 42)} ${handY - 21} ${x(shoulder + 47)} ${handY - 5} ${x(shoulder + 42)} ${handY + 1} C${x(shoulder + 38)} ${handY + 3} ${x(shoulder + 33)} ${handY - 7} ${x(shoulder + 31)} ${handY - 12} C${x(shoulder + 32)} ${handY - 4} ${x(shoulder + 34)} ${handY + 4} ${x(shoulder + 30)} ${handY + 6} C${x(shoulder + 24)} ${handY + 7} ${x(shoulder + 17)} ${handY - 12} ${x(shoulder + 17)} ${handY - 25} C${x(shoulder + 17)} ${handY - 35} ${x(shoulder + 17)} ${handY - 44} ${x(shoulder + 16)} ${handY - 53} C${x(shoulder + 12)} ${top + 127} ${x(shoulder + 9)} ${top + 115} ${x(shoulder + 7)} ${top + 105} C${x(shoulder + 3)} ${top + 81} ${x(shoulder - 7)} ${top + 55} ${x(shoulder - 10)} ${top + 34} Z`;
  };
  const leg = (sign: number) => {
    const x = (v: number) => 200 + sign * v;
    const kneeY = crotch + (ankle - crotch) * .49;
    const knee = child ? 30 : body === 'amplio' ? 37 : body === 'curvas' ? 33 : 29;
    const calf = body === 'amplio' ? 39 : 32;
    const foot = child ? 33 : 29;
    return `M${x(8)} ${crotch - 4} C${x(18)} ${crotch + 3} ${x(hip - 13)} ${hipY + 17} ${x(hip - 3)} ${hipY + 28} C${x(hip + 3)} ${crotch + 41} ${x(knee + 8)} ${kneeY - 18} ${x(knee + 7)} ${kneeY + 5} C${x(calf + 7)} ${kneeY + 32} ${x(foot + 2)} ${ankle - 35} ${x(foot + 1)} ${ankle - 12} C${x(foot + 2)} ${ankle - 3} ${x(foot + 12)} ${ankle + 3} ${x(foot + 11)} ${ankle + 9} C${x(foot + 5)} ${ankle + 16} ${x(foot - 12)} ${ankle + 15} ${x(foot - 13)} ${ankle + 8} L${x(foot - 12)} ${ankle - 13} C${x(foot - 10)} ${ankle - 47} ${x(knee - 12)} ${kneeY + 36} ${x(knee - 13)} ${kneeY + 5} C${x(knee - 14)} ${kneeY - 14} ${x(7)} ${crotch + 39} ${x(6)} ${crotch + 13} Z`;
  };
  const face = `M${200 - head.rx} ${head.cy - 7} C${200 - head.rx - 2} ${head.cy - head.ry - 10} ${200 + head.rx + 2} ${head.cy - head.ry - 10} ${200 + head.rx} ${head.cy - 7} C${200 + head.rx + 1} ${head.cy + 7} ${200 + head.rx - 7} ${head.cy + head.ry - 4} 200 ${head.cy + head.ry} C${200 - head.rx + 7} ${head.cy + head.ry - 4} ${200 - head.rx - 1} ${head.cy + 7} ${200 - head.rx} ${head.cy - 7} Z`;
  const neck = `M${200 - neckWidth} ${head.cy + head.ry - 8} C${200 - neckWidth + 1} ${head.cy + head.ry + 7} ${200 - neckWidth + 2} ${top - 24} ${200 - neckWidth - 7} ${top - 15} Q200 ${top + 4} ${200 + neckWidth + 7} ${top - 15} C${200 + neckWidth - 2} ${top - 24} ${200 + neckWidth - 1} ${head.cy + head.ry + 7} ${200 + neckWidth} ${head.cy + head.ry - 8} Z`;
  return { head, face, torso, arms: [arm(-1), arm(1)], legs: [leg(-1), leg(1)], neck, top, waistY, hipY, crotch, ankle, shoulderWidth: shoulder * 2, bodyWidth: hip * 2, waistWidth: waist * 2, shoulder, waist, hip };
}

/** A reasonable starting composition. Adjusting it never modifies a pattern. */
export function defaultFigurine(family?: string): FigurineOptions {
  const lower = family === 'pantalon' || family === 'falda';
  return { placement: 'auto', body: 'recto', age: 'adulto', skin: SKIN_TONES[3], hair: 'corto', hairColor: '#332720', garmentWidth: lower ? 147 : 238, garmentY: lower ? 282 : 157, garmentX: 0 };
}

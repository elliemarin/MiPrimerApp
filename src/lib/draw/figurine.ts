export type FigureBody = 'recto' | 'curvas' | 'amplio' | 'petite';
export type FigureAge = 'adulto' | 'infantil';
export interface FigurineOptions {
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

/** Original flat croquis in a 400 × 680 artboard; no fit or drape simulation. */
export function figureGeometry(body: FigureBody, age: FigureAge) {
  const child = age === 'infantil';
  const dimensions = {
    recto: { shoulder: 55, waist: 34, hip: 46, thigh: 25 },
    curvas: { shoulder: 56, waist: 34, hip: 65, thigh: 33 },
    amplio: { shoulder: 76, waist: 62, hip: 72, thigh: 37 },
    petite: { shoulder: 48, waist: 30, hip: 43, thigh: 24 }
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
  const head = child ? { cx: 200, cy: 93, rx: 38, ry: 49 } : { cx: 200, cy: 84, rx: 28, ry: 38 };
  const torso = `M180 ${top - 22} Q185 ${top - 2} ${200 - shoulder} ${top + 5} Q${200 - shoulder + 4} ${top + 48} ${200 - waist} ${waistY} Q${200 - waist - 1} ${waistY + 25} ${200 - hip} ${hipY} Q${200 - hip - 3} ${hipY + 29} ${200 - thigh} ${crotch + 14} L${200 + thigh} ${crotch + 14} Q${200 + hip + 3} ${hipY + 29} ${200 + hip} ${hipY} Q${200 + waist + 1} ${waistY + 25} ${200 + waist} ${waistY} Q${200 + shoulder - 4} ${top + 48} ${200 + shoulder} ${top + 5} Q215 ${top - 2} 220 ${top - 22} Z`;
  const arm = (sign: number) => {
    const x = (v: number) => 200 + sign * v;
    return `M${x(shoulder - 8)} ${top + 4} Q${x(shoulder + 14)} ${top - 1} ${x(shoulder + 23)} ${top + 36} L${x(shoulder + 44)} ${top + 139} Q${x(shoulder + 50)} ${top + 163} ${x(shoulder + 38)} ${top + 171} Q${x(shoulder + 28)} ${top + 169} ${x(shoulder + 30)} ${top + 151} L${x(shoulder + 8)} ${top + 71} L${x(shoulder - 5)} ${top + 37} Z`;
  };
  const leg = (sign: number) => {
    const x = (v: number) => 200 + sign * v;
    return `M${x(8)} ${crotch - 9} L${x(hip - 5)} ${hipY + 24} Q${x(hip + 1)} ${crotch + 41} ${x(44)} ${crotch + 109} L${x(35)} ${ankle - 13} Q${x(46)} ${ankle - 5} ${x(46)} ${ankle + 6} L${x(13)} ${ankle + 6} L${x(15)} ${crotch + 112} Z`;
  };
  return { head, torso, arms: [arm(-1), arm(1)], legs: [leg(-1), leg(1)], neck: `M181 ${head.cy + head.ry - 8} L219 ${head.cy + head.ry - 8} L222 ${top - 15} Q200 ${top + 4} 178 ${top - 15} Z`, top, waistY, hipY, crotch, ankle };
}

/** A reasonable starting composition. Adjusting it never modifies a pattern. */
export function defaultFigurine(family?: string): FigurineOptions {
  const lower = family === 'pantalon' || family === 'falda';
  return { body: 'recto', age: 'adulto', skin: SKIN_TONES[3], hair: 'corto', hairColor: '#332720', garmentWidth: lower ? 147 : 238, garmentY: lower ? 282 : 157, garmentX: 0 };
}

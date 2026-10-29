export interface PackRect {
  id: string;
  w: number;
  h: number;
}

export interface Placed extends PackRect {
  x: number;
  y: number;
  bin: number;
}

/**
 * Acomodo por estantes (FFDH) en contenedores de ancho binW y alto binH.
 * No escala ni rota: conserva el tamaño físico.
 */
export function shelfPack(rects: PackRect[], binW: number, binH: number, gap: number): { placed: Placed[]; tooBig: PackRect[]; bins: number; usedHeight: number[] } {
  const sorted = rects.slice().sort((a, b) => b.h - a.h || b.w - a.w);
  const placed: Placed[] = [];
  const tooBig: PackRect[] = [];
  interface Shelf {
    bin: number;
    y: number;
    h: number;
    x: number;
  }
  const shelves: Shelf[] = [];
  const binTop: number[] = [];
  for (const r of sorted) {
    if (r.w > binW + 1e-9 || r.h > binH + 1e-9) {
      tooBig.push(r);
      continue;
    }
    let shelf = shelves.find((s) => s.h >= r.h - 1e-9 && s.x + r.w <= binW + 1e-9);
    if (!shelf) {
      let bin = 0;
      for (; ; bin++) {
        const top = binTop[bin] ?? 0;
        const y = top === 0 ? 0 : top + gap;
        if (y + r.h <= binH + 1e-9) {
          shelf = { bin, y, h: r.h, x: 0 };
          binTop[bin] = y + r.h;
          shelves.push(shelf);
          break;
        }
      }
    }
    placed.push({ ...r, x: shelf.x, y: shelf.y, bin: shelf.bin });
    shelf.x += r.w + gap;
  }
  return { placed, tooBig, bins: binTop.length, usedHeight: binTop };
}

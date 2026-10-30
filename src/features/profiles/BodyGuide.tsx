// Figura de referencia con la línea de cada medida. Amarillo cinta = medida.
const FIGURE =
  'M100 8 C112 8 119 17 119 30 C119 41 113 49 107 52 L108 60 C120 64 136 66 143 72 C150 77 152 90 151 104 L155 160 C157 185 158 205 154 222 L148 222 C150 200 148 180 146 160 L146 120 C145 140 140 150 139 160 C143 175 148 188 147 200 C147 230 141 300 134 352 C132 372 130 385 131 395 L114 396 C113 380 113 360 113 340 C112 300 106 260 101 232 L99 232 C94 260 88 300 87 340 C87 360 87 380 86 396 L69 395 C70 385 68 372 66 352 C59 300 53 230 53 200 C52 188 57 175 61 160 C60 150 55 140 54 120 L54 160 C52 180 50 200 52 222 L46 222 C42 205 43 185 45 160 L49 104 C48 90 50 77 57 72 C64 66 80 64 92 60 L93 52 C87 49 81 41 81 30 C81 17 88 8 100 8 Z';

type G = { d: string; ellipse?: { cx: number; cy: number; rx: number; ry: number; rot?: number }; back?: boolean; note?: string };

const GUIDES: Record<string, G> = {
  estatura: { d: 'M178 8 L178 396 M172 8 L184 8 M172 396 L184 396' },
  pecho: { d: '', ellipse: { cx: 100, cy: 100, rx: 52, ry: 8 } },
  bajoBusto: { d: '', ellipse: { cx: 100, cy: 116, rx: 47, ry: 7 } },
  cintura: { d: '', ellipse: { cx: 100, cy: 150, rx: 40, ry: 7 } },
  cadera: { d: '', ellipse: { cx: 100, cy: 192, rx: 50, ry: 8 } },
  hombros: { d: 'M58 73 Q100 62 142 73', back: true },
  espalda: { d: 'M64 96 L136 96', back: true },
  cuello: { d: '', ellipse: { cx: 100, cy: 57, rx: 10, ry: 4 } },
  talleDelantero: { d: 'M92 60 Q86 96 88 150' },
  talleEspalda: { d: 'M100 50 L100 150', back: true },
  largoManga: { d: 'M58 73 Q50 120 49 160 Q48 190 47 220' },
  brazo: { d: '', ellipse: { cx: 51, cy: 112, rx: 7, ry: 3.5, rot: -8 } },
  muneca: { d: '', ellipse: { cx: 49, cy: 218, rx: 5, ry: 2.5 } },
  tiro: { d: 'M164 150 L164 226 M158 150 L170 150 M158 226 L170 226', note: 'Sentado' },
  tiroTotal: { d: 'M100 150 L100 230', note: 'Pasa entre las piernas hasta la espalda' },
  entrepierna: { d: 'M99 232 Q92 300 88 392' },
  largoExterior: { d: 'M139 152 Q147 200 141 300 Q136 360 131 392' },
  muslo: { d: '', ellipse: { cx: 125, cy: 240, rx: 23, ry: 5 } },
  rodilla: { d: '', ellipse: { cx: 122, cy: 310, rx: 13, ry: 3.5 } },
  tobillo: { d: '', ellipse: { cx: 122, cy: 386, rx: 9, ry: 2.5 } },
  talon: { d: '', ellipse: { cx: 122, cy: 398, rx: 12, ry: 4, rot: -35 } },
  cabeza: { d: '', ellipse: { cx: 100, cy: 24, rx: 20, ry: 6 } }
};

export function BodyGuide({ measure, size = 220 }: { measure?: string; size?: number }) {
  const g = measure ? GUIDES[measure] : undefined;
  return (
    <svg viewBox="0 0 200 410" width={size} height={(size * 410) / 200} role="img" aria-label="Guía para medir">
      <path d={FIGURE} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M100 160 L100 228" stroke="var(--line-strong)" strokeWidth={0.8} />
      {g?.ellipse && (
        <ellipse cx={g.ellipse.cx} cy={g.ellipse.cy} rx={g.ellipse.rx} ry={g.ellipse.ry} transform={g.ellipse.rot ? `rotate(${g.ellipse.rot} ${g.ellipse.cx} ${g.ellipse.cy})` : undefined} fill="none" stroke="var(--tape)" strokeWidth={3.2} />
      )}
      {g?.d && <path d={g.d} fill="none" stroke="var(--tape)" strokeWidth={3.2} strokeLinecap="round" strokeDasharray={g.back ? '6 4' : undefined} />}
      {g?.back && (
        <text x={100} y={406} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
          Se mide por la espalda
        </text>
      )}
      {g?.note && !g.back && (
        <text x={100} y={406} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
          {g.note}
        </text>
      )}
    </svg>
  );
}

import { ORGANIC_SHAPES } from '../../data/shapes';
import { Sheet } from '../../ui/components';

export function ShapesSheet({ value, onPick, onClose }: { value: string; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Sheet title="Figuras orgánicas" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 10 }}>
        {ORGANIC_SHAPES.map((s) => (
          <button key={s.id} className="card" onClick={() => onPick(s.id)} style={{ borderColor: s.id === value ? 'var(--mat)' : undefined }} aria-pressed={s.id === value}>
            <div className="art" style={{ aspectRatio: '1' }}>
              <svg viewBox="-6 -6 112 112">
                <path d={s.d} fill="#c9d6cf" stroke="#1d2420" strokeWidth={2} strokeLinejoin="round" />
              </svg>
            </div>
            <div className="meta" style={{ padding: '6px 8px' }}>
              <span className="small" style={{ fontWeight: 600 }}>{s.label}</span>
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

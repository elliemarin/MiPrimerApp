import { useState } from 'react';
import { ORGANIC_SHAPES, filterShapes, SHAPE_CATEGORY_LABEL, ShapeCategory } from '../../data/shapes';
import { Sheet, TextInput, Empty, Select, Field } from '../../ui/components';

export function ShapesSheet({ value, onPick, onClose }: { value: string; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ShapeCategory | 'todas'>('todas');
  const list = filterShapes(q, category);
  return (
    <Sheet title="Figuras y bordados" onClose={onClose}>
      <div className="stack">
        <TextInput value={q} onChange={setQ} placeholder="Buscar: estrella, hongo, mariposa…" aria-label="Buscar figuras" />
        <Field label="Colección"><Select value={category} onChange={setCategory} options={[{value:'todas',label:'Todas las colecciones'}, ...Object.entries(SHAPE_CATEGORY_LABEL).map(([value,label])=>({value:value as ShapeCategory,label}))]} /></Field>
        <p className="tiny muted">{list.length} de {ORGANIC_SHAPES.length} figuras. Elige una y toca el lienzo; ajusta su tamaño con los tiradores o con dos dedos. Para bordado, cambia la técnica en Propiedades.</p>
        {!list.length && <Empty icon="search" title="Sin figuras" body="Prueba otra palabra o colección." />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 10 }}>
          {list.map((s) => (
            <button key={s.id} className="card" onClick={() => onPick(s.id)} style={{ borderColor: s.id === value ? 'var(--mat)' : undefined }} aria-pressed={s.id === value}>
              <div className="art" style={{ aspectRatio: '1' }}><svg viewBox="-6 -6 112 112" aria-hidden="true"><path d={s.d} fill="#c9d6cf" stroke="#1d2420" strokeWidth={1.2} strokeLinejoin="round" /></svg></div>
              <div className="meta" style={{ padding: '6px 8px' }}><span className="small" style={{ fontWeight: 600 }}>{s.label}</span></div>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

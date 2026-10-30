import { useMemo, useState } from 'react';
import type { CatalogModel } from '../../data/catalog';
import { formatLength, type Unit } from '../../lib/units';
import { Field, Select } from '../../ui/components';
import { FlatArt } from '../../ui/FlatArt';
import { selectVariant, variantAxes, variantValue, type CatalogGroup } from './groups';
import './modelVariants.css';

export function ModelVariantPicker({ group, model, unit, onChange }: {
  group: CatalogGroup; model: CatalogModel; unit: Unit; onChange: (model: CatalogModel) => void;
}) {
  const axes = useMemo(() => variantAxes(group), [group]);
  const [announcement, setAnnouncement] = useState('');
  const main = axes.filter(axis => !axis.advanced);
  const primary = (main.length ? main : axes).slice(0, 3);
  const extra = axes.filter(axis => !primary.includes(axis));
  const axisLabel = (axis: typeof axes[number]) => axis.key === 'largoManga' ? 'Largo de manga' : axis.label;
  const label = (axis: typeof axes[number], value: string) => {
    if (axis.type === 'length' && value !== '__base__') {
      try { const mm = JSON.parse(value); if (typeof mm === 'number') return formatLength(mm, unit); } catch { /* Named options keep their catalogue label. */ }
    }
    return axis.options.find(option => option.value === value)?.label ?? value;
  };
  const change = (axis: typeof axes[number], value: string) => {
    const next = selectVariant(group, model, axis.key, value);
    const alsoChanged = axes.filter(other => other.key !== axis.key && variantValue(model, other.key) !== variantValue(next, other.key));
    setAnnouncement(alsoChanged.length ? `Para esta medida también se ajustó: ${alsoChanged.map(other => `${axisLabel(other).toLowerCase()} a ${label(other, variantValue(next, other.key))}`).join('; ')}.` : 'Medidas del diseño actualizadas.');
    onChange(next);
  };
  const fields = (items: typeof axes) => <div className="model-variant-fields">{items.map(axis => <Field key={axis.key} label={axisLabel(axis)} htmlFor={`variant-${axis.key}`}>
    <Select id={`variant-${axis.key}`} value={variantValue(model, axis.key)} options={axis.options.map(option => ({ value: option.value, label: label(axis, option.value) }))} onChange={value => change(axis, value)}/>
  </Field>)}</div>;
  if (!axes.length) return null;
  return <section className="model-variant-picker stack" aria-label="Medidas del diseño">
    <div><h3 className="section-title">Medidas del diseño</h3><p className="tiny muted">Elige la versión que quieres trabajar.</p></div>
    <div className="model-variant-preview"><FlatArt id={model.id} spec={model.flat} title={group.name} catalog/><p className="small muted">{model.variantLabel ?? model.name}</p></div>
    {fields(primary)}
    {extra.length > 0 && <details className="model-variant-more"><summary>Más medidas y acabados</summary>{fields(extra)}</details>}
    <p className="sr-only" role="status">{announcement}</p>
    {announcement.startsWith('Para esta medida') && <p className="tiny muted">{announcement}</p>}
  </section>;
}

import { useState } from 'react';
import type { PointerEvent } from 'react';
import { Button, Field, Select, Sheet } from '../../ui/components';
import { Harmony, harmonyColors, hexToHsl, hslToHex, wheelHue, wrapHue } from '../../lib/draw/colors';

export function ColorimetrySheet({ onClose, onApply, colors = [], applyLabel = 'Aplicar color' }: { onClose: () => void; onApply: (hex: string) => void; colors?: string[]; applyLabel?: string }) {
  const [base, setBase] = useState(hexToHsl(colors.find((c) => hexToHsl(c)) ?? '#527a64')!);
  const [harmony, setHarmony] = useState<Harmony>('complementaria');
  const [text, setText] = useState(hslToHex(base));
  const [chosen, setChosen] = useState(hslToHex(base));
  const hex = hslToHex(base);
  const setColor = (color: string) => {
    const next = hexToHsl(color);
    if (!next) return;
    setBase(next); setText(color); setChosen(color);
  };
  const setChannel = (channel: 'h' | 's' | 'l', n: number) => {
    const next = { ...base, [channel]: n };
    setBase(next); setText(hslToHex(next)); setChosen(hslToHex(next));
  };
  const pointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setChannel('h', wheelHue(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2));
  };
  const angle = (base.h - 90) * Math.PI / 180;
  return (
    <Sheet title="Círculo de color" onClose={onClose} footer={<Button variant="primary" block onClick={() => { onApply(chosen); onClose(); }}>{applyLabel} · {chosen.toUpperCase()}</Button>}>
      <div className="stack-lg">
        <p className="small muted">Gira el círculo y compara combinaciones para tus telas e hilos. Los tonos de pantalla son orientativos; compáralos con el material real.</p>
        <div role="slider" tabIndex={0} aria-label="Tono del círculo cromático" aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(base.h) % 360} aria-valuetext={`${Math.round(base.h) % 360} grados`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pointer(e); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pointer(e); }}
          onKeyDown={(e) => { if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(e.key)) { e.preventDefault(); setChannel('h', e.key === 'Home' ? 0 : e.key === 'End' ? 359 : wrapHue(base.h + (e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 15 : 1))); } }}
          style={{ width: 'min(260px, 100%)', aspectRatio: '1', alignSelf: 'center', borderRadius: '50%', position: 'relative', touchAction: 'none', background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)', cursor: 'crosshair' }}>
          <div style={{ position: 'absolute', inset: '18%', borderRadius: '50%', background: 'var(--surface)', display: 'grid', placeItems: 'center' }}>
            <span style={{ width: '68%', aspectRatio: '1', borderRadius: '50%', background: hex, border: '1px solid var(--line)' }} />
          </div>
          <span style={{ position: 'absolute', left: `${50 + 41 * Math.cos(angle)}%`, top: `${50 + 41 * Math.sin(angle)}%`, width: 20, height: 20, transform: 'translate(-50%, -50%)', border: '3px solid #fff', boxShadow: '0 0 0 1px #1d2420', borderRadius: '50%', pointerEvents: 'none' }} />
        </div>
        <Field label={`Saturación · ${Math.round(base.s)} %`} htmlFor="color-saturation"><input id="color-saturation" type="range" min={0} max={100} value={base.s} onChange={(e) => setChannel('s', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--mat)' }} /></Field>
        <Field label={`Luminosidad · ${Math.round(base.l)} %`} htmlFor="color-lightness"><input id="color-lightness" type="range" min={0} max={100} value={base.l} onChange={(e) => setChannel('l', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--mat)' }} /></Field>
        <div className="row">
          <input type="color" aria-label="Elegir color base" value={hex} onChange={(e) => setColor(e.target.value)} style={{ width: 52, height: 44, border: '1px solid var(--line)', background: 'transparent' }} />
          <input aria-label="Código hexadecimal del color" className="input" value={text} onChange={(e) => { setText(e.target.value); const next = hexToHsl(e.target.value); if (next) { setBase(next); setChosen(e.target.value); } }} onBlur={() => setText(hex)} spellCheck={false} maxLength={7} />
        </div>
        <Field label="Combinar tonos" htmlFor="color-harmony"><Select id="color-harmony" value={harmony} onChange={setHarmony} options={[{ value: 'complementaria', label: 'Complementarios' }, { value: 'analoga', label: 'Análogos' }, { value: 'triada', label: 'Tríada' }, { value: 'monocromatica', label: 'Un tono, distintas luces' }]} /></Field>
        <div className="row-wrap" aria-label="Paleta sugerida">{harmonyColors(base, harmony).map((color, i) => <Swatch key={`${i}-${color}`} color={color} selected={chosen.toLowerCase() === color.toLowerCase()} onClick={() => setChosen(color)} />)}</div>
        {colors.length > 0 && <section><h3 className="section-title">Colores de este diseño y tus telas</h3><div className="row-wrap">{[...new Set(colors)].filter((c) => hexToHsl(c)).map((color) => <Swatch key={color} color={color} selected={hex.toLowerCase() === color.toLowerCase()} onClick={() => setColor(color)} />)}</div></section>}
        <p className="tiny faint">Elige una muestra y pulsa Aplicar. Para usar una tela con textura, selecciónala en la biblioteca de telas.</p>
      </div>
    </Sheet>
  );
}

function Swatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-label={`Elegir ${color.toUpperCase()}`} aria-pressed={selected} onClick={onClick} style={{ minWidth: 58, padding: 4, border: `2px solid ${selected ? 'var(--mat)' : 'transparent'}`, borderRadius: 8, background: 'transparent', color: 'var(--ink)', flex: '1 0 58px', maxWidth: 100 }}><span style={{ display: 'block', height: 42, borderRadius: 4, background: color, border: '1px solid var(--line)' }} /><span className="tiny" style={{ fontVariantNumeric: 'tabular-nums' }}>{color.toUpperCase()}</span></button>;
}

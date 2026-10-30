import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import type { Project, Reference } from '../../store/types';
import { Button, Field, LengthInput, Notice, Sheet, Select } from '../../ui/components';
import { getFile } from '../../lib/db';
import { imageData, imageDataToBlob, loadBitmap, rectifyWhole } from '../../lib/image';
import type { Pt } from '../../lib/geom/vec';

const PRESETS: Record<string, [number, number] | null> = {
  carta: [215.9, 279.4],
  oficio: [215.9, 340.4],
  a4: [210, 297],
  cuadro10: [100, 100],
  propio: null
};

/** Corrige perspectiva marcando un rectángulo de medidas conocidas en la foto. */
export function PerspectiveSheet({ project, reference, onClose }: { project: Project; reference: Reference; onClose: () => void }) {
  const addFile = useApp((s) => s.addFile);
  const updateProject = useApp((s) => s.updateProject);
  const toast = useApp((s) => s.toast);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string>('');
  const [quad, setQuad] = useState<Pt[]>([]);
  const [preset, setPreset] = useState('carta');
  const [w, setW] = useState<number | undefined>(215.9);
  const [h, setH] = useState<number | undefined>(279.4);
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragIdx = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      const f = await getFile(reference.fileId);
      if (!f) return;
      const im = await loadBitmap(f.blob);
      setImg(im);
      setUrl(URL.createObjectURL(f.blob));
      const W = im.naturalWidth;
      const H = im.naturalHeight;
      setQuad(reference.corrected?.corners.map(([x, y]) => ({ x: x * W, y: y * H })) ?? [
        { x: W * 0.2, y: H * 0.2 },
        { x: W * 0.8, y: H * 0.2 },
        { x: W * 0.8, y: H * 0.8 },
        { x: W * 0.2, y: H * 0.8 }
      ]);
    })();
  }, [reference]);

  const toImg = (e: React.PointerEvent): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM()!.inverse();
    const p = pt.matrixTransform(m);
    return { x: p.x, y: p.y };
  };

  const apply = async () => {
    if (!img || !w || !h) return;
    setBusy(true);
    try {
      const src = imageData(img, 2400);
      const k = src.width / img.naturalWidth;
      const q = quad.map((p) => ({ x: p.x * k, y: p.y * k }));
      const { img: out, mmPerPx } = rectifyWhole(src, q, w, h);
      const blob = await imageDataToBlob(out, 'image/jpeg', 0.9);
      const fileId = await addFile(blob, `${reference.name} (perspectiva corregida).jpg`);
      const corners = quad.map((p) => [p.x / img.naturalWidth, p.y / img.naturalHeight] as [number, number]);
      updateProject(project.id, (p) => ({ ...p, references: p.references.map((r) => (r.id === reference.id ? { ...r, corrected: { fileId, wMm: out.width * mmPerPx, hMm: out.height * mmPerPx, corners }, mmPerPx: undefined } : r)) }), `Perspectiva corregida: ${reference.name}.`);
      toast('Perspectiva corregida. La imagen corregida conserva la escala física.', 'ok');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo corregir la perspectiva.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const W = img?.naturalWidth ?? 1;
  const H = img?.naturalHeight ?? 1;
  const r = Math.max(W, H) / 60;
  return (
    <Sheet title="Corregir perspectiva" onClose={onClose} wide>
      <div className="stack">
        <p className="muted small">Arrastra las cuatro esquinas sobre un rectángulo de medidas conocidas que aparezca en la foto (una hoja carta, una regla cuadrada o el borde de la mesa de corte). Toda la imagen se endereza y queda a escala.</p>
        {img && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', maxHeight: '52vh', touchAction: 'none', background: 'var(--sunken)', borderRadius: 12 }}
            onPointerMove={(e) => {
              if (dragIdx.current === null) return;
              const p = toImg(e);
              setQuad(quad.map((q, i) => (i === dragIdx.current ? { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) } : q)));
            }}
            onPointerUp={() => (dragIdx.current = null)}
            onPointerLeave={() => (dragIdx.current = null)}
          >
            <image href={url} width={W} height={H} />
            <polygon points={quad.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(227,178,31,0.18)" stroke="#e3b21f" strokeWidth={r / 3} />
            {quad.map((p, i) => (
              <g key={i} onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); dragIdx.current = i; }} style={{ cursor: 'grab' }}>
                <circle cx={p.x} cy={p.y} r={r * 1.6} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={r * 0.7} fill="#24584a" stroke="#fff" strokeWidth={r / 4} />
                <text x={p.x + r} y={p.y - r} fontSize={r * 1.4} fill="#fff" stroke="#000" strokeWidth={r / 10}>{['1', '2', '3', '4'][i]}</text>
              </g>
            ))}
          </svg>
        )}
        <p className="tiny faint">Orden: 1 arriba izquierda, 2 arriba derecha, 3 abajo derecha, 4 abajo izquierda.</p>
        <Field label="Rectángulo de referencia">
          <Select value={preset} onChange={(v) => { setPreset(v); const d = PRESETS[v]; if (d) { setW(d[0]); setH(d[1]); } }} options={[{ value: 'carta', label: 'Hoja carta (21.59 × 27.94 cm)' }, { value: 'oficio', label: 'Hoja oficio (21.59 × 34.04 cm)' }, { value: 'a4', label: 'Hoja A4 (21 × 29.7 cm)' }, { value: 'cuadro10', label: 'Cuadrado de 10 × 10 cm' }, { value: 'propio', label: 'Otras medidas' }]} />
        </Field>
        <div className="grid-2">
          <Field label="Ancho real (lado 1–2)">
            <LengthInput mm={w} onChange={(v) => { setW(v); setPreset('propio'); }} min={5} />
          </Field>
          <Field label="Alto real (lado 2–3)">
            <LengthInput mm={h} onChange={(v) => { setH(v); setPreset('propio'); }} min={5} />
          </Field>
        </div>
        <Notice>La corrección es exacta para el plano del rectángulo. Si la tela o el papel tienen pliegues o curvas, revisa los contornos al trazar.</Notice>
        <Button variant="primary" block onClick={() => void apply()} disabled={busy || !w || !h}>{busy ? 'Procesando…' : 'Corregir y calibrar'}</Button>
      </div>
    </Sheet>
  );
}

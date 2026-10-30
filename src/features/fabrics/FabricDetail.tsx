import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Confirm, Empty, Field, LengthInput, Notice, NumberInput, PageHead, Segmented, TextInput, useFileUrl } from '../../ui/components';
import { goBack, navigate } from '../../ui/router';
import { getFile } from '../../lib/db';
import { adjustImage, averageColor, imageData, imageDataToBlob, loadBitmap, warpPerspective } from '../../lib/image';
import type { Pt } from '../../lib/geom/vec';
import type { Fabric } from '../../store/types';
import { formatLength } from '../../lib/units';
import { fabricRepeat } from '../studio/render';

/** Editor de una tela: recorte con perspectiva, color, calibración, hilo y pelo. */
export function FabricDetail({ id }: { id: string }) {
  const fabric = useApp((s) => s.fabrics[id]);
  const put = useApp((s) => s.put);
  const remove = useApp((s) => s.remove);
  const addFile = useApp((s) => s.addFile);
  const toast = useApp((s) => s.toast);
  const unit = useApp((s) => s.settings.unit);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [srcUrl, setSrcUrl] = useState('');
  const [quad, setQuad] = useState<Pt[]>([]);
  const [busy, setBusy] = useState(false);
  const [calib, setCalib] = useState<{ w?: number; h?: number }>({});
  const [confirm, setConfirm] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const processedUrl = useFileUrl(fabric?.photo?.processedFileId);

  useEffect(() => {
    if (!fabric?.photo) return;
    let cancelled = false;
    let url: string | undefined;
    void (async () => {
      try {
        const f = await getFile(fabric.photo!.originalFileId);
        if (!f) return;
        const im = await loadBitmap(f.blob);
        if (cancelled) return;
        url = URL.createObjectURL(f.blob);
        setImg(im); setSrcUrl(url);
        const W = im.naturalWidth, H = im.naturalHeight;
        setQuad(fabric.photo!.corners?.map(([x, y]) => ({ x: x * W, y: y * H })) ?? [
          { x: W * 0.1, y: H * 0.1 }, { x: W * 0.9, y: H * 0.1 },
          { x: W * 0.9, y: H * 0.9 }, { x: W * 0.1, y: H * 0.9 }
        ]);
      } catch {
        if (!cancelled) toast('No se pudo abrir la foto original. Prueba otra imagen.', 'error');
      }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [fabric?.photo?.originalFileId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fabric) return <div className="page"><Empty icon="telas" title="Tela no encontrada" action={<Button onClick={() => navigate('/telas')}>Volver</Button>} /></div>;
  const set = (patch: Partial<Fabric>) => put('fabric', { ...fabric, ...patch });
  const adj = fabric.photo?.adjust ?? { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };

  const process = async () => {
    if (!img || !fabric.photo) return;
    setBusy(true);
    try {
      const src = imageData(img, 2400);
      const k = src.width / img.naturalWidth;
      const q = quad.map((p) => ({ x: p.x * k, y: p.y * k }));
      const side = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
      let outW = Math.round(Math.max(side(q[0], q[1]), side(q[3], q[2])));
      let outH = Math.round(Math.max(side(q[1], q[2]), side(q[0], q[3])));
      // Si se conocen las medidas reales, la proporción de la muestra es la real.
      if (calib.w && calib.h) outH = Math.round((outW * calib.h) / calib.w);
      const cap = 1600 / Math.max(outW, outH);
      if (cap < 1) {
        outW = Math.round(outW * cap);
        outH = Math.round(outH * cap);
      }
      const warped = warpPerspective(src, q, outW, outH);
      const adjusted = adjustImage(warped, adj);
      const blob = await imageDataToBlob(adjusted, 'image/jpeg', 0.92);
      const processedFileId = await addFile(blob, `${fabric.name} (muestra).jpg`);
      const corners = quad.map((p) => [p.x / img.naturalWidth, p.y / img.naturalHeight] as [number, number]);
      put('fabric', {
        ...fabric,
        color: averageColor(adjusted),
        photo: { ...fabric.photo, processedFileId, corners, pxW: outW, pxH: outH },
        calibration: calib.w ? { mmPerPx: calib.w / outW, refMm: calib.w } : fabric.calibration && fabric.photo.pxW ? { mmPerPx: (fabric.calibration.mmPerPx * fabric.photo.pxW) / outW, refMm: fabric.calibration.refMm } : undefined
      });
      toast(calib.w ? 'Muestra procesada y calibrada.' : 'Muestra procesada. Sin calibrar: es una textura visual.', 'ok');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo procesar la foto.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toImg = (e: React.PointerEvent): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const W = img?.naturalWidth ?? 1;
  const H = img?.naturalHeight ?? 1;
  const r = Math.max(W, H) / 55;
  const filter = `brightness(${1 + adj.brightness * 0.6}) contrast(${1 + adj.contrast}) saturate(${1 + adj.saturation})`;
  const rep = fabricRepeat(fabric);

  return (
    <div className="page page-wide">
      <PageHead title={fabric.name} back={{ label: 'Telas', onClick: () => goBack('/telas') }} sub={fabric.calibration ? `Muestra calibrada: ${formatLength(rep.w, unit)} × ${formatLength(rep.h, unit)} por repetición.` : 'Textura visual: su tamaño en el diseño es aproximado hasta que la calibres.'} />
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
        <div className="stack">
          <h2 className="section-title" style={{ margin: 0 }}>1. Recorta la muestra</h2>
          <p className="small muted">Arrastra las cuatro esquinas sobre una zona plana de la tela. Si colocaste una regla o una hoja carta, alinea las esquinas con ella para calibrar.</p>
          {img && (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              style={{ width: '100%', maxHeight: 420, background: 'var(--sunken)', borderRadius: 14, touchAction: 'none' }}
              onPointerMove={(e) => {
                if (drag.current === null) return;
                const p = toImg(e);
                setQuad(quad.map((q, i) => (i === drag.current ? { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) } : q)));
              }}
              onPointerUp={() => (drag.current = null)}
            >
              <image href={srcUrl} width={W} height={H} style={{ filter }} />
              <polygon points={quad.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(227,178,31,0.12)" stroke="#e3b21f" strokeWidth={r / 3} />
              {quad.map((p, i) => (
                <g key={i} onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); drag.current = i; }}>
                  <circle cx={p.x} cy={p.y} r={r * 1.7} fill="transparent" />
                  <circle cx={p.x} cy={p.y} r={r * 0.7} fill="#24584a" stroke="#fff" strokeWidth={r / 4} />
                </g>
              ))}
            </svg>
          )}
          <h2 className="section-title" style={{ margin: '8px 0 0' }}>2. Ajusta luz y color</h2>
          <p className="tiny faint">La foto original se conserva sin cambios; los ajustes se aplican a la muestra.</p>
          {(['brightness', 'contrast', 'saturation', 'warmth'] as const).map((k) => (
            <Field key={k} label={`${{ brightness: 'Brillo', contrast: 'Contraste', saturation: 'Saturación', warmth: 'Calidez' }[k]} ${Math.round(adj[k] * 100)}`}>
              <input type="range" min={-0.6} max={0.6} step={0.02} value={adj[k]} onChange={(e) => set({ photo: { ...fabric.photo!, adjust: { ...adj, [k]: Number(e.target.value) } } })} />
            </Field>
          ))}
          <h2 className="section-title" style={{ margin: '8px 0 0' }}>3. Calibra el tamaño (opcional)</h2>
          <div className="grid-2">
            <Field label="Ancho real del recorte">
              <LengthInput mm={calib.w} onChange={(w) => setCalib({ ...calib, w })} allowEmpty min={5} placeholder="Sin calibrar" />
            </Field>
            <Field label="Alto real del recorte">
              <LengthInput mm={calib.h} onChange={(h) => setCalib({ ...calib, h })} allowEmpty min={5} placeholder="Sin calibrar" />
            </Field>
          </div>
          <Button variant="primary" block onClick={() => void process()} disabled={busy || !img}>{busy ? 'Procesando…' : 'Procesar muestra'}</Button>
        </div>

        <div className="stack-lg">
          <section className="stack">
            <h2 className="section-title" style={{ margin: 0 }}>Muestra</h2>
            <div style={{ position: 'relative', height: 220, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', backgroundColor: fabric.color, backgroundImage: processedUrl ? `url(${processedUrl})` : undefined, backgroundSize: `${(rep.w / Math.max(rep.w, rep.h)) * 120}px auto`, backgroundRepeat: 'repeat' }}>
              <svg viewBox="-60 -60 120 120" style={{ position: 'absolute', right: 8, bottom: 8, width: 70, height: 70, background: 'rgba(255,255,255,0.85)', borderRadius: 12 }}>
                <g transform={`rotate(${fabric.grainAngle})`}>
                  <line x1={0} y1={-42} x2={0} y2={42} stroke="#1d2420" strokeWidth={4} />
                  <path d="M0 -50 L-10 -32 L10 -32 Z M0 50 L-10 32 L10 32 Z" fill="#1d2420" />
                </g>
                {fabric.nap === 'con-pelo' && <path d={fabric.napDirection === 'arriba' ? 'M30 20 L30 -20 M22 -10 L30 -22 L38 -10' : 'M30 -20 L30 20 M22 10 L30 22 L38 10'} stroke="#b4273a" strokeWidth={4} fill="none" />}
              </svg>
            </div>
            <div className="row-wrap">
              {fabric.calibration ? <Chip tone="ok">Calibrada · {formatLength(fabric.calibration.refMm, unit)} de referencia</Chip> : <Chip tone="warn">Textura visual</Chip>}
              {fabric.calibration && <Button size="sm" variant="ghost" onClick={() => set({ calibration: undefined })}>Quitar calibración</Button>}
            </div>
            {!fabric.calibration && (
              <Field label="Tamaño visual de la repetición" hint="Solo para verla proporcionada en el estudio; no es una medida física.">
                <LengthInput mm={fabric.visualRepeatMm} min={5} max={2000} onChange={(v) => v && set({ visualRepeatMm: v })} />
              </Field>
            )}
          </section>
          <section className="stack">
            <h2 className="section-title" style={{ margin: 0 }}>Hilo y sentido del pelo</h2>
            <Field label={`Hilo (urdimbre) ${fabric.grainAngle}° respecto a la vertical de la muestra`}>
              <input type="range" min={-90} max={90} step={1} value={fabric.grainAngle} onChange={(e) => set({ grainAngle: Number(e.target.value) })} />
            </Field>
            <Segmented value={fabric.nap} onChange={(n) => set({ nap: n, napDirection: n === 'con-pelo' ? fabric.napDirection ?? 'abajo' : undefined })} options={[{ value: 'sin-pelo', label: 'Sin pelo ni dirección' }, { value: 'con-pelo', label: 'Con pelo o dirección' }]} />
            {fabric.nap === 'con-pelo' && <Segmented value={fabric.napDirection ?? 'abajo'} onChange={(d) => set({ napDirection: d })} options={[{ value: 'abajo', label: 'Pelo hacia abajo' }, { value: 'arriba', label: 'Pelo hacia arriba' }]} />}
            {fabric.nap === 'con-pelo' && <Notice>Con pelo o estampado direccional, todas las piezas se cortan en el mismo sentido: la estimación de tela puede aumentar.</Notice>}
          </section>
          <section className="stack">
            <h2 className="section-title" style={{ margin: 0 }}>Datos de la tela</h2>
            <Field label="Nombre">
              <TextInput value={fabric.name} onChange={(v) => set({ name: v })} />
            </Field>
            <Segmented value={fabric.kind} onChange={(k) => set({ kind: k })} options={[{ value: 'plano', label: 'Tejido plano' }, { value: 'punto', label: 'Tejido de punto' }]} />
            <Field label="Composición">
              <TextInput value={fabric.composition} onChange={(v) => set({ composition: v })} placeholder="100 % algodón, 95/5 algodón-elastano…" />
            </Field>
            <div className="grid-2">
              <Field label="Ancho útil">
                <LengthInput mm={fabric.widthMm} onChange={(v) => set({ widthMm: v })} allowEmpty min={50} />
              </Field>
              <Field label="Cantidad disponible">
                <LengthInput mm={fabric.quantityMm} onChange={(v) => set({ quantityMm: v })} allowEmpty min={1} />
              </Field>
              <Field label="Elasticidad a lo ancho">
                <NumberInput value={fabric.stretchH ?? 0} min={0} max={200} onChange={(v) => set({ stretchH: v })} suffix="%" />
              </Field>
              <Field label="Elasticidad a lo largo">
                <NumberInput value={fabric.stretchV ?? 0} min={0} max={200} onChange={(v) => set({ stretchV: v })} suffix="%" />
              </Field>
            </div>
            <Field label="Notas">
              <textarea className="textarea" value={fabric.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Lavado, encogimiento, proveedor…" />
            </Field>
          </section>
          <Button variant="danger" onClick={() => setConfirm(true)}>Eliminar tela</Button>
        </div>
      </div>
      {confirm && <Confirm title="¿Eliminar esta tela?" body="Los diseños que la usan mostrarán un color plano. Las fotos se borran al liberar espacio." confirmLabel="Eliminar" danger onClose={() => setConfirm(false)} onConfirm={() => { remove('fabric', fabric.id); navigate('/telas'); }} />}
    </div>
  );
}

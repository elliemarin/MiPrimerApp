import { useEffect, useState } from 'react';
import type { RefLayer } from '../../lib/pattern/engine';
import { useFileUrl } from '../../ui/components';
import { getFile } from '../../lib/db';
import { imageData, loadBitmap } from '../../lib/image';

export function RefLayerSvg({ layer }: { layer: RefLayer }) {
  const url = useFileUrl(layer.fileId);
  if (!url) return null;
  return (
    <g transform={`translate(${layer.x} ${layer.y}) rotate(${layer.rotation}) scale(${layer.mmPerPx})`} opacity={layer.opacity} style={{ pointerEvents: 'none' }}>
      <image href={url} x={0} y={0} width={layer.pxW} height={layer.pxH} preserveAspectRatio="none" />
    </g>
  );
}

/** Píxeles de la capa (reducidos) para el trazado asistido. */
export function useLayerPixels(layer?: RefLayer): { data: ImageData; k: number } | null {
  const [px, setPx] = useState<{ id: string; data: ImageData; k: number } | null>(null);
  useEffect(() => {
    let alive = true;
    if (!layer) return;
    if (px?.id === layer.fileId) return;
    void (async () => {
      const f = await getFile(layer.fileId);
      if (!f) return;
      const img = await loadBitmap(f.blob);
      const data = imageData(img, 1600);
      if (alive) setPx({ id: layer.fileId, data, k: data.width / img.naturalWidth });
    })();
    return () => {
      alive = false;
    };
  }, [layer?.fileId]); // eslint-disable-line react-hooks/exhaustive-deps
  return layer && px && px.id === layer.fileId ? px : null;
}

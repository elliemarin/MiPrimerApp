import { useEffect, useRef, useState } from 'react';
import { Button, Field, LengthInput, Sheet, useFileUrl } from '../../ui/components';
import { EMBROIDERY_IMAGE_ACCEPT, importEmbroideryImage, type ImportedEmbroideryImage } from './embroideryImage';

export function EmbroideryImageSheet({ onClose, onPlace }: {
  onClose: () => void;
  onPlace: (image: ImportedEmbroideryImage, widthMm: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [image, setImage] = useState<ImportedEmbroideryImage>();
  const [width, setWidth] = useState<number | undefined>(70);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const url = useFileUrl(image?.fileId);
  useEffect(() => () => { request.current += 1; }, []);
  async function choose(file?: File) {
    if (!file) return;
    const current = ++request.current;
    setBusy(true); setError(''); setImage(undefined);
    try {
      const imported = await importEmbroideryImage(file);
      if (current === request.current) setImage(imported);
    } catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la imagen.');
    } finally {
      if (current === request.current) setBusy(false);
    }
  }
  return <Sheet title="Tu logo o imagen" onClose={onClose}>
    <div className="stack-lg">
      <p className="small muted">Elige tu logo, dibujo o foto. Después podrás moverlo sobre la prenda y ajustar su tamaño.</p>
      <input ref={input} type="file" accept={EMBROIDERY_IMAGE_ACCEPT} aria-label="Archivo de logo o imagen" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file); }}/>
      <Button block disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Preparando imagen…' : image ? 'Elegir otra imagen' : 'Elegir imagen'}</Button>
      {busy && <p className="small muted" role="status">Guardando tu imagen…</p>}
      {error && <p className="small" role="alert">{error}</p>}
      {image && <>
        <div className="embroidery-image-preview">{url && <img src={url} alt={`Vista previa de ${image.name}`}/>}</div>
        <Field label="Ancho de la imagen" htmlFor="embroidery-image-width"><LengthInput id="embroidery-image-width" mm={width} min={5} max={1000} allowEmpty onChange={setWidth}/></Field>
        <p className="tiny muted">El alto se ajusta automáticamente para conservar las proporciones.</p>
        <Button block variant="primary" disabled={!width || width < 5 || width > 1000 || busy} onClick={() => width && onPlace(image, width)}>Colocar imagen</Button>
      </>}
      <p className="tiny muted">PNG conserva el fondo transparente. También puedes usar JPG o WebP. La imagen se incluye en el PDF como referencia para transferir o digitalizar; no genera puntadas de máquina.</p>
    </div>
  </Sheet>;
}

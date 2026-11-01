import { useState } from 'react';
import type { TransformationIdea } from '../../data/transformations';
import { transformationPhotoFor, transformationPhotoUrl, type TransformationPhotoView } from '../../data/transformationPhotos';

/** The atlas only supplies a product photograph, never pattern geometry. */
export function TransformationPhoto({ idea, view = 'after', eager = false }: {
  idea: TransformationIdea; view?: TransformationPhotoView; eager?: boolean;
}) {
  const source = transformationPhotoFor(idea.id);
  const url = source && transformationPhotoUrl(source);
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!source || failedUrl === url) return <span className="transformation-photo is-unavailable" data-transformation-photo={idea.id} data-view={view}>Imagen no disponible</span>;
  const [x, y, width, height] = source[view], ratio = width / height;
  return <span className="transformation-photo" data-transformation-photo={idea.id} data-view={view}>
    <span className="transformation-photo-crop" role="img" aria-label={`${idea.name}. ${view === 'before' ? 'Prenda antes del cambio' : 'Ejemplo con la transformación'}.`} style={{ aspectRatio: ratio, width: `min(100cqw, ${ratio * 100}cqh)` }}>
      <img className="transformation-photo-atlas" src={url} alt="" aria-hidden="true" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false}
        onError={() => setFailedUrl(url)} style={{ left: `${-x / width * 100}%`, top: `${-y / height * 100}%`, width: `${1254 / width * 100}%`, height: `${1254 / height * 100}%` }}/>
    </span>
  </span>;
}

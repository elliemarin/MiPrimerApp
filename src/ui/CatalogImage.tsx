import { useState } from 'react';
import type { CatalogModel, Recipient } from '../data/catalog';
import { catalogImageBounds, catalogImageFor, catalogImageUrl } from '../data/catalogImages';
import { FlatArt } from './FlatArt';
import './catalogImage.css';

/** Presentation only. The separate FlatArt / assembly views own the editable
 * geometry, side views, project colours and physical pattern measurements. */
export function CatalogImage({ model, title = model.name, recipient, eager = false }: {
  model: CatalogModel; title?: string; recipient?: Recipient; eager?: boolean;
}) {
  const source = catalogImageFor(model, recipient);
  const url = source && catalogImageUrl(source);
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!source || failedUrl === url) return <FlatArt id={model.id} spec={model.flat} title={title} catalog/>;
  const [x, y, width, height] = catalogImageBounds(source), ratio = width / height;
  return <div className="catalog-photo" data-catalog-image={model.designGroup?.id ?? model.id} data-image-cell={source.cell}>
    <div className="catalog-photo-crop" role="img" aria-label={`${title}. Ilustración del diseño.`} style={{ aspectRatio: ratio, width: `min(100cqw, ${ratio * 100}cqh)` }}>
      <img className="catalog-photo-atlas" src={url} alt="" aria-hidden="true" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false}
        onError={() => setFailedUrl(url)} style={{ left: `${-x / width * 100}%`, top: `${-y / height * 100}%`, width: `${1254 / width * 100}%`, height: `${1254 / height * 100}%` }}/>
    </div>
  </div>;
}

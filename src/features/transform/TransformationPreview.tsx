import { useState } from 'react';
import type { TransformationIdea } from '../../data/transformations';
import type { TransformationPhotoView } from '../../data/transformationPhotos';
import { TransformationPhoto } from './TransformationPhoto';

export function TransformationPreview({ idea, compact = false }: { idea: TransformationIdea; compact?: boolean }) {
  const [view, setView] = useState<TransformationPhotoView>('after');
  return <figure className={`transform-preview${compact ? ' compact' : ''}`}>
    <TransformationPhoto idea={idea} view={view} eager/>
    <div className="transform-photo-switch" role="group" aria-label={`Comparar ${idea.name}`}>
      <button type="button" aria-pressed={view === 'before'} onClick={() => setView('before')}>Antes</button>
      <button type="button" aria-pressed={view === 'after'} onClick={() => setView('after')}>Con el cambio</button>
    </div>
    {!compact && <figcaption>Ejemplo visual generado con IA. Las piezas del patrón se calculan con tus medidas.</figcaption>}
  </figure>;
}

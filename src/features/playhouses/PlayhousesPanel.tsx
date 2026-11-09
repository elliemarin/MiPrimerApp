import { PLAYHOUSE_CARDS, PLAYHOUSE_CATEGORIES, PLAYHOUSE_CATEGORY_LABEL, type PlayhouseCategory } from '../../data/playhouses';
import { PlushCatalog, type CatalogConfig } from '../toys/PlushCatalog';
import { playhouseScene } from './PlayhouseArt';

const CONFIG: CatalogConfig<PlayhouseCategory> = {
  cards: PLAYHOUSE_CARDS, categories: PLAYHOUSE_CATEGORIES, categoryLabel: PLAYHOUSE_CATEGORY_LABEL,
  title: 'Casitas de juego', titleId: 'playhouses-title', className: 'toys-panel playhouses-panel', scene: playhouseScene,
  intro: 'Casitas de tela para un rincón de la habitación o para cubrir una mesa: tejado, faldón, puerta, ventanas, cortinas y apliques. Elige un tema y mézclalo con otro faldón o tus medidas; el patrón sale a tamaño real para imprimir o proyectar.',
  note: 'Diseños propios inspirados en tus fotos y experimentales hasta coser una muestra. Fija bien la barra y el gancho; sin cordones: alzapaños, persianas y esquinas cierran con velcro.',
  searchLabel: 'Buscar casitas', placeholder: 'Honguito, princesa, mesa…', groupLabel: 'Tipo de casita', noun: ['casita', 'casitas'],
  storagePrefix: 'hilvana-casita-',
  sizes: { 'casita-rincon': [110, 130, 150], 'casita-mesa': [100, 120, 160] }
};

export function PlayhousesPanel() { return <PlushCatalog config={CONFIG}/>; }

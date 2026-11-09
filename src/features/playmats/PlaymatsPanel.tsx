import { PLAYMAT_CARDS, PLAYMAT_CATEGORIES, PLAYMAT_CATEGORY_LABEL, type PlaymatCategory } from '../../data/playmats';
import { PlushCatalog, type CatalogConfig } from '../toys/PlushCatalog';
import { playmatScene } from './PlaymatArt';

const CONFIG: CatalogConfig<PlaymatCategory> = {
  cards: PLAYMAT_CARDS, categories: PLAYMAT_CATEGORIES, categoryLabel: PLAYMAT_CATEGORY_LABEL,
  title: 'Tapetes', titleId: 'playmats-title', className: 'toys-panel playmats-panel', scene: playmatScene,
  intro: 'Tapetes de juego acolchados con forma, con borde de pétalos, en puzle y sensoriales. Cada uno con su patrón a tamaño real y las líneas de acolchado, los apliques y los elementos marcados: proyéctalo sobre la tela o imprímelo.',
  note: 'También se llaman alfombras de juego o tapetes de actividades; «tapis d’éveil» en francés, «Krabbeldecke» en alemán y «play mat» en inglés. Son diseños propios inspirados en tus fotos y experimentales hasta coser una muestra. Para jugar con un adulto delante: no son para dormir ni para la cuna.',
  searchLabel: 'Buscar tapetes', placeholder: 'Sol, hoja, oso, sensorial…', groupLabel: 'Tipo de tapete', noun: ['tapete', 'tapetes'],
  storagePrefix: 'hilvana-tapete-',
  sizes: {
    'tapete-sol': [90, 110, 130], 'tapete-arcoiris': [100, 120, 140], 'tapete-oso': [80, 100, 120], 'tapete-conejo': [120, 150, 170], 'tapete-flor': [90, 110, 130],
    'tapete-hoja': [100, 120, 150], 'tapete-fresa': [80, 100, 120], 'tapete-petalos': [70, 90, 110], 'tapete-puzle': [30, 35, 40], 'tapete-sensorial': [25, 30, 35], 'tapete-sensorial-hexagonal': [50, 60, 70]
  }
};

export function PlaymatsPanel() { return <PlushCatalog config={CONFIG}/>; }

import { ORNAMENT_CARDS, ORNAMENT_CATEGORIES, ORNAMENT_CATEGORY_LABEL, type OrnamentCategory } from '../../data/ornaments';
import { PlushCatalog, type CatalogConfig } from '../toys/PlushCatalog';
import { ornamentScene } from './OrnamentArt';

const CONFIG: CatalogConfig<OrnamentCategory> = {
  cards: ORNAMENT_CARDS, categories: ORNAMENT_CATEGORIES, categoryLabel: ORNAMENT_CATEGORY_LABEL,
  title: 'Adornos navideños', titleId: 'ornaments-title', className: 'toys-panel ornaments-panel', scene: ornamentScene,
  intro: 'Adornos de fieltro para el árbol, figuritas para el calendario de adviento y botas forradas. Los de fieltro se cortan por el contorno y llevan marcada la puntada; los apliques salen en su sitio. Todo a tamaño real para imprimir o proyectar.',
  note: 'Diseños propios inspirados en tus fotos y experimentales hasta coser una muestra. Son adornos, no juguetes: botones, cuentas y pompones son piezas pequeñas; cuélgalos fuera del alcance de bebés y la bota lejos del fuego.',
  searchLabel: 'Buscar adornos', placeholder: 'Reno, jengibre, adviento, bota…', groupLabel: 'Tipo de adorno', noun: ['adorno', 'adornos'],
  storagePrefix: 'hilvana-adorno-',
  sizes: { 'adorno-casita': [8, 11, 15], 'adorno-reno': [9, 11, 15], 'adorno-jengibre': [9, 12, 16], 'adorno-arbol': [12, 15, 20], 'adorno-arbol-retales': [10, 14, 18], 'adorno-adviento': [6, 7.5, 10], 'bota-navidena': [30, 45, 55] }
};

export function OrnamentsPanel() { return <PlushCatalog config={CONFIG}/>; }

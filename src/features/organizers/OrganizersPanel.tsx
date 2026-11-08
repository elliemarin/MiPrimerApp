import { ORGANIZER_CARDS, ORGANIZER_CATEGORIES, ORGANIZER_CATEGORY_LABEL, type OrganizerCategory } from '../../data/organizers';
import { PlushCatalog, type CatalogConfig } from '../toys/PlushCatalog';
import { organizerScene } from './OrganizerArt';

const CONFIG: CatalogConfig<OrganizerCategory> = {
  cards: ORGANIZER_CARDS, categories: ORGANIZER_CATEGORIES, categoryLabel: ORGANIZER_CATEGORY_LABEL,
  title: 'Bolsilleros', titleId: 'organizers-title', className: 'toys-panel organizers-panel', scene: organizerScene,
  intro: 'Organizadores de tela para colgar en la pared, la cuna o el escritorio: una silueta acolchada con bolsillos, apliques y cara bordada. Cada uno con su patrón a tamaño real para imprimir o proyectar, con los bolsillos marcados en su sitio.',
  note: 'También se llaman organizadores colgantes o de pared; «porte-objets» o «vide-poches mural» en francés, «Utensilo» en alemán y «wall pocket organizer» en inglés. Son diseños propios inspirados en tus fotos y experimentales hasta coser una muestra. Cuélgalos fuera del alcance de la cuna, salvo el de cuna, que va por fuera de los barrotes.',
  searchLabel: 'Buscar bolsilleros', placeholder: 'Gato, ballena, cuna, lápices…', groupLabel: 'Tipo de bolsillero', noun: ['bolsillero', 'bolsilleros'],
  storagePrefix: 'hilvana-bolsillero-',
  sizes: {
    'bolsillero-gato': [50, 70, 90], 'organizador-cuna': [24, 28, 36], 'bolsillero-ballena': [45, 65, 85], 'bolsillero-flor': [22, 30, 40], 'zanahoria-conejito': [26, 32, 45],
    'bolsillero-trebol': [32, 45, 65], 'bolsillero-koala': [50, 77, 95], 'bolsillero-zorro': [50, 70, 90], 'portalapices-zorro': [30, 38, 55]
  }
};

export function OrganizersPanel() { return <PlushCatalog config={CONFIG}/>; }

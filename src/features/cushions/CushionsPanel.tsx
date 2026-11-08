import { CUSHION_CARDS, CUSHION_CATEGORIES, CUSHION_CATEGORY_LABEL, type CushionCategory } from '../../data/cushions';
import { PlushCatalog, type CatalogConfig } from '../toys/PlushCatalog';
import { cushionScene } from './CushionArt';

const CONFIG: CatalogConfig<CushionCategory> = {
  cards: CUSHION_CARDS, categories: CUSHION_CATEGORIES, categoryLabel: CUSHION_CATEGORY_LABEL,
  title: 'Cojines', titleId: 'cushions-title', className: 'toys-panel cushions-panel', scene: cushionScene,
  intro: 'Cojines con forma, de lactancia, pufs y sillones. Cada uno con su patrón a tamaño real para imprimir o proyectar sobre la tela, con margen, piquetes, abertura o cremallera, vivo y fuelle opcionales y costuras comprobadas.',
  note: 'Patrones revisados a partir de tus referencias: se respetan las medidas que cuadran y se corrigen las que no. Todo es experimental hasta coser una muestra. Ningún cojín va en la cuna de un bebé menor de 12 meses.',
  searchLabel: 'Buscar cojines', placeholder: 'Nube, pino, lactancia, puf…', groupLabel: 'Tipo de cojín', noun: ['cojín', 'cojines'],
  storagePrefix: 'hilvana-cojin-',
  sizes: {
    'cojin-pino': [35, 49, 60], 'cojin-hipocampo': [60, 80, 100], 'cojin-lactancia': [60, 70, 80], 'puf-conejo': [50, 60, 80], 'puf-pera-conejo': [34, 60, 80], 'cojin-sillon': [30, 45, 60],
    'cojin-pato': [30, 40, 55], 'cojin-arbol': [30, 35, 45], 'cojin-estrella': [22, 35, 50], 'cojin-conejo-redondo': [30, 35, 45], 'cojin-mariposa-volante': [50, 60, 70], 'cojin-abeja': [35, 45, 55],
    'cojin-manzana': [30, 40, 50], 'cojin-nube': [30, 43, 55], 'cojin-hongo': [35, 45, 55], 'cojin-bellota': [30, 40, 50], 'cojin-mariposa-alas': [45, 52, 65]
  }
};

export function CushionsPanel() { return <PlushCatalog config={CONFIG}/>; }

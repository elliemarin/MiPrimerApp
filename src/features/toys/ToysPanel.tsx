import { TOY_CARDS, TOY_CATEGORIES, TOY_CATEGORY_LABEL, type ToyCategory } from '../../data/toys';
import { PlushCatalog, type CatalogConfig } from './PlushCatalog';

const CONFIG: CatalogConfig<ToyCategory> = {
  cards: TOY_CARDS, categories: TOY_CATEGORIES, categoryLabel: TOY_CATEGORY_LABEL,
  title: 'Juguetes y peluches', titleId: 'toys-title', className: 'toys-panel',
  intro: 'Muñecas de trapo, animalitos con ropa, ositos, bichitos, peluches con volumen, casitas y casitas de muñecas portátiles con muebles que se abren. Elige el alto, descarga las piezas a tamaño real o proyéctalas sobre la tela, con margen, piquetes y costuras comprobadas.',
  note: 'Diseños propios de Hilvana inspirados en la construcción de juguetes clásicos. Todo es experimental: cose una prueba antes de la pieza definitiva. Para bebés, borda ojos y detalles.',
  searchLabel: 'Buscar juguetes', placeholder: 'Oso, conejo, casita, muñeca…', groupLabel: 'Tipo de juguete', noun: ['juguete', 'juguetes'],
  storagePrefix: 'hilvana-juguete-',
  sizes: { 'muneco-trapo': [25, 30, 40, 50], 'peluche-bichito': [16, 22, 30], 'fieltro-hada': [15, 20, 28], 'peluche-libelula': [35, 42, 60], 'peluche-conejo-3d': [26, 32, 45], 'peluche-plano': [27, 36, 45], 'peluche-oso-3d': [30, 40, 50], 'peluche-conejo-sentado': [25, 33, 45], 'peluche-casa-hongo': [20, 26, 35], 'fieltro-casa-gnomos': [15, 20, 30], 'casita-libro': [10, 12, 15], 'casita-bolsa': [10, 12, 15], 'casita-plegable': [10, 12, 15], 'casita-cubo': [10, 12, 15], 'casita-tapete': [10, 12, 15, 18], 'casita-paginas': [10, 12, 15] }
};

export function ToysPanel() { return <PlushCatalog config={CONFIG}/>; }

import type { CatalogModel } from './catalog';
import { findModel } from './catalog';
import type { Project } from '../store/types';
import type { PatternComponent, ComponentKind } from '../lib/pattern/components';
import type { DesignView } from '../features/studio/model';
import type { MaterialNeed } from '../lib/pattern/types';
import { uid } from '../lib/ids';

export type ComponentGroup = 'bolsillos' | 'cierres' | 'herramientas' | 'trabillas';

export interface ComponentOption {
  id: string;
  name: string;
  label: string;
  description: string;
  kind: ComponentKind;
  group: ComponentGroup;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth?: number;
  defaultQuantity?: number;
  hardware?: MaterialNeed[];
  /** Families are recommendations, never a claim of fit or load capacity. */
  families: CatalogModel['flat']['family'][];
}

type Definition = Omit<ComponentOption, 'label'>;
const clothes: ComponentOption['families'] = ['pantalon', 'top', 'falda', 'vestido', 'bebe'];
const useful: ComponentOption['families'] = ['pantalon', 'top', 'bolso', 'accesorio'];
const all: ComponentOption['families'] = [...clothes, 'bolso', 'accesorio'];
const definitions: Definition[] = [
  { id: 'parche-pequeno', name: 'Bolsillo pequeño', kind: 'bolsillo-parche', group: 'bolsillos', defaultWidth: 110, defaultHeight: 130, families: all, description: 'Aplicado y abierto, para detalles ligeros. Ancho y alto terminados ajustables.' },
  { id: 'parche-clasico', name: 'Bolsillo clásico', kind: 'bolsillo-parche', group: 'bolsillos', defaultWidth: 160, defaultHeight: 180, families: all, description: 'Rectangular con entrada superior doblada. Útil en chalecos, pantalones y bolsas.' },
  { id: 'parche-grande', name: 'Bolsillo grande', kind: 'bolsillo-parche', group: 'bolsillos', defaultWidth: 210, defaultHeight: 240, families: useful, description: 'Más espacio para un delantal, una chaqueta o un bolso. Comprueba que quepa sobre la base.' },
  { id: 'parche-pecho', name: 'Bolsillo de pecho', kind: 'bolsillo-parche', group: 'bolsillos', defaultWidth: 120, defaultHeight: 140, families: ['top', 'vestido'], description: 'Formato corto y estrecho para camisas, petos y chalecos.' },
  { id: 'punta-denim', name: 'Bolsillo en punta', kind: 'bolsillo-punta', group: 'bolsillos', defaultWidth: 150, defaultHeight: 170, families: ['pantalon', 'top', 'falda', 'vestido'], description: 'Base con punta central, como un bolsillo trasero de mezclilla.' },
  { id: 'redondeado', name: 'Bolsillo redondeado', kind: 'bolsillo-redondeado', group: 'bolsillos', defaultWidth: 150, defaultHeight: 170, families: all, description: 'Esquinas inferiores curvas. Frunce o hilvana el margen de la curva antes de planchar.' },
  { id: 'doble-delantal', name: 'Dos bolsillos de delantal', kind: 'bolsillo-parche', group: 'bolsillos', defaultWidth: 180, defaultHeight: 210, defaultQuantity: 2, families: ['accesorio', 'top', 'vestido'], description: 'Dos copias del mismo bolsillo. Colócalas sobre la prenda real antes de fijarlas.' },
  { id: 'solapa-boton', name: 'Bolsillo con botón', kind: 'bolsillo-solapa-boton', group: 'cierres', defaultWidth: 160, defaultHeight: 180, families: all, description: 'Bolsillo aplicado con solapa forrada y un botón. Incluye ojal y piezas de solapa.' },
  { id: 'solapa-grande', name: 'Solapa grande con botón', kind: 'bolsillo-solapa-boton', group: 'cierres', defaultWidth: 210, defaultHeight: 240, families: useful, description: 'Versión amplia para chaqueta o prenda de trabajo, con refuerzo de cierre.' },
  { id: 'velcro', name: 'Bolsillo con velcro', kind: 'bolsillo-solapa-velcro', group: 'cierres', defaultWidth: 170, defaultHeight: 200, families: all, description: 'Solapa de apertura rápida. El material y la posición se prueban primero sobre un retazo.' },
  { id: 'cierre-horizontal', name: 'Bolsillo con cierre', kind: 'bolsillo-cierre', group: 'cierres', defaultWidth: 180, defaultHeight: 150, families: all, description: 'Bolsillo aplicado forrado con cremallera superior. No requiere cortar una abertura en la base.' },
  { id: 'cierre-grande', name: 'Bolsillo amplio con cierre', kind: 'bolsillo-cierre', group: 'cierres', defaultWidth: 240, defaultHeight: 210, families: useful, description: 'Formato amplio con cremallera para bolso, chaqueta o delantal.' },
  { id: 'cargo', name: 'Bolsillo cargo', kind: 'bolsillo-cargo', group: 'bolsillos', defaultWidth: 180, defaultHeight: 220, defaultDepth: 35, families: ['pantalon', 'top', 'bolso', 'accesorio'], description: 'Con fuelle lateral e inferior y solapa. Incluye la tira de fuelle y sus uniones.' },
  { id: 'cargo-grande', name: 'Cargo de gran capacidad', kind: 'bolsillo-cargo', group: 'bolsillos', defaultWidth: 230, defaultHeight: 270, defaultDepth: 50, families: ['pantalon', 'bolso', 'accesorio'], description: 'Mayor ancho, alto y profundidad. Revisa movilidad, alcance de la mano y resistencia de la base.' },
  { id: 'cargo-compacto', name: 'Cargo compacto', kind: 'bolsillo-cargo', group: 'bolsillos', defaultWidth: 140, defaultHeight: 170, defaultDepth: 25, families: ['pantalon', 'top', 'bolso'], description: 'Fuelle corto para una intervención discreta. El volumen no se simula en la ilustración.' },
  { id: 'telefono', name: 'Bolsillo para teléfono', kind: 'bolsillo-solapa-velcro', group: 'herramientas', defaultWidth: 105, defaultHeight: 185, families: useful, description: 'Medidas iniciales orientativas. Mide el teléfono con su funda y añade espacio para sacarlo.' },
  { id: 'tres-herramientas', name: 'Organizador de herramientas', kind: 'porta-herramientas', group: 'herramientas', defaultWidth: 210, defaultHeight: 220, families: useful, description: 'Tres canales iguales de 7 cm antes de ajustes. Para herramientas pequeñas y ligeras.' },
  { id: 'lapices', name: 'Organizador para lápices', kind: 'porta-herramientas', group: 'herramientas', defaultWidth: 75, defaultHeight: 155, families: useful, description: 'Tres canales estrechos. Comprueba el diámetro del lápiz o marcador antes de coser divisiones.' },
  { id: 'reglas', name: 'Portarreglas y marcadores', kind: 'porta-herramientas', group: 'herramientas', defaultWidth: 120, defaultHeight: 240, families: useful, description: 'Tres canales alargados. Ajusta el alto para dejar una zona de agarre.' },
  { id: 'tijeras', name: 'Bolsillo para tijeras con funda', kind: 'bolsillo-punta', group: 'herramientas', defaultWidth: 110, defaultHeight: 200, families: useful, description: 'Usa las tijeras con protector de puntas y una base resistente. No sustituye una funda de seguridad.', hardware: [{ id: 'protector', label: 'Protector rígido de puntas para las tijeras', qty: '1 por cada copia del bolsillo', note: 'Comprueba el ajuste con las tijeras reales. El bolsillo textil no protege por sí solo de una punta cortante.' }] },
  { id: 'cinta-metrica', name: 'Bolsillo para cinta métrica', kind: 'bolsillo-solapa-velcro', group: 'herramientas', defaultWidth: 95, defaultHeight: 105, families: useful, description: 'Compartimento con solapa para una cinta blanda enrollada. Mide el rollo real.' },
  { id: 'herramienta-estrecha', name: 'Bolsillo para herramienta estrecha', kind: 'bolsillo-parche', group: 'herramientas', defaultWidth: 70, defaultHeight: 170, families: useful, description: 'Para una pieza ligera con su extremo protegido; verifica holgura y alcance de la mano.' },
  { id: 'trabilla-cinturon', name: 'Trabilla para cinturón', kind: 'trabilla', group: 'trabillas', defaultWidth: 20, defaultHeight: 75, defaultQuantity: 5, families: ['pantalon', 'falda', 'vestido', 'top'], description: 'Cinco tiras del mismo tamaño. El alto es el largo terminado antes de fijar los extremos.' },
  { id: 'trabilla-colgar', name: 'Presilla para colgar', kind: 'trabilla', group: 'trabillas', defaultWidth: 20, defaultHeight: 130, families: ['top', 'bolso', 'accesorio'], description: 'Tira doblada para colgar una prenda ligera. No es una sujeción de carga.' },
  { id: 'trabilla-herramienta', name: 'Aro para herramienta ligera', kind: 'trabilla', group: 'herramientas', defaultWidth: 35, defaultHeight: 180, families: useful, description: 'Forma un aro con la tira terminada. Prueba el objeto real y refuerza los anclajes; no admite carga certificada.' },
  { id: 'porta-martillo', name: 'Lazo portamartillo', kind: 'porta-martillo', group: 'herramientas', defaultWidth: 35, defaultHeight: 200, families: useful, description: 'Tira para formar un lazo y reforzar ambos anclajes. Prueba el diámetro del mango; no es una sujeción de carga certificada.' },
  { id: 'trabilla-argolla', name: 'Presilla para argolla', kind: 'trabilla', group: 'trabillas', defaultWidth: 25, defaultHeight: 90, families: ['bolso', 'accesorio', 'pantalon', 'top'], description: 'Ajusta el ancho al interior de la argolla. La argolla se compra aparte.', hardware: [{ id: 'argolla', label: 'Argolla para presilla', qty: '1 por cada copia de la presilla', note: 'El ancho interior debe admitir la tira terminada sin fruncirla.' }] }
];

/** Original, parametric add-ons. These are not licensed third-party patterns. */
export const COMPONENT_OPTIONS: readonly ComponentOption[] = definitions.map(option => ({ ...option, label: option.name }));
export const COMPONENT_PRESETS = COMPONENT_OPTIONS;
export type ComponentPreset = ComponentOption;

export function componentPresetsFor(model?: CatalogModel): ComponentOption[] {
  if (!model) return [...COMPONENT_OPTIONS];
  return COMPONENT_OPTIONS.filter(option => option.families.includes(model.flat.family));
}

export function optionsForProject(project: Pick<Project, 'modelId' | 'pattern'>): ComponentOption[] {
  const model = project.modelId ? findModel(project.modelId) : undefined;
  if (model) return componentPresetsFor(model);
  // Existing, non-catalogue projects still receive useful suggestions.
  const generator = project.pattern?.generatorId ?? '';
  const family = /pantalon/.test(generator) ? 'pantalon' : /falda|jumper/.test(generator) ? 'falda' : /chaqueta|top|poncho/.test(generator) ? 'top' : /bolsa|tote/.test(generator) ? 'bolso' : 'accesorio';
  return COMPONENT_OPTIONS.filter(option => option.families.includes(family));
}

export function createComponent(option: ComponentOption, id: string, view?: DesignView): PatternComponent {
  return {
    id, name: option.name, presetId: option.id, kind: option.kind, width: option.defaultWidth, height: option.defaultHeight,
    quantity: option.defaultQuantity ?? 1,
    ...(option.defaultDepth === undefined ? {} : { depth: option.defaultDepth }),
    allowance: 10,
    ...(option.hardware ? { materialNeeds: option.hardware.map(need => ({ ...need })) } : {}),
    ...(view ? { placement: { viewId: view.id, x: view.minX + view.width * .62, y: view.minY + view.height * .56, label: view.label } } : {})
  };
}

export function makeComponent(project: Project, presetId: string, targetViewId?: string): PatternComponent {
  const option = COMPONENT_OPTIONS.find(item => item.id === presetId);
  if (!option) throw new Error('No se encontró este complemento. Elige otro de la lista.');
  const views = project.design?.views ?? [];
  const view = views.find(item => item.id === targetViewId) ?? views.find(item => item.kind === 'frente' && item.source.type !== 'pieza') ?? views.find(item => item.source.type !== 'pieza');
  return createComponent(option, uid('complemento'), view);
}

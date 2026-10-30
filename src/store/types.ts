import type { MeasureValues } from '../lib/sizes/measurements';
import type { PersonKind } from '../lib/sizes/tables';
import type { PatternState } from '../lib/pattern/engine';
import type { FabricType, Fit } from '../lib/pattern/generator';
import type { DesignDoc } from '../features/studio/model';

export type ISO = string;

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: ISO;
  blob: Blob;
}

export interface MeasurementVersion {
  id: string;
  n: number;
  createdAt: ISO;
  label?: string;
  source: { type: 'tabla'; tableId: string; code: string } | { type: 'personalizada' };
  values: MeasureValues;
  approved: boolean;
  notes?: string;
}

export interface Profile {
  id: string;
  name: string;
  kind: PersonKind;
  birthDate?: string;
  notes?: string;
  fabric?: FabricType;
  fit?: Fit;
  versions: MeasurementVersion[];
  currentVersionId: string;
  createdAt: ISO;
  updatedAt: ISO;
}

export interface Fabric {
  id: string;
  name: string;
  kind: FabricType;
  composition: string;
  widthMm?: number;
  quantityMm?: number;
  stretchH?: number;
  stretchV?: number;
  color: string;
  photo?: {
    originalFileId: string;
    processedFileId?: string;
    /** Esquinas (fracción 0–1 de la foto original) para recorte y perspectiva. */
    corners?: [number, number][];
    adjust: { brightness: number; contrast: number; saturation: number; warmth: number };
    /** Tamaño en píxeles de la muestra procesada. */
    pxW?: number;
    pxH?: number;
  };
  /** Si existe, la muestra está calibrada físicamente. */
  calibration?: { mmPerPx: number; refMm: number };
  /** Tamaño visual para texturas sin calibrar (mm por repetición). */
  visualRepeatMm: number;
  /** Ángulo del hilo (urdimbre) en la muestra, en grados (0 = vertical). */
  grainAngle: number;
  nap: 'sin-pelo' | 'con-pelo';
  napDirection?: 'arriba' | 'abajo';
  notes?: string;
  createdAt: ISO;
  updatedAt: ISO;
}

export type MaterialCategory = 'hilo' | 'boton' | 'cierre' | 'elastico' | 'entretela' | 'estabilizador' | 'cinta' | 'otro';

export interface Material {
  id: string;
  category: MaterialCategory;
  name: string;
  quantity: number;
  unit: 'unidades' | 'm' | 'cm' | 'carretes' | 'g';
  color?: string;
  notes?: string;
  createdAt: ISO;
  updatedAt: ISO;
}

export type ProjectStatus = 'idea' | 'diseno' | 'patronaje' | 'corte' | 'confeccion' | 'terminado';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: 'Idea',
  diseno: 'Diseño',
  patronaje: 'Patronaje',
  corte: 'Corte',
  confeccion: 'Confección',
  terminado: 'Terminado'
};

export type ViewKind = 'frente' | 'espalda' | 'costado-izq' | 'costado-der' | 'detalle' | 'sin-identificar';

export const VIEW_LABEL: Record<ViewKind, string> = {
  frente: 'Frente',
  espalda: 'Espalda',
  'costado-izq': 'Costado izquierdo',
  'costado-der': 'Costado derecho',
  detalle: 'Detalle',
  'sin-identificar': 'Vista sin identificar'
};

export type ReferenceKind = 'foto-prenda' | 'patron' | 'boceto' | 'inspiracion';

export const REFERENCE_KIND_LABEL: Record<ReferenceKind, string> = {
  'foto-prenda': 'Foto de prenda',
  patron: 'Patrón existente',
  boceto: 'Boceto o dibujo técnico',
  inspiracion: 'Inspiración'
};

export type License = 'propia' | 'con-permiso' | 'licencia-libre' | 'desconocida';

export const LICENSE_LABEL: Record<License, string> = {
  propia: 'Foto propia',
  'con-permiso': 'Con permiso de uso',
  'licencia-libre': 'Licencia libre',
  desconocida: 'Permiso sin confirmar'
};

export interface Reference {
  id: string;
  /** Imagen de trabajo (en PDF, la página convertida a imagen). */
  fileId: string;
  /** Archivo original cuando difiere de la imagen de trabajo (p. ej. el PDF). */
  sourceFileId?: string;
  page?: number;
  name: string;
  kind: ReferenceKind;
  view: ViewKind;
  license: License;
  notes?: string;
  /** Imagen con perspectiva corregida y su tamaño físico. */
  corrected?: { fileId: string; wMm: number; hMm: number; corners: [number, number][] };
  /** Escala de la imagen: milímetros por píxel. */
  mmPerPx?: number;
  /** Datos de prenda: medidas conocidas y detalles por confirmar. */
  garment?: { known: Record<string, number>; pending: string[]; notes?: string };
}

export interface VersionRecord<T> {
  id: string;
  n: number;
  createdAt: ISO;
  label: string;
  approved: boolean;
  hash: string;
  data: T;
}

export type ExportKind = 'pdf-confeccion' | 'pdf-patron' | 'pdf-plantillas' | 'svg-bordado' | 'dst-bordado' | 'zip' | 'pdf-resumen' | 'svg-diseno';

export const EXPORT_KIND_LABEL: Record<ExportKind, string> = {
  'pdf-confeccion': 'PDF de confección e intervención',
  'pdf-patron': 'Patrón PDF carta',
  'pdf-plantillas': 'Plantillas de aplicaciones',
  'svg-bordado': 'Dibujo de bordado (SVG)',
  'dst-bordado': 'Archivo de puntadas DST (experimental)',
  zip: 'Proyecto completo (ZIP)',
  'pdf-resumen': 'Ficha del proyecto (PDF)',
  'svg-diseno': 'Diseño (SVG)'
};

export interface ExportDeps {
  measurement?: { profileId: string; versionId: string; n: number; profileName: string };
  pattern?: { versionId: string; n: number; hash: string };
  design?: { versionId: string; n: number; hash: string };
}

export interface ExportRecord {
  id: string;
  kind: ExportKind;
  createdAt: ISO;
  fileId: string;
  fileName: string;
  settings: unknown;
  deps: ExportDeps;
  appVersion: string;
}

export interface ProgressNote {
  id: string;
  createdAt: ISO;
  text: string;
  photoFileIds: string[];
}

export type ProjectOrigin = 'catalogo' | 'base' | 'patron-imagen' | 'fotos' | 'boceto' | 'intervencion';

export const ORIGIN_LABEL: Record<ProjectOrigin, string> = {
  catalogo: 'Modelo del catálogo',
  base: 'Patrón base paramétrico',
  'patron-imagen': 'Patrón existente (imagen o PDF)',
  fotos: 'Fotografías de una prenda',
  boceto: 'Boceto o dibujo técnico',
  intervencion: 'Intervenir una prenda existente'
};

export interface MaterialUse {
  id: string;
  materialId?: string;
  label: string;
  qty: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  archived: boolean;
  createdAt: ISO;
  updatedAt: ISO;
  origin: ProjectOrigin;
  modelId?: string;
  references: Reference[];
  profileRef?: { profileId: string; versionId: string };
  /** Tejido y ajuste deseados para el patrón. */
  fabricType: FabricType;
  stretch: number;
  fit: Fit;
  pattern?: PatternState;
  patternVersions: VersionRecord<PatternState>[];
  design?: DesignDoc;
  designVersions: VersionRecord<DesignDoc>[];
  fabricIds: string[];
  materialUses: MaterialUse[];
  guide: { checks: Record<string, boolean>; notes: Record<string, string> };
  notes: ProgressNote[];
  exports: ExportRecord[];
  changeLog: { at: ISO; text: string }[];
  /** Análisis de una prenda a partir de fotos: lo visto, lo medido y lo pendiente. */
  analysis?: GarmentAnalysis;
}

export type GarmentKind = 'pantalon' | 'falda' | 'bolsa' | 'otra';
export type DetailState = 'visto' | 'no' | 'confirmar';

export interface GarmentAnalysis {
  kind: GarmentKind;
  details: Record<string, DetailState>;
  /** Medidas de la prenda terminada (mm) tomadas sobre la prenda real. */
  measures: Record<string, number>;
  /** Medidas de la persona que no se pueden obtener de la prenda. */
  person: Record<string, number>;
  notes?: string;
}

export interface Settings {
  unit: 'cm' | 'in';
  /** Píxeles CSS por milímetro calibrados para ver a escala real en pantalla. */
  screenPxPerMm?: number;
  tile: { margin: number; overlap: number; orientation: 'vertical' | 'horizontal' };
  sync?: { owner: string; repo: string; branch: string; token: string; lastSync?: ISO; shas: Record<string, string> };
  /** Fotos de referencia que agrega la persona a los modelos, con su permiso de uso. */
  modelPhotos?: Record<string, { fileId: string; license: License; credit?: string }[]>;
  theme?: 'auto' | 'light' | 'dark';
}

export type EntityKind = 'project' | 'profile' | 'fabric' | 'material';

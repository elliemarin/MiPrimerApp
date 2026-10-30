import type { CatalogModel } from './catalog';
import type { FabricType } from '../lib/pattern/generator';
import type { MaterialCategory } from '../store/types';

export type FabricFamily = 'cotidiano' | 'punto' | 'estructurado' | 'delicado' | 'abrigo' | 'especial';
export const FABRIC_FAMILY_LABEL: Record<FabricFamily, string> = {
  cotidiano: 'Algodones y lino', punto: 'Punto y elásticos', estructurado: 'Resistentes y sastrería',
  delicado: 'Ligeros y fiesta', abrigo: 'Abrigo y texturas', especial: 'Técnicos y aplicaciones'
};
export type SwatchMotif = 'tejido' | 'rayas' | 'cuadros' | 'lunares' | 'flores' | 'espiga';
export const SWATCH_MOTIF_LABEL: Record<SwatchMotif, string> = { tejido: 'Liso con trama', rayas: 'Rayas', cuadros: 'Cuadros', lunares: 'Lunares', flores: 'Flores', espiga: 'Espiga' };
export interface LibraryFabric {
  id: string;
  name: string;
  aliases: string[];
  family: FabricFamily;
  kind: FabricType;
  composition: string;
  /** Rangos orientativos; un tejido real depende del fabricante. */
  weight: [number, number];
  stretch: [number, number];
  drape: 'fluida' | 'media' | 'firme';
  needle: string;
  care: string;
  uses: string[];
  avoid: string;
  color: string;
  motif: SwatchMotif;
  nap?: boolean;
}

type FabricRow = [id: string, name: string, composition: string, weight: [number, number], stretch: [number, number], drape: LibraryFabric['drape'], needle: string, uses: string[], avoid: string, color: string, aliases?: string[]];
function group(family: FabricFamily, kind: FabricType, care: string, rows: FabricRow[]): LibraryFabric[] {
  return rows.map(([id, name, composition, weight, stretch, drape, needle, uses, avoid, color, aliases = []]) => ({ id, name, aliases, family, kind, composition, weight, stretch, drape, needle, uses, avoid, color, motif: id.includes('espiga') ? 'espiga' : id.includes('vichy') ? 'cuadros' : 'tejido', care }));
}

/** Referencias textiles editoriales propias, sin fotografías o catálogos de terceros. */
export const FABRIC_LIBRARY: LibraryFabric[] = [
  ...group('cotidiano', 'plano', 'Prelavar según etiqueta; planchar probando primero en un retazo.', [
    ['popelina', 'Popelina de algodón', 'Algodón', [90, 150], [0, 3], 'media', 'Universal 70–80', ['camisa', 'blusa', 'vestido', 'pijama', 'bebé', 'aplicación'], 'No sustituye al jersey en prendas ajustadas.', '#9ebfbb', ['popelín']],
    ['quilting', 'Algodón para patchwork', 'Algodón', [120, 170], [0, 3], 'firme', 'Universal 75–80', ['collage', 'bordado', 'aplicación', 'cojín', 'bolsa', 'funda', 'babero'], 'Poca caída para blusas vaporosas.', '#d1a4a1', ['algodón estampado', 'quilting cotton', 'retazos']],
    ['batista', 'Batista', 'Algodón o mezcla de lino', [60, 100], [0, 3], 'fluida', 'Microtex 60–70', ['blusa', 'bebé', 'camisa', 'forro'], 'Puede transparentar; probar forro.', '#eadbc5'],
    ['voile', 'Voile', 'Algodón o viscosa', [50, 90], [0, 3], 'fluida', 'Microtex 60–70', ['blusa', 'vestido', 'falda'], 'Transparente; no es tela estructural.', '#c4d7d2'],
    ['oxford', 'Oxford', 'Algodón o algodón/poliéster', [130, 200], [0, 3], 'media', 'Universal 80', ['camisa', 'bolsillo', 'vestido'], 'Menos fluido que la viscosa.', '#a3b7ce'],
    ['chambray', 'Chambray', 'Algodón', [110, 180], [0, 3], 'media', 'Universal 75–80', ['camisa', 'vestido', 'pantalón', 'short'], 'No confundir con mezclilla gruesa.', '#7894ad'],
    ['lino', 'Lino de confección', 'Lino o mezcla lino/viscosa', [140, 240], [0, 3], 'media', 'Universal 80–90', ['pantalón', 'falda', 'vestido', 'camisa', 'tote', 'cojín', 'bordado'], 'Arruga y deshilacha; rematar bordes.', '#c3b398'],
    ['doble-gasa', 'Doble gasa de algodón', 'Algodón', [110, 160], [0, 5], 'fluida', 'Universal 70–80', ['bebé', 'blusa', 'vestido', 'babero', 'bandana'], 'Se deforma al cortar; no estirar al coser.', '#cdb3a0', ['muselina']],
    ['vichy', 'Vichy', 'Algodón o algodón/poliéster', [100, 160], [0, 3], 'media', 'Universal 75–80', ['camisa', 'vestido', 'pijama', 'funda', 'aplicación'], 'Casar los cuadros consume más tela.', '#a85d62'],
    ['percal', 'Percal', 'Algodón', [110, 180], [0, 3], 'media', 'Universal 80', ['cojín', 'funda', 'hogar', 'bolsa'], 'Para prendas comprobar suavidad y caída.', '#c1cba8'],
    ['manta', 'Manta de algodón', 'Algodón crudo', [130, 230], [0, 3], 'firme', 'Universal 80–90', ['tote', 'bordado', 'prueba', 'cojín', 'aplicación'], 'Prelavar; puede encoger notablemente.', '#ddd1b7', ['glasilla', 'toile']],
    ['seersucker', 'Seersucker', 'Algodón', [100, 170], [0, 5], 'media', 'Universal 75–80', ['camisa', 'short', 'vestido', 'bebé'], 'No aplastar el relieve con la plancha.', '#b4c7c5']
  ]),
  ...group('punto', 'punto', 'Prelavar según etiqueta; secar sin estirar. Medir elasticidad y recuperación reales.', [
    ['jersey-algodon', 'Jersey de algodón', 'Algodón con o sin elastano', [140, 220], [20, 50], 'fluida', 'Jersey / punta de bola 70–80', ['camiseta', 'body', 'bebé', 'pijama', 'gorro'], 'Verificar recuperación para cuellos y puños.', '#a7b9a0'],
    ['interlock', 'Interlock', 'Algodón o mezcla', [180, 260], [20, 40], 'media', 'Jersey 75–80', ['body', 'bebé', 'camiseta', 'pijama', 'gorro'], 'Más grueso y estable que jersey sencillo.', '#d2b7b1'],
    ['rib', 'Rib acanalado', 'Algodón/elastano', [180, 300], [50, 100], 'media', 'Stretch 75–90', ['puño', 'cuello', 'gorro', 'bebé', 'camiseta'], 'El largo de banda depende de la recuperación real.', '#b59490', ['resorte', 'canalé']],
    ['french-terry', 'French terry', 'Algodón o mezcla', [220, 320], [15, 35], 'media', 'Jersey 80–90', ['sudadera', 'hoodie', 'jogger', 'pantalón', 'short'], 'Rizo interior; no equivale a toalla absorbente.', '#93a59f'],
    ['felpa', 'Felpa perchada', 'Algodón/poliéster', [250, 360], [15, 35], 'media', 'Jersey 80–90', ['sudadera', 'hoodie', 'jogger', 'pijama'], 'Cortar todas las piezas en el mismo sentido.', '#a6a3b4'],
    ['pique', 'Piqué de punto', 'Algodón o mezcla', [170, 240], [15, 30], 'media', 'Jersey 75–80', ['polo', 'camiseta', 'vestido', 'bebé'], 'No sustituye rib para bandas elásticas.', '#d5c18b'],
    ['punto-roma', 'Punto Roma', 'Viscosa/poliamida/elastano', [250, 380], [20, 40], 'firme', 'Stretch 80–90', ['pantalón', 'falda', 'vestido', 'chaqueta'], 'La holgura negativa exige prueba.', '#556270', ['ponte']],
    ['lycra', 'Punto para deporte', 'Poliamida o poliéster con elastano', [180, 260], [50, 100], 'media', 'Stretch 75–90', ['legging', 'deporte', 'baño', 'top'], 'Probar opacidad, recuperación y resistencia al uso.', '#4c8094', ['lycra', 'licra', 'spandex']],
    ['jersey-viscosa', 'Jersey de viscosa', 'Viscosa/elastano', [160, 240], [30, 60], 'fluida', 'Stretch 70–80', ['camiseta', 'vestido', 'falda', 'blusa'], 'Se descuelga; dejar reposar antes del bajo.', '#b47882'],
    ['malla-elastica', 'Malla elástica', 'Poliamida/elastano', [70, 150], [40, 80], 'fluida', 'Stretch 65–75', ['deporte', 'inserto', 'forro', 'top'], 'Transparente; necesita base según uso.', '#89807c'],
    ['bambu-punto', 'Punto de viscosa de bambú', 'Viscosa de bambú/elastano', [180, 240], [30, 60], 'fluida', 'Jersey 70–80', ['bebé', 'body', 'pijama', 'camiseta'], 'El origen no garantiza certificación o tratamiento.', '#c5bfad'],
    ['scuba', 'Scuba de punto', 'Poliéster/elastano', [250, 400], [20, 40], 'firme', 'Stretch 80–90', ['falda', 'vestido', 'chaqueta', 'funda'], 'Es punto doble, no neopreno aislante.', '#a3b4c6']
  ]),
  ...group('estructurado', 'plano', 'Comprobar encogimiento y plancha en retazo; seguir la etiqueta.', [
    ['denim', 'Mezclilla rígida', 'Algodón', [280, 420], [0, 3], 'firme', 'Jeans 90–110', ['pantalón', 'jeans', 'short', 'chaqueta', 'tote', 'remiendo', 'aplicación'], 'Aguja e hilo deben admitir el grosor de las capas.', '#435d7c', ['denim', 'vaquero']],
    ['denim-stretch', 'Mezclilla stretch', 'Algodón/elastano', [240, 350], [10, 25], 'firme', 'Jeans / stretch 90', ['pantalón', 'jeans', 'short', 'falda'], 'No sustituye al punto de alta elasticidad.', '#5a6d85', ['denim elástico']],
    ['gabardina', 'Gabardina', 'Algodón, lana o mezcla', [200, 300], [0, 5], 'firme', 'Universal 80–100', ['pantalón', 'short', 'falda', 'chaqueta', 'abrigo'], 'La composición cambia su cuidado y caída.', '#b3a98e', ['sarga']],
    ['lona', 'Lona', 'Algodón o mezcla', [280, 450], [0, 3], 'firme', 'Jeans 90–110', ['tote', 'bolsa', 'funda', 'cojín', 'parche'], 'Evitar acumulaciones de capas en asas.', '#a99772', ['canvas']],
    ['loneta', 'Loneta', 'Algodón/poliéster', [180, 280], [0, 3], 'firme', 'Universal 90', ['tote', 'bolsa', 'cojín', 'funda', 'aplicación'], 'Probar la impresión con calor antes de planchar.', '#9fbaac'],
    ['sarga-ligera', 'Sarga ligera', 'Algodón', [150, 230], [0, 3], 'media', 'Universal 80–90', ['pantalón', 'short', 'camisa', 'falda'], 'Menos resistente que lona para cargas altas.', '#be9b8c'],
    ['sastreria', 'Tela de sastrería', 'Lana o mezcla lana/poliéster', [180, 280], [0, 5], 'media', 'Universal 80–90', ['pantalón', 'falda', 'chaleco', 'chaqueta'], 'Usar paño de plancha y probar brillo.', '#787e7d'],
    ['espiga', 'Espiga de lana', 'Lana o mezcla', [220, 340], [0, 5], 'media', 'Universal 80–90', ['pantalón', 'chaleco', 'chaqueta', 'abrigo'], 'Casar la dirección de la espiga.', '#969189']
  ]),
  ...group('delicado', 'plano', 'Lavar y planchar solo según composición; usar aguja fina y probar arrastre.', [
    ['viscosa', 'Viscosa tejida', 'Viscosa', [90, 160], [0, 3], 'fluida', 'Microtex 60–70', ['blusa', 'vestido', 'falda', 'pantalón', 'pijama'], 'Prelavar y estabilizar; cede al bies.', '#9b7a9e', ['rayón']],
    ['crepe', 'Crepé', 'Viscosa, seda o poliéster', [120, 220], [0, 5], 'fluida', 'Microtex 70–80', ['blusa', 'vestido', 'falda', 'pantalón'], 'Comprobar transparencia y acabado.', '#ba888f'],
    ['saten', 'Satén', 'Seda o poliéster', [80, 160], [0, 3], 'fluida', 'Microtex 60–70', ['vestido', 'falda', 'pijama', 'scrunchie', 'forro'], 'Resbala y marca pinchazos; usar alfileres finos.', '#b395aa', ['satín']],
    ['gasa', 'Gasa de vestir', 'Poliéster o seda', [30, 70], [0, 3], 'fluida', 'Microtex 60', ['blusa', 'vestido', 'falda', 'capa'], 'Transparente; requiere forro o superposición.', '#c4c9d6', ['chiffon']],
    ['organza', 'Organza', 'Seda o poliéster', [30, 80], [0, 3], 'firme', 'Microtex 60–70', ['vestido', 'lazo', 'aplicación', 'inserto'], 'Puede raspar; rematar bordes.', '#d0beab'],
    ['tul', 'Tul sin elasticidad', 'Poliamida o poliéster', [15, 60], [0, 5], 'media', 'Universal fina 60–70', ['falda', 'vestido', 'aplicación', 'bordado'], 'Bordar con estabilizador; no es base resistente.', '#c3bdcd'],
    ['encaje', 'Encaje tejido', 'Algodón, poliamida o mezcla', [80, 200], [0, 5], 'media', 'Microtex 65–75', ['blusa', 'vestido', 'inserto', 'aplicación'], 'La trama abierta necesita soporte en uniones.', '#c6ab9f'],
    ['tafetan', 'Tafetán', 'Seda o poliéster', [70, 150], [0, 3], 'firme', 'Microtex 70–80', ['falda', 'vestido', 'lazo', 'neceser'], 'Se marca y deshilacha; planchar con precaución.', '#a28fa8']
  ]),
  ...group('abrigo', 'plano', 'Respetar pelo y dirección; probar el cuidado indicado por el fabricante.', [
    ['pana', 'Pana', 'Algodón o mezcla', [220, 380], [0, 5], 'firme', 'Universal / jeans 90', ['pantalón', 'falda', 'chaqueta', 'bolsa'], 'Cortar con el pelo orientado igual.', '#9d8169'],
    ['terciopelo', 'Terciopelo tejido', 'Viscosa, seda o poliéster', [160, 280], [0, 5], 'fluida', 'Microtex 70–80', ['vestido', 'chaqueta', 'bolsa', 'scrunchie'], 'No aplastar el pelo con la plancha.', '#6b5e7d'],
    ['pano', 'Paño de lana', 'Lana o mezcla', [300, 500], [0, 5], 'firme', 'Universal 90–100', ['abrigo', 'chaleco', 'chaqueta', 'bolsa'], 'Valorar grueso de costuras y entretela.', '#8b968d', ['paño']],
    ['franela', 'Franela de algodón', 'Algodón', [140, 220], [0, 3], 'media', 'Universal 80', ['pijama', 'camisa', 'bebé', 'funda'], 'Prelavar; el pelo puede cambiar con lavados.', '#a4a1b3'],
    ['boucle', 'Bouclé', 'Lana, acrílico o mezcla', [250, 420], [0, 10], 'media', 'Universal 90', ['chaqueta', 'abrigo', 'cojín', 'bolsa'], 'Trama suelta: estabilizar uniones.', '#b9ad9d'],
    ['acolchado', 'Acolchado textil', 'Exterior tejido y guata', [180, 350], [0, 3], 'firme', 'Universal / quilting 90', ['chaleco', 'chaqueta', 'funda', 'bolsa'], 'Las capas reducen el espacio interior.', '#9bada7']
  ]),
  ...group('especial', 'plano', 'Probar aguja, adhesivos y temperatura en un sobrante; seguir ficha del proveedor.', [
    ['fieltro', 'Fieltro para aplicaciones', 'Lana o poliéster (no tejido)', [180, 350], [0, 5], 'firme', 'Universal 80–90', ['parche', 'aplicación', 'collage', 'bordado', 'figura'], 'No tejido: la clasificación plano aquí indica baja elasticidad.', '#bb8d7c'],
    ['neopreno', 'Neopreno laminado', 'Espuma elastomérica y tejido', [250, 500], [10, 25], 'firme', 'Stretch 90', ['funda', 'cheve', 'lata', 'botella', 'accesorio'], 'No planchar directamente; comprobar espesor admitido.', '#6a8990'],
    ['corcho', 'Tejido de corcho', 'Corcho sobre soporte textil', [200, 350], [0, 3], 'firme', 'Microtex 80–90', ['bolsa', 'monedero', 'funda', 'aplicación'], 'Los pinchazos quedan; usar pinzas.', '#b99b70'],
    ['laminado', 'Algodón laminado', 'Algodón con recubrimiento', [160, 260], [0, 3], 'firme', 'Microtex 80–90', ['neceser', 'funda', 'bolsa', 'babero'], 'No implica seguridad alimentaria; revisar certificado.', '#9db9b4'],
    ['ripstop', 'Ripstop', 'Poliamida o poliéster', [60, 150], [0, 3], 'media', 'Microtex 70–80', ['bolsa', 'funda', 'chaqueta', 'accesorio'], 'Impermeabilidad y resistencia dependen del acabado.', '#899e80'],
    ['toalla', 'Toalla de rizo', 'Algodón', [300, 500], [0, 5], 'firme', 'Universal 90–100', ['babero', 'bebé', 'hogar', 'funda'], 'Probar las capas y limpiar pelusa de la máquina.', '#c4c7b4'],
    ['forro', 'Forro de confección', 'Acetato, viscosa o poliéster', [50, 100], [0, 3], 'fluida', 'Microtex 60–70', ['forro', 'bolsa', 'chaqueta', 'falda', 'vestido'], 'Para prendas de punto, elegir forro elástico compatible.', '#ad9aaa'],
    ['tela-bordado', 'Lino de bordado', 'Lino o algodón de trama regular', [140, 220], [0, 3], 'firme', 'Bordado 75–90', ['bordado', 'parche', 'aplicación', 'cojín'], 'Elegir estabilizador y densidad según el bordado.', '#d4c7ae']
  ])
].map((f) => ({ ...f, nap: ['pana', 'terciopelo', 'felpa', 'franela'].includes(f.id) }));

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function searchLibraryFabric(f: LibraryFabric, query: string): boolean {
  const hay = norm([f.name, ...f.aliases, f.composition, ...f.uses, FABRIC_FAMILY_LABEL[f.family]].join(' '));
  return norm(query).trim().split(/\s+/).every((s) => hay.includes(s));
}
export interface FabricRecommendation { fabric: LibraryFabric; reason: string; score: number }
/** Prioriza compatibilidad real de tejido/elasticidad antes de las etiquetas del proyecto. */
export function recommendFabrics(model?: CatalogModel, fabricType?: FabricType, stretch?: number): FabricRecommendation[] {
  if (!model && !fabricType) return [];
  const kinds = fabricType ? [fabricType] : model!.fabrics;
  const needed = stretch ?? ({ ninguna: 0, baja: 10, media: 25, alta: 50 }[model?.stretch ?? 'ninguna']);
  const names = (model?.recommendedFabrics ?? []).map(norm);
  const projectText = norm(`${model?.name ?? ''} ${model?.sub ?? ''} ${model?.description ?? ''} ${(model?.techniques ?? []).join(' ')}`);
  return FABRIC_LIBRARY.filter((f) => kinds.includes(f.kind) && f.stretch[1] >= needed).map((f) => {
    const preferred = names.some((n) => [f.name, ...f.aliases].some((a) => norm(a).includes(n) || n.includes(norm(a))));
    const uses = f.uses.filter((u) => projectText.includes(norm(u)));
    const score = (preferred ? 30 : 0) + uses.length * 8 + (needed >= f.stretch[0] ? 2 : 0);
    return { fabric: f, score, reason: preferred ? 'Entre las telas sugeridas para este modelo.' : uses.length ? `Adecuada para ${uses.slice(0, 2).join(' y ')}.` : `Tejido ${f.kind} compatible; verifica caída y elasticidad.` };
  }).filter((r) => r.score > 2).sort((a, b) => b.score - a.score || a.fabric.name.localeCompare(b.fabric.name));
}

/** Tramas vectoriales propias. Son ilustraciones, no escaneos físicos calibrados. */
export function swatchSvg(fabric: LibraryFabric, color = fabric.color, motif: SwatchMotif = fabric.motif): string {
  const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : fabric.color;
  const trama = fabric.family === 'punto'
    ? '<path d="M2 0 Q14 8 2 16 M18 0 Q6 8 18 16" fill="none" stroke="white" stroke-opacity=".12" stroke-width="1.4"/>'
    : '<path d="M0 2H16 M0 10H16 M2 0V16 M10 0V16" stroke="white" stroke-opacity=".12" stroke-width="1"/>';
  const decoration: Record<SwatchMotif, string> = {
    tejido: '',
    rayas: '<path d="M0 0V64 M32 0V64" stroke="white" stroke-opacity=".48" stroke-width="12"/>',
    cuadros: '<path d="M16 0V64 M48 0V64 M0 16H64 M0 48H64" stroke="white" stroke-opacity=".3" stroke-width="16"/>',
    lunares: '<g fill="white" fill-opacity=".7"><circle cx="16" cy="16" r="5"/><circle cx="48" cy="48" r="5"/></g>',
    flores: '<g fill="white" fill-opacity=".65"><path d="M16 8C8 0 0 10 10 16C0 22 8 32 16 24C24 32 32 22 22 16C32 10 24 0 16 8Z"/><path d="M48 40C40 32 32 42 42 48C32 54 40 64 48 56C56 64 64 54 54 48C64 42 56 32 48 40Z"/></g>',
    espiga: '<path d="M0 0L16 16L32 0 M0 16L16 32L32 16 M0 32L16 48L32 32 M0 48L16 64L32 48 M32 0L48 16L64 0 M32 16L48 32L64 16 M32 32L48 48L64 32 M32 48L48 64L64 48" fill="none" stroke="white" stroke-opacity=".3" stroke-width="3"/>'
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><pattern id="trama" width="16" height="16" patternUnits="userSpaceOnUse">${trama}</pattern><pattern id="motivo" width="64" height="64" patternUnits="userSpaceOnUse">${decoration[motif]}</pattern></defs><path fill="${safeColor}" d="M0 0H256V256H0Z"/><path fill="url(#trama)" d="M0 0H256V256H0Z"/><path fill="url(#motivo)" d="M0 0H256V256H0Z"/></svg>`;
}
export function swatchUrl(f: LibraryFabric, color = f.color, motif: SwatchMotif = f.motif) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(swatchSvg(f, color, motif))}`;
}

export interface LibraryMaterial { id: string; name: string; category: MaterialCategory; use: string }
export const MATERIAL_LIBRARY: LibraryMaterial[] = [
  ['hilo-universal', 'Hilo de poliéster universal', 'hilo', 'Costura general; ajustar aguja y tensión en un retazo.'],
  ['hilo-algodon', 'Hilo de algodón', 'hilo', 'Patchwork y tejidos de algodón.'],
  ['hilo-bordado', 'Hilo de bordado 40 wt', 'hilo', 'Bordado; comprobar la aguja y estabilizador.'],
  ['hilo-torcido', 'Hilo grueso para pespuntes', 'hilo', 'Pespuntes decorativos; verificar grosor admitido por la máquina.'],
  ['hilo-sashiko', 'Hilo para sashiko manual', 'hilo', 'Remiendo visible y puntadas a mano.'],
  ['hilo-canilla', 'Hilo fino de canilla para bordado', 'hilo', 'Solo si lo admite el fabricante de la máquina.'],
  ['boton-plano', 'Botón plano de dos agujeros', 'boton', 'Camisas, cojines y accesorios.'],
  ['boton-cuatro', 'Botón de cuatro agujeros', 'boton', 'Pantalones, chaquetas y camisas.'],
  ['boton-forrado', 'Botón para forrar', 'boton', 'Acabado coordinado con la tela.'],
  ['broche-presion', 'Broche de presión', 'boton', 'Bodies y baberos; comprobar fijación y grosor.'],
  ['cierre-invisible', 'Cierre invisible', 'cierre', 'Faldas y vestidos; prensatelas específico.'],
  ['cierre-espiral', 'Cierre de espiral', 'cierre', 'Neceseres, cojines y bolsas.'],
  ['cierre-separable', 'Cierre separable', 'cierre', 'Chaquetas y sudaderas.'],
  ['elastico-cintura', 'Elástico tejido para cintura', 'elastico', 'Pantalones y faldas con jareta; probar recuperación.'],
  ['elastico-suave', 'Elástico suave para bebé', 'elastico', 'Jaretas suaves; no ajustar por edad solamente.'],
  ['elastico-scrunchie', 'Elástico para scrunchie', 'elastico', 'Coleteros; ajustar largo a la muñeca o al cabello.'],
  ['entretela-tejida', 'Entretela termoadhesiva tejida', 'entretela', 'Cuellos, puños, pretinas y refuerzo de bolsas.'],
  ['entretela-punto', 'Entretela de punto', 'entretela', 'Estabilizar conservando cierta elasticidad.'],
  ['entretela-doble', 'Adhesivo de doble cara para aplicaciones', 'entretela', 'Fijación temporal; coser el contorno según instrucciones.'],
  ['guata', 'Guata para acolchado', 'entretela', 'Volumen de fundas, acolchados y accesorios.'],
  ['estabilizador-corte', 'Estabilizador recortable', 'estabilizador', 'Bordado sobre punto o telas que ceden.'],
  ['estabilizador-rasgado', 'Estabilizador rasgable', 'estabilizador', 'Bordado ligero sobre tejido estable.'],
  ['estabilizador-agua', 'Estabilizador hidrosoluble', 'estabilizador', 'Cubierta de rizo y trabajos que admiten lavado.'],
  ['bies', 'Cinta al bies', 'cinta', 'Rematar curvas de baberos, escotes y aplicaciones.'],
  ['cinta-mochila', 'Cinta para asas', 'cinta', 'Asas de tote y correas; verificar carga y anclajes.'],
  ['encaje-cinta', 'Encaje en cinta', 'cinta', 'Bajos, cuellos y adornos.'],
  ['velcro', 'Cinta de gancho y bucle', 'cinta', 'Cierre ajustable para fundas y accesorios.'],
  ['cordon', 'Cordón textil', 'cinta', 'Bolsas y accesorios; evitar cordones sueltos en bebé.'],
  ['anilla', 'Anillas y regulador', 'otro', 'Correas de bandolera; casar ancho con la cinta.'],
  ['alfileres', 'Pinzas de confección', 'otro', 'Sujetar laminados, corcho y capas sin pinchar.']
].map(([id, name, category, use]) => ({ id, name, category: category as MaterialCategory, use }));

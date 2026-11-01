import { createServer } from 'vite';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Inventario local y reproducible. No descarga imágenes ni lee proyectos privados.
// Ejecutar: node scripts/audit-catalog-photos.mjs
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'docs/auditoria/fotos-catalogo.csv');
const server = await createServer({ root, server: { middlewareMode: true }, logLevel: 'error' });

try {
  const { CATALOG, RECIPIENT_LABEL } = await server.ssrLoadModule('/src/data/catalog.ts');
  const { modelSupportsRecipient } = await server.ssrLoadModule('/src/data/catalogTaxonomy.ts');
  const { modelAvailability, modelHasPattern } = await server.ssrLoadModule('/src/features/library/filters.ts');
  const { groupCatalog } = await server.ssrLoadModule('/src/features/library/groups.ts');
  const { catalogImageFor, catalogImageBounds, catalogImageCaption } = await server.ssrLoadModule('/src/data/catalogImages.ts');

  // Son los recursos vectoriales anteriores: renombrar su leyenda no los vuelve IA.
  const technicalSheets = new Set([
    'ninas-01', 'bebe-02', 'tendencia-01', 'tendencia-02', 'tendencia-03',
    'infantil-01', 'infantil-02', 'infantil-03', 'infantil-04', 'infantil-05',
  ]);
  const files = new Map();
  const cells = new Set();
  const recipesBySource = { ia: 0, vector: 0, faltante: 0 };
  const selectionsBySource = { ia: 0, vector: 0, faltante: 0 };
  const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const sourceKey = source => source ? `${source.sheet}/${source.cell}` : null;

  function describeSource(source) {
    if (!source) return null;
    const kind = technicalSheets.has(source.sheet) || !catalogImageCaption(source).includes('generada con IA')
      ? 'vector' : 'ia';
    if (!files.has(source.sheet)) files.set(source.sheet, existsSync(resolve(root, 'public/catalog-images', `${source.sheet}.webp`)));
    cells.add(sourceKey(source));
    return {
      fuente: source.sheet,
      celda: source.cell,
      recorte: catalogImageBounds(source),
      tipo: kind,
      archivo_presente: files.get(source.sheet),
    };
  }

  const rows = [[
    'id', 'diseno', 'nombre', 'disponibilidad', 'tipo_imagen', 'fuente', 'celda',
    'recorte', 'archivo_presente', 'destinatarios_filtro', 'overrides_por_destinatario',
  ]];
  for (const model of [...CATALOG].sort((a, b) => a.id.localeCompare(b.id, 'es'))) {
    const source = catalogImageFor(model);
    const image = describeSource(source);
    recipesBySource[image?.tipo ?? 'faltante']++;
    selectionsBySource[image?.tipo ?? 'faltante']++;
    const recipients = Object.keys(RECIPIENT_LABEL).filter(recipient => modelSupportsRecipient(model, recipient));
    const overrides = {};
    for (const recipient of recipients) {
      const selectedSource = catalogImageFor(model, recipient);
      const selectedImage = describeSource(selectedSource);
      selectionsBySource[selectedImage?.tipo ?? 'faltante']++;
      // Sin override, la selección usa la fuente principal de esta misma fila.
      if (sourceKey(selectedSource) !== sourceKey(source)) overrides[recipient] = selectedImage;
    }
    rows.push([
      model.id, model.designGroup?.id ?? model.id, model.name, modelAvailability(model),
      image?.tipo ?? 'faltante', image?.fuente, image?.celda,
      image ? JSON.stringify(image.recorte) : '', image?.archivo_presente ?? false,
      recipients.join('|'), JSON.stringify(overrides),
    ]);
  }

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${rows.map(row => row.map(csv).join(',')).join('\n')}\n`);
  const groups = groupCatalog(CATALOG);
  const availableGroups = groupCatalog(CATALOG.filter(modelHasPattern));
  const inspirationGroups = groupCatalog(CATALOG.filter(model => modelAvailability(model) === 'inspiracion'));
  const studioGroups = groupCatalog(CATALOG.filter(model => modelAvailability(model) === 'estudio'));
  const missingFiles = [...files].filter(([, present]) => !present).map(([sheet]) => sheet).sort();
  console.log(`Auditoría de imágenes: ${CATALOG.length} recetas; ${groups.length} diseños (${availableGroups.length} con patrón, ${inspirationGroups.length} de inspiración, ${studioGroups.length} solo de estudio).`);
  console.log(`Fuentes principales por receta: ${recipesBySource.ia} IA, ${recipesBySource.vector} vectoriales, ${recipesBySource.faltante} faltantes.`);
  console.log(`Fuentes por selección (principal y destinatarios admitidos): ${selectionsBySource.ia} IA, ${selectionsBySource.vector} vectoriales, ${selectionsBySource.faltante} faltantes.`);
  console.log(`Recursos usados: ${cells.size} celdas únicas; ${files.size} láminas WebP; ${missingFiles.length} archivos faltantes.`);
  if (missingFiles.length) console.log(`Archivos faltantes: ${missingFiles.join(', ')}.`);
  console.log('Inventario: docs/auditoria/fotos-catalogo.csv');
} finally {
  await server.close();
}

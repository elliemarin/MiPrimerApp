import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

// Local, deterministic inventory; no downloads or private projects/profiles.
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { CATALOG, RECIPIENT_LABEL } = await server.ssrLoadModule('/src/data/catalog.ts');
  const { familyOf, modelSupportsRecipient } = await server.ssrLoadModule('/src/data/catalogTaxonomy.ts');
  const { modelAvailability } = await server.ssrLoadModule('/src/features/library/filters.ts');
  const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['id', 'diseno', 'nombre', 'tipo', 'familia', 'destinatarios', 'destinatarios_filtro', 'dificultad', 'tecnicas', 'tejidos', 'elasticidad', 'ajustes', 'motor', 'estado', 'disponibilidad', 'parametros']];
  for (const model of [...CATALOG].sort((a, b) => a.id.localeCompare(b.id, 'es'))) {
    const family = familyOf(model);
    if (family === 'sin-clasificar') throw new Error(`Falta clasificar ${model.id}`);
    rows.push([model.id, model.designGroup?.id ?? model.id, model.name, model.type, family, model.recipients.join('|'), Object.keys(RECIPIENT_LABEL).filter(recipient => modelSupportsRecipient(model, recipient)).join('|'), model.difficulty, model.techniques.join('|'), model.fabrics.join('|'), model.stretch, model.fits.join('|'), model.generatorId, model.status, modelAvailability(model), JSON.stringify(model.params ?? {})]);
  }
  await mkdir('docs/auditoria', { recursive: true });
  await writeFile('docs/auditoria/catalogo.csv', `${rows.map(row => row.map(csv).join(',')).join('\n')}\n`);
  console.log(`Auditoría: ${CATALOG.length} artículos, ${new Set(CATALOG.map(m => m.designGroup?.id ?? m.id)).size} diseños, ${new Set(CATALOG.map(familyOf)).size} familias; ningún artículo sin clasificar.`);
} finally { await server.close(); }

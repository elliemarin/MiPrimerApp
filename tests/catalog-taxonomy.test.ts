import { describe, expect, it } from 'vitest';
import { CATALOG, findModel } from '../src/data/catalog';
import { FAMILY_BY_DESIGN, FAMILY_LABEL, catalogFamilyOptions, familyOf, modelSupportsRecipient, type CatalogFamily } from '../src/data/catalogTaxonomy';
import { INITIAL_FILTERS, matches, modelHasPattern, sanitizeFilters } from '../src/features/library/filters';
import { groupCatalog } from '../src/features/library/groups';

const onlyPatterns = { ...INITIAL_FILTERS, availability: 'patron' as const };
const search = (q: string) => CATALOG.filter(model => matches(model, { ...INITIAL_FILTERS, q }));
const patternSearch = (q: string) => CATALOG.filter(model => matches(model, { ...onlyPatterns, q }));

describe('Auditoría completa de identidad y destinatario del catálogo', () => {
  it('clasifica cada receta e inspiración mediante una asignación explícita de su diseño', () => {
    expect(CATALOG).toHaveLength(1923);
    expect(new Set(CATALOG.map(model => model.id)).size).toBe(CATALOG.length);
    expect(CATALOG.filter(modelHasPattern)).toHaveLength(1846);
    const designIds = new Set(CATALOG.map(model => model.designGroup?.id ?? model.id));
    expect(Object.keys(FAMILY_BY_DESIGN).sort()).toEqual([...designIds].sort());
    for (const model of CATALOG) {
      expect(familyOf(model), model.id).not.toBe('sin-clasificar');
      expect(model.family, model.id).toBe(familyOf(model));
      expect(FAMILY_LABEL[familyOf(model)], model.id).toBeTruthy();
      expect(new Set(model.recipients).size, model.id).toBe(model.recipients.length);
    }
  });

  it('cada familia devuelve exclusivamente sus artículos, incluso al agrupar sus medidas', () => {
    for (const { value } of catalogFamilyOptions(CATALOG)) {
      const expected = CATALOG.filter(model => model.family === value);
      const found = CATALOG.filter(model => matches(model, { ...INITIAL_FILTERS, family: value }));
      expect(found.map(model => model.id), value).toEqual(expected.map(model => model.id));
      expect(groupCatalog(found).every(group => group.models.every(model => model.family === value)), value).toBe(true);
    }
  });

  it.each([
    [['servilleta', 'servilletas', 'napkins'], ['tipo-textil-servilleta'], 3],
    [['mantel', 'manteles', 'individual', 'placemats'], ['tipo-textil-individual'], 4],
    [['banda', 'bandas', 'headbands'], ['tipo-banda-cabello'], 22],
    [['monedero', 'monederos'], ['tipo-estuche-cierre'], 4],
    [['neceser', 'neceseres'], ['neceser', 'tipo-estuche-cierre'], 6],
    [['túnica', 'túnicas', 'tunics'], ['tunica-suelta', 'tipo-top-cuadrado', 'tipo-top-cuadrado-sin-mangas'], 50],
    [['parka', 'parkas'], ['parka-capucha'], 1],
    [['trench'], ['gabardina-cruzada', 'trench-corto'], 2],
    [['cazadora', 'cazadoras'], ['cazadora-mezclilla', 'cazadora-denim-corta'], 2],
    [['pajarita', 'pajaritas'], ['pajarita'], 1],
    [['corbata', 'corbatas'], ['corbata-clasica'], 1],
    [['playsuit', 'playsuits'], ['playsuit-camisero'], 1],
    [['overol', 'overoles'], ['overol', 'peto-bermuda', 'peto-palazzo'], 3],
    [['jumper', 'jumpper', 'pinafore'], ['tipo-jumper-falda'], 76],
    [['bermuda', 'bermudas'], ['peto-bermuda'], 1],
    [['protector', 'protectores'], ['tipo-textil-escritorio'], 1],
    [['tapete', 'tapetes'], ['tipo-textil-maquina', 'tipo-textil-bandeja', 'tipo-textil-taza', 'tipo-textil-plato', 'tipo-textil-raton'], 6],
    [['portacubiertos'], ['portacubiertos-enrollable'], 1],
    [['almohada', 'almohadas', 'pillows'], ['tipo-cojin'], 16],
    [['gorro', 'gorros', 'beanies'], ['gorro'], 1],
    [['sombrero', 'sombreros', 'hats'], ['sombrero-pescador', 'tipo-disfraz-sombrero'], 4],
    [['marcapáginas', 'bookmark'], ['tipo-textil-marcapaginas'], 2]
  ] as [string[], string[], number][])('los subtipos %s no devuelven otros objetos de su familia', (queries, ids, recipes) => {
    for (const query of queries) {
      const found = search(query);
      expect(found, query).toHaveLength(recipes);
      expect(groupCatalog(found).map(group => group.id).sort(), query).toEqual([...ids].sort());
      expect(groupCatalog(found).every(group => matches(group.representative, { ...INITIAL_FILTERS, q: query })), query).toBe(true);
    }
  });

  it('elige una variante del objeto buscado y conserva las consultas generales', () => {
    expect(groupCatalog(patternSearch('monedero'))[0].representative.id).toBe('monedero-cierre');
    expect(groupCatalog(patternSearch('monedero'))[0].representative.params).toMatchObject({ ancho: 120, alto: 90 });
    expect(groupCatalog(patternSearch('neceser'))[0].representative.id).toBe('neceser-plano');
    expect(groupCatalog(patternSearch('túnica')).every(group => group.representative.name.startsWith('Túnica'))).toBe(true);
    expect(groupCatalog(patternSearch('almohada'))[0].representative.params).toMatchObject({ ancho: 300, alto: 500 });
    expect(groupCatalog(search('mantelería')).map(group => group.id).sort()).toEqual(['tipo-textil-camino', 'tipo-textil-centro', 'tipo-textil-individual', 'tipo-textil-servilleta']);
    expect(groupCatalog(patternSearch('fundas')).length).toBeGreaterThan(10);
    expect(groupCatalog(patternSearch('estuches')).map(group => group.id).sort()).toEqual(['tipo-estuche-cierre', 'tipo-funda-lentes']);
  });

  it.each(['hoodie', 'hoodies', 'hoddie', 'hoddies', 'hoody', ' HÓÓDIE '])('%s nunca incluye capas, parkas, ponchos, chaquetas ni sudaderas sin capucha', query => {
    const found = search(query);
    expect(found).toHaveLength(73); // 72 presets and the original inspiration.
    expect(found.every(model => familyOf(model) === 'hoodie')).toBe(true);
    expect(groupCatalog(patternSearch(query))).toHaveLength(1);
    for (const id of ['capa-capucha', 'parka-capucha', 'poncho-capucha-inspiracion', 'anorak-canguro', 'tipo-sudadera']) {
      expect(found.some(model => model.id === id || model.designGroup?.id === id), id).toBe(false);
    }
  });

  it('hoodie con colección y medidas conserva una única construcción y sus dimensiones reales', () => {
    const found = CATALOG.filter(model => model.collection === 'Hoodies y sudaderas' && matches(model, {
      ...onlyPatterns, q: 'hoddies 66', family: 'hoodie', recipient: 'mujer', fabric: 'punto', fit: 'oversize'
    }));
    expect(found.length).toBeGreaterThan(0);
    expect(found.every(model => model.params?.capucha === 'si' && model.params?.largo === 660)).toBe(true);
    expect(groupCatalog(found)).toHaveLength(1);
    expect(CATALOG.filter(model => matches(model, { ...onlyPatterns, q: 'hoodie', family: 'chaqueta' }))).toEqual([]);
  });

  it.each([
    ['chamarras', ['chaqueta']], ['jackets', ['chaqueta']], ['chalecos', ['chaleco']],
    ['cárdigans', ['cardigan']], ['suéteres', ['sueter']], ['jumpper', ['peto']],
    ['enterizos', ['mono']], ['faldas', ['falda']], ['gorros', ['gorro']],
    ['coronas', ['corona']], ['pantuflas', ['pantuflas']], ['baberos', ['babero']]
  ] as [string, CatalogFamily[]][])('la palabra %s respeta la identidad del artículo', (query, families) => {
    const found = search(query);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every(model => families.includes(familyOf(model)))).toBe(true);
  });

  it('las variantes sugeridas, las colecciones y las telas no se convierten en categorías', () => {
    expect(search('shorts').map(model => model.id)).toEqual(['short-elastico']);
    expect(search('pijamas').map(model => model.id).sort()).toEqual(['pantalon-pijama', 'pijama-camisa']);
    expect(search('cardigan').every(model => model.designGroup?.id === 'tipo-cardigan-abierto')).toBe(true);
    const pants = findModel('pantalon-recto-elastico')!;
    expect(matches({ ...pants, description: 'Podrías hacer una hoodie', variants: [{ name: 'Hoodie', text: 'chaquetas' }], searchTerms: ['hoodie'] }, { ...INITIAL_FILTERS, q: 'hoodie' })).toBe(false);
    expect(search('sudadera sin capucha').every(model => familyOf(model) === 'sudadera')).toBe(true);
    expect(search('sudadera con capucha').every(model => familyOf(model) === 'hoodie')).toBe(true);
    expect(search('capa con capucha').map(model => model.id)).toEqual(['capa-capucha']);
  });

  it('recupera bebé por edad explícita y conserva siete diseños nativos sin presets adultos', () => {
    const expectedIds = ['pantalon-recto-elastico', 'jogger', 'pantalon-bebe-panal', 'short-elastico', 'pantalon-pijama', 'babero', 'gorro', 'body-bebe', 'body-bebe-manga-larga'];
    const baby = CATALOG.filter(model => matches(model, { ...onlyPatterns, recipient: 'bebe' }));
    expect(baby.map(model => model.id).sort()).toEqual(expectedIds.sort());
    expect(groupCatalog(baby)).toHaveLength(7);
    expect(patternSearch('bebé').map(model => model.id)).toEqual(baby.map(model => model.id));
    expect(search('baby').map(model => model.id)).toContain('body-bebe');
    expect(search('baby').map(model => model.id)).toContain('mameluco');
    expect(baby.some(model => model.id.startsWith('coleccion-'))).toBe(false);
    expect(modelSupportsRecipient(findModel('bandana-reversible')!, 'bebe')).toBe(false);
    expect(modelSupportsRecipient(findModel('delantal-adulto')!, 'mujer')).toBe(true);
    expect(modelSupportsRecipient(findModel('delantal-adulto')!, 'hombre')).toBe(true);
    expect(modelSupportsRecipient(findModel('delantal-adulto')!, 'infantil')).toBe(false);
    expect(modelSupportsRecipient(findModel('delantal-junior')!, 'bebe')).toBe(false);
    expect(CATALOG.filter(model => matches(model, { ...onlyPatterns, family: 'hoodie', recipient: 'bebe' }))).toEqual([]);
  });

  it.each(['pañalero', 'panalero', 'body', 'bodies', 'bodysuit', 'onesie'])('%s reúne las dos mangas del pañalero en una base de bebé editable', query => {
    const found = patternSearch(query);
    expect(found.map(model => model.id).sort()).toEqual(['body-bebe', 'body-bebe-manga-larga']);
    expect(groupCatalog(found)).toHaveLength(1);
    expect(groupCatalog(found)[0].id).toBe('body-bebe');
    expect(found.every(model => model.generatorId === 'body-bebe-broches' && modelSupportsRecipient(model, 'bebe'))).toBe(true);
    expect(found.map(model => model.params?.tipoManga).sort()).toEqual(['corta', 'larga']);
    expect(found.every(model => matches(model, { ...onlyPatterns, recipient: 'bebe', q: query }))).toBe(true);
  });

  it('ofrece 44 diseños de disfraces y mantiene las medidas dentro de cada construcción', () => {
    const found = patternSearch('disfraces');
    const grouped = groupCatalog(found);
    expect(found).toHaveLength(55);
    expect(grouped).toHaveLength(44);
    expect(new Set(grouped.map(group => group.id)).size).toBe(44);
    expect(found.every(model => model.collection === 'Disfraces' && model.generatorId)).toBe(true);
    expect(grouped.find(group => group.id === 'tipo-disfraz-corona')?.models).toHaveLength(6);
    expect(grouped.map(group => group.id)).toEqual(expect.arrayContaining(['disfraz-alas-hada', 'disfraz-alas-mariposa', 'disfraz-cola-dinosaurio', 'disfraz-kit-hada', 'disfraz-tabardo-robot']));
  });

  it('orejas incluye gato, conejo y oso sin confundir antenas, astas o cuernos', () => {
    const found = patternSearch('orejas');
    expect(found).toHaveLength(5);
    expect(groupCatalog(found).map(group => group.id).sort()).toEqual(['disfraz-orejas-conejo', 'disfraz-orejas-oso', 'tipo-disfraz-orejas']);
    expect(found.every(model => ['orejas', 'diadema-disfraz'].includes(familyOf(model)))).toBe(true);
  });

  it('pone jaretas y estuches en bolsos, petos en monos y separa los lazos de los cinturones', () => {
    for (const id of ['saquito-joyas', 'bolsa-pan', 'estuche-lapices', 'neceser-plano']) expect(findModel(id)?.type, id).toBe('bolsos');
    expect(findModel('overol')?.type).toBe('monos');
    expect(search('cabello').some(model => ['cinturon-tela', 'pulsera-tela', 'lazo-regalo'].includes(model.id))).toBe(false);
    expect(search('cinturones').map(model => model.id)).toEqual(['cinturon-tela', 'disfraz-cinturon-pirata']);
    expect(groupCatalog(patternSearch('scrunchie'))).toHaveLength(1);
    expect(groupCatalog(patternSearch('laptop 13'))).toHaveLength(1);
  });

  it('descarta filtros guardados desconocidos y subcategorías antiguas invisibles', () => {
    expect(sanitizeFilters(null)).toEqual(INITIAL_FILTERS);
    expect(sanitizeFilters({ q: 4, recipient: 'adulto', family: 'garment', difficulty: 42, subcategory: 'Hoodies y sudaderas' })).toEqual(INITIAL_FILTERS);
    expect(sanitizeFilters({ ...INITIAL_FILTERS, q: 'hoddie', recipient: 'mujer', family: 'hoodie', difficulty: 2, fabric: 'punto', technique: 'bordado', availability: 'patron' })).toMatchObject({ q: 'hoddie', recipient: 'mujer', family: 'hoodie', difficulty: 2, fabric: 'punto', technique: 'bordado', availability: 'patron' });
    expect(sanitizeFilters({ type: 'bebe' })).toMatchObject({ type: 'todos', recipient: 'bebe' });
  });

  it('acepta nombres compuestos sin conectores y no confunde una laptop con una consola portátil', () => {
    for (const query of ['jumper falda', 'peto falda']) {
      expect(patternSearch(query).length).toBeGreaterThan(0);
      expect(patternSearch(query).every(model => familyOf(model) === 'peto' && model.flat.pinafore)).toBe(true);
    }
    expect(groupCatalog(patternSearch('delantal peto'))).toHaveLength(1);
    expect(patternSearch('pantalón corto').map(model => model.id)).toEqual(['short-elastico']);
    expect(groupCatalog(patternSearch('funda laptop'))).toHaveLength(1);
    expect(patternSearch('funda laptop').every(model => model.designGroup?.id === 'tipo-funda-portatil')).toBe(true);
    expect(patternSearch('funda libro').every(model => model.designGroup?.id === 'tipo-funda-libro')).toBe(true);
    expect(CATALOG.filter(model => matches(model, { ...onlyPatterns, type: 'accesorios', recipient: 'bebe' })).map(model => model.id).sort()).toEqual(['babero', 'gorro']);
  });

  it('filtra técnicas y nivel por la construcción actual, sin etiquetas de adornos futuros', () => {
    const hoodie = findModel('coleccion-sudadera-660-540-260-capucha')!;
    expect(matches(hoodie, { ...onlyPatterns, technique: 'tejido-punto', difficulty: 2 })).toBe(true);
    expect(matches(hoodie, { ...onlyPatterns, technique: 'puno' })).toBe(false); // Actual hoodie has plain hems.
    expect(matches(hoodie, { ...onlyPatterns, technique: 'bordado' })).toBe(false);
    const pouch = findModel('coleccion-estuche-lapices-base')!;
    expect(matches(pouch, { ...onlyPatterns, technique: 'cierre', difficulty: 2 })).toBe(true);
    expect(matches(pouch, { ...onlyPatterns, technique: 'forro' })).toBe(true);
    expect(matches(findModel('jumper-peto-midi')!, { ...onlyPatterns, technique: 'botones' })).toBe(false);
    for (const model of CATALOG.filter(model => model.generatorId === 'bolsa-tote')) {
      expect(matches(model, { ...onlyPatterns, technique: 'forro' }), model.id).toBe(model.params?.forro !== 'no');
    }
    expect(matches(findModel('delantal-estudio')!, { ...onlyPatterns, technique: 'bolsillos' })).toBe(true);
    expect(matches(findModel('bolsa-zapatos')!, { ...onlyPatterns, technique: 'jareta' })).toBe(true);
    expect(findModel('mitones-polar')?.fabrics).toEqual(['punto']);
    expect(findModel('chaqueta-varsity')?.fabrics).toContain('punto');
    expect(findModel('poncho-capucha-inspiracion')?.fabrics).toContain('punto');
    expect(findModel('blusa-v')?.techniques).not.toContain('tejido-punto');
    expect(findModel('hoodie')?.techniques).not.toContain('cierre');
    expect(findModel('sudadera')?.techniques).not.toContain('cierre');
  });
});

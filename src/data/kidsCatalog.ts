import type { CatalogModel } from './catalog';

/* Colección Niña y ampliación de Bebé. Cada tarjeta corresponde a una
 * construcción real con su generador; las variantes solo cambian parámetros
 * del mismo patrón y comparten grupo. Todo entra como experimental hasta
 * imprimir y coser una muestra física. */

type Base = Omit<CatalogModel, 'status' | 'variants'> & { variants?: CatalogModel['variants'] };
const model = (m: Base): CatalogModel => ({ status: 'experimental', variants: [], ...m });
const girls = 'Niña', baby = 'Bebé';

const TRAPEZE = model({
  id: 'vestido-trapecio', name: 'Vestido trapecio · sin mangas', type: 'faldas-vestidos', sub: 'Vestidos', recipients: ['bebe', 'toddler', 'infantil'],
  difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular', 'holgado'], techniques: ['costura-recta', 'dobladillo', 'botones'],
  generatorId: 'vestido-trapecio-infantil', params: { manga: 'sin' }, flat: { family: 'vestido', kids: 'vestido-trapecio' },
  description: 'Vestido sin cintura que cae en trapecio desde la sisa. Delantero al doblez, espalda con abertura y botón, escote y sisas ribeteados al bies. El patrón comprueba que la cabeza pase con la abertura desabrochada.',
  variants: [{ name: 'Sin mangas o con volantes', text: 'Los volantes de mariposa son semicírculos calculados para medir exactamente el tramo superior de la sisa.' }, { name: 'Largo y vuelo', text: 'Ajusta el largo desde el hombro y el vuelo del bajo.' }],
  recommendedFabrics: ['Popelina de algodón', 'Batista', 'Lino ligero', 'Chambray'], materials: ['Bies de algodón', 'Botón de 12–15 mm', 'Hilo'],
  collection: girls, searchTerms: ['vestido', 'vestidos', 'trapecio', 'evase', 'sin mangas', 'volantes', 'mariposa', 'vestido de bebe', 'vestido de nina'],
  designGroup: { id: 'tipo-vestido-trapecio', name: 'Vestido trapecio', preferred: true }
});

const CIRCLE = model({
  id: 'falda-circular', name: 'Falda circular · círculo completo', type: 'faldas-vestidos', sub: 'Faldas', recipients: ['toddler', 'infantil', 'mujer'],
  difficulty: 2, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'jareta', 'dobladillo'],
  generatorId: 'falda-circular-elastica', params: { vuelo: 'completo' }, flat: { family: 'falda', kids: 'falda-circular' },
  description: 'Falda de círculo completo o medio círculo calculada desde la cadera, con pretina doblada y elástico: se pone sin cierre. Avisa si la pieza no cabe en tu tela doblada.',
  variants: [{ name: 'Círculo completo o medio círculo', text: 'El radio de cintura se recalcula para que el contorno siempre pase por la cadera.' }],
  recommendedFabrics: ['Viscosa', 'Popelina suave', 'Crepé', 'Punto ligero'], materials: ['Elástico', 'Hilo'],
  collection: girls, searchTerms: ['circular', 'falda circular', 'vuelo', 'medio circulo', 'skater', 'falda de nina'],
  designGroup: { id: 'tipo-falda-circular', name: 'Falda circular', preferred: true }
});

const BLOOMERS = model({
  id: 'cubrepanal-bebe', name: 'Cubrepañal liso', type: 'bebe', sub: 'Cubrepañales', recipients: ['bebe', 'toddler'],
  difficulty: 2, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'jareta'],
  generatorId: 'cubrepanal-bebe', params: { olanes: 'no' }, flat: { family: 'bebe', kids: 'cubrepanal' },
  description: 'Bombacho para cubrir el pañal: delantero y espalda al doblez, espalda más profunda, jareta en la cintura y piernas ribeteadas con bies que hace de canal del elástico.',
  variants: [{ name: 'Liso o con olanes', text: 'Los tres olanes traseros se calculan con el ancho real de la espalda en cada línea.' }],
  recommendedFabrics: ['Algodón suave', 'Batista', 'Lino ligero', 'Interlock'], materials: ['Elástico de 15 mm', 'Elástico de 6 mm', 'Bies', 'Hilo'],
  collection: baby, searchTerms: ['cubrepanal', 'cubre panal', 'bombacho', 'bombachos', 'bloomers', 'calzon', 'panal'],
  designGroup: { id: 'tipo-cubrepanal', name: 'Cubrepañal / bombacho', preferred: true }
});

/** Upgrades legacy inspiration IDs without breaking bookmarks or projects. */
export function withKidsPatterns(m: CatalogModel): CatalogModel {
  return m.id === 'falda-circular' ? { ...m, ...CIRCLE } : m;
}

export const KIDS_CATALOG: CatalogModel[] = [
  TRAPEZE,
  { ...TRAPEZE, id: 'vestido-trapecio-volantes', name: 'Vestido trapecio · volantes de mariposa', params: { manga: 'volante' }, flat: { family: 'vestido', kids: 'vestido-trapecio-volante' }, designGroup: { ...TRAPEZE.designGroup!, preferred: false } },
  model({
    id: 'vestido-tirantes', name: 'Vestido de tirantes con falda fruncida', type: 'faldas-vestidos', sub: 'Vestidos', recipients: ['toddler', 'infantil'],
    difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'frunces', 'botones', 'dobladillo'],
    generatorId: 'vestido-tirantes-fruncido', flat: { family: 'vestido', kids: 'vestido-tirantes' },
    description: 'Cuerpo forrado sin cierre, tirantes cosidos al delantero que se abotonan en la espalda (con dos ojales para crecer) y falda fruncida al doblez.',
    variants: [{ name: 'Frunce y largo', text: 'Cambia el frunce de la falda, el alto del cuerpo y el largo de los tirantes.' }],
    recommendedFabrics: ['Popelina', 'Lino ligero', 'Chambray', 'Algodón estampado'], materials: ['Forro de algodón', '2 botones de 15 mm', 'Hilo'],
    collection: girls, searchTerms: ['vestido', 'vestidos', 'tirantes', 'sundress', 'verano', 'falda fruncida', 'vestido de nina'],
    designGroup: { id: 'tipo-vestido-tirantes', name: 'Vestido de tirantes' }
  }),
  model({
    id: 'falda-tul', name: 'Falda de tul (tutú)', type: 'faldas-vestidos', sub: 'Faldas', recipients: ['bebe', 'toddler', 'infantil', 'mujer'],
    difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'frunces', 'jareta'],
    generatorId: 'falda-tul-elastica', flat: { family: 'falda', kids: 'falda-tul' },
    description: 'Varias capas de tul fruncidas sobre una falda base de forro y una pretina doblada con elástico. La pretina siempre pasa por la cadera.',
    variants: [{ name: 'Capas y volumen', text: 'De 2 a 5 capas y volumen de 2 a 4 veces la cadera.' }],
    recommendedFabrics: ['Tul suave', 'Tul de novia', 'Forro de algodón'], materials: ['Elástico', 'Hilo'],
    collection: girls, searchTerms: ['tutu', 'tul', 'falda de tul', 'ballet', 'princesa', 'falda de nina'],
    designGroup: { id: 'tipo-falda-tul', name: 'Falda de tul (tutú)' }
  }),
  model({
    id: 'falda-olanes', name: 'Falda de tres olanes', type: 'faldas-vestidos', sub: 'Faldas', recipients: ['toddler', 'infantil', 'mujer'],
    difficulty: 2, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'frunces', 'jareta', 'dobladillo'],
    generatorId: 'falda-olanes-escalonada', flat: { family: 'falda', kids: 'falda-olanes' },
    description: 'Tres olanes de alto creciente, cada uno fruncido al anterior, con jareta integrada en la cintura. Avisa cuándo unir paños por el ancho de la tela.',
    variants: [{ name: 'Más o menos frunce', text: 'Cada olán mide de 1,3 a 2 veces el anterior.' }],
    recommendedFabrics: ['Batista', 'Gasa doble de algodón', 'Viscosa', 'Algodón ligero'], materials: ['Elástico', 'Hilo'],
    collection: girls, searchTerms: ['olanes', 'volantes', 'escalonada', 'gitana', 'boho', 'falda de nina'],
    designGroup: { id: 'tipo-falda-olanes', name: 'Falda de tres olanes' }
  }),
  { ...CIRCLE, id: 'falda-medio-circulo', name: 'Falda circular · medio círculo', params: { vuelo: 'medio' }, flat: { family: 'falda', kids: 'falda-medio-circulo' }, designGroup: { ...CIRCLE.designGroup!, preferred: false } },
  BLOOMERS,
  { ...BLOOMERS, id: 'cubrepanal-olanes', name: 'Cubrepañal con olanes', params: { olanes: 'si' }, techniques: ['costura-recta', 'jareta', 'frunces'], flat: { family: 'bebe', kids: 'cubrepanal-olanes' }, designGroup: { ...BLOOMERS.designGroup!, preferred: false } },
  model({
    id: 'bonete-bebe', name: 'Bonete con lengüeta', type: 'bebe', sub: 'Gorros', recipients: ['bebe', 'toddler'],
    difficulty: 2, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro'],
    generatorId: 'bonete-bebe', flat: { family: 'accesorio', kids: 'bonete' },
    description: 'Bonete forrado de banda y pieza trasera curva calculada para medir lo mismo que la banda. Se cierra con una lengüeta y broche bajo la barbilla, sin cintas para atar.',
    recommendedFabrics: ['Algodón', 'Muselina', 'Pana fina', 'Franela'], materials: ['Forro suave', 'Broche de presión infantil', 'Hilo'],
    collection: baby, searchTerms: ['bonete', 'gorrito', 'gorro de tela', 'capota', 'sombrerito'],
    designGroup: { id: 'tipo-bonete', name: 'Bonete con lengüeta' }
  }),
  model({
    id: 'patucos-bebe', name: 'Patucos forrados', type: 'bebe', sub: 'Patucos', recipients: ['bebe', 'toddler'],
    difficulty: 2, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro', 'jareta'],
    generatorId: 'patucos-bebe', flat: { family: 'accesorio', kids: 'patucos' },
    description: 'Empeine, talonera con elástico y suela. El contorno del empeine y la talonera se calcula para coincidir exactamente con la suela.',
    recommendedFabrics: ['Polar', 'Pana fina', 'Punto grueso', 'Ante sintético para la suela'], materials: ['Forro de algodón', 'Elástico de 6 mm', 'Hilo resistente'],
    collection: baby, searchTerms: ['patucos', 'zapatitos', 'botitas', 'escarpines', 'zapatos de bebe'],
    designGroup: { id: 'tipo-patucos', name: 'Patucos de bebé' }
  }),
  model({
    id: 'saco-dormir-bebe', name: 'Saco de dormir sin mangas', type: 'bebe', sub: 'Para dormir', recipients: ['bebe', 'toddler'],
    difficulty: 3, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta', 'forro', 'cierre'],
    generatorId: 'saco-dormir-bebe', flat: { family: 'bebe', kids: 'saco-dormir' },
    description: 'Saco forrado con cierre delantero y bajo redondeado. El patrón comprueba que el escote y las sisas sean menores que la cabeza para que el bebé no se deslice dentro.',
    recommendedFabrics: ['Muselina doble', 'Interlock de algodón', 'Franela'], materials: ['Forro', 'Cierre de nylon', 'Bies', 'Hilo'],
    collection: baby, searchTerms: ['saco de dormir', 'saquito', 'sleeping bag', 'dormir'],
    designGroup: { id: 'tipo-saco-dormir', name: 'Saco de dormir' }
  }),
  model({
    id: 'toalla-capucha', name: 'Toalla con capucha', type: 'bebe', sub: 'Baño', recipients: ['bebe', 'toddler', 'infantil'],
    difficulty: 1, fabrics: ['plano'], stretch: 'ninguna', fits: ['holgado'], techniques: ['costura-recta'],
    generatorId: 'toalla-capucha', flat: { family: 'accesorio', kids: 'toalla' },
    description: 'Toalla de esquinas redondeadas con capucha triangular calculada desde el contorno de cabeza y todo el borde ribeteado al bies.',
    recommendedFabrics: ['Rizo de algodón', 'Felpa', 'Muselina de bambú'], materials: ['Bies de algodón', 'Hilo'],
    collection: baby, searchTerms: ['toalla', 'capucha', 'bano', 'albornoz', 'toalla con capucha'],
    designGroup: { id: 'tipo-toalla-capucha', name: 'Toalla con capucha' }
  }),
  model({
    id: 'babero-bandana', name: 'Babero bandana', type: 'accesorios', sub: 'Baberos', recipients: ['bebe', 'toddler'],
    difficulty: 1, fabrics: ['plano', 'punto'], stretch: 'ninguna', fits: ['regular'], techniques: ['costura-recta', 'forro'],
    generatorId: 'babero-bandana', flat: { family: 'accesorio', kids: 'babero-bandana' },
    description: 'Babero triangular de dos capas con el borde del cuello calculado y broche de presión; reverso absorbente.',
    recommendedFabrics: ['Algodón estampado', 'Muselina', 'Rizo o minky para el reverso'], materials: ['Broche infantil', 'Hilo'],
    collection: baby, searchTerms: ['babero', 'bandana', 'babas'],
    designGroup: { id: 'tipo-babero-bandana', name: 'Babero bandana' }
  })
];

/** Girls' shortcut: the new collection plus existing kid-sized dresses, skirts and pinafores. */
export const GIRL_FAMILIES = ['vestido', 'falda', 'peto'] as const;

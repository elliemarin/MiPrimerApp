// Barrido de validación: genera cada generador listado en todas las tallas y variantes
// y muestra los errores de validatePattern. Uso: npx vite-node scripts/sweep-generators.ts [ids...]
// Las únicas fallas esperadas son rechazos intencionales (p. ej. jeans o oversize en talla bebé).
import { GENERATORS } from '../src/lib/pattern/generators';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { validatePattern } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
const only = process.argv.slice(2);
const K=['bebe','toddler','infantil'];
export const cases:Record<string,{kinds:string[],variants:any[],fabric?:string}>={
 'chaleco-infantil':{kinds:K,variants:[{escote:'pico',acabado:'forro',cierre:'broches',lazo:'si'},{escote:'redondo',acabado:'ribete',cierre:'abierto',lazo:'no'},{escote:'pico',acabado:'ribete',cierre:'broches'},{escote:'redondo',acabado:'forro',cierre:'abierto'}]},
 'chaqueta-cierre-infantil':{kinds:K,variants:[{}],fabric:'punto'},
 'chaqueta-acolchada-infantil':{kinds:K,variants:[{bolsillos:'si'},{bolsillos:'no'}]},
 'chaqueta-capucha-infantil':{kinds:K,variants:[{bolsillos:'si'},{bolsillos:'no'}]},
 'sudadera-canguro-infantil':{kinds:K,variants:[{bolsillo:'si'},{bolsillo:'no'}],fabric:'punto'},
 'blusa-campesina-infantil':{kinds:K,variants:[{manga:'corta'},{manga:'larga'},{volante:'no'}]},
 'blusa-botones-infantil':{kinds:K,variants:[{}]},
 'vestido-jareta-infantil':{kinds:K,variants:[{lazo:'si'},{lazo:'no'}]},
 'pelele-volantes':{kinds:['bebe','toddler'],variants:[{tirantes:'si'},{tirantes:'no'}]},
 'diadema-lazo':{kinds:K,variants:[{}],fabric:'punto'},
 'gorro-duende':{kinds:K,variants:[{forro:'si'},{forro:'no'}]},
 'gorro-orejeras':{kinds:K,variants:[{orejas:'gato'},{orejas:'oso'},{orejas:'ninguna'}]},
 'pantalon-cintura-elastica':{kinds:[...K,'mujer','hombre'],variants:[{estilo:'bombacho'},{estilo:'bombacho',volantito:15},{estilo:'recto'},{estilo:'jogger'},{estilo:'ancho',corte:'capri'},{estilo:'recto',corte:'bermuda'},{estilo:'jogger',corte:'capri'},{estilo:'ancho',cintura:'pretina',amplitudBajo:1.5,bolsillos:'costado'},{estilo:'ancho',amplitudBajo:1.4,cordon:'si',bolsillos:'costado'},{estilo:'ancho',volante:'si',alforzas:3},{estilo:'recto',cintura:'pretina'},{estilo:'jogger',holguraCadera:250,bolsillos:'costado',cordon:'si'},{estilo:'ancho',holguraCadera:200,bolsillos:'costado',cordon:'si'},{estilo:'ancho',cintura:'pretina',corte:'capri',volante:'si'}]},
 'cubrepanal-bebe':{kinds:['bebe','toddler'],variants:[{tirantes:'cruzados',lazo:'si'},{tirantes:'cruzados',olanes:'si'},{}]},
 'sombrero-pescador':{kinds:[...K,'mujer','hombre'],variants:[{lazo:'si'},{lazo:'si',barbiquejo:'si'},{}]},
 'pantalon-mezclilla':{kinds:[...K,'mujer','hombre'],variants:[{silueta:'barrel',cintura:'elastica',bolsillos:'frontales'},{silueta:'recto',cintura:'pretina',bolsillos:'frontales'},{silueta:'ancho',cintura:'pretina',bolsillos:'cinco',pinzas:'dos',tiro:'alto'},{silueta:'baggy',cintura:'pretina',bolsillos:'parche',pinzas:'una'},{silueta:'barrel',cintura:'elastica',bolsillos:'frontales',tiro:'alto'},{silueta:'recto',cintura:'pretina',bolsillos:'cargo'}]},
 'bonete-volante':{kinds:K,variants:[{volante:'tela'},{volante:'doble'},{volante:'encaje'},{volante:'ninguno'}]},
 'delantal-pichi-infantil':{kinds:['toddler','infantil'],variants:[{volantes:'si',bolsillo:'si'},{volantes:'no',bolsillo:'no'}]},
 'mono-tirantes-infantil':{kinds:K,variants:[{forma:'pichi'},{forma:'pico',bajo:'volante',lazos:'si'},{forma:'peto',largo:'largo',bajo:'vuelta'},{forma:'pichi',largo:'largo',entrepierna:'cerrada'},{forma:'peto',bolsillos:'no'},{forma:'pico',largo:'largo'}]},
 'blusa-trapecio-infantil':{kinds:K,variants:[{},{volanteBajo:'si'}]},
 'oversize-hombro-caido':{kinds:[...K,'mujer','hombre'],variants:[{prenda:'sobrecamisa',cuelloTipo:'tira',bolsillos:'grandes'},{prenda:'sobrecamisa',cuelloTipo:'tira',bolsillos:'pecho'},{prenda:'sobrecamisa'},{prenda:'bomber'},{prenda:'camiseta'}]},
 'sudadera-media-cremallera':{kinds:['toddler','infantil','mujer','hombre'],variants:[{bloques:'si'},{bloques:'no'}],fabric:'punto'},
 'chaqueta-ranglan':{kinds:['toddler','infantil','mujer','hombre'],variants:[{bolsillos:'si'},{bolsillos:'no'}]},
 'buzo-murcielago':{kinds:['toddler','infantil','mujer','hombre'],variants:[{},{cordon:'no',bolsillos:'no',forroCapucha:'no'}],fabric:'punto'},
 'cazadora-mezclilla':{kinds:['infantil','mujer','hombre'],variants:[{bolsillos:'pecho-vivo'},{bolsillos:'pecho',largoExtra:-110},{bolsillos:'pecho'},{bolsillos:'ninguno'}]},
 'chaqueta-campo':{kinds:['infantil','mujer','hombre'],variants:[{bolsillos:'cuatro'},{bolsillos:'cuatro',cierre:'botones',cuelloTipo:'camisero'},{bolsillos:'pecho',largoExtra:-150},{bolsillos:'pecho'},{bolsillos:'ninguno'}]},
 'culotte-encaje':{kinds:['mujer'],variants:[{},{acabado:'elastico',refuerzo:'no'},{bajadaCintura:30,subidaPierna:40}],fabric:'punto'},
 'conjunto-bebe':{kinds:['bebe','toddler'],variants:[{conjunto:'verano'},{conjunto:'invierno'},{conjunto:'recien-nacido'},{conjunto:'vestido'},{conjunto:'pelele-diadema'},{conjunto:'campesino'},{conjunto:'rayas'},{conjunto:'trapecio'},{conjunto:'vichy'}]},
};
let total=0,fails=0; const seen=new Map<string,number>();
for(const [id,c] of Object.entries(cases)){ if(only.length && !only.includes(id)) continue; const gen=GENERATORS.find(g=>g.id===id); if(!gen){continue;}
 for(const table of SIZE_TABLES) for(const row of table.rows){ if(!c.kinds.includes(row.kind)) continue; for(const v of c.variants){ total++;
  const ctx={body:row.values,kind:row.kind as any,fabric:(c.fabric??'plano') as any,stretch:c.fabric?30:0,fit:'regular' as any};
  let r; try { r=gen.generate(ctx,{...gen.defaults(ctx),...v}); } catch(e){ fails++; console.log('THROW',id,row.code,JSON.stringify(v),(e as Error).message); continue; }
  const cuts=new Map(r.pieces.map(p=>[p.id,cutOutline(p)]));
  const issues=[...r.notices.filter(n=>n.level==='error'),...(r.pieces.length?validatePattern(r,cuts).filter(i=>i.level==='error'||i.code==='costura-no-coincide'):[])];
  if(issues.length||!r.pieces.length){fails++; const k=id+':'+issues.map(i=>i.code+(i.pieceId?':'+i.pieceId:'')).join(',');
   if(!seen.has(k)) console.log(id,row.code,row.kind,JSON.stringify(v),'=>',issues.map(i=>i.code+':'+i.message.slice(0,140)+(i.pieceId?' ['+i.pieceId+']':'')).join(' | '));
   seen.set(k,(seen.get(k)??0)+1);}}}}
console.log('total',total,'fails',fails,[...seen.entries()]);

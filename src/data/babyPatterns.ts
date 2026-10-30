import type { CatalogModel } from './catalog';

const BODY: CatalogModel = {
  id:'body-bebe',name:'Pañalero de bebé · manga corta',type:'bebe',sub:'Bodies',recipients:['bebe'],
  difficulty:2,fabrics:['punto'],stretch:'media',fits:['regular'],techniques:['tejido-punto','botones','dobladillo'],
  status:'experimental',generatorId:'body-bebe-broches',params:{tipoManga:'corta'},
  flat:{family:'bebe',baby:{legs:'body',sleeve:'corta'}},
  description:'Pañalero de punto con apertura frontal completa y broches en entrepierna. Incluye tapetas, ribetes, refuerzos y las piezas reales de manga corta o larga.',
  variants:[{name:'Manga corta o larga',text:'La manga tiene una construcción propia y medidas calculadas según la talla infantil.'},{name:'Broches delanteros',text:'La apertura completa facilita vestir sin pasar la cabeza por un cuello cerrado. No es un hombro envolvente.'}],
  recommendedFabrics:['Interlock de algodón','Jersey de algodón con buena recuperación','Rib fino para ribetes'],
  materials:['Broches de presión para tejido infantil','Entretela suave de punto','Hilo y aguja para punto'],
  collection:'Bebé',searchTerms:['pañalero','panalero','body','bodies','bodysuit','onesie'],
  designGroup:{id:'body-bebe',name:'Pañalero / body de bebé',preferred:true}
};

/** Upgrade the previous inspiration without changing its bookmark/project ID. */
export function withBabyPatterns(model: CatalogModel): CatalogModel {
  return model.id==='body-bebe'?{...model,...BODY}:model;
}
export const BABY_CATALOG_VARIANTS:CatalogModel[]=[{
  ...BODY,id:'body-bebe-manga-larga',name:'Pañalero de bebé · manga larga',params:{tipoManga:'larga'},
  flat:{family:'bebe',baby:{legs:'body',sleeve:'larga'}},
  designGroup:{...BODY.designGroup!,preferred:false}
}];

import { describe, expect, it } from 'vitest';
import { CATALOG, CatalogModel } from '../src/data/catalog';
import { INITIAL_FILTERS, matches, modelAvailability, modelHasPattern } from '../src/features/library/filters';
const base=CATALOG.find(m=>m.id==='pantalon-recto-elastico')!;
const model=(patch:Partial<CatalogModel>):CatalogModel=>({...base,...patch});

describe('Filtros de biblioteca combinables',()=>{
  it('distingue patrón de costura, diseño en estudio e inspiración',()=>{
    const pattern=model({status:'experimental'});
    const studio=model({generatorId:undefined,studioOnly:true,status:'implementado'});
    const inspiration=model({generatorId:undefined,studioOnly:false,status:'pendiente'});
    expect([pattern,studio,inspiration].map(modelAvailability)).toEqual(['patron','estudio','inspiracion']);
    expect(matches(pattern,{...INITIAL_FILTERS,availability:'patron'})).toBe(true);
    expect(matches(studio,{...INITIAL_FILTERS,availability:'patron'})).toBe(false);
    expect(matches(inspiration,{...INITIAL_FILTERS,availability:'estudio'})).toBe(false);
    expect(modelHasPattern(studio)).toBe(false);
  });
  it('no anuncia patrón para una entrada sin generador aunque su estado sea implementado',()=>{
    expect(modelHasPattern(model({generatorId:undefined,status:'implementado'}))).toBe(false);
  });
  it('aplica categoría, holgura, tejido y destinatario a la vez',()=>{
    const m=model({fits:['holgado'],recipients:['mujer'],fabrics:['plano']});
    expect(matches(m,{...INITIAL_FILTERS,type:m.type,fit:'holgado',fabric:'plano',recipient:'mujer'})).toBe(true);
    expect(matches(m,{...INITIAL_FILTERS,type:m.type,fit:'oversize',recipient:'mujer'})).toBe(false);
    expect(matches(m,{...INITIAL_FILTERS,fit:'holgado',fabric:'punto'})).toBe(false);
  });
  it('mantiene las categorías de bebé y adulto sin cruces',()=>{
    const baby=model({recipients:['bebe']});
    expect(matches(baby,{...INITIAL_FILTERS,recipient:'mujer'})).toBe(false);
    expect(matches(baby,{...INITIAL_FILTERS,size:'adulto'})).toBe(false);
    expect(matches(baby,{...INITIAL_FILTERS,recipient:'bebe',size:'infantil'})).toBe(true);
  });
  it('busca sin acentos, con espacios y sinónimos, exigiendo todos los términos',()=>{
    const jacket=CATALOG.find(m=>m.id==='cazadora-mezclilla')!;
    expect(matches(jacket,{...INITIAL_FILTERS,q:'  chamarra   denim '})).toBe(true);
    expect(matches(jacket,{...INITIAL_FILTERS,q:'chaqueta MÉZCLILLA'})).toBe(true);
    expect(matches(jacket,{...INITIAL_FILTERS,q:'chamarras denim'})).toBe(true);
    expect(matches(jacket,{...INITIAL_FILTERS,q:'chamarra seda'})).toBe(false);
  });
  it('encuentra petos cuando se busca jumper y no confunde disponibilidad',()=>{
    const pinafore={...CATALOG.find(m=>m.id==='jumper-peto-midi')!,generatorId:undefined,status:'pendiente' as const};
    expect(matches(pinafore,{...INITIAL_FILTERS,q:'jumper'})).toBe(true);
    expect(matches(pinafore,{...INITIAL_FILTERS,q:'jumper',availability:'patron'})).toBe(false);
  });
  it('filtra subcategorías de accesorios sin confundirlas con disponibilidad',()=>{
    const sleeve=model({sub:'Fundas',generatorId:'funda-bebida'});
    expect(matches(sleeve,{...INITIAL_FILTERS,subcategory:'Fundas',availability:'patron'})).toBe(true);
    expect(matches(sleeve,{...INITIAL_FILTERS,subcategory:'Cabello'})).toBe(false);
  });
  it('un filtro vacío conserva todo el catálogo',()=>{
    expect(CATALOG.every(m=>matches(m,INITIAL_FILTERS))).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { EXPANDED_CATALOG } from '../src/data/catalogExpansion';
import { buildFlat } from '../src/data/flats';
import { parseSvgPath } from '../src/lib/draw/svgpath';
import { cmdsToPolylines } from '../src/lib/draw/flatten';
import { getGenerator } from '../src/lib/pattern/generators';

describe('Biblioteca ampliada de prendas y accesorios',()=>{
 it('conserva ids únicos y ofrece colecciones reales diferenciadas',()=>{
  expect(CATALOG.length).toBeGreaterThan(130);
  expect(new Set(CATALOG.map(m=>m.id)).size).toBe(CATALOG.length);
  expect(CATALOG.filter(m=>m.type==='accesorios').length).toBeGreaterThan(50);
  expect(CATALOG.filter(m=>m.type==='monos').length).toBeGreaterThanOrEqual(12);
  expect(CATALOG.some(m=>m.id==='pantalon-recto-elastico')).toBe(true);
 });
 it('enlaza motores existentes y mantiene las prendas no construidas como inspiración',()=>{
  for(const m of EXPANDED_CATALOG){
   if(m.generatorId){expect(getGenerator(m.generatorId),m.id).toBeDefined();expect(m.status,m.id).toBe('experimental');}
   else expect(m.status,m.id).toBe('pendiente');
  }
  for(const id of ['chaqueta-biker','gabardina-cruzada','chaqueta-acolchada','mono-camisero']) expect(CATALOG.find(m=>m.id===id)?.generatorId).toBeUndefined();
  // The bomber now has its own drop-shoulder construction, never the haori engine.
  expect(CATALOG.find(m=>m.id==='bomber-clasica')?.generatorId).toBe('oversize-hombro-caido');
 });
 it('produce ilustraciones con zonas y contornos finitos para todo el catálogo',()=>{
  for(const m of CATALOG){
   const flat=buildFlat(m.id,m.flat);expect(flat.views.length,m.id).toBeGreaterThan(0);
   for(const v of flat.views){
    expect(v.width,m.id).toBeGreaterThan(0);expect(v.height,m.id).toBeGreaterThan(0);
    expect(Number.isFinite(v.width+v.height+v.minX+v.minY),m.id).toBe(true);
    expect(new Set(v.zones.map(z=>z.id)).size,`${m.id}/${v.key}`).toBe(v.zones.length);
    for(const z of v.zones){
     const lines=cmdsToPolylines(parseSvgPath(z.d),1);
     expect(lines.length,`${m.id}/${z.id}`).toBeGreaterThan(0);
     for(const line of lines)for(const p of line.pts)expect(Number.isFinite(p.x+p.y),`${m.id}/${z.id}`).toBe(true);
    }
   }
  }
 });
 it('distingue visualmente estilos de chaqueta y monos sin renombrar un mismo dibujo',()=>{
  const art=(id:string)=>{const m=CATALOG.find(m=>m.id===id)!;return JSON.stringify(buildFlat(id,m.flat).views[0]);};
  const ids=['bomber-clasica','cazadora-mezclilla','gabardina-cruzada','chaqueta-acolchada','chaqueta-biker','chaqueta-varsity','anorak-canguro','haori-corto','poncho-recto','jumper-peto-midi','mono-camisero','mono-cruzado'];
  expect(new Set(ids.map(art)).size).toBe(ids.length);
 });
});

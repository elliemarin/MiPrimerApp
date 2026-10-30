import { describe, expect, it } from 'vitest';
import { ACCESSORY_PLUS_GENERATORS, apronGenerator, drawstringBagGenerator, envelopeSleeveGenerator, pennantGenerator, sleepMaskGenerator } from '../src/lib/pattern/generators/accessoriesPlus';
import { validatePattern, evaluateSeams } from '../src/lib/pattern/validate';
import { cutOutline } from '../src/lib/pattern/offset';
import { bboxOf } from '../src/lib/geom/vec';
const ctx = {body:{},kind:'mujer' as const,fabric:'plano' as const,stretch:0,fit:'regular' as const};

describe('Accesorios construidos a partir de medidas del objeto',()=>{
 for(const gen of ACCESSORY_PLUS_GENERATORS) for(const factor of [.75,1,1.4]) it(`${gen.id}: contornos, costuras y dimensiones a proporción ${factor}`,()=>{
  const defaults=gen.defaults(ctx);
  const params=Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,typeof v==='number'&&!['margen','dobladillo','jareta'].includes(k)?v*factor:v]));
  const result=gen.generate(ctx,params);
  const issues=[...result.notices,...validatePattern(result)];
  expect(issues.filter(i=>i.level==='error'),JSON.stringify(issues)).toEqual([]);
  for(const seam of evaluateSeams(result.pieces,result.seams)) expect(seam.ok,seam.relation.label).toBe(true);
  for(const check of result.checks) expect(Math.abs(check.target-check.measured),check.label).toBeLessThanOrEqual(check.tolerance);
  for(const piece of result.pieces){
   expect(new Set(piece.nodes.map(n=>n.id)).size).toBe(piece.nodes.length);
   const cut=cutOutline(piece);const box=bboxOf(cut.points);expect(box.maxX-box.minX).toBeGreaterThan(0);expect(box.maxY-box.minY).toBeGreaterThan(0);
  }
  for(const step of result.steps) for(const id of step.pieces) expect(result.pieces.some(piece=>piece.id===id)).toBe(true);
  expect(gen.status).toBe('experimental');
 });
 it('la funda calcula capacidad y reserva solapa sin sumar el margen dos veces',()=>{
  const params={...envelopeSleeveGenerator.defaults(ctx),ancho:330,alto:230,grosor:20,holgura:12,solapa:90};
  const small=envelopeSleeveGenerator.generate(ctx,{...params,margen:5}),large=envelopeSleeveGenerator.generate(ctx,{...params,margen:15});
  expect(small.pieces[0].nodes[1].x).toBe(362);expect(small.pieces[0].nodes[2].y).toBe(582);
  expect(small.checks).toEqual(large.checks);
  expect(small.pieces[0].lines.map(l=>l.a.y)).toEqual([246,492]);
  expect(bboxOf(cutOutline(large.pieces[0]).points).maxX-bboxOf(cutOutline(small.pieces[0]).points).maxX).toBeCloseTo(10,2);
 });
 it('la jareta usa un margen independiente en la boca',()=>{
  const r=drawstringBagGenerator.generate(ctx,{...drawstringBagGenerator.defaults(ctx),jareta:40,margen:7});
  expect(r.pieces[0].edges.map(e=>e.allowance)).toEqual([40,7,7,7]);
  expect(r.pieces[0].cut.qty).toBe(2);
  expect(drawstringBagGenerator.generate(ctx,{alto:100,jareta:60}).notices.some(i=>i.level==='error')).toBe(true);
 });
 it('el bolsillo del delantal y las tiras son piezas separadas sin parámetros corporales ficticios',()=>{
  const r=apronGenerator.generate(ctx,apronGenerator.defaults(ctx));
  expect(r.pieces.map(p=>p.id)).toEqual(['cuerpo','bolsillo','cuello','lazo']);
  expect(r.pieces[3].cut.qty).toBe(2);
  expect(apronGenerator.requiredMeasures).toEqual([]);
  expect(apronGenerator.generate(ctx,{ancho:200,anchoPeto:260}).notices.some(i=>i.level==='error')).toBe(true);
 });
 it('limita la geometría imposible de solapa, jareta y puente nasal',()=>{
  expect(envelopeSleeveGenerator.generate(ctx,{alto:80,solapa:200}).notices.some(i=>i.level==='error')).toBe(true);
  expect(pennantGenerator.generate(ctx,{alto:100,jareta:60}).notices.some(i=>i.level==='error')).toBe(true);
  expect(sleepMaskGenerator.generate(ctx,{alto:90,puente:70}).notices.some(i=>i.level==='error')).toBe(true);
 });
 it('conserva IDs de las curvas del antifaz al regenerar otro tamaño',()=>{
  const a=sleepMaskGenerator.generate(ctx,sleepMaskGenerator.defaults(ctx));
  const b=sleepMaskGenerator.generate(ctx,{ancho:250,alto:110,puente:22});
  expect(a.pieces[0].nodes.map(n=>n.id)).toEqual(b.pieces[0].nodes.map(n=>n.id));
  expect(a.pieces[0].edges.map(n=>n.id)).toEqual(b.pieces[0].edges.map(n=>n.id));
  expect(a.pieces[0].edges.every(e=>e.kind==='cubic')).toBe(true);
 });
});

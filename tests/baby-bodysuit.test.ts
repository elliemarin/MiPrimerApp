import { describe, expect, it } from 'vitest';
import { babyBodysuitGenerator as generator } from '../src/lib/pattern/generators/babyBodysuit';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { evaluateSeams, validatePattern } from '../src/lib/pattern/validate';
import { edgesLength, seamPolygon } from '../src/lib/pattern/outline';
import { cutOutline } from '../src/lib/pattern/offset';
import { bboxOf } from '../src/lib/geom/vec';
import type { GeneratorContext, Params } from '../src/lib/pattern/generator';
import { babyBodysuitFlat } from '../src/data/babyBodysuitFlat';
import { BABY_CATALOG_VARIANTS } from '../src/data/babyPatterns';
import { templateScaleFor } from '../src/store/projects';
import { cmdsBBox } from '../src/lib/draw/paths';
import { parseSvgPath } from '../src/lib/draw/svgpath';
import { cubicAt } from '../src/lib/geom/bezier';
import { edgeCubic } from '../src/lib/pattern/outline';

const rows=SIZE_TABLES.find(table=>table.id==='ref-bebe-meses')!.rows;
const context=(index=1):GeneratorContext=>({body:rows[index].values,kind:'bebe',fabric:'punto',stretch:30,fit:'regular'});
const errors=(result:ReturnType<typeof generator.generate>)=>[...result.notices,...validatePattern(result)].filter(issue=>issue.level==='error');

describe('Pañalero infantil con apertura frontal y broches',()=>{
  for(const row of rows)for(const sleeve of ['corta','larga'])it(`${row.label}, manga ${sleeve}: piezas a escala y uniones válidas`,()=>{
    const ctx={...context(),body:row.values},result=generator.generate(ctx,{tipoManga:sleeve});
    expect(errors(result)).toEqual([]);
    expect(result.pieces).toHaveLength(9);
    expect(evaluateSeams(result.pieces,result.seams).every(seam=>seam.ok)).toBe(true);
    for(const piece of result.pieces) {
      const cut=cutOutline(piece);
      expect(cut.points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))).toBe(true);
      expect(bboxOf(cut.points).maxX).toBeGreaterThan(bboxOf(cut.points).minX);
    }
    for(const step of result.steps)for(const id of step.pieces)expect(result.pieces.some(piece=>piece.id===id)).toBe(true);
  });

  it('mantiene tapetas fuera del contorno corporal y descuenta el solape trasero una sola vez',()=>{
    const ctx=context(),result=generator.generate(ctx,{holgura:40,largo:350,traslapeEntrepierna:24});
    expect(errors(result)).toEqual([]);
    const front=result.pieces.find(piece=>piece.id==='delantero')!,back=result.pieces.find(piece=>piece.id==='espalda')!;
    expect(front.cut).toMatchObject({qty:2,mirrorPairs:true,onFold:false});
    expect(back.cut).toMatchObject({qty:1,onFold:false});
    expect(result.checks.find(check=>check.key==='contorno-torso')).toMatchObject({target:490,measured:490});
    expect(bboxOf(seamPolygon(front)).minX).toBe(-36);
    expect(bboxOf(seamPolygon(back)).maxY).toBe(374);
    expect(result.checks.find(check=>check.key==='largo-espalda-cerrada')?.measured).toBe(350);
    expect(front.lines.find(line=>line.id==='doblez-tapeta')?.a.x).toBe(-12);
    expect(front.marks.filter(mark=>mark.id.startsWith('broche-frente')).every(mark=>mark.at.x===0)).toBe(true);
  });

  it('calcula los ribetes desde los cantos reales después de doblar las tapetas',()=>{
    const result=generator.generate(context(),{proporcionRibete:.9});
    expect(errors(result)).toEqual([]);
    const front=result.pieces.find(piece=>piece.id==='delantero')!;
    const rib=result.pieces.find(piece=>piece.id==='ribete-inferior-delantero')!;
    expect(edgesLength(rib,['largo-superior'])).toBeCloseTo(edgesLength(front,['pierna','entrepierna'])*.9,6);
    expect(front.edges.filter(edge=>['cuello','cuello-tapeta','pierna','entrepierna'].includes(edge.id)).every(edge=>edge.allowance===0)).toBe(true);
    expect(result.pieces.filter(piece=>piece.cut.fabric==='punto-elastico').reduce((sum,piece)=>sum+piece.cut.qty,0)).toBe(6);
    expect(result.pieces.filter(piece=>piece.cut.fabric==='entretela').every(piece=>piece.edges.every(edge=>edge.allowance===0))).toBe(true);
  });

  it('recorta las piernas hacia dentro y conserva una lengüeta de entrepierna, en lugar de un fondo convexo cerrado',()=>{
    const result=generator.generate(context(),{}),front=result.pieces.find(piece=>piece.id==='delantero')!;
    const curve=edgeCubic(front,front.edges.find(edge=>edge.id==='pierna')!)!,mid=cubicAt(curve,.5);
    const chordX=curve.p0.x+(curve.p3.x-curve.p0.x)*(mid.y-curve.p0.y)/(curve.p3.y-curve.p0.y);
    expect(mid.x).toBeLessThan(chordX-20);
    expect(curve.c1.y).toBe(curve.p0.y);
    expect(curve.c2.x).toBe(curve.p3.x);
    expect(errors(result)).toEqual([]);
  });

  it('los márgenes no cambian pecho, solapes, marcas de cierre ni longitudes de costura',()=>{
    const a=generator.generate(context(),{margen:3}),b=generator.generate(context(),{margen:10});
    expect(errors(a)).toEqual([]);expect(errors(b)).toEqual([]);
    expect(a.checks).toEqual(b.checks);
    expect(a.pieces.map(piece=>[piece.id,piece.nodes,piece.marks])).toEqual(b.pieces.map(piece=>[piece.id,piece.nodes,piece.marks]));
    expect(a.pieces.map(piece=>piece.edges.map(edge=>edge.id))).toEqual(b.pieces.map(piece=>piece.edges.map(edge=>edge.id)));
  });

  it('una manga larga cambia su pieza sin alterar el cuerpo ni duplicar diseños por talla',()=>{
    const a=generator.generate(context(),{tipoManga:'corta'}),b=generator.generate(context(),{tipoManga:'larga'});
    expect(a.pieces.find(piece=>piece.id==='delantero')).toEqual(b.pieces.find(piece=>piece.id==='delantero'));
    expect(bboxOf(seamPolygon(b.pieces.find(piece=>piece.id==='manga')!)).maxX).toBeGreaterThan(bboxOf(seamPolygon(a.pieces.find(piece=>piece.id==='manga')!)).maxX);
    expect(generator.status).toBe('experimental');
  });

  it('rechaza tejido plano, medidas adultas y combinaciones imposibles en vez de fabricar un body inválido',()=>{
    expect(generator.generate({...context(),fabric:'plano',stretch:0},{}).pieces).toEqual([]);
    expect(generator.generate({...context(),kind:'mujer'},{}).pieces).toEqual([]);
    const invalidParams:Params[]=[{largo:220,profundidadSisa:170,altoAberturaPierna:100},{anchoEntrepierna:200},{proporcionRibete:.5},{margen:-1},{tipoManga:'otra'}];
    for(const params of invalidParams) {
      const bad=generator.generate(context(),params);
      expect(bad.pieces).toEqual([]);
      expect(bad.notices.some(issue=>issue.level==='error')).toBe(true);
    }
  });

  it('la ilustración infantil ya está a tamaño bebé y no vuelve a encogerse con proporciones adultas',()=>{
    const model=BABY_CATALOG_VARIANTS[0],reference=templateScaleFor(model,'bebe',rows[1].values),older=templateScaleFor(model,'bebe',rows[2].values);
    expect(reference).toMatchObject({sx:1,sy:1});
    expect(older.sx).toBeCloseTo(rows[2].values.pecho!/450,9);
    expect(older.sy).toBeCloseTo(rows[2].values.estatura!/620,9);
    expect(templateScaleFor(model,'bebe',undefined)).toMatchObject({sx:1,sy:1});
    const front=babyBodysuitFlat('frente','corta'),back=babyBodysuitFlat('espalda','corta');
    expect(front.dots.length).toBeGreaterThan(2);
    expect(back.dots).toHaveLength(0);
    const bounds=cmdsBBox(parseSvgPath(front.zones.find(zone=>zone.type==='delantero')!.d));
    expect(bounds.maxX-bounds.minX).toBe(240);
    expect(bounds.maxY-bounds.minY).toBe(315);
    expect(front.zones.filter(zone=>zone.type==='manga')).toHaveLength(2);
    expect(babyBodysuitFlat('frente','larga').width).toBeGreaterThan(front.width);
  });
});

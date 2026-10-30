import { describe, expect, it } from 'vitest';
import { hoodieGenerator, hoodieDefaults, generateHoodie } from '../src/lib/pattern/generators/hoodie';
import type { GeneratorContext, Params } from '../src/lib/pattern/generator';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { cutOutline } from '../src/lib/pattern/offset';
import { edgeLength, pointOnEdge } from '../src/lib/pattern/outline';
import { evaluateSeams, validatePattern } from '../src/lib/pattern/validate';

const examples:GeneratorContext[]=SIZE_TABLES.filter(table=>['ref-mujer-busto','ref-hombre-pecho','ref-infantil-estatura'].includes(table.id)).flatMap(table=>table.rows.filter(row=>row.kind==='mujer'||row.kind==='hombre'||row.kind==='infantil').map(row=>({body:row.values,kind:row.kind,fabric:'punto',stretch:20,fit:'holgado'})));
const generate=(context:GeneratorContext,params:Params={})=>generateHoodie(context,{...hoodieDefaults(context),...params});

describe('sudadera cerrada de hombro caído y capucha',()=>{
  for(const [index,context]of examples.entries()) it(`cuerpo${index}: contornos de corte, márgenes, cuello y costuras coinciden`,()=>{
    const result=generate(context);
    const errors=[...result.notices,...validatePattern(result)].filter(issue=>issue.level==='error');
    expect(errors,JSON.stringify(errors)).toEqual([]);
    expect(hoodieGenerator.status).toBe('experimental');
    expect(result.pieces.map(piece=>piece.id)).toEqual(['delantero','espalda','manga','capucha']);
    expect(result.pieces[3].cut).toMatchObject({qty:2,mirrorPairs:true,onFold:false});
    expect(result.pieces[2].cut.qty).toBe(2);
    for(const piece of result.pieces) expect(cutOutline(piece).points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))).toBe(true);
    for(const seam of evaluateSeams(result.pieces,result.seams)) expect(seam.ok,`${seam.relation.label}: ${seam.lengthA}/${seam.lengthB}`).toBe(true);
    for(const check of result.checks) expect(check.measured).toBeCloseTo(check.target,5);
    expect(result.checks.find(check=>check.key==='cuello')!.measured).toBeGreaterThanOrEqual(context.body.cabeza!+30-.01);
    for(const step of result.steps) for(const id of step.pieces) expect(result.pieces.some(piece=>piece.id===id)).toBe(true);
  });

  it('cada mitad de base de capucha divide exactamente los tramos de escote delantero y trasero',()=>{
    const result=generate(examples[4]);
    const front=result.pieces[0],back=result.pieces[1],hood=result.pieces[3];
    const neckFront=edgeLength(front,front.edges.find(edge=>edge.id==='cuello-der')!);
    const neckBack=edgeLength(back,back.edges.find(edge=>edge.id==='cuello-der')!);
    const base=hood.edges.find(edge=>edge.id==='base-cuello')!,notch=hood.notches[0];
    expect(notch.s).toBeCloseTo(neckFront,6);
    expect(edgeLength(hood,base)-notch.s).toBeCloseTo(neckBack,6);
    const point=pointOnEdge(hood,base,notch.s).p;
    expect(point.x).toBeGreaterThan(0);expect(point.x).toBeLessThan(hood.nodes[1].x);
  });

  it('sin capucha conserva una sudadera real y ribetea todo el escote sin simular rib',()=>{
    const result=generate(examples[4],{capucha:'no'});
    expect(result.pieces.map(piece=>piece.id)).toEqual(['delantero','espalda','manga']);
    expect(result.seams.some(seam=>seam.id.startsWith('capucha'))).toBe(false);
    for(const piece of result.pieces.slice(0,2)) for(const edge of piece.edges.filter(edge=>edge.id.startsWith('cuello'))) expect([edge.allowance,edge.finish]).toEqual([0,'sin-margen']);
    expect(result.materials.some(material=>material.id==='bies-cuello')).toBe(true);
    expect(validatePattern(result).filter(issue=>issue.level==='error')).toEqual([]);
  });

  it('holgura una sola vez y cambios de margen no cambian las medidas terminadas',()=>{
    const context=examples[4];
    const a=generate(context,{holgura:180,margen:5,dobladillo:15});
    const b=generate(context,{holgura:180,margen:15,dobladillo:30});
    expect(a.checks).toEqual(b.checks);
    expect(a.checks[0].measured).toBe(Math.max(context.body.pecho!,context.body.cadera!)+180);
    expect(a.pieces.map(piece=>piece.nodes)).toEqual(b.pieces.map(piece=>piece.nodes));
    expect(a.pieces.map(piece=>piece.id)).toEqual(b.pieces.map(piece=>piece.id));
    expect(validatePattern(a).filter(issue=>issue.level==='error')).toEqual([]);
    expect(validatePattern(b).filter(issue=>issue.level==='error')).toEqual([]);
  });

  it('rechaza escotes que no permiten pasar cabeza y proporciones de capucha imposibles',()=>{
    const context=examples[4];
    expect(generate(context,{escoteAncho:100,escoteDelante:40}).notices.some(issue=>issue.code==='hoodie-paso-cabeza'&&issue.level==='error')).toBe(true);
    expect(generate(context,{altoCapucha:100}).notices.some(issue=>issue.code==='hoodie-capucha-alto'&&issue.level==='error')).toBe(true);
    expect(generate(context,{holgura:10}).notices.some(issue=>issue.code==='hoodie-proporciones')).toBe(true);
  });

  it('variantes adultas de largos, mangas y holguras conservan patrones válidos',()=>{
    const context=examples.find(context=>context.body.pecho===920&&context.kind==='mujer')!;
    for(const largo of [500,580,660,740,820,900]) for(const largoManga of [150,280,410,540]) for(const holgura of [180,260,340]) for(const capucha of ['si','no']) {
      const result=generate(context,{largo,largoManga,holgura,capucha});
      const errors=[...result.notices,...validatePattern(result)].filter(issue=>issue.level==='error');
      expect(errors,JSON.stringify({largo,largoManga,holgura,capucha,errors})).toEqual([]);
    }
  });

  it('los márgenes ofrecidos mantienen contornos válidos en todos los cuerpos admitidos',()=>{
    for(const context of examples) for(const margen of [3,10,20]) {
      const result=generate(context,{margen});
      const errors=[...result.notices,...validatePattern(result)].filter(issue=>issue.level==='error');
      expect(errors,JSON.stringify({kind:context.kind,pecho:context.body.pecho,margen,errors})).toEqual([]);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { buildPattern, newPatternState } from '../src/lib/pattern/engine';
import { findSize } from '../src/lib/sizes/tables';
import { edgeLength } from '../src/lib/pattern/outline';

describe('pantalones con holguras y largos de catálogo: costados e interiores compatibles',()=>{
  for(const [table,code]of [['ref-mujer-busto','M88'],['ref-mujer-busto','M92'],['ref-mujer-busto','M104'],['ref-hombre-pecho','H92'],['ref-hombre-pecho','H100'],['ref-hombre-pecho','H112']] as const) {
    for(const estilo of ['recto','ancho','jogger']) it(`${code} ${estilo}: conserva medidas exactas y no embebe un costado`,()=>{
      const row=findSize(table,code)!;
      for(const largo of [720,800,880,1040,1120]) for(const holguraCadera of [80,140,220]) {
        const state=newPatternState('pantalon-cintura-elastica',row.values,{kind:row.kind,fabric:'plano',stretch:0,fit:'regular'});
        state.params={estilo,largo,holguraCadera,anchoElastico:20};
        const built=buildPattern(state);
        expect(built.issues.filter(issue=>issue.level==='error'),JSON.stringify({code,estilo,largo,holguraCadera,issues:built.issues})).toEqual([]);
        const side=built.seamResults.find(seam=>seam.relation.id==='costado')!;
        const inside=built.seamResults.find(seam=>seam.relation.id==='entrepierna')!;
        expect(side.relation.tolerance).toBe(3);
        expect(inside.relation.tolerance).toBe(2);
        // Actual geometric equality, far stricter than existing sewing tolerances.
        expect(Math.abs(side.lengthA-side.lengthB)).toBeLessThan(.001);
        expect(Math.abs(inside.lengthA-inside.lengthB)).toBeLessThan(.02);
        const hip=built.result!.checks.find(check=>check.key==='cadera')!;
        const height=built.result!.checks.find(check=>check.key==='largo')!;
        expect(hip.measured).toBeCloseTo(row.values.cadera!+holguraCadera,7);
        expect(height.measured).toBe(largo);
        for(const check of built.result!.checks) expect(Math.abs(check.target-check.measured)).toBeLessThanOrEqual(check.tolerance);
        const front=built.pieces[0],back=built.pieces[1];
        const kneeFront=front.nodes.find(node=>node.id==='rodilla-ext'),kneeBack=back.nodes.find(node=>node.id==='rodilla-ext');
        if(kneeFront&&kneeBack) expect(kneeBack.y).toBe(kneeFront.y);
        const hemFront=edgeLength(front,front.edges.find(edge=>edge.id==='bajo')!);
        const hemBack=edgeLength(back,back.edges.find(edge=>edge.id==='bajo')!);
        expect(hemBack).toBeGreaterThan(hemFront);
      }
    });
  }

  it('el margen no participa en la solución y cambiarlo conserva las líneas terminadas',()=>{
    const row=findSize('ref-mujer-busto','M92')!;
    const state=newPatternState('pantalon-cintura-elastica',row.values,{kind:row.kind,fabric:'plano',stretch:0,fit:'regular'});
    state.params={estilo:'recto',largo:720,holguraCadera:220,margen:5};
    const small=buildPattern(state),large=buildPattern({...state,params:{...state.params,margen:20}});
    expect(small.pieces.map(piece=>piece.nodes)).toEqual(large.pieces.map(piece=>piece.nodes));
    expect(small.result!.checks).toEqual(large.result!.checks);
    expect(large.issues.filter(issue=>issue.level==='error')).toEqual([]);
  });
});

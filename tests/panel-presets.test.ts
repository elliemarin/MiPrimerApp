import { describe, expect, it } from 'vitest';
import { PANEL_PRESETS, presetCuts } from '../src/data/panelPresets';
import { relaxedJacketGenerator } from '../src/lib/pattern/generators/relaxed';
import { panelizePattern } from '../src/lib/pattern/panels';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { CATALOG } from '../src/data/catalog';
import { evaluateSeams, validatePiece } from '../src/lib/pattern/validate';
import { seamPolygon } from '../src/lib/pattern/outline';
import { polygonArea } from '../src/lib/geom/polyoffset';
import { buildFlat } from '../src/data/flats';
import type { GeneratorContext } from '../src/lib/pattern/generator';

const bodies = ['M80','M92','M128','H88','H130'].map(code=>{
  const row=SIZE_TABLES.flatMap(t=>t.rows).find(r=>r.code===code)!;
  return {body:row.values,kind:row.kind,fabric:'plano',stretch:0,fit:'holgado'} as GeneratorContext;
});

describe('Variantes de chaqueta para collage con cortes reales',()=>{
  for(const preset of PANEL_PRESETS) for(const ctx of bodies) it(`${preset.id} · ${ctx.body.pecho}: conserva superficie y uniones al dividir piezas reales`,()=>{
    const base=relaxedJacketGenerator.generate(ctx,{...relaxedJacketGenerator.defaults(ctx),largo:760,holgura:300,largoManga:390});
    const cuts=presetCuts(preset.id,base.pieces,10);
    const result=panelizePattern(base.pieces,base.seams,cuts);
    expect(result.issues.filter(i=>i.level==='error'),JSON.stringify(result.issues)).toEqual([]);
    expect(result.pieces.length).toBeGreaterThan(base.pieces.length);
    const before=base.pieces.reduce((sum,p)=>sum+polygonArea(seamPolygon(p)),0);
    const after=result.pieces.reduce((sum,p)=>sum+polygonArea(seamPolygon(p)),0);
    expect(Math.abs(after-before)).toBeLessThan(1);
    for(const p of result.pieces)expect(validatePiece(p).filter(i=>i.level==='error'),p.name).toEqual([]);
    for(const seam of evaluateSeams(result.pieces,result.seams))expect(seam.ok,seam.relation.label).toBe(true);
    expect(presetCuts(preset.id,base.pieces,10)).toEqual(cuts);
    expect(new Set(result.pieces.map(p=>p.id)).size).toBe(result.pieces.length);
  });
  it('presenta cinco variantes honestas, con patrón base y líneas de composición diferentes',()=>{
    const models=CATALOG.filter(m=>m.panelPreset);
    expect(models).toHaveLength(5);
    const art=models.map(m=>{
      expect(m.generatorId).toBe('chaqueta-hombro-caido');
      expect(m.status).toBe('experimental');
      expect(PANEL_PRESETS.some(p=>p.id===m.panelPreset)).toBe(true);
      return JSON.stringify(buildFlat(m.id,m.flat).views[0].details);
    });
    expect(new Set(art).size).toBe(models.length);
  });
  it('rechaza distribución desconocida, margen inválido o prendas que no comparten esa construcción',()=>{
    const ctx=bodies[0],base=relaxedJacketGenerator.generate(ctx,relaxedJacketGenerator.defaults(ctx));
    expect(()=>presetCuts('inexistente',base.pieces)).toThrow();
    expect(()=>presetCuts(PANEL_PRESETS[0].id,base.pieces,-10)).toThrow();
    expect(()=>presetCuts(PANEL_PRESETS[0].id,[])).toThrow();
  });
});

import { describe,expect,it } from 'vitest';
import { COSTUME_RECIPES,COSTUME_EXPANSION_GENERATORS,buildCostumeRecipe,costumeMaxMargin } from '../src/lib/pattern/generators/costumeExpansion';
import { validatePattern,evaluateSeams } from '../src/lib/pattern/validate';
import { buildCostumeFlat,COSTUME_SURFACE_PIECES } from '../src/data/costumeFlats';
import { COSTUME_EXPANSION_CATALOG } from '../src/data/costumeExpansion';
import { seamPolygon,edgeLength } from '../src/lib/pattern/outline';
import { bboxOf,pointInPolygon } from '../src/lib/geom/vec';
import { buildPattern,newPatternState,layoutMatrix } from '../src/lib/pattern/engine';
import { pieceDrawable } from '../src/lib/draw/drawable';
import { arrangeForTiles,exportTiledPdf } from '../src/lib/pdf/export';
import { DEFAULT_TILE } from '../src/lib/pdf/tile';
import { PDFDocument } from 'pdf-lib';
import { costumeDisplayPath } from '../src/lib/pattern/generators/costumeExpansion';
import { cmdsToPolylines } from '../src/lib/draw/flatten';
import { parseSvgPath } from '../src/lib/draw/svgpath';
const ctx={body:{},kind:'mujer' as const,fabric:'plano' as const,stretch:0,fit:'regular' as const};

describe('40 construcciones originales de disfraz',()=>{
  for(const recipe of COSTUME_RECIPES)for(const [scale,margin] of [[1,5],[.65,3],[1.5,10],[.65,10],[1.5,3]])it(`${recipe.id} × ${scale} · margen ${margin}: piezas, inventario, costuras y contornos`,()=>{
    const built=buildCostumeRecipe(recipe,{ancho:recipe.width*scale,largo:recipe.height*scale,contorno:(recipe.circumference??760)*scale,margen:Math.min(margin,costumeMaxMargin(recipe))}),result=built.result;
    expect([...result.notices,...validatePattern(result)].filter(issue=>issue.level==='error')).toEqual([]);
    expect(evaluateSeams(result.pieces,result.seams).every(seam=>seam.ok)).toBe(true);
    expect(new Set(result.pieces.map(piece=>piece.id)).size).toBe(result.pieces.length);
    for(const piece of result.pieces){expect(piece.cut.qty).toBeGreaterThan(0);expect(piece.edges.every(edge=>piece.cut.fabric==='entretela'?edge.allowance===0:edge.allowance>=Math.min(margin,costumeMaxMargin(recipe))||edge.finish==='dobladillo')).toBe(true);}
    for(const step of result.steps){for(const id of step.pieces)expect(result.pieces.some(piece=>piece.id===id)).toBe(true);for(const id of step.seams??[])expect(result.seams.some(seam=>seam.id===id)).toBe(true);}
    for(const piece of result.pieces){const poly=seamPolygon(piece,.1);expect(pointInPolygon(piece.grain.a,poly)).toBe(true);expect(pointInPolygon(piece.grain.b,poly)).toBe(true);for(const mark of piece.marks)expect(pointInPolygon(mark.at,poly),`${piece.id} ${mark.id}`).toBe(true);}
    for(const part of [...built.front,...built.back])expect(result.pieces.some(piece=>piece.id===part.pieceId)).toBe(true);
  });
  for(const recipe of COSTUME_RECIPES)for(const [sx,sy] of [[.65,1.5],[1.5,.65]])it(`${recipe.id}: extremos independientes de ancho y largo ${sx}/${sy}`,()=>{const result=buildCostumeRecipe(recipe,{ancho:recipe.width*sx,largo:recipe.height*sy,contorno:(recipe.circumference??760)*sx,margen:costumeMaxMargin(recipe)}).result;expect([...result.notices,...validatePattern(result)].filter(issue=>issue.level==='error')).toEqual([]);});
  it('cada tarjeta cambia contorno o inventario; no duplica tamaños ni colores',()=>{
    expect(COSTUME_RECIPES).toHaveLength(40);expect(COSTUME_EXPANSION_CATALOG).toHaveLength(40);
    const signatures=COSTUME_RECIPES.map(recipe=>JSON.stringify(buildCostumeRecipe(recipe).result.pieces.map(piece=>[piece.nodes,piece.edges,piece.cut])));
    expect(new Set(signatures).size).toBe(40);
    expect(COSTUME_EXPANSION_GENERATORS.every(g=>g.status==='experimental')).toBe(true);
  });
  it('todas las superficies ensambladas corresponden a piezas reales, incluidas copias y reversos',()=>{
    for(const recipe of COSTUME_RECIPES){const flat=buildCostumeFlat('test',recipe.id),built=buildCostumeRecipe(recipe);
      expect(flat.views).toHaveLength(2);
      for(const view of flat.views){expect(view.width).toBeGreaterThan(0);expect(view.height).toBeGreaterThan(0);expect(new Set(view.zones.map(z=>z.id)).size).toBe(view.zones.length);
        for(const surface of COSTUME_SURFACE_PIECES[recipe.id][view.key])expect(built.result.pieces.some(p=>p.id===surface.pieceId)).toBe(true);
      }
    }
  });
  it('márgenes independientes de la geometría terminada y cantidades correctas',()=>{
    for(const recipe of COSTUME_RECIPES){const a=buildCostumeRecipe(recipe,{margen:3}).result,b=buildCostumeRecipe(recipe,{margen:costumeMaxMargin(recipe)}).result;expect(a.pieces.map(p=>p.nodes)).toEqual(b.pieces.map(p=>p.nodes));}
    const skirt=buildCostumeRecipe(COSTUME_RECIPES.find(r=>r.id==='falda-petalos')!).result;
    expect(skirt.pieces.find(p=>p.id==='panel')?.cut.qty).toBe(6);expect(skirt.pieces.find(p=>p.id==='panel-forro')?.cut.qty).toBe(6);
    const wings=buildCostumeRecipe(COSTUME_RECIPES.find(r=>r.id==='alas-hada')!).result;expect(wings.pieces.find(p=>p.id==='ala')?.cut.qty).toBe(2);
  });
  it('contornos cerrados, cono circular y frunce con proporción real',()=>{
    for(const id of ['cola-gato','falda-hojas','alas-hada']){const recipe=COSTUME_RECIPES.find(r=>r.id===id)!,p=buildCostumeRecipe(recipe).result.pieces[0],box=bboxOf(seamPolygon(p,.01));expect(box.maxX-box.minX).toBeCloseTo(recipe.width,1);expect(box.maxY-box.minY).toBeCloseTo(recipe.height,1);}
    const cone=buildCostumeRecipe(COSTUME_RECIPES.find(r=>r.id==='cuerno-unicornio')!).result;const seam=evaluateSeams(cone.pieces,cone.seams).find(s=>s.relation.id==='cerrar-base')!;expect(Math.abs(seam.lengthA-Math.PI*95)).toBeLessThan(.1);expect(seam.ok).toBe(true);
    const ruffle=buildCostumeRecipe(COSTUME_RECIPES.find(r=>r.id==='gorguera')!).result;expect(evaluateSeams(ruffle.pieces,ruffle.seams).find(s=>s.relation.id==='fruncir')?.ratio).toBeCloseTo(3,6);
    const band=ruffle.pieces.find(p=>p.id==='banda-cuello')!;expect(edgeLength(band,band.edges[0])-40).toBe(360);
  });
  it('el aplique de zorro queda dentro de su cola y el tabardo tiene cuatro almenas reales',()=>{
    const recipe=COSTUME_RECIPES.find(r=>r.id==='cola-zorro')!;
    for(const [sx,sy] of [[1,1],[.65,1.5],[1.5,.65]]){
      const built=buildCostumeRecipe(recipe,{ancho:recipe.width*sx,largo:recipe.height*sy});
      const paths=['cola','punta'].map(id=>{const piece=built.result.pieces.find(p=>p.id===id)!,part=built.front.find(part=>part.pieceId===id)!;return cmdsToPolylines(parseSvgPath(costumeDisplayPath(piece,part)),.1)[0].pts;});
      expect(paths[1].every(point=>pointInPolygon(point,paths[0]))).toBe(true);
    }
    const battlements=buildCostumeRecipe(COSTUME_RECIPES.find(r=>r.id==='tabardo-almenado')!).result.pieces[0];
    expect(battlements.edges.filter(edge=>edge.kind==='line'&&battlements.nodes.find(n=>n.id===edge.from)?.y===740&&battlements.nodes.find(n=>n.id===edge.to)?.y===740)).toHaveLength(4);
  });
  for(const model of COSTUME_EXPANSION_CATALOG)it(`${model.id}: el motor registrado conserva todos los cortes`,()=>{
    const state=newPatternState(model.generatorId!,{},ctx);state.params={...state.params,...model.params};
    const result=buildPattern(state);expect(result.missing).toEqual([]);expect(result.issues.filter(i=>i.level==='error')).toEqual([]);
    expect(result.cuts.size).toBe(result.pieces.length);expect(result.pieces.length).toBeGreaterThan(1);
  });
  for(const id of ['cuerno-unicornio','kit-dragon','cinturon-pirata'])it(`${id}: exporta todas sus plantillas en PDF Carta a escala`,async()=>{
    const result=buildPattern(newPatternState(`cosplay-${id}`,{},ctx));
    const ds=result.pieces.map(piece=>pieceDrawable(piece,result.cuts.get(piece.id)!,layoutMatrix(undefined),{subtitle:id,version:'Experimental'}));
    const pdf=await exportTiledPdf(arrangeForTiles(ds,DEFAULT_TILE),{settings:DEFAULT_TILE},{title:id,lines:['Patrón original experimental'],footer:'Imprimir al 100 %',json:{id}});
    const document=await PDFDocument.load(pdf.bytes);expect(document.getPageCount()).toBe(pdf.pages.length+1);
    expect(pdf.pages.length).toBeGreaterThan(0);for(const page of document.getPages()){expect(page.getWidth()).toBeCloseTo(612,3);expect(page.getHeight()).toBeCloseTo(792,3);}
  });
});

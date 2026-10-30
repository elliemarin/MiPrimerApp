import { describe, expect, it } from 'vitest';
import { findModel } from '../src/data/catalog';
import { buildFlat } from '../src/data/flats';
import { figureGeometry } from '../src/lib/draw/figurine';
import { garmentComposition, garmentIllustrationView, supportsModelIllustration } from '../src/lib/draw/garmentComposition';
import { cmdsBBox } from '../src/lib/draw/paths';
import { parseSvgPath } from '../src/lib/draw/svgpath';

function position(transform: string, x: number, y: number) {
  const [tx,ty,sx,sy] = transform.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number);
  return { x:tx+x*sx, y:ty+y*sy };
}

describe('composición ilustrativa sin modificar patrones',()=>{
  it('une torso y falda de los jumpers en su cintura y lleva los tirantes al hombro',()=>{
    for(const id of ['jumper-peto-midi','jumper-peto-maxi']) {
      const model=findModel(id)!,view=buildFlat(model.id,model.flat).views[0];
      const composition=garmentComposition(model.flat,view);
      expect(composition.segments).toHaveLength(2);
      for(const segment of composition.segments) expect(position(segment.transform,0,segment.splitY).y).toBeCloseTo(figureGeometry('recto','adulto').waistY,8);
      const strap=view.zones.find(zone=>zone.id.startsWith('tirante'))!;
      const box=cmdsBBox(parseSvgPath(strap.d));
      expect(position(composition.segments[0].transform,0,box.minY).y).toBeCloseTo(159,8);
      expect(composition.segments[0].splitY).toBe(view.refY);
    }
  });

  it('reconoce el dibujo de bebé reducido de origen y cubre los hombros del figurín infantil',()=>{
    const model=findModel('body-bebe')!,view=buildFlat(model.id,model.flat).views[0];
    const composition=garmentComposition(model.flat,view,'recto','infantil');
    const body=cmdsBBox(parseSvgPath(view.zones.find(zone=>zone.id==='delantero')!.d));
    const left=position(composition.segments[0].transform,body.minX,0),right=position(composition.segments[0].transform,body.maxX,0);
    expect(right.x-left.x).toBeGreaterThan(figureGeometry('recto','infantil').shoulderWidth);
    expect(right.x-left.x).toBeLessThan(150);
  });

  it('muestra la capucha caída y conserva inmutables las zonas del dibujo técnico',()=>{
    const model=findModel('coleccion-sudadera-660-540-260-capucha')!,view=buildFlat(model.id,model.flat).views[0];
    const before=JSON.stringify(view);
    const worn=garmentIllustrationView(view,model.flat);
    expect(cmdsBBox(parseSvgPath(view.zones.find(zone=>zone.type==='capucha')!.d)).minY).toBeLessThan(-200);
    expect(cmdsBBox(parseSvgPath(worn.zones.find(zone=>zone.type==='capucha')!.d)).minY).toBeGreaterThanOrEqual(0);
    expect(worn.zones.filter(zone=>zone.type!=='capucha')).toEqual(view.zones.filter(zone=>zone.type!=='capucha'));
    expect(worn.details.some(detail=>detail.d.includes('C-70'))).toBe(false);
    expect(JSON.stringify(view)).toBe(before);
  });

  it('compensa una escala ilustrativa anterior y deja fuera los monos de referencia sin montaje',()=>{
    const model=findModel('pantalon-recto-elastico')!,view=buildFlat(model.id,model.flat).views[0];
    const first=garmentComposition(model.flat,view).segments[0];
    const scaled={...view,minX:view.minX*.9,width:view.width*.9,minY:view.minY*1.2,height:view.height*1.2,refY:view.refY*1.2,seams:{...view.seams,center:0},templateScale:{sx:.9,sy:1.2}};
    const second=garmentComposition(model.flat,scaled).segments[0];
    expect(position(first.transform,100,700).x).toBeCloseTo(position(second.transform,90,840).x,8);
    expect(position(first.transform,100,700).y).toBeCloseTo(position(second.transform,90,840).y,8);
    expect(supportsModelIllustration(findModel('mono-mecanico')!.flat)).toBe(false);
    expect(supportsModelIllustration(model.flat)).toBe(true);
  });
});

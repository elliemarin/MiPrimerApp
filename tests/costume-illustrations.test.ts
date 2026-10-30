import { describe, expect, it } from 'vitest';
import { COSTUME_CATALOG } from '../src/data/costumeCatalog';
import { buildFlat } from '../src/data/flats';
import { parseSvgPath } from '../src/lib/draw/svgpath';

describe('fidelidad de las ilustraciones de disfraces', () => {
  it('la corona muestra la misma cantidad de puntas que la receta elegida', () => {
    for(const model of COSTUME_CATALOG.filter(model=>model.generatorId==='corona-textil')) {
      const front=buildFlat(model.id,model.flat).views[0].zones.find(zone=>zone.id==='base')!;
      const points=parseSvgPath(front.d).flatMap(command=>command.op==='Z'?[]:[command.p]);
      const peaks=points.filter((point,index)=>index>0&&index<points.length-1&&point.y<points[index-1].y&&point.y<points[index+1].y);
      expect(peaks,model.id).toHaveLength(Number(model.params!.puntas));
    }
  });
});

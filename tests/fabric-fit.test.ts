import { expect,it } from 'vitest';
import { coverFabric, fabricRepeat } from '../src/features/studio/fabricFit';
import type { Fabric } from '../src/store/types';
const fabric={visualRepeatMm:100,grainAngle:25,photo:{pxW:800,pxH:400}} as Fabric;
const fill={type:'tela' as const,fabricId:'f',rotation:15,offsetX:0,offsetY:0,scale:1};
it('cubre una parte con una foto sin deformarla y la centra, sin mutar la muestra',()=>{
 const next=coverFabric(fill,fabric,{minX:-100,minY:20,maxX:100,maxY:420});
 expect(next.scale).toBe(8);expect(next.rotation).toBe(-25);
 expect(next.offsetX).toBe(-400);expect(next.offsetY).toBe(20);
 expect(fabricRepeat(fabric)).toEqual({w:100,h:50});expect(fill.scale).toBe(1);
});
it('conserva la calibración real y permite volver a repetición sin modificar patrón',()=>{
 const measured={...fabric,calibration:{mmPerPx:.25,refMm:50}};
 expect(fabricRepeat(measured)).toEqual({w:200,h:100});
 expect(coverFabric(fill,measured,{minX:0,minY:0,maxX:500,maxY:100}).scale).toBe(2.5);
 expect(measured.calibration.mmPerPx).toBe(.25);
 expect(coverFabric(fill,measured,{minX:0,minY:0,maxX:0,maxY:0})).toBe(fill);
});

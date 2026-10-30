import { describe, it, expect } from 'vitest';
import { newDesign, newElement, DesignView } from '../src/features/studio/model';
import { surfaceAt, fillSurface } from '../src/features/studio/surfaces';
const view: DesignView = {id:'v',kind:'frente',label:'Frente',source:{type:'vacia'},minX:0,minY:0,width:200,height:200,refY:0,refLabel:'Arriba',zones:[{id:'zone',label:'Delantero',type:'delantero',d:'M0 0 H200 V200 H0 Z'}]};
describe('Aplicar material sobre contornos', () => {
  it('detecta zona bajo esquinas vacías de una elipse, no su caja', () => {
    const doc = newDesign([view]);
    doc.elements=[newElement('v',{id:'e',x:100,y:100,w:80,h:80,shape:{type:'ellipse'}})];
    expect(surfaceAt(doc,view,{x:100,y:100})?.id).toBe('e');
    expect(surfaceAt(doc,view,{x:62,y:62})?.id).toBe('zone');
  });
  it('respeta recortes, máscaras, orden y bloqueo', () => {
    const doc=newDesign([view]);
    const el=newElement('v',{id:'e',x:100,y:100,w:100,h:100,clip:[[-.5,-.5],[0,-.5],[0,.5],[-.5,.5]]});
    doc.elements=[el];
    expect(surfaceAt(doc,view,{x:70,y:100})?.id).toBe('e');
    expect(surfaceAt(doc,view,{x:125,y:100})?.id).toBe('zone');
    doc.elements[0]={...el,locked:true};
    expect(surfaceAt(doc,view,{x:70,y:100})?.id).toBe('zone');
    doc.elements[0]={...el,clip:undefined,maskZoneId:'inexistente'};
    expect(surfaceAt(doc,view,{x:70,y:100})?.id).toBe('zone');
  });
  it('guarda la tela sin cambiar la geometría y permite deshacer por documento', () => {
    const doc=newDesign([view]);
    const target=surfaceAt(doc,view,{x:20,y:20})!;
    const next=fillSurface(doc,'v',target,{type:'tela',fabricId:'denim',rotation:0,offsetX:0,offsetY:0,scale:1});
    expect(next.views[0].zoneFills?.zone).toMatchObject({fabricId:'denim'});
    expect(next.views[0].zones).toEqual(view.zones);
    expect(doc.views[0].zoneFills).toBeUndefined();
  });
});

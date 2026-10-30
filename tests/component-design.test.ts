import { describe, expect, it } from 'vitest';
import { COMPONENT_OPTIONS, createComponent, makeComponent, optionsForProject } from '../src/data/components';
import { findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { newElement, type DesignDoc } from '../src/features/studio/model';
import { removeElements } from '../src/features/studio/ops';
import { buildPattern } from '../src/lib/pattern/engine';
import { componentDesignIssues, componentElementId, componentGroupId, componentIdForElement, componentMaterials, isComponentElementId, normalizeComponentDesign, readComponentsFromDesign, reconcileComponentDesign, syncComponentDesign } from '../src/features/customize/componentDesign';
import type { Fabric } from '../src/store/types';

function fixture(preset = 'cargo') {
  const base = projectFromModel(findModel('individual-reversible')!);
  const component = makeComponent(base,preset);
  return syncComponentDesign({ ...base, pattern: { ...base.pattern!, components: [component] } });
}

describe('Complementos del catálogo vinculados al estudio', () => {
  it('construye todos los presets originales con sus medidas y materiales específicos', () => {
    expect(COMPONENT_OPTIONS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(COMPONENT_OPTIONS.map(option => option.id)).size).toBe(COMPONENT_OPTIONS.length);
    const base = projectFromModel(findModel('individual-reversible')!);
    for (const option of COMPONENT_OPTIONS) {
      const component = createComponent(option,option.id);
      const built = buildPattern({ ...base.pattern!, components: [component] });
      expect(built.issues.filter(issue => issue.level === 'error'),option.name).toEqual([]);
      if(option.kind==='cinta-comprada') {
        expect(built.pieces.some(piece=>piece.id.startsWith(`componente-${option.id}-`)),option.name).toBe(false);
        expect(built.result?.materials.some(material=>material.label.includes(option.name)),option.name).toBe(true);
      } else expect(built.pieces.some(piece => piece.name.includes(option.name)),option.name).toBe(true);
      if (option.hardware) for (const hardware of option.hardware) expect(built.result?.materials.some(material => material.label === hardware.label),option.name).toBe(true);
    }
  });

  it('sugiere según la base sin confundir accesorios con prendas', () => {
    const pants = projectFromModel(findModel('pantalon-recto-elastico')!);
    const bag = projectFromModel(findModel('tote-basica') ?? findModel('individual-reversible')!);
    const ids = optionsForProject(pants).map(option => option.id);
    expect(ids).toContain('cargo');
    expect(ids).toContain('porta-martillo');
    expect(ids).toContain('trabilla-cinturon');
    expect(ids).not.toContain('trabilla-colgar');
    expect(optionsForProject(bag).some(option => option.id === 'trabilla-colgar')).toBe(true);
  });

  it('conserva nombre del preset, centro y etiqueta de montaje al guardar', () => {
    const project = fixture('lapices');
    const component = project.pattern!.components![0];
    expect(component.name).toBe('Organizador para lápices');
    expect(component.presetId).toBe('lapices');
    component.placement!.label='Muslo derecho';
    const synced = syncComponentDesign(project);
    expect(readComponentsFromDesign(synced,synced.design!)[0].placement?.label).toBe('Muslo derecho');
    expect(componentDesignIssues(synced)).toEqual([]);
  });

  it('repite sincronización sin duplicados y conserva telas, colores y dibujos ajenos', () => {
    const project = fixture();
    const component = project.pattern!.components![0];
    const bodyId = componentElementId(component.id,'cuerpo');
    const unrelated = newElement(project.design!.views[0].id,{name:'Mi estrella',kind:'forma',shape:{type:'star'},fill:{type:'color',color:'#ff0000'}});
    const doc: DesignDoc={...project.design!,elements:[...project.design!.elements.map(element=>element.id===bodyId?{...element,fill:{type:'tela' as const,fabricId:'gabardina',rotation:15,scale:1.2,offsetX:3,offsetY:4}}:element),unrelated]};
    const next=syncComponentDesign({...project,design:doc});
    const again=syncComponentDesign(next);
    expect(again.design!.elements.map(element=>element.id)).toEqual(next.design!.elements.map(element=>element.id));
    expect(again.design!.elements.find(element=>element.id===bodyId)?.fill).toEqual(doc.elements.find(element=>element.id===bodyId)?.fill);
    expect(again.design!.elements.find(element=>element.id===unrelated.id)).toEqual(unrelated);
    expect(again.design!.elements.every(element=>!isComponentElementId(element.id)||element.technique==='ninguna')).toBe(true);
    expect(componentDesignIssues(again)).toEqual([]);
  });

  it('usa el tamaño real del cuerpo editado y reconstruye detalles acotados tras redimensionar', () => {
    const project=fixture('solapa-boton');
    const component=project.pattern!.components![0];
    const bodyId=componentElementId(component.id,'cuerpo');
    const doc=normalizeComponentDesign({...project.design!,elements:project.design!.elements.map(element=>element.id===bodyId?{...element,w:260,h:330,x:145,y:310}:element)});
    const next=reconcileComponentDesign({...project,design:doc});
    expect(next.pattern!.components![0]).toMatchObject({width:260,height:330,placement:{x:145,y:310}});
    const body=buildPattern(next.pattern!).pieces.find(piece=>piece.id===`componente-${component.id}-cuerpo`)!;
    expect(Math.max(...body.nodes.map(node=>node.x))).toBe(260);
    expect(Math.max(...body.nodes.map(node=>node.y))).toBe(330);
    expect(componentDesignIssues(next)).toEqual([]);
  });

  it('elimina solo el complemento seleccionado y Deshacer recupera su definición completa', () => {
    const project=fixture();
    const first=project.pattern!.components![0];
    const second=makeComponent(project,'cierre-horizontal');
    const ready=syncComponentDesign({...project,pattern:{...project.pattern!,components:[first,second]}});
    const deletedDoc=removeElements(ready.design!,[componentGroupId(first.id)]);
    const deleted=reconcileComponentDesign({...ready,design:deletedDoc});
    expect(deleted.pattern!.components!.map(component=>component.id)).toEqual([second.id]);
    expect(deleted.design!.elements.some(element=>componentIdForElement(element.id)===first.id)).toBe(false);
    const restored=reconcileComponentDesign({...deleted,design:ready.design});
    expect(restored.pattern!.components!.map(component=>component.id)).toEqual([first.id,second.id]);
    expect(restored.pattern!.components![0].depth).toBe(first.depth);
    expect(syncComponentDesign(deleted).pattern!.components!.map(component=>component.id)).toEqual([second.id]);
  });

  it('borrar el cuerpo desde capas quita sus partes huérfanas y mantiene el historial', () => {
    const project=fixture();
    const component=project.pattern!.components![0];
    const bodyId=componentElementId(component.id,'cuerpo');
    const result=reconcileComponentDesign({...project,design:{...project.design!,elements:project.design!.elements.filter(element=>element.id!==bodyId)}});
    expect(result.pattern!.components).toEqual([]);
    expect(result.design!.elements.filter(element=>componentIdForElement(element.id)===component.id)).toEqual([]);
    expect(result.design!.componentSelections).toHaveLength(1);
  });

  it('registra telas reales por pieza sin convertir la referencia de color en existencias', () => {
    const project=fixture('solapa-boton');
    const component=project.pattern!.components![0];
    const doc={...project.design!,elements:project.design!.elements.map(element=>element.id===componentElementId(component.id,'cuerpo')?{...element,fill:{type:'tela' as const,fabricId:'mezclilla',rotation:0,scale:1,offsetX:0,offsetY:0}}:element)};
    const fabrics={mezclilla:{id:'mezclilla',name:'Mezclilla azul de mi foto',color:'#224466'} as Fabric};
    const next=reconcileComponentDesign({...project,design:doc},fabrics);
    expect(next.pattern!.components![0].materials?.cuerpo).toEqual({fabricId:'mezclilla',name:'Mezclilla azul de mi foto',color:'#224466'});
    expect(componentMaterials(next,fabrics).find(material=>material.fabricId==='mezclilla')).toMatchObject({componentId:component.id,fabricName:'Mezclilla azul de mi foto'});
    expect(next.pattern!.components![0].materials?.solapa?.name).toContain('tela por elegir');
  });

  it('rechaza forma, recorte o piezas separadas que no coincidan con el patrón', () => {
    const project=fixture('solapa-boton');
    const component=project.pattern!.components![0];
    const change=(id:string,patch:Record<string,unknown>)=>({...project,design:{...project.design!,elements:project.design!.elements.map(element=>element.id===id?{...element,...patch}:element)}});
    expect(componentDesignIssues(change(componentElementId(component.id,'cuerpo'),{clip:[[0,0],[.5,0],[0,.5]]}))).not.toEqual([]);
    expect(componentDesignIssues(change(componentElementId(component.id,'solapa'),{x:999}))).not.toEqual([]);
    expect(componentDesignIssues(change(componentGroupId(component.id),{hidden:true}))).not.toEqual([]);
    expect(componentDesignIssues(project)).toEqual([]);
    expect(componentIdForElement('mi-componente-pintado')).toBeUndefined();
  });
});

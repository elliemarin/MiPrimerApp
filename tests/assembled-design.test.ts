import { describe, expect, it } from 'vitest';
import { CATALOG, findModel } from '../src/data/catalog';
import { projectFromModel } from '../src/store/projects';
import { prepareSimpleProject } from '../src/features/simple/workflow';
import { profileFromSize } from '../src/store/profiles';
import { quickSize } from '../src/lib/sizes/quickSizes';
import { assemblyArtworkMatrix, assemblyArtworkReflection, assemblyComponentFits, assemblyHit, assemblyPoint, assemblySurfaceForElement, buildAssembly, firstFittingAssemblyPosition, inverseAssemblyPoint, type AssemblySurface } from '../src/features/simple/assembled';
import { newElement } from '../src/features/studio/model';
import { COMPONENT_OPTIONS, createComponent } from '../src/data/components';
import { componentElementId, syncComponentDesign } from '../src/features/customize/componentDesign';
import { basePanelPattern } from '../src/features/studio/panelWorkflow';
import { componentAtPoint, componentFits } from '../src/features/customize/placementDrag';
import type { Project } from '../src/store/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssemblyArtwork } from '../src/features/simple/AssemblyArtwork';
import { buildFlat } from '../src/data/flats';
import { groupCatalog } from '../src/features/library/groups';
import { modelHasPattern } from '../src/features/library/filters';
import { SIZE_TABLES } from '../src/lib/sizes/tables';
import { matApply } from '../src/lib/geom/vec';
import { COSTUME_EXPANSION_CATALOG } from '../src/data/costumeExpansion';
import { COSTUME_SURFACE_PIECES } from '../src/data/costumeFlats';

const size=quickSize('mujer','mediana');
const modelProject=(id:string)=>prepareSimpleProject(projectFromModel(findModel(id)!,profileFromSize(size.table,size.row)));
const center=(s:AssemblySurface)=>({x:(s.physicalBounds.minX+s.physicalBounds.maxX)/2,y:(s.physicalBounds.minY+s.physicalBounds.maxY)/2});
const hoodieId=()=>CATALOG.find(model=>model.generatorId==='sudadera-capucha-holgada'&&model.params?.capucha==='si')!.id;

describe('prenda armada con coordenadas físicas reversibles',()=>{
  it('cubre cada diseño editable previo y pañalero, sin transformaciones inválidas ni piezas ajenas',()=>{
    const groups=groupCatalog(CATALOG.filter(model=>modelHasPattern(model)&&!model.generatorId?.startsWith('cosplay-')));
    const babyTable=SIZE_TABLES.find(table=>table.id==='ref-bebe-meses')!,kidTable=SIZE_TABLES.find(table=>table.id==='ref-infantil-estatura')!;
    const fallback:string[]=[],missingPrimary:string[]=[];
    expect(groups.length).toBeGreaterThanOrEqual(70);
    for(const group of groups) {
      const model=group.representative,childOnly=!model.recipients.some(recipient=>['mujer','hombre','unisex'].includes(recipient));
      const profile=model.recipients.includes('bebe')&&!model.recipients.includes('mujer')?profileFromSize(babyTable,babyTable.rows[0]):childOnly?profileFromSize(kidTable,kidTable.rows.find(row=>row.code==='E116')!):profileFromSize(size.table,size.row);
      const project=prepareSimpleProject(projectFromModel(model,profile)),scenes=buildAssembly(project);
      expect(scenes.length,model.id).toBeGreaterThan(0);
      if(scenes[0].label==='Diseño') fallback.push(group.id);
      if(!scenes.some(scene=>scene.surfaces.some(surface=>surface.primary))) missingPrimary.push(group.id);
      for(const scene of scenes) {
        expect([scene.view.minX,scene.view.minY,scene.view.width,scene.view.height].every(Number.isFinite),model.id).toBe(true);
        expect(scene.view.width>0&&scene.view.height>0,model.id).toBe(true);
        for(const surface of scene.surfaces) {
          expect([...surface.matrix,...surface.inverse,...Object.values(surface.physicalBounds)].every(Number.isFinite),`${model.id}/${surface.id}`).toBe(true);
          const point=center(surface),restored=inverseAssemblyPoint(surface,assemblyPoint(surface,point));
          expect(restored.x,model.id).toBeCloseTo(point.x,6);expect(restored.y,model.id).toBeCloseTo(point.y,6);
          expect(project.design!.views.some(view=>view.id===surface.viewId&&view.source.type==='pieza'&&view.source.pieceId===surface.pieceId),model.id).toBe(true);
          expect(surface.pieceId,model.id).not.toMatch(/componente-|entretela|forro|refuerzo/);
        }
      }
      if(['pantalon','top','falda','bolso','bebe'].includes(model.flat.family)&&!model.generatorId?.includes('capa')) expect(scenes.map(scene=>scene.label),model.id).toEqual(['Frente','Espalda']);
    }
    expect(fallback.sort()).toEqual(['babero','gorro','tipo-cojin','tipo-dona-cabello','tipo-banderin'].sort());
    expect(missingPrimary).toEqual([]);
  });
  it('presenta frente/espalda completos y cada vista remite a sus piezas reales',()=>{
    for(const id of ['jogger',hoodieId(),'falda-fruncida','bolsa-tote']) {
      const project=modelProject(id),before=JSON.stringify(project),scenes=buildAssembly(project);
      expect(scenes.map(s=>s.id)).toEqual(['armado-frente','armado-espalda']);
      expect(scenes.every(scene=>scene.surfaces.length>0)).toBe(true);
      for(const scene of scenes) {
        expect(scene.view.zones.every(z=>z.type!=='bolsillo')).toBe(true);
        expect(new Set(scene.surfaces.map(s=>s.id)).size).toBe(scene.surfaces.length);
        for(const surface of scene.surfaces) {
          expect(surface.view.source.type).toBe('pieza');
          expect(project.design!.views).toContain(surface.view);
          for(const fx of [.2,.5,.8]) for(const fy of [.2,.5,.8]) {
            const b=surface.physicalBounds,p={x:b.minX+(b.maxX-b.minX)*fx,y:b.minY+(b.maxY-b.minY)*fy};
            const actual=inverseAssemblyPoint(surface,assemblyPoint(surface,p));
            expect(actual.x).toBeCloseTo(p.x,7);expect(actual.y).toBeCloseTo(p.y,7);
          }
        }
      }
      expect(JSON.stringify(project)).toBe(before);
    }
  });

  it('un bolsillo se coloca en una pierna y conserva su patrón independiente tras guardar/reabrir',()=>{
    let project=modelProject('jogger');
    const scene=buildAssembly(project)[0],legs=scene.surfaces.filter(s=>s.pieceId==='delantero');
    expect(legs).toHaveLength(2);
    expect(new Set(legs.map(s=>s.label)).size).toBe(2);
    const chosen=legs[1],point={...center(chosen),y:200};
    const hit=assemblyHit(scene,assemblyPoint(chosen,point),chosen.id)!;
    expect(hit.surface.id).toBe(chosen.id);expect(hit.point.x).toBeCloseTo(point.x);
    const base=basePanelPattern(project)!;
    const extra=componentAtPoint({...createComponent(COMPONENT_OPTIONS.find(o=>o.kind==='bolsillo-parche')!,'unico',chosen.view),width:70,height:80},chosen.view,point);
    extra.placement={...extra.placement!,assemblySurfaceId:chosen.id,assemblySurfaceLabel:chosen.label};
    expect(componentFits(extra,chosen.view,base.pieces)).toBe(true);
    project=syncComponentDesign({...project,pattern:{...project.pattern!,components:[extra]}});
    project=JSON.parse(JSON.stringify(project)) as Project;
    const reopened=buildAssembly(project)[0],body=project.design!.elements.find(e=>e.id===componentElementId('unico','cuerpo'))!;
    expect(assemblySurfaceForElement(reopened,project,body)?.id).toBe(chosen.id);
    expect(assemblySurfaceForElement(buildAssembly(project)[1],project,body)).toBeUndefined();
    const built=basePanelPattern(project)!;
    expect(built.pieces.some(piece=>piece.id.startsWith('componente-unico'))).toBe(true);
    expect(built.pieces.find(piece=>piece.id==='delantero')!.nodes).toEqual(base.pieces.find(piece=>piece.id==='delantero')!.nodes);
  });

  it('hereda la instancia de un grupo y migra visualmente objetos antiguos sin duplicarlos',()=>{
    const project=modelProject('jogger'),scene=buildAssembly(project)[0],legs=scene.surfaces.filter(s=>s.pieceId==='delantero');
    const root=newElement(legs[1].viewId,{id:'grupo',kind:'grupo',...center(legs[1]),assemblySurfaceId:legs[1].id});
    const child=newElement(root.viewId,{id:'hoja',parentId:root.id,...center(legs[1])});
    project.design={...project.design!,elements:[root,child]};
    expect(assemblySurfaceForElement(scene,project,child)?.id).toBe(legs[1].id);
    root.assemblySurfaceId=undefined;
    expect(assemblySurfaceForElement(scene,project,root)?.id).toBe(legs[0].id);
    expect(assemblySurfaceForElement(scene,project,child)?.id).toBe(legs[0].id);
    root.assemblySurfaceId='armado-espalda/pierna-b';
    expect(assemblySurfaceForElement(scene,project,child)).toBeUndefined();
  });

  it('no refleja un bordado de manga delantera en su cara trasera',()=>{
    const project=modelProject(hoodieId()),[front,back]=buildAssembly(project);
    const f=front.surfaces.find(s=>s.pieceId==='manga')!,b=back.surfaces.find(s=>s.pieceId==='manga')!;
    expect(f.physicalBounds.maxY).toBe(b.physicalBounds.minY);
    const el=newElement(f.viewId,{...center(f)});
    expect(assemblySurfaceForElement(front,project,el)?.id).toBe(f.id);
    expect(assemblySurfaceForElement(back,project,el)).toBeUndefined();
    expect(assemblyHit(front,{x:front.view.minX-100,y:front.view.minY-100})).toBeUndefined();
  });

  it('desdobla la falda conservando dos mitades y una única coordenada física por extra',()=>{
    const project=modelProject('falda-fruncida'),scene=buildAssembly(project)[0];
    const halves=scene.surfaces.filter(s=>s.pieceId==='delantera');
    expect(halves).toHaveLength(2);
    const point=center(halves[0]),a=assemblyPoint(halves[0],point),b=assemblyPoint(halves[1],point);
    expect(a.x).toBeLessThan(0);expect(b.x).toBeGreaterThan(0);
    expect(assemblyHit(scene,a)?.surface.id).toBe(halves[0].id);
    expect(assemblyHit(scene,b)?.surface.id).toBe(halves[1].id);
  });

  it('busca bolsillos dentro de la cara de manga escogida y no los desplaza a la otra',()=>{
    const project=modelProject(hoodieId()),[front,back]=buildAssembly(project),pieces=basePanelPattern(project)!.pieces;
    const f=front.surfaces.find(s=>s.pieceId==='manga')!,b=back.surfaces.find(s=>s.pieceId==='manga')!;
    const pocket={...createComponent(COMPONENT_OPTIONS.find(o=>o.kind==='bolsillo-parche')!,'manga',f.view),width:45,height:50};
    const wrongFace=componentAtPoint(pocket,f.view,center(b));
    expect(componentFits(wrongFace,f.view,pieces)).toBe(true);
    expect(assemblyComponentFits(f,wrongFace)).toBe(false);
    const placed=firstFittingAssemblyPosition(pocket,f,pieces,center(b))!;
    expect(placed).toBeDefined();expect(placed.placement?.assemblySurfaceId).toBe(f.id);
    expect(assemblyComponentFits(f,placed)).toBe(true);expect(assemblyComponentFits(b,placed)).toBe(false);
    expect(placed.width).toBe(45);expect(placed.height).toBe(50);
    const tooLarge={...pocket,height:f.physicalBounds.maxY-f.physicalBounds.minY+5};
    expect(firstFittingAssemblyPosition(tooLarge,f,pieces)).toBeUndefined();
  });

  it('muestra cada color del bordado agrupado una sola vez, y la selección corresponde al grupo',()=>{
    const project=modelProject('jogger'),scene=buildAssembly(project)[0],surface=scene.surfaces.find(s=>s.pieceId==='delantero')!;
    const group=newElement(surface.viewId,{id:'abeja-grupo',kind:'grupo',assemblySurfaceId:surface.id,...center(surface),w:50,h:40});
    const yellow=newElement(surface.viewId,{id:'abeja-amarilla',parentId:group.id,...center(surface),fill:{type:'color',color:'#FACB13'},w:50,h:40});
    const black=newElement(surface.viewId,{id:'abeja-negra',parentId:group.id,...center(surface),fill:{type:'color',color:'#17231E'},w:20,h:40});
    project.design={...project.design!,elements:[group,yellow,black]};
    const markup=renderToStaticMarkup(createElement('svg',null,createElement(AssemblyArtwork,{scene,project,fabrics:{},selectedId:group.id})));
    expect(markup.match(/data-assembly-element="abeja-grupo"/g)).toHaveLength(1);
    expect(markup.match(/fill="#FACB13"/g)).toHaveLength(1);
    expect(markup.match(/fill="#17231E"/g)).toHaveLength(1);
    expect(markup.match(/stroke="#18785c"/g)).toHaveLength(1);
    group.hidden=true;
    expect(renderToStaticMarkup(createElement('svg',null,createElement(AssemblyArtwork,{scene,project,fabrics:{}})))).not.toContain('abeja-grupo');
  });

  it('omite las aperturas decorativas de bolsillos que el patrón base no confecciona',()=>{
    const project=modelProject('jogger'),scene=buildAssembly(project)[0],model=findModel('jogger')!;
    const stock=buildFlat(model.id,model.flat).views[0];
    const plain=buildFlat(model.id,{...model.flat,pants:{...model.flat.pants!,pockets:'ninguno'}}).views[0];
    const unsupported=stock.details.filter(detail=>!plain.details.some(d=>d.d===detail.d));
    expect(unsupported).toHaveLength(2);
    expect(scene.view.details?.some(d=>unsupported.some(p=>p.d===d.d))).toBe(false);
  });

  it('mantiene letras y cámaras legibles en piezas espejo sin alterar centro, ancho ni patrón de bordado',()=>{
    const project=modelProject('jogger'),scene=buildAssembly(project)[0],legs=scene.surfaces.filter(s=>s.pieceId==='delantero');
    for(const surface of legs) {
      const root=newElement(surface.viewId,{id:'texto',...center(surface),w:80,h:30,rotation:0,flipX:false});
      const before=JSON.stringify(root),m=assemblyArtworkMatrix(surface,root),r=assemblyArtworkReflection(surface,root);
      expect(m[0]*m[3]-m[1]*m[2]).toBeGreaterThan(0);
      const expected=assemblyPoint(surface,root),actual=matApply(m,root);
      expect(actual.x).toBeCloseTo(expected.x,8);expect(actual.y).toBeCloseTo(expected.y,8);
      expect(Math.abs(matApply(m,{x:root.x+root.w/2,y:root.y}).x-matApply(m,{x:root.x-root.w/2,y:root.y}).x)).toBeCloseTo(root.w*Math.abs(surface.matrix[0]),8);
      expect(matApply(r,matApply(r,{x:root.x+15,y:root.y-8}))).toEqual({x:root.x+15,y:root.y-8});
      expect(JSON.stringify(root)).toBe(before);
    }
    const mirrored=legs.find(surface=>surface.matrix[0]<0)!;
    expect(assemblyArtworkReflection(mirrored,center(mirrored))[0]).toBe(-1);
  });

  it('enlaza las 40 construcciones nuevas de disfraces con sus caras, reversos e instancias declaradas',()=>{
    expect(COSTUME_EXPANSION_CATALOG).toHaveLength(40);
    let visibleReverses=0,mirroredParts=0;
    for(const model of COSTUME_EXPANSION_CATALOG) {
      const project=prepareSimpleProject(projectFromModel(model,profileFromSize(size.table,size.row)));
      const scenes=buildAssembly(project),binding=COSTUME_SURFACE_PIECES[model.flat.costume!]!;
      expect(scenes.map(s=>s.id),model.id).toEqual(['armado-frente','armado-espalda']);
      for(const scene of scenes) {
        const expected=binding[scene.view.kind];
        expect(scene.surfaces,`${model.id}/${scene.label}`).toHaveLength(expected.length);
        for(const actual of scene.surfaces) {
          const source=expected.find(part=>part.zoneId===actual.zoneId)!;
          expect(actual.pieceId,`${model.id}/${actual.zoneId}`).toBe(source.pieceId);
          expect(actual.matrix[0]<0,`${model.id}/${actual.zoneId}`).toBe(source.mirror);
          expect([...actual.matrix,...actual.inverse,...Object.values(actual.physicalBounds)].every(Number.isFinite),model.id).toBe(true);
          if(actual.pieceId?.includes('forro')) visibleReverses++;
          if(source.mirror) mirroredParts++;
          expect(actual.pieceId).not.toContain('refuerzo');
          const point=center(actual),restored=inverseAssemblyPoint(actual,assemblyPoint(actual,point));
          expect(restored.x).toBeCloseTo(point.x,6);expect(restored.y).toBeCloseTo(point.y,6);
        }
      }
    }
    expect(visibleReverses).toBeGreaterThan(20);expect(mirroredParts).toBeGreaterThan(20);
  });
});

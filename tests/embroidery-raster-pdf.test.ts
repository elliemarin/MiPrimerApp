import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PrintScaling, decodePDFRawStream } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { newDesign, newElement, type DesignView } from '../src/features/studio/model';
import { blankProject, projectFromModel } from '../src/store/projects';
import { embroideryForView } from '../src/features/projects/tabs/embroideryExport';
import { elementImage } from '../src/lib/draw/designImage';
import { drawableBBox, imageCorners, type Drawable } from '../src/lib/draw/drawable';
import { arrangeForTiles, exportTiledPdf, tilesWithContent } from '../src/lib/pdf/export';
import { computeGrid, DEFAULT_TILE } from '../src/lib/pdf/tile';
import { buildSewingPackPdf, prepareSewingPack, type SewingPackCtx } from '../src/lib/pdf/projectPack';
import { preparePlacementGuide } from '../src/lib/pdf/placement';
import { freezeDeps } from '../src/store/exports';
import { putFile } from '../src/lib/db';
import { exportProjectZip } from '../src/lib/zip';
import { findModel } from '../src/data/catalog';
import { profileFromSize } from '../src/store/profiles';
import { quickSize } from '../src/lib/sizes/quickSizes';
import { prepareSimpleProject } from '../src/features/simple/workflow';
import { assemblyArtworkReflection, buildAssembly } from '../src/features/simple/assembled';
import { matMul } from '../src/lib/geom/vec';
import type { StoredFile } from '../src/store/types';

// Asymmetric RGBA: red opaque, green 50%, blue transparent, yellow opaque.
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8DwHwgbGMA0EAEAPdkHevpJ8dsAAAAASUVORK5CYII=','base64');
const file:StoredFile={id:'logo-raster',name:'logo.png',type:'image/png',size:bytes.length,createdAt:'2026-10-31T00:00:00Z',blob:new Blob([bytes],{type:'image/png'})};
const view:DesignView={id:'frente',label:'Frente',kind:'detalle',source:{type:'vacia'},minX:0,minY:0,width:180,height:200,zones:[],refY:0,refLabel:'Origen'};
function logoProject() {
  const project=blankProject('Logo de prueba','intervencion');
  project.design=newDesign([view]);
  project.design.elements=[
    newElement(view.id,{id:'logo-grupo',name:'Mi logotipo',kind:'grupo',technique:'bordado',embroidery:{kind:'image'},x:85,y:90,w:50,h:25,rotation:37}),
    newElement(view.id,{id:'logo-imagen',parentId:'logo-grupo',name:'Mi logotipo',kind:'imagen',technique:'bordado',image:{fileId:file.id,naturalW:2,naturalH:2},x:85,y:90,w:50,h:25,rotation:37,flipX:true,fill:{type:'ninguno'}})
  ];
  return project;
}
const ctx:SewingPackCtx={profiles:{},fabrics:{},materials:{},unit:'cm',includePhotos:false,mode:'intervention',loadImageFile:async id=>id===file.id?file:undefined};
const info={title:'Logotipo 1:1',lines:[],footer:'Prueba',json:{},loadImageFile:ctx.loadImageFile};
function imageObjects(pdf:PDFDocument,pageIndex:number) {
  const objects=pdf.getPage(pageIndex).node.Resources()?.lookup(PDFName.of('XObject'),PDFDict);
  return objects?.entries().map(([,ref])=>pdf.context.lookup(ref)).filter((stream):stream is PDFRawStream=>stream instanceof PDFRawStream&&stream.dict.get(PDFName.of('Subtype'))===PDFName.of('Image'))??[];
}

describe('logotipos como imágenes reales en las guías de bordado',()=>{
  it('no fabrica un contorno de bordado y conserva tamaño, giro y volteo al acomodar',()=>{
    const project=logoProject();
    const preview=prepareSewingPack(project,ctx);
    expect(preview.blockers).toEqual([]);
    expect(preview.embroideryCount).toBe(1);
    const drawing=embroideryForView(project.design!,view.id)[0];
    expect(drawing.paths).toEqual([]);
    expect(drawing.images).toHaveLength(1);
    const corners=imageCorners(drawing.images![0]);
    expect(Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y)).toBeCloseTo(50,9);
    expect(Math.hypot(corners[3].x-corners[0].x,corners[3].y-corners[0].y)).toBeCloseTo(25,9);
    const packed=arrangeForTiles([drawing],DEFAULT_TILE)[0];
    expect(packed.images![0].matrix.slice(0,4)).toEqual(drawing.images![0].matrix.slice(0,4));
  });

  it('incrusta un PNG con su canal alpha y matriz física 50 × 25 mm',async()=>{
    const drawing=embroideryForView(logoProject().design!,view.id)[0];
    const result=await exportTiledPdf([drawing],{settings:DEFAULT_TILE},info);
    const pdf=await PDFDocument.load(result.bytes);
    const [image]=imageObjects(pdf,1);
    expect(image).toBeTruthy();
    const mask=pdf.context.lookup(image.dict.get(PDFName.of('SMask'))) as PDFRawStream;
    expect([...decodePDFRawStream(mask).decode()]).toEqual([255,128,0,255]);
    const contents=pdf.getPage(1).node.Contents() as PDFArray;
    const operations=Array.from({length:contents.size()},(_,i)=>Buffer.from(decodePDFRawStream(contents.lookup(i,PDFRawStream)).decode()).toString()).join('\n');
    const match=operations.match(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm\s*\/Image[^\s]* Do/)!;
    expect(match).toBeTruthy();
    const [a,b,c,d]=match.slice(1,5).map(Number);
    expect(Math.hypot(a,b)*25.4/72).toBeCloseTo(50,6);
    expect(Math.hypot(c,d)*25.4/72).toBeCloseTo(25,6);
    expect(a*d-b*c).toBeLessThan(0); // explicit horizontal flip survives PDF coordinates
    expect(pdf.catalog.getOrCreateViewerPreferences().getPrintScaling()).toBe(PrintScaling.None);
    if(process.env.PDF_OUT) {mkdirSync(process.env.PDF_OUT,{recursive:true});writeFileSync(`${process.env.PDF_OUT}/logo-raster.pdf`,result.bytes);}
  });

  it('conserva páginas interiores de una imagen grande aunque no tengan bordes ni etiquetas',()=>{
    const images=[{fileId:file.id,name:'Grande',matrix:[650,0,0,750,0,0] as [number,number,number,number,number,number]}];
    const drawing:Drawable={id:'grande',name:'Grande',paths:[],labels:[],grains:[],images,bbox:drawableBBox([],[],images)};
    const grid=computeGrid(drawing.bbox,DEFAULT_TILE);
    expect(tilesWithContent(grid,[drawing]).size).toBe(grid.tiles.length);
  });

  it('omite logos con padre oculto sin exigir sus archivos al exportar otro motivo visible',async()=>{
    const project=logoProject();
    project.design!.elements[0].hidden=true;
    project.design!.elements.push(newElement(view.id,{name:'Motivo visible',technique:'bordado',x:45,y:50,w:20,h:20}));
    expect(prepareSewingPack(project,ctx).embroideryCount).toBe(1);
    const drawings=embroideryForView(project.design!,view.id);
    expect(drawings).toHaveLength(1);
    expect(drawings[0].images).toBeUndefined();
    await expect(buildSewingPackPdf(project,{...ctx,loadImageFile:async()=>undefined})).resolves.toHaveProperty('bytes');
  });

  it('omite un logo dentro de un subgrupo oculto al resumir y ubicar un grupo visible',async()=>{
    const project=logoProject();
    const doc=project.design!;
    doc.elements[1].parentId='subgrupo-oculto';
    doc.elements.push(
      newElement(view.id,{id:'subgrupo-oculto',parentId:'logo-grupo',name:'Detalle oculto',kind:'grupo',technique:'bordado',hidden:true}),
      newElement(view.id,{id:'motivo-visible',parentId:'logo-grupo',name:'Motivo visible',technique:'bordado',x:85,y:90,w:20,h:20})
    );
    const placement=preparePlacementGuide(project);
    expect(placement.placements).toHaveLength(1);
    expect(placement.placements[0].id).toBe('logo-grupo');
    expect(placement.drawings.flatMap(drawing=>drawing.drawables.flatMap(drawable=>drawable.images??[]))).toEqual([]);
    expect(prepareSewingPack(project,ctx).embroideryCount).toBe(1);
    const result=await buildSewingPackPdf(project,{...ctx,loadImageFile:async()=>{throw new Error('No debe leer el archivo oculto');}});
    const pdf=await PDFDocument.load(result.bytes);
    expect(pdf.getPages().flatMap((_,index)=>imageObjects(pdf,index))).toEqual([]);
    expect(result.manifest.placements).toHaveLength(1);
  });

  it('separa el espejo de colocación de la plantilla independiente legible',()=>{
    const size=quickSize('mujer','mediana');
    const project=prepareSimpleProject(projectFromModel(findModel('jogger')!,profileFromSize(size.table,size.row)));
    const surface=buildAssembly(project)[0].surfaces.find(item=>assemblyArtworkReflection(item,{x:0})[0]<0)!;
    const element=newElement(surface.viewId,{id:'logo-espejo',name:'Logo lateral',kind:'imagen',technique:'bordado',image:{fileId:file.id,naturalW:2,naturalH:2},x:(surface.physicalBounds.minX+surface.physicalBounds.maxX)/2,y:240,w:50,h:25,rotation:18,assemblySurfaceId:surface.id,assemblySurfaceLabel:surface.label});
    project.design!.elements.push(element);
    const guide=preparePlacementGuide(project);
    expect(guide.placements[0].mirroredOnGuide).toBe(true);
    const original=elementImage(element)!;
    expect(guide.drawings[0].drawables[0].images![0].matrix).toEqual(matMul(assemblyArtworkReflection(surface,element),original.matrix));
    expect(embroideryForView(project.design!,surface.viewId)[0].images![0].matrix).toEqual(original.matrix);
  });

  it('incluye logo real en ficha, guía independiente y ubicación con dependencias congeladas',async()=>{
    const {project,deps}=freezeDeps(logoProject(),{},{design:true});
    const result=await buildSewingPackPdf(project,{...ctx,deps});
    expect(result.manifest.dependencies.imageFileIds).toEqual([file.id]);
    expect(result.manifest.placements).toEqual([expect.objectContaining({id:'logo-grupo',width:50,height:25,rotation:37})]);
    const pdf=await PDFDocument.load(result.bytes);
    for(const section of result.manifest.sections) {
      const indices=Array.from({length:section.endPage-section.startPage+1},(_,i)=>section.startPage-1+i);
      expect(indices.some(index=>imageObjects(pdf,index).length>0)).toBe(true);
    }
    if(process.env.PDF_OUT)writeFileSync(`${process.env.PDF_OUT}/logo-confeccion.pdf`,result.bytes);
  });

  it('bloquea archivos ausentes, corruptos y enlaces de imagen perdidos con explicación',async()=>{
    await expect(buildSewingPackPdf(logoProject(),{...ctx,loadImageFile:async()=>undefined})).rejects.toThrow('Vuelve a cargar el logotipo');
    await expect(buildSewingPackPdf(logoProject(),{...ctx,loadImageFile:async()=>({...file,blob:new Blob(['no es PNG'])})})).rejects.toThrow('dañada');
    const missing=logoProject();missing.design!.elements[1].image=undefined;
    expect(prepareSewingPack(missing,ctx).blockers.join(' ')).toContain('no tiene un archivo de imagen');
  });

  it('incluye el archivo exacto en ZIP y lo enlaza desde las vistas SVG',async()=>{
    await putFile(file);
    const project=logoProject();
    const zip=unzipSync(new Uint8Array(await (await exportProjectZip(project)).arrayBuffer()));
    const manifestPath=Object.keys(zip).find(path=>path.endsWith('/archivos.json'))!;
    const root=manifestPath.slice(0,-'archivos.json'.length);
    const manifest=JSON.parse(strFromU8(zip[manifestPath]));
    expect(zip[root+manifest[file.id]]).toEqual(new Uint8Array(bytes));
    const svg=strFromU8(zip[root+'diseno/vistas/Frente.svg']);
    expect(svg).toContain(`<image href="../../${manifest[file.id]}"`);
    expect(svg).toContain('transform="matrix(');
  });
});

import { describe, expect, it } from 'vitest';
import { EMBROIDERY_MOTIFS, EMBROIDERY_CATEGORY_LABEL, filterEmbroideryMotifs, findEmbroideryMotif } from '../src/data/embroideryMotifs';
import { createEmbroideryMotif } from '../src/lib/draw/embroideryMotifs';
import { createLettering, letteringOutline, LETTERING_FONTS } from '../src/lib/draw/lettering';
import { elementLocalCmds, newDesign, type DesignView } from '../src/features/studio/model';
import { cmdsToPolylines } from '../src/lib/draw/flatten';
import { parseSvgPath } from '../src/lib/draw/svgpath';
import { cmdsBBox } from '../src/lib/draw/paths';
import { signedArea } from '../src/lib/geom/vec';
import { embroideryForView } from '../src/features/projects/tabs/embroideryExport';

const view:DesignView={id:'frente',kind:'frente',label:'Frente',source:{type:'vacia'},minX:0,minY:0,width:500,height:700,zones:[],refY:0,refLabel:'Inicio'};

describe('biblioteca de bordados con color',()=>{
  it('ofrece al menos300 diseños distintos y composiciones identificadas, sin contar recolores ni tallas',()=>{
    expect(EMBROIDERY_MOTIFS.length).toBeGreaterThanOrEqual(300);
    expect(new Set(EMBROIDERY_MOTIFS.map(drawing=>drawing.id)).size).toBe(EMBROIDERY_MOTIFS.length);
    expect(new Set(EMBROIDERY_MOTIFS.map(drawing=>drawing.name)).size).toBe(EMBROIDERY_MOTIFS.length);
    expect(new Set(EMBROIDERY_MOTIFS.map(drawing=>drawing.parts.map(layer=>layer.d).join('|'))).size).toBe(EMBROIDERY_MOTIFS.length);
    for(const drawing of EMBROIDERY_MOTIFS) {
      expect(EMBROIDERY_CATEGORY_LABEL[drawing.category],drawing.id).toBeTruthy();
      if(drawing.category==='escenas'||drawing.category==='emblemas')expect(drawing.composition).toBe(true);
    }
  });
  it('todas las partes tienen contornos cerrados finitos y colores válidos dentro de su caja',()=>{
    for(const drawing of EMBROIDERY_MOTIFS) for(const layer of drawing.parts) {
      expect(layer.color,drawing.id).toMatch(/^#[a-f0-9]{6}$/i);
      const contours=cmdsToPolylines(parseSvgPath(layer.d),.1);
      expect(contours.length,drawing.id).toBeGreaterThan(0);
      for(const contour of contours) {
        expect(contour.closed,drawing.id).toBe(true);
        expect(contour.pts.length,drawing.id).toBeGreaterThan(2);
        for(const point of contour.pts) {
          expect(Number.isFinite(point.x)&&Number.isFinite(point.y),drawing.id).toBe(true);
          expect(point.x,`${drawing.id} x`).toBeGreaterThanOrEqual(-.02);
          expect(point.y,`${drawing.id} y`).toBeGreaterThanOrEqual(-.02);
          expect(point.x,`${drawing.id} x`).toBeLessThanOrEqual(100.02);
          expect(point.y,`${drawing.id} y`).toBeLessThanOrEqual(100.02);
        }
      }
    }
  });
  it('abeja mantiene amarillo, negro y alas como partes físicas y no como una sola silueta',()=>{
    const bee=findEmbroideryMotif('abeja')!;
    expect(new Set(bee.parts.map(layer=>layer.color))).toEqual(new Set(['#F5C842','#202824','#D9EFF2']));
    const created=createEmbroideryMotif('abeja',view.id,150,180,80);
    expect(created.elements.filter(element=>element.kind!=='grupo')).toHaveLength(bee.parts.length);
    expect(created.elements.every(element=>element.technique==='bordado')).toBe(true);
    expect(created.elements.filter(element=>element.parentId===created.groupId)).toHaveLength(bee.parts.length);
    expect(created.elements.find(element=>element.id===created.groupId)?.embroidery?.motifId).toBe('abeja');
    const doc={...newDesign([view]),elements:created.elements};
    const drawables=embroideryForView(doc,view.id);
    expect(drawables).toHaveLength(1);
    expect(drawables[0].paths).toHaveLength(bee.parts.length);
    expect(drawables[0].paths.every(path=>path.cmds.length>=4)).toBe(true);
    expect(drawables[0].paths.some(path=>path.cmds.some(command=>command.op==='C'))).toBe(true);
    expect(new Set(drawables[0].paths.map(path=>path.fillColor))).toEqual(new Set(['#F5C842','#202824','#D9EFF2']));
  });
  it('busca categorías y nombres sin acentos, y rechaza tamaños inválidos',()=>{
    expect(filterEmbroideryMotifs('abejita','insectos').map(drawing=>drawing.id)).toEqual(['abeja']);
    expect(filterEmbroideryMotifs('medallon','emblemas').length).toBeGreaterThan(20);
    expect(filterEmbroideryMotifs('ññpalabranoinventada')).toEqual([]);
    expect(()=>createEmbroideryMotif('abeja',view.id,0,0,NaN)).toThrow();
    expect(()=>createEmbroideryMotif('no-existe',view.id,0,0,70)).toThrow();
  });
});

describe('letras y números con contornos de tipografías OFL',()=>{
  it('incluye cinco fuentes con procedencia/licencia y letras españolas completas',()=>{
    expect(LETTERING_FONTS).toHaveLength(5);
    expect(new Set(LETTERING_FONTS.map(font=>font.id)).size).toBe(5);
    for(const font of LETTERING_FONTS) {
      expect(font.license).toBe('SIL OFL 1.1');
      expect(font.sha256).toMatch(/^[a-f0-9]{64}$/);
      for(const char of 'ABO8áéíóúüñÁÉÍÓÚÜÑ0123456789')expect(font.glyphs[char],`${font.id} ${char}`).toBeTruthy();
      expect(letteringOutline('Año 2026',font.id).unsupported).toEqual([]);
    }
  });
  it('conserva contraformas de O/8 y el dibujo original de B, incluidas las variantes manuscritas abiertas',()=>{
    for(const font of LETTERING_FONTS) for(const char of ['O','8']) {
      const outline=letteringOutline(char,font.id);
      const contours=cmdsToPolylines(parseSvgPath(outline.d),.05);
      const areas=contours.map(contour=>signedArea(contour.pts));
      expect(areas.some(area=>area>0),`${font.id} ${char}`).toBe(true);
      expect(areas.some(area=>area<0),`${font.id} ${char}`).toBe(true);
      expect(contours.length,`${font.id} ${char}`).toBeGreaterThanOrEqual(char==='O'?2:3);
    }
    for(const font of LETTERING_FONTS) {
      const original=parseSvgPath(font.glyphs.B.d),converted=parseSvgPath(letteringOutline('B',font.id).d);
      expect(converted.filter(command=>command.op==='M')).toHaveLength(original.filter(command=>command.op==='M').length);
      expect(converted.filter(command=>command.op==='C').length, font.id).toBeGreaterThan(3);
    }
  });
  it('el alto es la medida real del contorno con acentos, y su exportación no es un rectángulo de texto',()=>{
    const created=createLettering('B8O Año 2026','clara',view.id,200,220,40,'#D94F54');
    const body=created.elements.find(element=>element.kind!=='grupo')!;
    expect(body.kind).toBe('trazo');expect(body.vectorPath).toBeTruthy();expect(body.text).toBeUndefined();
    const commands=elementLocalCmds(body),bounds=cmdsBBox(commands);
    expect(bounds.maxY-bounds.minY).toBeCloseTo(40,6);
    expect(bounds.maxX-bounds.minX).toBeCloseTo(created.width,6);
    expect(commands.filter(command=>command.op==='M').length).toBeGreaterThan(15);
    const doc={...newDesign([view]),elements:created.elements};
    const drawings=embroideryForView(doc,view.id);
    expect(drawings).toHaveLength(1);expect(drawings[0].paths[0].cmds.length).toBe(commands.length);
    expect(created.elements.find(element=>element.kind==='grupo')?.embroidery?.text).toBe('B8O Año 2026');
  });
  it('explica caracteres no disponibles y no convierte emoji o texto vacío en cajas falsas',()=>{
    expect(letteringOutline('A🐝','clara').unsupported).toEqual(['🐝']);
    expect(()=>createLettering('A🐝','clara',view.id,0,0)).toThrow('no incluye');
    expect(()=>createLettering(' ','clara',view.id,0,0)).toThrow();
    expect(()=>createLettering('ABC','no-existe',view.id,0,0)).toThrow();
    expect(()=>createLettering('ABC','clara',view.id,0,0,0)).toThrow();
  });
});

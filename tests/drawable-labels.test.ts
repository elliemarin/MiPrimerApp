import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { labelBounds, labelTextWidth, pieceDrawable, wrapLabelText, type Drawable } from '../src/lib/draw/drawable';
import { pdfSafe } from '../src/lib/pdf/canvas';
import { buildPattern, newPatternState } from '../src/lib/pattern/engine';
import { bboxOf } from '../src/lib/geom/vec';
import { polylineCmds } from '../src/lib/draw/paths';
import { computeGrid, DEFAULT_TILE, tileRect } from '../src/lib/pdf/tile';
import { tilesWithContent } from '../src/lib/pdf/export';

describe('etiquetas de patrón legibles y completas',()=>{
  it('usa las mismas métricas de Helvetica y kerning que el PDF',async()=>{
    const pdf=await PDFDocument.create();
    for(const bold of [false,true]) {
      const font=await pdf.embedFont(bold?StandardFonts.HelveticaBold:StandardFonts.Helvetica);
      const text='AVATAR · Bolsillo, tela azul #336699 × 2';
      const expected=font.widthOfTextAtSize(pdfSafe(text),3.2*72/25.4*1.38)*25.4/72;
      expect(labelTextWidth(text,3.2,bold)).toBeCloseTo(expected,9);
    }
  });

  it('incluye las cuatro esquinas de una etiqueta girada en sus límites',()=>{
    const label={text:'Bolsillo con solapa y botón',at:{x:0,y:0},size:3,bold:true};
    const horizontal=labelBounds(label);
    const vertical=labelBounds({...label,angle:90});
    expect(vertical.maxY-vertical.minY).toBeCloseTo(horizontal.maxX-horizontal.minX,9);
    expect(vertical.maxX-vertical.minX).toBeCloseTo(horizontal.maxY-horizontal.minY,9);
    const diagonal=labelBounds({...label,angle:45});
    expect(diagonal.maxX-diagonal.minX).toBeGreaterThan((horizontal.maxX-horizontal.minX)*Math.SQRT1_2);
  });

  it('envuelve nombres y palabras largas sin perder letras ni reducir la geometría',()=>{
    const state=newPatternState('manual',{}, {kind:'otro',fabric:'plano',stretch:0,fit:'regular'});
    state.components=[{id:'compacto',kind:'bolsillo-parche',width:50,height:70,quantity:1}];
    const built=buildPattern(state);
    const piece=built.pieces[0];
    piece.name='Bolsillo portaherramientas pequeño con tela de contraste impermeable';
    const cut=built.cuts.get(piece.id)!;
    const before=JSON.stringify({piece,cut});
    const drawing=pieceDrawable(piece,cut,undefined,{subtitle:'Proyecto de herramientas',version:'Patrón v1'});
    expect(JSON.stringify({piece,cut})).toBe(before);
    expect(drawing.paths.find(path=>path.style==='corte')?.cmds).toEqual(polylineCmds(cut.points,true));
    expect(drawing.labels.filter(label=>label.bold).map(label=>label.text).join('').replace(/\s/g,'')).toBe(piece.name.replace(/\s/g,''));
    const available=Math.max(18,Math.hypot(piece.grain.b.x-piece.grain.a.x,piece.grain.b.y-piece.grain.a.y)-6);
    for(const label of drawing.labels) {
      expect(label.size).toBeGreaterThanOrEqual(2.4);
      expect(labelTextWidth(label.text,label.size,!!label.bold)).toBeLessThanOrEqual(available+.0001);
      const box=labelBounds(label);
      expect(box.minX).toBeGreaterThanOrEqual(drawing.bbox.minX-.0001);
      expect(box.maxY).toBeLessThanOrEqual(drawing.bbox.maxY+.0001);
    }
    const token='PALABRAEXTREMADAMENTELARGASINESPACIOS';
    const lines=wrapLabelText(token,2.4,18);
    expect(lines.join('')).toBe(token);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('conserva hojas que sólo contienen el texto completo de una pieza estrecha',()=>{
    const square=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];
    const drawing:Drawable={id:'pieza',name:'Pieza estrecha',paths:[{style:'corte',cmds:polylineCmds(square,true)}],grains:[],labels:[{text:'Etiqueta externa completa',at:{x:510,y:20},size:3,angle:25}],bbox:{minX:0,minY:0,maxX:550,maxY:60}};
    const grid=computeGrid(drawing.bbox,DEFAULT_TILE);
    const content=tilesWithContent(grid,[drawing]);
    const labelTile=grid.tiles.find(tile=>{const rect=tileRect(grid,tile);return rect.minX<510 && rect.maxX>510 && rect.minY<20 && rect.maxY>20;})!;
    expect(tileRect(grid,labelTile).minX).toBeGreaterThan(bboxOf(square).maxX);
    expect(content.has(labelTile.code)).toBe(true);
  });
});

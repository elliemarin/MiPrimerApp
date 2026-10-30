import type { Fabric, Material, Profile, Project } from '../../store/types';
import { STATUS_LABEL, ORIGIN_LABEL } from '../../store/types';
import { FlowDoc } from './doc';
import { PDF_STYLES } from './canvas';
import { parseSvgPath } from '../draw/svgpath';
import { pieceSeamCmds, transformCmds, PathCmd, polylineCmds, cmdsBBox } from '../draw/paths';
import type { DesignDoc, DesignView } from '../../features/studio/model';
import { elementWorldCmds, TECHNIQUE_LABEL, EDGE_LABEL } from '../../features/studio/model';
import { buildPattern, estimateFabric, PatternState } from '../pattern/engine';
import { shelfPack } from '../geom/pack';
import { bboxOf, matRotate, norm, sub } from '../geom/vec';
import { formatLength, Unit } from '../units';
import { computeCutouts, appliqueSteps, materialSummary } from '../../features/studio/despiece';
import { findModel } from '../../data/catalog';
import { MEASURE_BY_KEY } from '../sizes/measurements';
import { getFile } from '../db';
import type { Pt } from '../geom/vec';
import { APP_VERSION } from '../../store/app';
import { componentMaterials, isComponentElementId } from '../../features/customize/componentDesign';
import { materialTargets, simpleViews } from '../../features/simple/workflow';
import { preparePlacementGuide, type Placement } from './placement';
import { findLetteringFont } from '../draw/lettering';

export interface SummaryCtx {
  profiles: Record<string, Profile>;
  fabrics: Record<string, Fabric>;
  materials: Record<string, Material>;
  unit: Unit;
  includePhotos?: boolean;
}

function drawView(fd: FlowDoc, doc: DesignDoc, view: DesignView, fabrics: Record<string, Fabric>, box: { x: number; y: number; w: number; h: number }, placements: Placement[]) {
  const k = Math.min(box.w / view.width, box.h / view.height);
  const ox = box.x + (box.w - view.width * k) / 2;
  const oy = box.y + (box.h - view.height * k) / 2;
  const tx = (p: Pt): Pt => ({ x: ox + (p.x - view.minX) * k, y: oy + (p.y - view.minY) * k });
  for (const z of view.zones) {
    const cmds = parseSvgPath(z.d);
    const f = view.zoneFills?.[z.id];
    const color = f?.type === 'color' ? f.color : f?.type === 'tela' ? fabrics[f.fabricId]?.color : view.source.type === 'foto' ? undefined : '#ffffff';
    if (color) fd.cv.fillPathRgb(cmds, fd.fillColor(color), tx);
    fd.cv.strokePath(cmds, view.source.type === 'foto' ? PDF_STYLES.colocacion : { width: 0.6, dash: [], gray: 0.1 }, tx);
  }
  for (const d of view.details ?? []) fd.cv.strokePath(parseSvgPath(d.d), d.style === 'pespunte' ? { width: 0.35, dash: [1.4, 1], gray: 0.1 } : { width: 0.35, dash: [], gray: 0.2 }, tx);
  if (view.source.type === 'foto') fd.cv.rect(box.x, box.y, box.w, box.h, PDF_STYLES.referencia);
  const els = doc.elements.filter((e) => e.viewId === view.id && !e.hidden && e.kind !== 'grupo');
  let number=0;
  els.forEach((e) => {
    const cmds = elementWorldCmds(e);
    const color = e.fill.type === 'color' ? e.fill.color : e.fill.type === 'tela' ? fabrics[e.fill.fabricId]?.color : undefined;
    if (color && e.kind !== 'texto' && e.kind !== 'imagen') fd.cv.fillPathRgb(cmds, fd.fillColor(color), tx);
    fd.cv.strokePath(cmds, e.technique === 'bordado' ? PDF_STYLES.bordado : { width: 0.45, dash: [], gray: 0.05 }, tx);
    const embroideryParent=e.parentId&&doc.elements.some(parent=>parent.id===e.parentId&&parent.embroidery);
    if(!isComponentElementId(e.id)&&!embroideryParent&&!placements.some(placement=>placement.id===e.id)) {
      const b = cmdsBBox(cmds);
      const p = tx({ x: b.maxX, y: b.minY });
      fd.cv.text(`${++number}`, p.x + 1.5, p.y, 2.4, { bold: true });
    }
  });
  const codePositions:Pt[]=[];
  for(const placement of placements.filter(item=>item.viewId===view.id)) {
    const at=tx({x:placement.x+placement.width/2,y:placement.y-placement.height/2});
    const label={x:at.x+1.5,y:at.y};
    while(codePositions.some(previous=>Math.abs(previous.x-label.x)<9&&Math.abs(previous.y-label.y)<4.5))label.y-=5;
    if(label.y!==at.y)fd.cv.line(at,{x:label.x,y:label.y+1.5},PDF_STYLES.referencia);
    codePositions.push(label);
    fd.cv.text(placement.code,label.x,label.y,2.6,{bold:true});
  }
  fd.cv.text(view.label, box.x + box.w / 2, box.y + box.h + 4, 3, { anchor: 'middle', bold: true });
}

function colorName(hex:string):string {
  const references:[string,string][]=[['Negro','#202824'],['Blanco','#FFFFFF'],['Amarillo','#F5C842'],['Rojo','#D94F54'],['Rosa','#E78FAD'],['Verde','#4C8864'],['Verde claro','#9FCDA0'],['Azul','#5484BA'],['Azul claro','#D9EFF2'],['Naranja','#E89042'],['Marrón','#95634B'],['Morado','#875C94'],['Crema','#FFF5DA']];
  const rgb=(value:string)=>[1,3,5].map(index=>parseInt(value.slice(index,index+2),16));
  const target=rgb(hex);
  return references.reduce((best,reference)=>{
    const distance=rgb(reference[1]).reduce((sum,value,index)=>sum+(value-target[index])**2,0);
    return distance<best.distance?{name:reference[0],distance}:best;
  },{name:'Color personalizado',distance:Infinity}).name;
}

function embroideryArt(doc:DesignDoc,id:string) {
  const included=new Set([id]);
  let more=true;
  while(more) {more=false;for(const element of doc.elements)if(element.parentId&&included.has(element.parentId)&&!included.has(element.id)){included.add(element.id);more=true;}}
  return doc.elements.filter(element=>included.has(element.id)&&!element.hidden&&element.kind!=='grupo'&&element.technique==='bordado');
}

function drawEmbroideryPalette(fd:FlowDoc,doc:DesignDoc,placements:Placement[],fabrics:Record<string,Fabric>,unit:Unit) {
  const embroidery=placements.filter(placement=>placement.kind==='bordado');
  if(!embroidery.length) return;
  fd.heading('Bordados y colores');
  fd.para('Los códigos B1, B2… corresponden al plano de colocación. Los colores HEX son referencias del diseño: compara las muestras con tus hilos reales. Estos dibujos necesitan digitalización para bordado a máquina.',2.7);
  const mm=(value:number)=>`${Number(value.toFixed(2)).toLocaleString('es-MX')} mm`;
  for(const placement of embroidery) {
    const view=doc.views.find(item=>item.id===placement.viewId);
    const group=doc.elements.find(element=>element.id===placement.id);
    const parts=embroideryArt(doc,placement.id);
    fd.ensure(30);
    const top=fd.y;
    const bounds=bboxOf(parts.flatMap(element=>{
      const box=cmdsBBox(elementWorldCmds(element));
      return [{x:box.minX,y:box.minY},{x:box.maxX,y:box.maxY}];
    }));
    if(Number.isFinite(bounds.minX)) {
      const k=Math.min(24/Math.max(.01,bounds.maxX-bounds.minX),23/Math.max(.01,bounds.maxY-bounds.minY));
      const tx=(point:Pt):Pt=>({x:fd.m+(point.x-bounds.minX)*k,y:top+(point.y-bounds.minY)*k});
      for(const element of parts) {
        const color=element.fill.type==='color'?element.fill.color:element.fill.type==='tela'?fabrics[element.fill.fabricId]?.color:undefined;
        const commands=elementWorldCmds(element);
        if(color)fd.cv.fillPathRgb(commands,fd.fillColor(color),tx);
        else fd.cv.strokePath(commands,PDF_STYLES.bordado,tx);
      }
    }
    fd.para(`${placement.code} · ${placement.name}`,3.5,{bold:true,indent:30,gap:.6});
    fd.para(`${view?.label??'Vista'} · ${formatLength(placement.width,unit)} × ${formatLength(placement.height,unit)} · giro ${Number(placement.rotation.toFixed(2))}°.`,2.8,{indent:30,gap:.5});
    fd.para(`Centro X ${mm(placement.x)} · Y ${mm(placement.y)}. ${placement.precise?'Origen 0,0 de la pieza real; cuadrícula de 10 mm.':'Ubicación orientativa: comprueba sobre la prenda antes de transferir.'}`,2.7,{indent:30,gap:.5});
    if(group?.embroidery?.fontId) {
      const font=findLetteringFont(group.embroidery.fontId);
      fd.para(`Tipografía: ${font?.name??group.embroidery.fontId}${font?` (${font.family})`:''}.`,2.7,{indent:30,gap:.5});
    }
    fd.y=Math.max(fd.y,top+27);
    const palette=new Map<string,Set<string>>();
    for(const element of parts) {
      const color=element.fill.type==='color'?element.fill.color:element.fill.type==='tela'?fabrics[element.fill.fabricId]?.color:element.stroke?.color;
      if(!color||!/^#[\da-f]{6}$/i.test(color))continue;
      const label=element.name.startsWith(`${placement.name} · `)?element.name.slice(placement.name.length+3):element.name;
      if(!palette.has(color))palette.set(color,new Set());
      palette.get(color)!.add(label);
    }
    for(const [color,names]of palette) {
      fd.ensure(8);
      const swatch=polylineCmds([{x:fd.m,y:fd.y+.5},{x:fd.m+5,y:fd.y+.5},{x:fd.m+5,y:fd.y+5.5},{x:fd.m,y:fd.y+5.5}],true);
      fd.cv.fillPathRgb(swatch,fd.fillColor(color));
      fd.cv.strokePath(swatch,{width:.2,dash:[],gray:.65});
      fd.para(`${colorName(color)} · ${color.toUpperCase()} · ${[...names].join(', ')}`,2.8,{indent:8,gap:1.5});
    }
    fd.y+=3;
  }
}

function drawPieceThumb(fd: FlowDoc, cmds: PathCmd[], box: { x: number; y: number; w: number; h: number }) {
  const b = cmdsBBox(cmds);
  const k = Math.min(box.w / (b.maxX - b.minX), box.h / (b.maxY - b.minY));
  const tx = (p: Pt): Pt => ({ x: box.x + (p.x - b.minX) * k + (box.w - (b.maxX - b.minX) * k) / 2, y: box.y + (p.y - b.minY) * k });
  fd.cv.fillPathRgb(cmds, [0.96, 0.96, 0.94], tx);
  fd.cv.strokePath(cmds, { width: 0.5, dash: [], gray: 0.1 }, tx);
}

export async function buildSummaryPdf(p: Project, ctx: SummaryCtx): Promise<Uint8Array> {
  const u = ctx.unit;
  const fd = await FlowDoc.create(`${p.name} · ficha del proyecto · Hilvana ${APP_VERSION}`);
  const model = p.modelId ? findModel(p.modelId) : undefined;
  fd.cv.fillPathRgb(polylineCmds([{x:fd.m,y:fd.y},{x:fd.w-fd.m,y:fd.y},{x:fd.w-fd.m,y:fd.y+10},{x:fd.m,y:fd.y+10}],true),fd.fillColor('#24584A'));
  fd.cv.text('Hilvana',fd.m+3,fd.y+6.5,4,{bold:true,gray:1});
  fd.cv.text('Tu diseño para coser',fd.w-fd.m-3,fd.y+6,2.6,{anchor:'end',gray:1});
  fd.y+=15;
  fd.para(p.name,5.2,{bold:true,gap:2});
  fd.para(`${STATUS_LABEL[p.status]} · ${ORIGIN_LABEL[p.origin]}${model ? ` · ${model.name}` : ''}`, 3.2);
  fd.para(`Creado el ${new Date(p.createdAt).toLocaleDateString('es-MX')} · actualizado el ${new Date(p.updatedAt).toLocaleString('es-MX')}`, 2.8);

  // Vistas
  const doc = p.design;
  const placements=preparePlacementGuide(p).placements;
  if (doc && doc.views.length) {
    fd.heading('Vistas del diseño');
    const views = doc.simpleWorkflow?simpleViews(doc):doc.views;
    for (let i = 0; i < views.length; i += 2) {
      const h = 92;
      fd.ensure(h + 10);
      const w = (fd.width - 8) / 2;
      drawView(fd, doc, views[i], ctx.fabrics, { x: fd.m, y: fd.y, w, h },placements);
      if (views[i + 1]) drawView(fd, doc, views[i + 1], ctx.fabrics, { x: fd.m + w + 8, y: fd.y, w, h },placements);
      fd.y += h + 10;
    }
    fd.para('Composición en 2D: muestra colores y ubicaciones sin simular caída ni ajuste del tejido. E1, E2… identifican extras; B1, B2… identifican bordados en el plano de colocación.', 2.6);
  }
  if(doc)drawEmbroideryPalette(fd,doc,placements,ctx.fabrics,u);

  // Preserve the actual reference images as well as the schematic placement views.
  if (ctx.includePhotos !== false) {
    const photos = new Map<string,string>();
    for (const reference of p.references) photos.set(reference.corrected?.fileId ?? reference.fileId, reference.name);
    for (const view of doc?.views ?? []) if (view.source.type === 'foto') photos.set(view.source.fileId, view.label);
    for (const element of doc?.elements ?? []) if (!element.hidden && element.kind === 'imagen' && element.image) photos.set(element.image.fileId, `${element.name} · ${formatLength(element.w,u)} × ${formatLength(element.h,u)}`);
    const usedFabricIds = new Set([...p.fabricIds, ...(doc?.elements.flatMap(element=>element.fill.type==='tela'?[element.fill.fabricId]:[]) ?? []), ...(doc?.views.flatMap(view=>Object.values(view.zoneFills??{}).flatMap(fill=>fill.type==='tela'?[fill.fabricId]:[])) ?? [])]);
    for (const id of usedFabricIds) {
      const fabric=ctx.fabrics[id];
      if(fabric?.photo) photos.set(fabric.photo.processedFileId??fabric.photo.originalFileId, `Muestra de tela · ${fabric.name}${fabric.calibration?' · calibrada':' · referencia visual sin calibrar'}`);
    }
    if(photos.size) {
      fd.heading('Imágenes y muestras de referencia');
      fd.para('Estas imágenes muestran las referencias y telas elegidas. Su tamaño en esta ficha es ilustrativo; utiliza las plantillas 1:1 para cortar.',2.7);
      for(const [id,label] of photos) {
        const file=await getFile(id);
        fd.para(label,2.9,{bold:true});
        if(file && /jpe?g|png/.test(file.type)) await fd.image(new Uint8Array(await file.blob.arrayBuffer()),file.type,100,85);
        else fd.para('La imagen no está disponible en formato JPG/PNG en este dispositivo.',2.6);
      }
    }
  }

  // Medidas
  const pat = p.pattern;
  const built = pat ? buildPattern(pat) : null;
  fd.heading('Medidas y ajuste');
  const ref = pat?.measurementRef ?? p.profileRef;
  const prof = ref ? ctx.profiles[ref.profileId] : undefined;
  const ver = prof?.versions.find((v) => v.id === ref?.versionId);
  fd.para(prof ? `Perfil: ${prof.name}, versión ${ver?.n ?? '?'} (${ver?.label ?? ''}).` : 'Sin perfil de medidas vinculado.', 3);
  fd.para(`Tejido: ${p.fabricType === 'plano' ? 'plano' : `punto, elasticidad ${p.stretch} %`}. Ajuste: ${p.fit}.`, 3);
  if (built?.result) {
    fd.table(
      ['Medida', 'Cuerpo', 'Holgura', 'Prenda terminada', 'En el patrón'],
      built.result.checks.map((c) => [c.label, c.body !== undefined ? formatLength(c.body, u) : '—', c.ease !== undefined ? formatLength(c.ease, u) : '—', formatLength(c.target, u), formatLength(c.measured, u)]),
      [3, 1.4, 1.4, 1.8, 1.6]
    );
    const allowances = new Set<string>();
    for (const pc of built.pieces) for (const e of pc.edges) if (e.allowance > 0) allowances.add(`${e.label}: ${formatLength(e.allowance, u)}`);
    fd.para(`Márgenes por borde (fuera de la prenda terminada): ${[...allowances].slice(0, 12).join(' · ')}.`, 2.7);
    for(const assumption of built.result.assumptions) fd.para(`Supuesto de construcción: ${assumption}`,2.7,{gap:.5});
  } else if (ver) {
    const rows = Object.entries(ver.values).map(([k, v]) => [MEASURE_BY_KEY[k as keyof typeof MEASURE_BY_KEY]?.label ?? k, formatLength(v as number, u)]);
    if (rows.length) fd.table(['Medida corporal', 'Valor'], rows, [3, 1]);
  }

  if(built?.pieces.length) {
    fd.heading('Todas las piezas y sus medidas');
    fd.para('Medidas de la caja de cada plantilla: ancho × alto. La línea de costura define la pieza terminada; el contorno de corte incluye los márgenes. Una pieza al doblez se despliega al cortar y no equivale a la medida total de la prenda.',2.7);
    for(const piece of built.pieces) {
      const seam=cmdsBBox(pieceSeamCmds(piece));
      const cut=built.cuts.get(piece.id);
      const box=cut?bboxOf(cut.points):undefined;
      fd.para(`${piece.name} · ${piece.id}`,3,{bold:true,gap:.5});
      fd.para(`${piece.cut.onFold?`Cortar ${piece.cut.qty} al doblez`:`Cortar ${piece.cut.qty}${piece.cut.mirrorPairs?' en pares simétricos':''}`} · ${piece.cut.fabric}. Línea de costura: ${formatLength(seam.maxX-seam.minX,u)} × ${formatLength(seam.maxY-seam.minY,u)}.${box?` Corte: ${formatLength(box.maxX-box.minX,u)} × ${formatLength(box.maxY-box.minY,u)}.`:''}`,2.8,{gap:.6});
      fd.para(`Márgenes y acabados: ${piece.edges.map(edge=>`${edge.label}: ${formatLength(edge.allowance,u)} (${edge.finish})`).join('; ')}.`,2.6,{gap:1.6});
    }
  }

  // Telas y materiales
  fd.heading('Telas y materiales');
  const componentMats=componentMaterials(p,ctx.fabrics);
  if(doc?.simpleWorkflow)fd.table(['Parte del diseño','Tela o color elegido'],materialTargets(p).map(target=>{
    const fill=target.fill;
    return [target.label,fill?.type==='color'?`${colorName(fill.color)} · ${fill.color.toUpperCase()}`:fill?.type==='tela'?`${ctx.fabrics[fill.fabricId]?.name??'Tela elegida'}${ctx.fabrics[fill.fabricId]?.color?` · ${ctx.fabrics[fill.fabricId].color.toUpperCase()}`:''}`:'Sin material elegido'];
  }),[1,1]);
  else if(componentMats.length) fd.table(['Complemento','Tela o color elegido'],componentMats.map(material=>[material.name, `${material.fabricName??'Tela por elegir'}${material.color?` · ${material.color}`:''}`]),[1,1]);
  const fabs = p.fabricIds.map((id) => ctx.fabrics[id]).filter(Boolean);
  if (fabs.length)
    fd.table(
      ['Tela', 'Composición', 'Ancho', 'Cantidad', 'Muestra'],
      fabs.map((f) => [f.name, f.composition || '—', f.widthMm ? formatLength(f.widthMm, u) : '—', f.quantityMm ? formatLength(f.quantityMm, u) : '—', f.calibration ? 'calibrada' : 'visual']),
      [2.2, 2, 1.1, 1.1, 1]
    );
  if (built) {
    const width = fabs[0]?.widthMm ?? 1400;
    for (const e of estimateFabric(built.pieces, built.cuts, width)) {
      fd.para(`${e.fabric === 'principal' ? 'Tela principal' : e.fabric}: aprox. ${formatLength(e.lengthMm, u)} de largo.`, 3, { bold: true });
      for (const a of e.assumptions) fd.para(`Supuesto: ${a}`, 2.6, { indent: 4, gap: 0.5 });
    }
    for (const m of built.result?.materials ?? []) fd.para(`${m.label}: ${m.qty}${m.note ? ` (${m.note})` : ''}`, 2.8, { gap: 0.6 });
  }
  const cutouts = doc ? computeCutouts({...doc,elements:doc.elements.filter(element=>!isComponentElementId(element.id))}, ctx.fabrics, u) : [];
  for (const r of materialSummary(cutouts, u)) fd.para(`${r.label}: ${r.detail}`, 2.8, { gap: 0.6 });
  for (const m of p.materialUses) fd.para(`${m.label}: ${m.qty}${m.notes ? ` (${m.notes})` : ''}`, 2.8, { gap: 0.6 });

  // Plano de corte estimado
  if (built && built.pieces.length) {
    fd.heading('Plano de corte estimado');
    const width = fabs[0]?.widthMm ?? 1400;
    const rects: { id: string; w: number; h: number; cmds: PathCmd[] }[] = [];
    for (const pc of built.pieces) {
      const c = built.cuts.get(pc.id);
      if (!c) continue;
      const g = norm(sub(pc.grain.b, pc.grain.a));
      const ang = (Math.atan2(g.x, g.y) * 180) / Math.PI;
      const cmds = transformCmds(polylineCmds(c.points, true), matRotate(ang));
      const b = cmdsBBox(cmds);
      const n = pc.cut.onFold ? pc.cut.qty : Math.ceil(pc.cut.qty / 2);
      for (let i = 0; i < n; i++) rects.push({ id: `${pc.id}#${i}`, w: b.maxX - b.minX, h: b.maxY - b.minY, cmds: transformCmds(cmds, [1, 0, 0, 1, -b.minX, -b.minY]) });
    }
    const packed = shelfPack(rects, width / 2, 1e9, 15);
    const L = packed.usedHeight[0] ?? 0;
    const boxH = 110;
    const k = Math.min(fd.width / (width / 2), boxH / L);
    fd.ensure(L * k + 14);
    const x0 = fd.m;
    const y0 = fd.y;
    fd.cv.rect(x0, y0, (width / 2) * k, L * k, PDF_STYLES.referencia);
    fd.cv.text('Doblez de la tela', x0 + 1, y0 + L * k + 4, 2.4);
    fd.cv.text('Orillos', x0 + (width / 2) * k, y0 + L * k + 4, 2.4, { anchor: 'end' });
    for (const pl of packed.placed) {
      const r = rects.find((x) => x.id === pl.id)!;
      const tx = (q: Pt): Pt => ({ x: x0 + (pl.x + q.x) * k, y: y0 + (pl.y + q.y) * k });
      fd.cv.fillPathRgb(r.cmds, [0.92, 0.95, 0.93], tx);
      fd.cv.strokePath(r.cmds, { width: 0.4, dash: [], gray: 0.1 }, tx);
      const name = built.pieces.find((pc) => pc.id === pl.id.split('#')[0])?.name ?? '';
      const c = tx({ x: r.w / 2, y: r.h / 2 });
      fd.cv.text(name, c.x, c.y, 2.4, { anchor: 'middle', angle: -90 });
    }
    fd.y += L * k + 8;
    fd.para(`Tela de ${formatLength(width, u)} doblada a lo ancho; largo usado ${formatLength(L, u)} sin margen de seguridad. Es una estimación por rectángulos: encajar piezas a mano puede ahorrar tela.`, 2.6);
  }

  // Aplicaciones
  if (cutouts.length) {
    fd.heading('Aplicaciones y recortes');
    fd.table(
      ['#', 'Elemento', 'Vista y zona', 'Técnica', 'Tela', 'Final', 'Margen'],
      cutouts.map((c) => [String(c.order), c.name, `${c.view.label}${c.zoneLabel ? ` · ${c.zoneLabel}` : ''}`, `${c.technique} · ${c.edge}`, c.fabricName, `${formatLength(c.widthMm - 2 * c.allowance, u)} × ${formatLength(c.heightMm - 2 * c.allowance, u)}`, formatLength(c.allowance, u)]),
      [0.4, 1.6, 1.8, 1.8, 1.6, 1.6, 0.9],
      2.5
    );
    for (const c of cutouts) fd.para(`${c.order}. ${c.name}: ${c.placement}`, 2.6, { gap: 0.4 });
  }

  // Orden de armado
  fd.heading('Orden de armado y pasos verificables');
  const steps = [...(built?.result?.steps ?? []), ...appliqueSteps(cutouts).map((s) => ({ ...s, pieces: [] as string[] }))];
  if (!steps.length) fd.para('Aún no hay pasos: se generan con el patrón y el despiece del diseño.', 2.8);
  steps.forEach((s, i) => {
    fd.checkbox(`${i + 1}. ${s.title}. ${s.detail}`, !!p.guide.checks[s.id]);
    const note = p.guide.notes[s.id];
    if (note) fd.para(`Nota: ${note}`, 2.6, { indent: 7 });
    const pcs = (s.pieces ?? []).map((id) => built?.pieces.find((x) => x.id === id)).filter(Boolean);
    if (pcs.length) {
      fd.ensure(24);
      pcs.slice(0, 6).forEach((pc, j) => drawPieceThumb(fd, pieceSeamCmds(pc!), { x: fd.m + 7 + j * 26, y: fd.y, w: 22, h: 20 }));
      fd.y += 24;
    }
  });

  // Técnicas
  if (doc && doc.elements.length) {
    fd.heading('Técnicas y acabados');
    const tech = new Map<string, number>();
    for (const e of doc.elements) if (e.technique !== 'ninguna'&&e.kind!=='grupo'&&!e.embroidery&&!doc.elements.some(parent=>parent.id===e.parentId&&parent.embroidery)) tech.set(`${TECHNIQUE_LABEL[e.technique]}${e.edge !== 'na' ? ` · ${EDGE_LABEL[e.edge]}` : ''}`, (tech.get(`${TECHNIQUE_LABEL[e.technique]}${e.edge !== 'na' ? ` · ${EDGE_LABEL[e.edge]}` : ''}`) ?? 0) + 1);
    if(placements.some(placement=>placement.kind==='bordado'))tech.set('Bordados y textos vectoriales',placements.filter(placement=>placement.kind==='bordado').length);
    for (const [t, n] of tech) fd.para(`${t}: ${n} ${n === 1 ? 'elemento' : 'elementos'}`, 2.8, { gap: 0.5 });
  }

  // Registro
  if(p.notes.length||!doc?.simpleWorkflow)fd.heading(doc?.simpleWorkflow?'Notas para confeccionar':'Registro de cambios y avances');
  for (const n of p.notes.slice(-12)) {
    fd.para(`${new Date(n.createdAt).toLocaleDateString('es-MX')}: ${n.text}`, 2.9);
    if (ctx.includePhotos !== false)
      for (const fid of n.photoFileIds.slice(0, 2)) {
        const f = await getFile(fid);
        if (f && /jpe?g|png/.test(f.type)) await fd.image(new Uint8Array(await f.blob.arrayBuffer()), f.type, 70, 60);
      }
  }
  if(!doc?.simpleWorkflow)for (const c of p.changeLog.slice(-25)) fd.para(`${new Date(c.at).toLocaleString('es-MX')} · ${c.text}`, 2.5, { gap: 0.3 });
  const exps = doc?.simpleWorkflow?[]:p.exports.slice(-10);
  if (exps.length) {
    fd.heading('Exportaciones');
    for (const e of exps) fd.para(`${new Date(e.createdAt).toLocaleString('es-MX')} · ${e.fileName} · ${e.deps.measurement ? `medidas v${e.deps.measurement.n}` : ''} ${e.deps.pattern ? `patrón v${e.deps.pattern.n}` : ''} ${e.deps.design ? `diseño v${e.deps.design.n}` : ''}`, 2.6, { gap: 0.4 });
  }
  void bboxOf;
  return fd.save();
}

export type { PatternState };

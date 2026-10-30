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

export interface SummaryCtx {
  profiles: Record<string, Profile>;
  fabrics: Record<string, Fabric>;
  materials: Record<string, Material>;
  unit: Unit;
  includePhotos?: boolean;
}

function drawView(fd: FlowDoc, doc: DesignDoc, view: DesignView, fabrics: Record<string, Fabric>, box: { x: number; y: number; w: number; h: number }) {
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
  els.forEach((e, i) => {
    const cmds = elementWorldCmds(e);
    const color = e.fill.type === 'color' ? e.fill.color : e.fill.type === 'tela' ? fabrics[e.fill.fabricId]?.color : undefined;
    if (color && e.kind !== 'texto' && e.kind !== 'imagen') fd.cv.fillPathRgb(cmds, fd.fillColor(color), tx);
    fd.cv.strokePath(cmds, e.technique === 'bordado' ? PDF_STYLES.bordado : { width: 0.45, dash: [], gray: 0.05 }, tx);
    const b = cmdsBBox(cmds);
    const p = tx({ x: b.maxX, y: b.minY });
    fd.cv.text(`${i + 1}`, p.x + 1.5, p.y, 2.4, { bold: true });
  });
  fd.cv.text(view.label, box.x + box.w / 2, box.y + box.h + 4, 3, { anchor: 'middle', bold: true });
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
  fd.title(p.name);
  fd.para(`${STATUS_LABEL[p.status]} · ${ORIGIN_LABEL[p.origin]}${model ? ` · ${model.name}` : ''}`, 3.2);
  fd.para(`Creado el ${new Date(p.createdAt).toLocaleDateString('es-MX')} · actualizado el ${new Date(p.updatedAt).toLocaleString('es-MX')}`, 2.8);

  // Vistas
  const doc = p.design;
  if (doc && doc.views.length) {
    fd.heading('Vistas del diseño');
    const views = doc.views.slice(0, 6);
    for (let i = 0; i < views.length; i += 2) {
      const h = 92;
      fd.ensure(h + 10);
      const w = (fd.width - 8) / 2;
      drawView(fd, doc, views[i], ctx.fabrics, { x: fd.m, y: fd.y, w, h });
      if (views[i + 1]) drawView(fd, doc, views[i + 1], ctx.fabrics, { x: fd.m + w + 8, y: fd.y, w, h });
      fd.y += h + 10;
    }
    fd.para('Vista de apariencia plana: muestra colores y ubicaciones a escala, no simula caída ni ajuste del tejido. Los números identifican cada elemento.', 2.6);
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
  } else if (ver) {
    const rows = Object.entries(ver.values).map(([k, v]) => [MEASURE_BY_KEY[k as keyof typeof MEASURE_BY_KEY]?.label ?? k, formatLength(v as number, u)]);
    if (rows.length) fd.table(['Medida corporal', 'Valor'], rows, [3, 1]);
  }

  // Telas y materiales
  fd.heading('Telas y materiales');
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
  const cutouts = doc ? computeCutouts(doc, ctx.fabrics, u) : [];
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
    for (const e of doc.elements) if (e.technique !== 'ninguna') tech.set(`${TECHNIQUE_LABEL[e.technique]}${e.edge !== 'na' ? ` · ${EDGE_LABEL[e.edge]}` : ''}`, (tech.get(`${TECHNIQUE_LABEL[e.technique]}${e.edge !== 'na' ? ` · ${EDGE_LABEL[e.edge]}` : ''}`) ?? 0) + 1);
    for (const [t, n] of tech) fd.para(`${t}: ${n} ${n === 1 ? 'elemento' : 'elementos'}`, 2.8, { gap: 0.5 });
  }

  // Registro
  fd.heading('Registro de cambios y avances');
  for (const n of p.notes.slice(-12)) {
    fd.para(`${new Date(n.createdAt).toLocaleDateString('es-MX')}: ${n.text}`, 2.9);
    if (ctx.includePhotos !== false)
      for (const fid of n.photoFileIds.slice(0, 2)) {
        const f = await getFile(fid);
        if (f && /jpe?g|png/.test(f.type)) await fd.image(new Uint8Array(await f.blob.arrayBuffer()), f.type, 70, 60);
      }
  }
  for (const c of p.changeLog.slice(-25)) fd.para(`${new Date(c.at).toLocaleString('es-MX')} · ${c.text}`, 2.5, { gap: 0.3 });
  const exps = p.exports.slice(-10);
  if (exps.length) {
    fd.heading('Exportaciones');
    for (const e of exps) fd.para(`${new Date(e.createdAt).toLocaleString('es-MX')} · ${e.fileName} · ${e.deps.measurement ? `medidas v${e.deps.measurement.n}` : ''} ${e.deps.pattern ? `patrón v${e.deps.pattern.n}` : ''} ${e.deps.design ? `diseño v${e.deps.design.n}` : ''}`, 2.6, { gap: 0.4 });
  }
  void bboxOf;
  return fd.save();
}

export type { PatternState };

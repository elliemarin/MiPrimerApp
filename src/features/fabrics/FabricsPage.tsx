import { useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Empty, Field, FilePick, NumberInput, PageHead, Segmented, Select, Sheet, TextInput, useFileUrl } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { uid, nowIso } from '../../lib/ids';
import type { Fabric, Material, MaterialCategory } from '../../store/types';
import { navigate } from '../../ui/router';
import { loadBitmap } from '../../lib/image';

export const CATEGORY_LABEL: Record<MaterialCategory, string> = {
  hilo: 'Hilos',
  boton: 'Botones',
  cierre: 'Cierres',
  elastico: 'Elásticos',
  entretela: 'Entretelas',
  estabilizador: 'Estabilizadores',
  cinta: 'Cintas, encajes y adornos',
  otro: 'Otros'
};

function FabricCard({ f }: { f: Fabric }) {
  const url = useFileUrl(f.photo?.processedFileId ?? f.photo?.originalFileId);
  return (
    <a className="card" href={`#/telas/${f.id}`}>
      <div className="art" style={{ backgroundColor: f.color, backgroundImage: url ? `url(${url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="meta">
        <span className="name">{f.name}</span>
        <span className="sub">{f.kind === 'punto' ? 'Punto' : 'Plano'}{f.composition ? ` · ${f.composition}` : ''}</span>
        <span>{f.calibration ? <Chip tone="ok">Calibrada</Chip> : <Chip tone="warn">Textura visual</Chip>}</span>
      </div>
    </a>
  );
}

export function FabricsPage() {
  const fabrics = useApp((s) => Object.values(s.fabrics).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  const materials = useApp((s) => Object.values(s.materials));
  const put = useApp((s) => s.put);
  const addFile = useApp((s) => s.addFile);
  const [tab, setTab] = useState<'telas' | 'materiales'>('telas');
  const [editing, setEditing] = useState<Material | null>(null);
  const addFabric = async (files: File[]) => {
    for (const file of files) {
      const img = await loadBitmap(file);
      const fileId = await addFile(file, file.name);
      const t = nowIso();
      const f: Fabric = {
        id: uid('tela'),
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Tela nueva',
        kind: 'plano',
        composition: '',
        color: '#cccccc',
        photo: { originalFileId: fileId, adjust: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }, pxW: img.naturalWidth, pxH: img.naturalHeight },
        visualRepeatMm: 150,
        grainAngle: 0,
        nap: 'sin-pelo',
        createdAt: t,
        updatedAt: t
      };
      put('fabric', f);
      if (files.length === 1) navigate(`/telas/${f.id}`);
    }
  };
  return (
    <div className="page page-wide">
      <PageHead
        title="Telas y materiales"
        sub="Tus telas fotografiadas y calibradas, y el inventario de hilos, botones, cierres y más."
        actions={
          tab === 'telas' ? (
            <FilePick accept="image/*" multiple onFiles={(f) => void addFabric(f)}>
              {(open) => <Button variant="primary" icon="camera" onClick={open}>Agregar tela</Button>}
            </FilePick>
          ) : (
            <Button variant="primary" icon="plus" onClick={() => setEditing({ id: uid('mat'), category: 'hilo', name: '', quantity: 1, unit: 'unidades', createdAt: nowIso(), updatedAt: nowIso() })}>Agregar</Button>
          )
        }
      />
      <div style={{ marginBottom: 18 }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'telas', label: `Telas (${fabrics.length})` }, { value: 'materiales', label: `Materiales (${materials.length})` }]} />
      </div>
      {tab === 'telas' ? (
        fabrics.length === 0 ? (
          <Empty icon="telas" title="Fotografía tus telas" body="Toma la foto de frente sobre una superficie plana, con una regla o una hoja carta al lado para calibrar el tamaño del estampado." />
        ) : (
          <div className="cards">{fabrics.map((f) => <FabricCard key={f.id} f={f} />)}</div>
        )
      ) : materials.length === 0 ? (
        <Empty icon="thread" title="Sin materiales" body="Registra hilos, botones, cierres, elásticos, entretelas y estabilizadores con sus cantidades." />
      ) : (
        (Object.keys(CATEGORY_LABEL) as MaterialCategory[]).map((c) => {
          const list = materials.filter((m) => m.category === c);
          if (!list.length) return null;
          return (
            <section key={c} style={{ marginBottom: 20 }}>
              <h2 className="section-title">{CATEGORY_LABEL[c]}</h2>
              <div className="group">
                {list.map((m) => (
                  <button key={m.id} className="list-row" onClick={() => setEditing(m)}>
                    <span className="swatch" style={{ background: m.color ?? 'var(--sunken)', width: 32, height: 32 }} />
                    <span className="grow">
                      <span className="t small" style={{ display: 'block' }}>{m.name}</span>
                      {m.notes && <span className="s tiny">{m.notes}</span>}
                    </span>
                    <span className="num small">{m.quantity} {m.unit}</span>
                    <Icon name="chev" className="chev" />
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}
      {editing && <MaterialSheet m={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MaterialSheet({ m, onClose }: { m: Material; onClose: () => void }) {
  const put = useApp((s) => s.put);
  const remove = useApp((s) => s.remove);
  const exists = useApp((s) => !!s.materials[m.id]);
  const [v, setV] = useState(m);
  return (
    <Sheet title={exists ? v.name || 'Material' : 'Nuevo material'} onClose={onClose}>
      <div className="stack">
        <Field label="Tipo">
          <Select value={v.category} onChange={(c: MaterialCategory) => setV({ ...v, category: c })} options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value: value as MaterialCategory, label }))} />
        </Field>
        <Field label="Nombre">
          <TextInput value={v.name} onChange={(n) => setV({ ...v, name: n })} placeholder="Hilo poliéster verde 100 m, botón madera 15 mm…" />
        </Field>
        <div className="grid-2">
          <Field label="Cantidad">
            <NumberInput value={v.quantity} min={0} onChange={(q) => setV({ ...v, quantity: q })} />
          </Field>
          <Field label="Unidad">
            <Select value={v.unit} onChange={(u: Material['unit']) => setV({ ...v, unit: u })} options={[{ value: 'unidades', label: 'Unidades' }, { value: 'm', label: 'Metros' }, { value: 'cm', label: 'Centímetros' }, { value: 'carretes', label: 'Carretes' }, { value: 'g', label: 'Gramos' }]} />
          </Field>
        </div>
        <Field label="Color">
          <input type="color" value={v.color ?? '#cccccc'} onChange={(e) => setV({ ...v, color: e.target.value })} style={{ width: 60, height: 40, border: 0, background: 'none' }} />
        </Field>
        <Field label="Notas">
          <textarea className="textarea" value={v.notes ?? ''} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="Proveedor, calibre, ancho, compatibilidad…" />
        </Field>
        <Button variant="primary" block disabled={!v.name.trim()} onClick={() => { put('material', v); onClose(); }}>Guardar</Button>
        {exists && <Button variant="danger" block onClick={() => { remove('material', v.id); onClose(); }}>Eliminar</Button>}
      </div>
    </Sheet>
  );
}

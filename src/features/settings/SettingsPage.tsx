import { useEffect, useState } from 'react';
import { useApp } from '../../store/app';
import { Button, Chip, Confirm, Field, Notice, PageHead, Segmented, SaveIndicator, TextInput } from '../../ui/components';
import { GitHubStore } from '../../lib/sync/github';
import { enqueueEverything, pullAll, pushOutbox, useSyncStatus } from '../../lib/sync/engine';
import { navigate } from '../../ui/router';

export function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const wipe = useApp((s) => s.wipe);
  const collect = useApp((s) => s.collectGarbage);
  const toast = useApp((s) => s.toast);
  const counts = useApp((s) => ({ p: Object.keys(s.projects).length, f: Object.keys(s.fabrics).length, pr: Object.keys(s.profiles).length }));
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number; persisted: boolean } | null>(null);
  useEffect(() => {
    void (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      if (est) setUsage({ used: est.usage ?? 0, quota: est.quota ?? 0, persisted });
    })();
  }, []);
  return (
    <div className="page">
      <PageHead title="Ajustes" sub={<SaveIndicator />} />
      <div className="stack-lg" style={{ maxWidth: 720 }}>
        <section className="stack">
          <h2 className="section-title" style={{ margin: 0 }}>Unidades y apariencia</h2>
          <Field label="Mostrar medidas en" hint="Internamente todo se guarda en milímetros: cambiar la unidad no altera ningún valor.">
            <Segmented value={settings.unit} onChange={(u) => setSettings((s) => ({ ...s, unit: u }))} options={[{ value: 'cm', label: 'Centímetros' }, { value: 'in', label: 'Pulgadas' }]} />
          </Field>
          <Field label="Tema">
            <Segmented value={settings.theme ?? 'auto'} onChange={(t) => setSettings((s) => ({ ...s, theme: t }))} options={[{ value: 'auto', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
          </Field>
        </section>
        <ScreenCalibration />
        <SyncSection />
        <section className="stack">
          <h2 className="section-title" style={{ margin: 0 }}>Privacidad y datos</h2>
          <Notice>Tus proyectos son privados: se guardan solo en este navegador. Nada se publica. Si activas la sincronización, se copian únicamente a tu repositorio privado.</Notice>
          <div className="small muted">
            {counts.p} proyectos · {counts.pr} perfiles · {counts.f} telas
            {usage && ` · ${(usage.used / 1048576).toFixed(1)} MB usados de ${(usage.quota / 1073741824).toFixed(1)} GB disponibles`}
          </div>
          {usage && !usage.persisted && <Notice tone="warn">El navegador podría borrar estos datos si no usas la app en un tiempo. En iPhone, agrégala a la pantalla de inicio (Compartir → Agregar a inicio) y descarga ZIP de respaldo o activa la sincronización.</Notice>}
          <div className="row-wrap">
            <Button icon="trash" onClick={async () => toast(`Se liberaron ${await collect()} archivos que nadie usaba.`, 'ok')}>Liberar espacio</Button>
            <Button variant="danger" icon="trash" onClick={() => setConfirmWipe(true)}>Borrar todos mis datos</Button>
          </div>
        </section>
        <section className="stack">
          <h2 className="section-title" style={{ margin: 0 }}>Acerca de</h2>
          <p className="small muted">Hilvana 0.1 · Diseño de prendas, patronaje a medida e intervención textil. <a href="#/ayuda">Ayuda</a></p>
        </section>
      </div>
      {confirmWipe && (
        <Confirm
          title="¿Borrar todos los datos?"
          body="Se eliminan de este dispositivo todos los proyectos, perfiles, telas, materiales y archivos. No se puede deshacer. Los datos ya sincronizados en tu repositorio no se borran desde aquí."
          confirmLabel="Borrar todo"
          danger
          onClose={() => setConfirmWipe(false)}
          onConfirm={() => void wipe().then(() => { toast('Datos borrados.'); navigate('/proyectos'); })}
        />
      )}
    </div>
  );
}

function ScreenCalibration() {
  const px = useApp((s) => s.settings.screenPxPerMm);
  const setSettings = useApp((s) => s.setSettings);
  const [v, setV] = useState(px ?? 96 / 25.4);
  const card = 85.6;
  return (
    <section className="stack">
      <h2 className="section-title" style={{ margin: 0 }}>Escala real en pantalla</h2>
      <p className="small muted">Para que «1:1» en los editores mida lo real, apoya una tarjeta bancaria (8.56 cm) sobre la pantalla y ajusta la barra hasta que coincidan.</p>
      <div style={{ height: 54, width: card * v, maxWidth: '100%', background: 'var(--tape)', borderRadius: 6, display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--tape-ink)' }}>8.56 cm</div>
      <input type="range" min={2} max={12} step={0.01} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Ajustar escala" />
      <div className="row-wrap">
        <Button size="sm" variant="primary" onClick={() => setSettings((s) => ({ ...s, screenPxPerMm: v }))}>Guardar calibración</Button>
        {px && <Chip tone="ok">Calibrada</Chip>}
      </div>
    </section>
  );
}

function SyncSection() {
  const sync = useApp((s) => s.settings.sync);
  const setSettings = useApp((s) => s.setSettings);
  const toast = useApp((s) => s.toast);
  const status = useSyncStatus();
  const [owner, setOwner] = useState(sync?.owner ?? '');
  const [repo, setRepo] = useState(sync?.repo ?? 'hilvana-datos');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setBusy(true);
    try {
      const gh = new GitHubStore({ owner: owner.trim(), repo: repo.trim(), branch: 'main', token: token.trim() });
      const info = await gh.check();
      if (!info.private) {
        toast('El repositorio es público. Usa uno privado para proteger tus proyectos.', 'error');
        return;
      }
      setSettings((s) => ({ ...s, sync: { owner: owner.trim(), repo: repo.trim(), branch: 'main', token: token.trim(), shas: {} } }));
      await new Promise((r) => setTimeout(r, 50));
      const r = await pullAll();
      const n = await enqueueEverything();
      await pushOutbox();
      toast(`Conectado a ${info.fullName}. ${r.updated} elementos descargados, ${n} enviados.`, 'ok');
    } catch (e) {
      toast(`No se pudo conectar: ${e instanceof Error ? e.message : e}`, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="stack">
      <div className="row-wrap">
        <h2 className="section-title" style={{ margin: 0 }}>Cuenta y sincronización</h2>
        <Chip tone="warn">Experimental</Chip>
      </div>
      <p className="small muted">Asocia tus proyectos a tu cuenta de GitHub guardándolos en un repositorio privado. Así los retomas desde otro dispositivo. Sin conexión, los cambios quedan en cola y se envían al volver.</p>
      {sync?.token ? (
        <div className="panel panel-pad stack">
          <div className="spread">
            <div>
              <strong>{sync.owner}/{sync.repo}</strong>
              <div className="small muted">{status.state === 'al-dia' ? 'Al día' : status.state === 'sincronizando' ? 'Sincronizando…' : status.state === 'pendiente' ? `${status.pending} cambios pendientes` : status.state === 'sin-conexion' ? 'Sin conexión: se reintentará' : status.state === 'error' ? `Error: ${status.message}` : 'En espera'}</div>
            </div>
            <Chip tone={status.state === 'al-dia' ? 'ok' : status.state === 'error' ? 'err' : 'warn'}>{status.state}</Chip>
          </div>
          <div className="row-wrap">
            <Button size="sm" icon="sync" onClick={() => void pullAll().then(() => pushOutbox()).then(() => toast('Sincronizado.', 'ok')).catch((e) => toast(String(e.message ?? e), 'error'))}>Sincronizar ahora</Button>
            <Button size="sm" variant="danger" onClick={() => setSettings((s) => ({ ...s, sync: undefined }))}>Desconectar</Button>
          </div>
        </div>
      ) : (
        <div className="panel panel-pad stack">
          <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>En GitHub crea un repositorio <strong>privado</strong> vacío, por ejemplo «hilvana-datos».</li>
            <li>En Settings → Developer settings → Fine-grained tokens, crea un token con acceso solo a ese repositorio y permiso <em>Contents: Read and write</em>.</li>
            <li>Pega aquí tu usuario, el nombre del repositorio y el token. El token se guarda solo en este dispositivo.</li>
          </ol>
          <div className="grid-2">
            <Field label="Usuario u organización">
              <TextInput value={owner} onChange={setOwner} placeholder="tu-usuario" autoCapitalize="off" autoCorrect="off" />
            </Field>
            <Field label="Repositorio privado">
              <TextInput value={repo} onChange={setRepo} autoCapitalize="off" autoCorrect="off" />
            </Field>
          </div>
          <Field label="Token de acceso">
            <TextInput value={token} onChange={setToken} type="password" placeholder="github_pat_…" autoCapitalize="off" autoCorrect="off" />
          </Field>
          <Button variant="primary" onClick={() => void connect()} disabled={busy || !owner || !repo || !token}>{busy ? 'Conectando…' : 'Conectar y sincronizar'}</Button>
        </div>
      )}
    </section>
  );
}

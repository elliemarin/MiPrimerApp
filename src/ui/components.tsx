import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useApp } from '../store/app';
import { editableValue, formatLength, parseLength, Unit } from '../lib/units';

export function Button({
  children,
  variant = 'secondary',
  size,
  icon,
  block,
  ...rest
}: { children?: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid'; size?: 'sm'; icon?: string; block?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ['btn', variant === 'primary' && 'btn-primary', variant === 'ghost' && 'btn-ghost', variant.startsWith('danger') && 'btn-danger', variant === 'danger-solid' && 'solid', size === 'sm' && 'btn-sm', block && 'btn-block', rest.className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" {...rest} className={cls}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, pressed, ...rest }: { icon: string; label: string; pressed?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} aria-pressed={pressed} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export function PageHead({ title, sub, back, actions }: { title: string; sub?: ReactNode; back?: { label: string; onClick: () => void }; actions?: ReactNode }) {
  return (
    <header className="page-head">
      {back && (
        <button className="back-link" onClick={back.onClick}>
          <Icon name="back" size={20} /> {back.label}
        </button>
      )}
      <div className="title-row">
        <h1 className="page-title">{title}</h1>
        {actions && <div className="row">{actions}</div>}
      </div>
      {sub && <p className="page-sub">{sub}</p>}
    </header>
  );
}

export function Sheet({ title, onClose, children, wide, footer }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  // Se registra una sola vez: si se re-registrara en cada render, un cambio de
  // estado durante el mismo evento podría quitar el oyente antes de llamarlo.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={`sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <IconButton icon="close" label="Cerrar" onClick={onClose} />
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer" style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--line)' }}>{footer}</div>}
      </div>
    </>
  );
}

export function Confirm({ title, body, confirmLabel, danger, onConfirm, onClose, extra }: { title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void; extra?: ReactNode }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="stack">
        <div className="muted">{body}</div>
        {extra}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant={danger ? 'danger-solid' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, id, ...rest }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return <input className="input" id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

/** Entrada de longitud: muestra la unidad elegida y guarda milímetros sin redondeo. */
export function LengthInput({ mm, onChange, unit, id, min, max, placeholder, allowEmpty }: { mm: number | undefined; onChange: (mm: number | undefined) => void; unit?: Unit; id?: string; min?: number; max?: number; placeholder?: string; allowEmpty?: boolean }) {
  const settingsUnit = useApp((s) => s.settings.unit);
  const u = unit ?? settingsUnit;
  const [text, setText] = useState(editableValue(mm, u));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (!focused) setText(editableValue(mm, u));
  }, [mm, u, focused]);
  const commit = (t: string) => {
    if (!t.trim()) {
      if (allowEmpty) {
        setInvalid(false);
        onChange(undefined);
      } else setInvalid(true);
      return;
    }
    const v = parseLength(t, u);
    if (v === null || (min !== undefined && v < min) || (max !== undefined && v > max)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (mm === undefined || Math.abs(v - mm) > 1e-9) onChange(v);
  };
  return (
    <div className="len-input">
      <input
        id={id}
        className={`input num${invalid ? ' invalid' : ''}`}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseLength(e.target.value, u);
          setInvalid(e.target.value.trim() !== '' && v === null);
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        aria-invalid={invalid}
      />
      <span className="unit">{u}</span>
    </div>
  );
}

export function NumberInput({ value, onChange, step = 0.01, min, max, id, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; id?: string; suffix?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Math.round(value * 1000) / 1000)), [value]);
  return (
    <div className="len-input">
      <input
        id={id}
        className="input num"
        inputMode="decimal"
        value={text}
        step={step}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const v = parseFloat(text.replace(',', '.'));
          if (Number.isFinite(v) && (min === undefined || v >= min) && (max === undefined || v <= max)) onChange(v);
          else setText(String(value));
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {suffix && <span className="unit">{suffix}</span>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({ value, options, onChange, id }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; id?: string }) {
  return (
    <select className="select" id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId();
  return (
    <label className="spread" htmlFor={id} style={{ minHeight: 44 }}>
      <span>{label}</span>
      <span className="switch">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}

export function Chip({ tone, children, icon }: { tone?: 'ok' | 'warn' | 'err' | 'off'; children: ReactNode; icon?: string }) {
  return (
    <span className={`chip${tone ? ` ${tone}` : ''}`}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

export function Notice({ tone, children, icon }: { tone?: 'warn' | 'err' | 'ok'; children: ReactNode; icon?: string }) {
  return (
    <div className={`notice${tone ? ` ${tone}` : ''}`} role={tone === 'err' ? 'alert' : undefined}>
      <Icon name={icon ?? (tone === 'err' ? 'warn' : tone === 'ok' ? 'ok' : tone === 'warn' ? 'warn' : 'info')} />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: string; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function Len({ mm, decimals }: { mm: number; decimals?: number }) {
  const unit = useApp((s) => s.settings.unit);
  return <span className="num">{formatLength(mm, unit, { decimals })}</span>;
}

export function useUnit(): Unit {
  return useApp((s) => s.settings.unit);
}

export function SaveIndicator() {
  const status = useApp((s) => s.saveStatus);
  const at = useApp((s) => s.savedAt);
  const err = useApp((s) => s.saveError);
  const saveNow = useApp((s) => s.saveNow);
  if (status === 'error')
    return (
      <button className="save-ind err" onClick={() => void saveNow()} title={err} style={{ background: 'none', border: 0 }}>
        <span className="dot" /> No guardado · Reintentar
      </button>
    );
  if (status === 'guardando' || status === 'pendiente')
    return (
      <span className="save-ind pend" aria-live="polite">
        <span className="dot" /> {status === 'guardando' ? 'Guardando…' : 'Cambios sin guardar'}
      </span>
    );
  const time = at ? new Date(at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <span className="save-ind ok" aria-live="polite">
      <span className="dot" /> Guardado {time}
    </span>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.tone === 'error' ? ' error' : ''}`}>
          <span>{t.text}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Selector de archivos accesible (en iPhone ofrece cámara y fototeca). */
export function FilePick({ accept, multiple, onFiles, children, capture }: { accept: string; multiple?: boolean; onFiles: (f: File[]) => void; children: (open: () => void) => ReactNode; capture?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture ? 'environment' : undefined}
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {children(() => ref.current?.click())}
    </>
  );
}

export function Thumb({ fileId, alt, style, className }: { fileId?: string; alt: string; style?: React.CSSProperties; className?: string }) {
  const url = useFileUrl(fileId);
  if (!url) return <div className={className ?? 'thumb'} style={style} aria-label={alt} />;
  return <img src={url} alt={alt} className={className ?? 'thumb'} style={style} />;
}

import { getFile } from '../lib/db';
const urlCache = new Map<string, string>();
export function useFileUrl(fileId?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(fileId ? urlCache.get(fileId) : undefined);
  useEffect(() => {
    let alive = true;
    if (!fileId) {
      setUrl(undefined);
      return;
    }
    const hit = urlCache.get(fileId);
    if (hit) {
      setUrl(hit);
      return;
    }
    void getFile(fileId).then((f) => {
      if (!f || !alive) return;
      const u = URL.createObjectURL(f.blob);
      urlCache.set(fileId, u);
      setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [fileId]);
  return url;
}

export async function fileUrl(fileId: string): Promise<string | undefined> {
  const hit = urlCache.get(fileId);
  if (hit) return hit;
  const f = await getFile(fileId);
  if (!f) return undefined;
  const u = URL.createObjectURL(f.blob);
  urlCache.set(fileId, u);
  return u;
}

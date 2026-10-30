import { useEffect, useState } from 'react';

/** Enrutador por hash: funciona en GitHub Pages sin configuración del servidor. */
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/proyectos';
}

export function navigate(path: string, replace = false) {
  const url = `#${path}`;
  if (replace) window.location.replace(url);
  else window.location.hash = path;
}

export function useRoute(): string[] {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
}

export function queryParam(name: string): string | null {
  const q = currentPath().split('?')[1];
  if (!q) return null;
  return new URLSearchParams(q).get(name);
}

export function goBack(fallback: string) {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
}

// Sincronización con un repositorio PRIVADO de GitHub de la persona usuaria.
// Cada entidad es un JSON; los archivos se guardan por id. Sin servidor propio.

export interface SyncConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export type Fetcher = typeof fetch;

const API = 'https://api.github.com';
export const ROOT = 'hilvana';

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function b64encode(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const s = atob(b64.replace(/\n/g, ''));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const textToB64 = (t: string) => b64encode(new TextEncoder().encode(t));
export const b64ToText = (b: string) => new TextDecoder().decode(b64decode(b));
export { b64encode, b64decode };

export class GitHubStore {
  constructor(public cfg: SyncConfig, private fetcher: Fetcher = fetch.bind(globalThis)) {}

  private async req(method: string, path: string, body?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const res = await this.fetcher(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new GitHubError(res.status, (data && data.message) || `Error ${res.status}`);
    return data;
  }

  /** Comprueba acceso y que el repositorio sea privado. */
  async check(): Promise<{ private: boolean; fullName: string }> {
    const r = await this.req('GET', `/repos/${this.cfg.owner}/${this.cfg.repo}`);
    return { private: !!r.private, fullName: r.full_name };
  }

  /** Lista rutas y huellas (sha) de los archivos de Hilvana en la rama. */
  async tree(): Promise<Record<string, string>> {
    try {
      const t = await this.req('GET', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/trees/${encodeURIComponent(this.cfg.branch)}?recursive=1`);
      const out: Record<string, string> = {};
      for (const e of t.tree as { path: string; sha: string; type: string }[]) if (e.type === 'blob' && e.path.startsWith(`${ROOT}/`)) out[e.path] = e.sha;
      return out;
    } catch (e) {
      // Repositorio vacío o rama inexistente: aún no hay nada sincronizado.
      if (e instanceof GitHubError && (e.status === 409 || e.status === 404)) return {};
      throw e;
    }
  }

  async blob(sha: string): Promise<Uint8Array> {
    const b = await this.req('GET', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/blobs/${sha}`);
    return b64decode(b.content);
  }

  /** Crea o actualiza un archivo. Devuelve el sha nuevo. */
  async put(path: string, contentB64: string, sha: string | undefined, message: string): Promise<string> {
    const r = await this.req('PUT', `/repos/${this.cfg.owner}/${this.cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, { message, content: contentB64, branch: this.cfg.branch, ...(sha ? { sha } : {}) });
    return r.content.sha;
  }

  async remove(path: string, sha: string, message: string): Promise<void> {
    await this.req('DELETE', `/repos/${this.cfg.owner}/${this.cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, { message, sha, branch: this.cfg.branch });
  }
}

export const entityPath = (kind: 'project' | 'profile' | 'fabric' | 'material', id: string) =>
  `${ROOT}/${{ project: 'proyectos', profile: 'perfiles', fabric: 'telas', material: 'materiales' }[kind]}/${id}.json`;
export const filePath = (id: string) => `${ROOT}/archivos/${id}`;
export const fileMetaPath = (id: string) => `${ROOT}/archivos/${id}.json`;

export function kindFromPath(path: string): { kind: 'project' | 'profile' | 'fabric' | 'material'; id: string } | null {
  const m = /^hilvana\/(proyectos|perfiles|telas|materiales)\/(.+)\.json$/.exec(path);
  if (!m) return null;
  const kind = ({ proyectos: 'project', perfiles: 'profile', telas: 'fabric', materiales: 'material' } as const)[m[1] as 'proyectos'];
  return { kind, id: m[2] };
}

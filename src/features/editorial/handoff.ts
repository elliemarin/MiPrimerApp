/** Handoff to the person's own ChatGPT account. No API, automatic messages,
 * account access, private URLs or cross-origin attachment injection.
 *
 * Prepare files before the click. Web Share and Safari's Clipboard API need
 * transient user activation, so these helpers start the native call before
 * their first await. A fulfilled share does not prove a ChatGPT message was sent.
 */
export const CHATGPT_URL = 'https://chatgpt.com/';

export interface EditorialShareInput {
  files: readonly File[];
  prompt: string;
  title?: string;
}

export type EditorialShareResult =
  | { status: 'shared' }
  | { status: 'cancelled' }
  | { status: 'unsupported'; message: string }
  | { status: 'failed'; message: string };

export type EditorialCopyResult =
  | { status: 'copied' }
  | { status: 'manual'; message: string };

/** Check the actual prepared files, rather than assuming that text sharing
 * implies image/file sharing. The OS chooses which share targets are available.
 */
export function canShareFiles(files: readonly File[]): boolean {
  if (!files.length || typeof navigator === 'undefined'
    || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [...files] });
  } catch {
    return false;
  }
}

/** Invoke directly from the Share button with prebuilt File objects.
 * Cancellation never triggers a download, clipboard write or a new window.
 */
export async function shareEditorial({ files, prompt, title = 'Lámina de Hilvana' }: EditorialShareInput): Promise<EditorialShareResult> {
  if (!prompt.trim()) return { status: 'failed', message: 'Prepara el texto de la lámina antes de compartir.' };
  if (!canShareFiles(files)) return {
    status: 'unsupported',
    message: 'Este navegador no permite compartir estas imágenes. Descárgalas y copia el texto para adjuntarlas en ChatGPT.'
  };
  try {
    // No await (or clipboard access) before this call: preserve user activation.
    await navigator.share({ files: [...files], text: prompt, title });
    return { status: 'shared' };
  } catch (cause) {
    const name = cause && typeof cause === 'object' && 'name' in cause ? cause.name : '';
    // Also covers an OS with no compatible share targets, per the Web Share API.
    if (name === 'AbortError') return { status: 'cancelled' };
    return {
      status: 'failed',
      message: 'No se pudieron compartir las referencias. Puedes volver a intentarlo o descargarlas y copiar el texto.'
    };
  }
}

/** Write only on the person's Copy action. Report blocked/missing clipboard as
 * manual so the UI can select its visible text; never announce false success.
 */
export async function copyPrompt(prompt: string): Promise<EditorialCopyResult> {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') return {
    status: 'manual', message: 'Selecciona el texto de la lámina y cópialo.'
  };
  try {
    await navigator.clipboard.writeText(prompt);
    return { status: 'copied' };
  } catch {
    return { status: 'manual', message: 'No se pudo copiar automáticamente. Selecciona el texto y usa Copiar.' };
  }
}

/** Separate explicit click, not a callback after await/share/copy. A plain URL
 * keeps the prompt out of browser history and cannot submit it automatically.
 * The UI must also offer a normal link if the browser blocks new windows.
 */
export function openChatGPT(): void {
  if (typeof window !== 'undefined') window.open(CHATGPT_URL, '_blank', 'noopener,noreferrer');
}

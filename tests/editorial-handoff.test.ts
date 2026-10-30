import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareFiles, CHATGPT_URL, copyPrompt, openChatGPT, shareEditorial } from '../src/features/editorial/handoff';

const files = [new File(['png-1'], '01-prenda.png', { type: 'image/png' }), new File(['png-2'], '02-telas.png', { type: 'image/png' })];
const prompt = 'Genera una lámina con estas prendas.\nColor #24584A, tela fotografiada.';

afterEach(() => vi.unstubAllGlobals());

describe('referencias para el ChatGPT personal', () => {
  it('comprueba los archivos reales y conserva texto/fotos sin añadir una URL', async () => {
    const canShare = vi.fn(() => true), share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare, share });
    const input = { files, prompt, title: 'Look 01' };
    const snapshot = [...files];
    expect(canShareFiles(files)).toBe(true);
    expect(canShare).toHaveBeenLastCalledWith({ files });
    const result = shareEditorial(input);
    // Must already be called, before yielding: Safari keeps click activation.
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ files, text: prompt, title: 'Look 01' });
    expect(share.mock.calls[0][0]).not.toHaveProperty('url');
    expect(await result).toEqual({ status: 'shared' });
    expect(files).toEqual(snapshot);
  });

  it('cancelar no escribe, descarga, vuelve a intentar ni abre ChatGPT', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    const copy = vi.fn(), open = vi.fn(), click = vi.fn();
    vi.stubGlobal('navigator', { canShare: () => true, share, clipboard: { writeText: copy } });
    vi.stubGlobal('window', { open });
    vi.stubGlobal('document', { createElement: click });
    expect(await shareEditorial({ files, prompt })).toEqual({ status: 'cancelled' });
    expect(share).toHaveBeenCalledTimes(1);
    expect(copy).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it('no reduce silenciosamente un lote de imágenes a un enlace o sólo texto', async () => {
    const share = vi.fn();
    vi.stubGlobal('navigator', { canShare: () => false, share });
    expect(canShareFiles(files)).toBe(false);
    expect((await shareEditorial({ files, prompt })).status).toBe('unsupported');
    expect(share).not.toHaveBeenCalled();
    expect(canShareFiles([])).toBe(false);
    vi.stubGlobal('navigator', { share, canShare: () => { throw new DOMException('Policy', 'NotAllowedError'); } });
    expect(canShareFiles(files)).toBe(false);
    vi.stubGlobal('navigator', {});
    expect(canShareFiles(files)).toBe(false);
  });

  it('un fallo de permisos no se anuncia como compartido ni abre otra aplicación', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('User activation missing', 'NotAllowedError'));
    const open = vi.fn();
    vi.stubGlobal('navigator', { share, canShare: () => true });
    vi.stubGlobal('window', { open });
    expect((await shareEditorial({ files, prompt })).status).toBe('failed');
    expect(open).not.toHaveBeenCalled();
    expect((await shareEditorial({ files, prompt: '   ' })).status).toBe('failed');
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('sólo confirma la copia después de resolver el portapapeles y permite copia manual', async () => {
    let finish!: () => void;
    const writeText = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const result = copyPrompt(prompt);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(prompt);
    let resolved = false;
    void result.then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    finish();
    expect(await result).toEqual({ status: 'copied' });
    writeText.mockImplementation(() => Promise.reject(new DOMException('Denied', 'NotAllowedError')));
    expect((await copyPrompt(prompt)).status).toBe('manual');
    vi.stubGlobal('navigator', {});
    expect((await copyPrompt(prompt)).status).toBe('manual');
  });

  it('abre un chat vacío sin prompt, archivos, credenciales ni parámetros de envío', () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    openChatGPT();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    const destination = new URL(CHATGPT_URL);
    expect(destination.search).toBe('');
    expect(destination.hash).toBe('');
    expect(destination.username + destination.password).toBe('');
  });
});

/** Descarga un archivo; en iPhone ofrece la hoja de compartir si está disponible. */
export async function saveBlob(blob: Blob, filename: string, preferShare = false): Promise<'compartido' | 'descargado'> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (preferShare && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'compartido';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'compartido';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'descargado';
}

export function canShareFiles(): boolean {
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  try {
    return !!nav.canShare?.({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] });
  } catch {
    return false;
  }
}

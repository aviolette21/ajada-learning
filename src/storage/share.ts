/**
 * Opens the iOS share sheet with the file when supported, otherwise downloads it.
 * Resolves true once the file was shared or downloaded, false if the user cancelled the share sheet.
 */
export async function shareOrDownload(text: string, fileName: string): Promise<boolean> {
  const file = new File([text], fileName, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'Ajada Learning backup' });
      return true;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

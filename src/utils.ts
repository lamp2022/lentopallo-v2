/**
 * XSS-safe HTML escaping using DOM text node trick.
 * Ported from index.html line 815.
 */
export function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

const isPlainText = (value: string) => !/^\s*[[{<]/.test(value) && !value.startsWith('pic:') && !value.startsWith('data:');

/** Quotes and dashes the page adds around some text (“…”, — author). */
const unwrap = (text: string) => text.replace(/^[\s“"«—–-]+|[\s”"»]+$/g, '');

/**
 * The player typed straight onto their page: find which property held the old words and
 * put the new ones in their place. Returns the property that changed, or null.
 */
export function applyTextEdit(props: Record<string, string>, before: string, after: string): string | null {
  for (const [from, to] of [
    [before.trim(), after.trim()],
    [unwrap(before), unwrap(after)],
  ]) {
    if (!from) continue;
    const keys = Object.keys(props).filter((k) => typeof props[k] === 'string' && isPlainText(props[k]));
    const exact = keys.find((k) => props[k].trim() === from);
    if (exact) {
      props[exact] = to;
      return exact;
    }
    const inside = keys.find((k) => props[k].includes(from));
    if (inside) {
      const value = props[inside];
      const at = value.indexOf(from);
      props[inside] = value.slice(0, at) + to + value.slice(at + from.length);
      return inside;
    }
  }
  return null;
}

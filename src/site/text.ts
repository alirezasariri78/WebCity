const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (text: string) => text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

/** Blank lines split paragraphs; single line breaks become <br>. */
export const paragraphs = (text: string) =>
  text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

export const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** Splits "left | right" into its two trimmed halves. */
export function splitPair(line: string): [string, string] {
  const bar = line.indexOf('|');
  return bar < 0 ? [line, ''] : [line.slice(0, bar).trim(), line.slice(bar + 1).trim()];
}

export const splitList = (text: string | undefined) =>
  (text ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export function parseJSON<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-') || 'page';

const LEADING_EMOJI = /^((?:\p{Extended_Pictographic}|‍|️|\p{Emoji_Modifier})+)\s*(.*)$/u;

/** "⭐ Quality" → ["⭐", "Quality"]; text without an emoji → [null, text]. */
export function splitEmoji(text: string): [string | null, string] {
  const match = text.match(LEADING_EMOJI);
  return match ? [match[1], match[2]] : [null, text];
}

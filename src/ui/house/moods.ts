import { FONTS, contrastText } from '../../core/design';
import type { House, StyleProps } from '../../core/types';
import { t } from '../../i18n';
import { esc } from '../../site';

export const PAINTS = [
  '#ffffff',
  '#fff3e0',
  '#ffe0b2',
  '#ffccbc',
  '#f8bbd0',
  '#e1bee7',
  '#d1c4e9',
  '#bbdefb',
  '#b2ebf2',
  '#c8e6c9',
  '#fff59d',
  '#ffd54f',
  '#ff8a65',
  '#7c5cff',
  '#1e88e5',
  '#2e7d32',
  '#263238',
  '#111827',
];

interface MoodOption {
  id: string;
  emoji: string;
  name: string;
  style: StyleProps;
}

const LIGHTS: MoodOption[] = [
  { id: 'day', emoji: '☀️', name: 'Day', style: { bg: '', text: '', surface: '' } },
  { id: 'evening', emoji: '🌇', name: 'Evening', style: { bg: '#fff4e6', text: '#3b2f2f', surface: '#ffffff' } },
  { id: 'night', emoji: '🌙', name: 'Night', style: { bg: '#141826', text: '#eef1f7', surface: '#1f2536' } },
];

const WALLPAPERS: MoodOption[] = [
  { id: 'none', emoji: '⬜', name: 'Plain', style: { pattern: 'none' } },
  { id: 'dots', emoji: '⚪', name: 'Dots', style: { pattern: 'dots' } },
  { id: 'grid', emoji: '🔲', name: 'Grid', style: { pattern: 'grid' } },
  { id: 'lines', emoji: '〰️', name: 'Stripes', style: { pattern: 'lines' } },
];

const RUGS: MoodOption[] = [
  { id: 'square', emoji: '⬛', name: 'Sharp', style: { radius: '0', btnRadius: '0' } },
  { id: 'soft', emoji: '🔳', name: 'Soft', style: { radius: '10', btnRadius: '10' } },
  { id: 'round', emoji: '🟣', name: 'Round', style: { radius: '22', btnRadius: '22' } },
  { id: 'pill', emoji: '💊', name: 'Bubbly', style: { radius: '30', btnRadius: '40' } },
];

const LETTERING_FEELS = ['Friendly', 'Modern', 'Elegant', 'Playful', 'Classic', 'Handwritten'];
const LETTERING: MoodOption[] = LETTERING_FEELS.map((feel) => {
  const font = FONTS.find((f) => f.feel === feel)!;
  return { id: font.name, emoji: 'Aa', name: feel, style: { headingFont: font.name } };
});

export const MOOD_GROUPS: { id: string; title: string; hint: string; options: MoodOption[] }[] = [
  { id: 'light', title: '💡 Lights', hint: 'Light or dark page', options: LIGHTS },
  { id: 'wallpaper', title: '🧱 Wallpaper', hint: 'Page background pattern', options: WALLPAPERS },
  { id: 'rug', title: '🟫 Rug', hint: 'Round or sharp corners on cards and buttons', options: RUGS },
  { id: 'letters', title: '🔤 Lettering', hint: 'Font for titles', options: LETTERING },
];

const matches = (style: StyleProps | undefined, option: MoodOption) =>
  Object.entries(option.style).every(([k, v]) => (style?.[k as keyof StyleProps] ?? '') === v || (!v && !style?.[k as keyof StyleProps]));

export function moodSheet(house: House): string {
  return MOOD_GROUPS.map(
    (g) =>
      `<div class="mood-group"><div class="mood-title"><b>${t(g.title)}</b><small>${t(g.hint)}</small></div><div class="mood-options">${g.options
        .map((o) => {
          const font = g.id === 'letters' ? ` style="font-family:'${esc(o.id)}'"` : '';
          return `<button class="mood${matches(house.style, o) ? ' on' : ''}" data-mood="${g.id}:${esc(o.id)}"><span class="mood-emoji"${font}>${o.emoji}</span><small>${t(o.name)}</small></button>`;
        })
        .join('')}</div></div>`,
  ).join('');
}

/** Applies a mood option to the page. Returns false if it was unknown. */
export function applyMood(house: House, key: string): boolean {
  const [group, id] = key.split(':');
  const option = MOOD_GROUPS.find((g) => g.id === group)?.options.find((o) => o.id === id);
  if (!option) return false;
  const style = { ...house.style };
  for (const [k, v] of Object.entries(option.style)) {
    if (v) style[k as keyof StyleProps] = v;
    else delete style[k as keyof StyleProps];
  }
  house.style = style;
  return true;
}

export function paintSheet(current: string): string {
  const swatches = PAINTS.map(
    (c) => `<button class="paint${c === current ? ' on' : ''}" style="background:${c}" data-paint="${c}" aria-label="${c}"></button>`,
  ).join('');
  return `<div class="paint-row"><span class="paint-hint">🖌️ ${t('Pick a colour, then tap furniture or the wall')}</span><div class="paints">${swatches}<label class="paint custom" title="${t('Any colour')}">🎨<input type="color" data-paint-any value="${esc(current)}"></label><button class="paint eraser${current === '' ? ' on' : ''}" data-paint="" title="${t('Remove colour')}">🧽</button></div></div>`;
}

/** Colours a part (or the page when it is the wall), cards inside it too, with readable text. An empty colour removes the paint. */
export function paintStyle(style: StyleProps | undefined, color: string): StyleProps {
  const next = { ...style };
  if (!color) {
    delete next.bg;
    delete next.text;
    delete next.surface;
    return next;
  }
  next.bg = color;
  next.surface = color;
  next.text = contrastText(color);
  return next;
}

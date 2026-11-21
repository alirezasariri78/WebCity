import { furnitureDef, themeDef } from '../../core/catalog';
import { contrastText } from '../../core/design';
import type { Furniture, House, StyleProps } from '../../core/types';
import { sfx } from '../../game/audio';
import { state } from '../../game/store';
import { num, t } from '../../i18n';
import { esc } from '../../site';
import { summary } from './room';

export type Tool = 'arrange' | 'paint' | 'mood' | 'write';

export interface DecorHandlers {
  select: (id: string | null) => void;
  move: (id: string, toIndex: number) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  resize: (id: string) => void;
  /** Paint a part, or the wall (the page background) when id is null. */
  paint: (id: string | null) => void;
  write: (id: string) => void;
  add: () => void;
}

const SPAN_COLUMNS: Record<string, number> = { full: 6, 'two-thirds': 4, half: 3, third: 2 };
export const SPAN_ORDER = ['full', 'half', 'third', 'two-thirds'];
const SPAN_LABEL: Record<string, string> = { full: '▭▭▭', 'two-thirds': '▭▭', half: '▭▭ ½', third: '▭ ⅓' };
const DRAG_START_PX = 8;

/** The page's look, layered like the website: theme → whole site → this page. */
export function roomLook(house: House) {
  const theme = themeDef(state.town.theme).site;
  const style: StyleProps = { ...state.town.style, ...house.style };
  const wall = style.bg || theme.bg;
  return {
    wall,
    ink: style.text || (style.bg ? contrastText(style.bg) : theme.text),
    accent: style.accent || theme.primary,
    pattern: style.pattern || 'none',
    radius: Number(style.radius ?? parseInt(theme.radius, 10)) || 0,
    dark: contrastText(wall) === '#ffffff',
  };
}

function itemHtml(item: Furniture, selected: boolean, tool: Tool): string {
  const def = furnitureDef(item.kind);
  const span = item.style?.span || 'full';
  const color = item.style?.bg;
  const vars = color ? ` style="--c:${esc(color)};--ct:${esc(item.style?.text || contrastText(color))}"` : '';
  const tools =
    selected && tool === 'arrange'
      ? `<div class="deco-tools">
          <button data-resize title="${t('Size')}">↔ <small>${SPAN_LABEL[span] ?? ''}</small></button>
          <button data-write title="${t('Write')}">✏️</button>
          <button data-dup title="${t('Duplicate')}">⧉</button>
          <button data-del class="danger" title="${t('Remove')}">🗑️</button>
        </div>`
      : '';
  const words = esc(summary(item)) || `<i>${t(def.web)}</i>`;
  const badge = !item.edited && def.fields.length ? `<span class="deco-new">${t('write me!')}</span>` : '';
  return `<div class="deco-item${selected ? ' selected' : ''}${color ? ' painted' : ''}" data-id="${item.id}" style="grid-column:span ${SPAN_COLUMNS[span] ?? 6}">
    <div class="deco-thing"${vars}><span class="deco-emoji">${def.emoji}</span><span class="deco-words">${words}</span>${badge}</div>
    <div class="deco-shelf"></div>${tools}</div>`;
}

export function renderDecor(el: HTMLElement, house: House, selectedId: string | null, tool: Tool, slots: number, on: DecorHandlers) {
  const look = roomLook(house);
  const items = house.items.map((item) => itemHtml(item, item.id === selectedId, tool)).join('');
  const full = house.items.length >= slots;
  el.innerHTML = `<div class="deco tool-${tool}${look.dark ? ' dark' : ''}" style="--wall:${esc(look.wall)};--ink:${esc(look.ink)};--accent:${esc(look.accent)};--rug-r:${Math.min(60, look.radius * 2)}px">
    <div class="deco-wall pat-${esc(look.pattern)}" data-wall>
      <div class="deco-window" aria-hidden="true"><i></i><i></i></div>
      <div class="deco-lamp" aria-hidden="true"><i></i></div>
      <div class="deco-top">${t('Top of page ↑')} <span class="slots${full ? ' full' : ''}">🛋️ ${num(house.items.length)} / ${num(slots)}</span></div>
      <div class="deco-grid">${items}<button class="deco-add" data-add>＋<small>${t('Add furniture')}</small></button></div>
    </div>
    <div class="deco-floor"><div class="deco-rug"></div></div>
  </div>`;
  bind(el, house, tool, on);
}

function bind(el: HTMLElement, house: House, tool: Tool, on: DecorHandlers) {
  el.querySelector('[data-add]')!.addEventListener('click', on.add);
  el.querySelector('[data-wall]')!.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.deco-item, .deco-add')) return;
    if (tool === 'paint') on.paint(null);
    else on.select(null);
  });

  el.querySelectorAll<HTMLElement>('.deco-item').forEach((itemEl) => {
    const id = itemEl.dataset.id!;
    itemEl.querySelector('.deco-tools')?.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('button');
      if (button?.hasAttribute('data-resize')) on.resize(id);
      else if (button?.hasAttribute('data-write')) on.write(id);
      else if (button?.hasAttribute('data-dup')) on.duplicate(id);
      else if (button?.hasAttribute('data-del')) on.remove(id);
    });
    const tap = (target: HTMLElement) => {
      if (target.closest('.deco-tools')) return;
      if (tool === 'paint') return on.paint(id);
      if (tool === 'write') return on.write(id);
      sfx('click');
      on.select(id);
    };
    itemEl.addEventListener('pointerdown', (e) => startDrag(e, itemEl, el, house, tool, on, tap));
    itemEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tap(e.target as HTMLElement);
    });
    itemEl.tabIndex = 0;
  });
}

/** Press and drag a piece of furniture to a new place. A short press is a tap. */
function startDrag(
  e: PointerEvent,
  itemEl: HTMLElement,
  root: HTMLElement,
  house: House,
  tool: Tool,
  on: DecorHandlers,
  tap: (target: HTMLElement) => void,
) {
  const target = e.target as HTMLElement;
  if (e.button !== 0 || target.closest('.deco-tools')) return;
  const id = itemEl.dataset.id!;
  const start = { x: e.clientX, y: e.clientY };
  let ghost: HTMLElement | null = null;
  let drop: { index: number; el: HTMLElement; after: boolean } | null = null;

  const move = (ev: PointerEvent) => {
    if (!ghost) {
      if (tool !== 'arrange' || Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_START_PX) return;
      ghost = itemEl.cloneNode(true) as HTMLElement;
      ghost.classList.add('deco-ghost');
      ghost.style.width = `${itemEl.offsetWidth}px`;
      document.body.appendChild(ghost);
      itemEl.classList.add('lifted');
      sfx('click');
    }
    ev.preventDefault();
    ghost.style.translate = `${ev.clientX - itemEl.offsetWidth / 2}px ${ev.clientY - 30}px`;
    root.querySelectorAll('.drop-before, .drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
    const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.deco-item');
    if (!under || under === itemEl) {
      drop = null;
      return;
    }
    const box = under.getBoundingClientRect();
    const rtl = getComputedStyle(under).direction === 'rtl';
    const after = rtl ? ev.clientX < box.left + box.width / 2 : ev.clientX > box.left + box.width / 2;
    const index = house.items.findIndex((f) => f.id === under.dataset.id);
    drop = { index, el: under, after };
    under.classList.add(after ? 'drop-after' : 'drop-before');
  };

  const up = (ev: PointerEvent) => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    if (!ghost) {
      if (ev.type === 'pointerup') tap(target);
      return;
    }
    ghost.remove();
    itemEl.classList.remove('lifted');
    if (!drop) return;
    const from = house.items.findIndex((f) => f.id === id);
    let to = drop.index + (drop.after ? 1 : 0);
    if (from < to) to--;
    on.move(id, to);
  };

  addEventListener('pointermove', move, { passive: false });
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

export function nextSpan(current: string | undefined): string {
  const i = SPAN_ORDER.indexOf(current || 'full');
  return SPAN_ORDER[(i + 1) % SPAN_ORDER.length];
}

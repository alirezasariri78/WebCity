import { furnitureDef, resolveImage, roomSlots } from '../../core/catalog';
import { isStyled } from '../../core/design';
import { countFormFields, isForm } from '../../core/rules';
import type { Furniture, House } from '../../core/types';
import { sfx } from '../../game/audio';
import { esc, parseJSON } from '../../site';
import { num, t } from '../../i18n';

export interface RoomHandlers {
  select: (id: string) => void;
  move: (id: string, toIndex: number) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
}

const MAX_SUMMARY = 48;

export function summary(item: Furniture): string {
  const p = item.props;
  if (item.kind === 'photowall') return t('{n} photos', { n: (p.images || '').split(',').filter(Boolean).length });
  if (item.kind === 'divider') return '— — —';
  if (item.kind === 'spacer') return t('{n}px of space', { n: p.size });
  if (isForm(item)) return `${t('{n} inputs', { n: countFormFields(p.fields) })} · ${p.title ?? ''}`;
  if (item.kind === 'buttons')
    return parseJSON<{ label: string }[]>(p.items, [])
      .map((r) => r.label)
      .join(' · ');
  if (item.kind === 'html') return t('Custom code');
  const text = p.title || p.heading || p.name || p.label || p.text || p.caption || '';
  return text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY - 2)}…` : text;
}

function card(item: Furniture, index: number, count: number, selectedId: string | null): string {
  const def = furnitureDef(item.kind);
  const needsWords = !item.edited && def.fields.length > 0;
  return `<div class="item${item.id === selectedId ? ' selected' : ''}" draggable="true" data-item="${item.id}">
    <span class="item-emoji">${def.emoji}</span>
    <span class="item-text"><b>${t(def.name)}</b> <small class="muted">→ ${t(def.web)}</small><span class="item-sum">${esc(summary(item))}</span></span>
    ${isStyled(item.style) ? `<span class="styled-dot" title="${t('Has its own style')}">🎨</span>` : ''}
    ${item.props.src ? `<img class="thumb" src="${esc(resolveImage(item.props.src))}" alt="">` : ''}
    <span class="item-tools">
      <button class="icon-btn" data-up ${index === 0 ? 'disabled' : ''} title="${t('Move up')}">▲</button>
      <button class="icon-btn" data-down ${index === count - 1 ? 'disabled' : ''} title="${t('Move down')}">▼</button>
      <button class="icon-btn" data-dup title="${t('Duplicate')}">⧉</button>
      <button class="icon-btn danger" data-del title="${t('Remove')}">✕</button>
    </span>
    ${needsWords ? `<span class="new-badge">${t('write me!')}</span>` : ''}
  </div>`;
}

export function renderRoom(el: HTMLElement, house: House, selectedId: string | null, on: RoomHandlers) {
  const slots = roomSlots(house.kind, house.level);
  const full = house.items.length >= slots ? ' full' : '';
  const cards = house.items.length
    ? house.items.map((item, i) => card(item, i, house.items.length, selectedId)).join('')
    : `<div class="empty">${t('This room is empty!')}<br>${t('Pick furniture from the shop.')}</div>`;
  el.innerHTML = `<div class="room-head">${t('Top of page ↑')} <span class="slots${full}">🛋️ ${num(house.items.length)} / ${num(slots)}</span></div>
    <div class="stack">${cards}</div>
    <div class="room-head">${t('Bottom of page ↓')}</div>`;

  el.querySelectorAll<HTMLElement>('[data-item]').forEach((cardEl, index) => {
    const id = cardEl.dataset.item!;
    cardEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button') || id === selectedId) return;
      sfx('click');
      on.select(id);
    });
    cardEl.querySelector('[data-up]')!.addEventListener('click', () => on.move(id, index - 1));
    cardEl.querySelector('[data-down]')!.addEventListener('click', () => on.move(id, index + 1));
    cardEl.querySelector('[data-dup]')!.addEventListener('click', () => on.duplicate(id));
    cardEl.querySelector('[data-del]')!.addEventListener('click', () => on.remove(id));

    cardEl.addEventListener('dragstart', (e) => {
      e.dataTransfer!.setData('text/plain', id);
      cardEl.classList.add('dragging');
    });
    cardEl.addEventListener('dragend', () => cardEl.classList.remove('dragging'));
    cardEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      cardEl.classList.add('drop-target');
    });
    cardEl.addEventListener('dragleave', () => cardEl.classList.remove('drop-target'));
    cardEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = e.dataTransfer!.getData('text/plain');
      if (from && from !== id) on.move(from, index);
    });
  });
}

import { furnitureDef, resolveImage, roomSlots } from '../../core/catalog';
import { isStyled } from '../../core/design';
import { countFormFields, isForm } from '../../core/rules';
import type { Furniture, House } from '../../core/types';
import { sfx } from '../../game/audio';
import { esc, parseJSON } from '../../site';

export interface RoomHandlers {
  select: (id: string) => void;
  move: (id: string, toIndex: number) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
}

const MAX_SUMMARY = 48;

export function summary(item: Furniture): string {
  const p = item.props;
  if (item.kind === 'photowall') return `${(p.images || '').split(',').filter(Boolean).length} photos`;
  if (item.kind === 'divider') return '— — —';
  if (item.kind === 'spacer') return `${p.size}px of space`;
  if (isForm(item)) return `${countFormFields(p.fields)} inputs · ${p.title ?? ''}`;
  if (item.kind === 'buttons')
    return parseJSON<{ label: string }[]>(p.items, [])
      .map((r) => r.label)
      .join(' · ');
  if (item.kind === 'html') return 'Custom code';
  const text = p.title || p.heading || p.name || p.label || p.text || p.caption || '';
  return text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY - 2)}…` : text;
}

function card(item: Furniture, index: number, count: number, selectedId: string | null): string {
  const def = furnitureDef(item.kind);
  const needsWords = !item.edited && def.fields.length > 0;
  return `<div class="item${item.id === selectedId ? ' selected' : ''}" draggable="true" data-item="${item.id}">
    <span class="item-emoji">${def.emoji}</span>
    <span class="item-text"><b>${def.name}</b> <small class="muted">→ ${def.web}</small><span class="item-sum">${esc(summary(item))}</span></span>
    ${isStyled(item.style) ? '<span class="styled-dot" title="Has its own style">🎨</span>' : ''}
    ${item.props.src ? `<img class="thumb" src="${esc(resolveImage(item.props.src))}" alt="">` : ''}
    <span class="item-tools">
      <button class="icon-btn" data-up ${index === 0 ? 'disabled' : ''} title="Move up">▲</button>
      <button class="icon-btn" data-down ${index === count - 1 ? 'disabled' : ''} title="Move down">▼</button>
      <button class="icon-btn" data-dup title="Duplicate">⧉</button>
      <button class="icon-btn danger" data-del title="Remove">✕</button>
    </span>
    ${needsWords ? '<span class="new-badge">write me!</span>' : ''}
  </div>`;
}

export function renderRoom(el: HTMLElement, house: House, selectedId: string | null, on: RoomHandlers) {
  const slots = roomSlots(house.kind, house.level);
  const full = house.items.length >= slots ? ' full' : '';
  const cards = house.items.length
    ? house.items.map((item, i) => card(item, i, house.items.length, selectedId)).join('')
    : '<div class="empty">This room is empty!<br>Pick furniture from the shop on the left. 👈</div>';
  el.innerHTML = `<div class="room-head">Top of page ↑ <span class="slots${full}">🛋️ ${house.items.length} / ${slots}</span></div>
    <div class="stack">${cards}</div>
    <div class="room-head">Bottom of page ↓</div>`;

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

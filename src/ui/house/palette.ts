import { FURNITURE } from '../../core/catalog';
import type { FurnitureKind } from '../../core/types';
import { level } from '../../game/progress';
import { esc } from '../../site';

const BY_LEVEL = [...FURNITURE].sort((a, b) => a.level - b.level);

export function renderPalette(el: HTMLElement, onAdd: (kind: FurnitureKind, button: HTMLElement) => void) {
  const playerLevel = level();
  const items = BY_LEVEL.map((f) => {
    const locked = f.level > playerLevel;
    const cost = locked ? '' : f.cost ? `${f.cost}🪙` : 'Free';
    return `<button class="pal-item${locked ? ' locked' : ''}" data-add="${f.kind}" title="${esc(f.web)}">
        <span class="pal-emoji">${locked ? '🔒' : f.emoji}</span>
        <span class="pal-text"><b>${f.name}</b><small>${locked ? `Unlocks at level ${f.level}` : f.web}</small></span>
        <span class="cost">${cost}</span></button>`;
  }).join('');

  el.innerHTML = `<h3>🛋️ Furniture shop</h3><p class="muted small">Each piece becomes a part of your page.</p><div class="pal-list">${items}</div>`;
  el.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((button) =>
    button.addEventListener('click', () => onAdd(button.dataset.add as FurnitureKind, button)),
  );
}

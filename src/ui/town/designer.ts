import type { BuildingLook, HouseKind, RoofShape } from '../../core/types';
import { SWATCHES } from '../../core/design';
import { sfx } from '../../game/audio';
import { t } from '../../i18n';
import { houseArt, towerArt, type Art } from '../../render/art';
import { esc } from '../../site';
import { openModal } from '../common/modal';

export interface DesignResult {
  look: BuildingLook;
  name: string;
}

interface DesignerOptions {
  title: string;
  look: BuildingLook;
  name: string;
  /** Page buildings below level 3 still look like a little house. */
  houseKind?: HouseKind;
  floors: number;
}

export const SHAPES: { id: RoofShape; label: string; icon: string }[] = [
  { id: 'pyramid', label: 'Pointed', icon: '🔺' },
  { id: 'flat', label: 'Flat', icon: '▬' },
  { id: 'dome', label: 'Dome', icon: '◠' },
  { id: 'spire', label: 'Spire', icon: '🗼' },
  { id: 'castle', label: 'Castle', icon: '🏰' },
];

const SIGNS = ['🏠', '🏢', '🍰', '☕', '📚', '🎨', '🎸', '💼', '🛍️', '🍕', '🌸', '⚽', '🧪', '🐾', '💡', '⭐', '🚀', '🎮', '💈', '🏋️'];

function preview(art: Art): string {
  const [x0, y0, x1, y1] = art.box;
  return `<svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" xmlns="http://www.w3.org/2000/svg">${art.svg}</svg>`;
}

/** Opens the designer. Resolves with the new look, or null if the player closed it. */
export function openBuildingDesigner(options: DesignerOptions): Promise<DesignResult | null> {
  return new Promise((resolve) => {
    const look: BuildingLook = { ...options.look };
    let saved = false;

    const modal = openModal(
      `<div class="designer">
        <div class="designer-preview"></div>
        <div class="designer-controls">
          <h2>${esc(options.title)}</h2>
          <label class="field"><span>${t('Name')}</span><input class="input" data-name maxlength="24" value="${esc(options.name)}"></label>
          <div class="field"><span>${t('Roof shape')}</span><div class="seg wrap-seg" data-shapes></div></div>
          <div class="field"><span>${t('Wall colour')}</span><div class="swatches" data-colors="wall"></div></div>
          <div class="field"><span>${t('Roof colour')}</span><div class="swatches" data-colors="roof"></div></div>
          <div class="field"><span>${t('Sign')}</span><div class="logo-grid" data-signs></div></div>
          <div class="row end"><button class="btn ghost" data-cancel>${t('Cancel')}</button><button class="btn primary" data-save>${t('Save ✓')}</button></div>
        </div>
      </div>`,
      { cls: 'designer-modal', onClose: () => !saved && resolve(null) },
    );

    const draw = () => {
      const art =
        options.houseKind && options.floors <= 1
          ? houseArt(options.houseKind, false, look)
          : towerArt({ look, floors: Math.max(1, options.floors), night: false });
      modal.el.querySelector('.designer-preview')!.innerHTML = preview(art);

      modal.el.querySelector('[data-shapes]')!.innerHTML = SHAPES.map(
        (s) => `<button class="${look.shape === s.id ? 'on' : ''}" data-shape="${s.id}">${s.icon} ${t(s.label)}</button>`,
      ).join('');
      for (const part of ['wall', 'roof'] as const) {
        modal.el.querySelector(`[data-colors="${part}"]`)!.innerHTML =
          SWATCHES.map(
            (c) =>
              `<button class="sw${look[part] === c ? ' on' : ''}" style="background:${c}" data-part="${part}" data-color="${c}"></button>`,
          ).join('') +
          `<label class="sw custom" title="${t('Any colour')}">🎨<input type="color" data-part-picker="${part}" value="${look[part]}"></label>`;
      }
      modal.el.querySelector('[data-signs]')!.innerHTML = SIGNS.map(
        (s) => `<button class="logo-pick${look.emoji === s ? ' on' : ''}" data-sign="${s}">${s}</button>`,
      ).join('');
    };

    modal.el.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      const d = button.dataset;
      if (d.shape) look.shape = d.shape as RoofShape;
      else if (d.part && d.color) look[d.part as 'wall' | 'roof'] = d.color;
      else if (d.sign) look.emoji = d.sign;
      else return;
      sfx('pop');
      draw();
    });
    modal.el.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      if (!input.dataset.partPicker) return;
      look[input.dataset.partPicker as 'wall' | 'roof'] = input.value;
      draw();
    });
    modal.el.querySelector('[data-cancel]')!.addEventListener('click', () => modal.close());
    modal.el.querySelector('[data-save]')!.addEventListener('click', () => {
      saved = true;
      sfx('coin');
      const name = (modal.el.querySelector<HTMLInputElement>('[data-name]')!.value.trim() || options.name).slice(0, 24);
      resolve({ look, name });
      modal.close();
    });
    draw();
  });
}

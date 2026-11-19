import { MAX_HOUSE_LEVEL, UPGRADE_LEVEL, decorDef, houseDef, roomSlots, upgradeCost } from '../../core/catalog';
import type { Decor, House } from '../../core/types';
import { sfx } from '../../game/audio';
import { level } from '../../game/progress';
import { state } from '../../game/store';
import { esc, fileNames } from '../../site';

export type PopoverAction = 'enter' | 'upgrade' | 'rename' | 'move' | 'remove';

function upgradeButton(house: House): string {
  const houseLevel = house.level ?? 1;
  if (houseLevel >= MAX_HOUSE_LEVEL) return '<div class="pop-note">⭐ Fully upgraded!</div>';
  if (level() < UPGRADE_LEVEL) return `<div class="pop-note">🔒 Upgrades unlock at level ${UPGRADE_LEVEL}</div>`;
  const cost = upgradeCost(house.kind, houseLevel);
  const poor = state.progress.coins < cost ? ' poor' : '';
  return `<button class="btn small upgrade${poor}" data-act="upgrade">⬆️ Upgrade to ★${houseLevel + 1} · ${cost} 🪙</button>`;
}

function houseMenu(house: House): string {
  const def = houseDef(house.kind);
  const houseLevel = house.level ?? 1;
  const removable = house.kind !== 'townhall';
  return `<div class="pop-title">${def.emoji} ${esc(house.name)} <span class="pop-lv">${'★'.repeat(houseLevel)}</span></div>
    <div class="pop-sub">On your website: <b>${def.web}</b> · <code>${fileNames(state.town).get(house.id)}</code><br>Room: ${house.items.length} / ${roomSlots(house.kind, houseLevel)} furniture</div>
    <button class="btn primary block" data-act="enter">🚪 Go inside &amp; decorate</button>
    ${upgradeButton(house)}
    <div class="row"><button class="btn small" data-act="rename">✏️ Rename</button><button class="btn small" data-act="move">✋ Move</button>${removable ? '<button class="btn small danger-soft" data-act="remove" title="Remove">🗑️</button>' : ''}</div>`;
}

function decorMenu(decor: Decor): string {
  const def = decorDef(decor.kind);
  return `<div class="pop-title">${def.emoji} ${def.name}</div><div class="pop-sub">Makes your town prettier (and brings more visitors!)</div>
    <div class="row"><button class="btn small" data-act="move">✋ Move</button><button class="btn small danger-soft" data-act="remove">🗑️ Remove</button></div>`;
}

export function showPopover(el: HTMLElement, target: House | Decor, onAction: (action: PopoverAction, event: MouseEvent) => void) {
  el.innerHTML = 'items' in target ? houseMenu(target) : decorMenu(target);
  el.hidden = false;
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  el.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((button) =>
    button.addEventListener('click', (event) => {
      sfx('click');
      onAction(button.dataset.act as PopoverAction, event);
    }),
  );
}

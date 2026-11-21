import { MAX_HOUSE_LEVEL, UPGRADE_LEVEL, cityDef, decorDef, houseDef, houseFloors, roomSlots, upgradeCost } from '../../core/catalog';
import { floorCap } from '../../core/rules';
import type { CityBuilding, Decor, House } from '../../core/types';
import { sfx } from '../../game/audio';
import { currentEra, level } from '../../game/progress';
import { state } from '../../game/store';
import { num, t } from '../../i18n';
import { esc, fileNames } from '../../site';

export type PopoverAction = 'enter' | 'upgrade' | 'rename' | 'move' | 'remove' | 'grow' | 'design';

export type PopoverTarget = { type: 'house'; item: House } | { type: 'city'; item: CityBuilding } | { type: 'decor'; item: Decor };

/** Coins to add one floor by hand (instead of waiting for the town to grow it). */
export const floorCost = (floors: number) => 10 + floors * 6;

const note = (text: string) => `<div class="pop-note">${text}</div>`;

function upgradeButton(house: House): string {
  const houseLevel = house.level ?? 1;
  if (houseLevel >= MAX_HOUSE_LEVEL) return note(t('🏙️ A full skyscraper!'));
  if (level() < UPGRADE_LEVEL) return note(t('🔒 Upgrades unlock at level {n}', { n: UPGRADE_LEVEL }));
  const era = currentEra();
  if (houseLevel >= era.maxPageLevel) return note(t('🔒 Grow your town to build higher'));
  const cost = upgradeCost(house.kind, houseLevel);
  const poor = state.progress.coins < cost ? ' poor' : '';
  const floors = houseFloors(houseLevel + 1);
  return `<button class="btn small upgrade${poor}" data-act="upgrade">⬆️ ${t('Upgrade to ★{level} ({floors} floors) · {cost} 🪙', { level: houseLevel + 1, floors, cost })}</button>`;
}

function houseMenu(house: House): string {
  const def = houseDef(house.kind);
  const houseLevel = house.level ?? 1;
  const removable = house.kind !== 'townhall';
  const emoji = house.look?.emoji ?? def.emoji;
  return `<div class="pop-title">${emoji} ${esc(house.name)} <span class="pop-lv">${'★'.repeat(Math.min(houseLevel, 5))}${houseLevel > 5 ? `+${num(houseLevel - 5)}` : ''}</span></div>
    <div class="pop-sub">${t('On your website:')} <b>${t(def.web)}</b> · <code>${fileNames(state.town).get(house.id)}</code><br>${t('Room: {used} / {max} parts', { used: house.items.length, max: roomSlots(house.kind, houseLevel) })}</div>
    <button class="btn primary block" data-act="enter">🚪 ${t('Go inside & edit the page')}</button>
    ${upgradeButton(house)}
    <div class="row"><button class="btn small" data-act="rename">✏️ ${t('Rename')}</button><button class="btn small" data-act="design">🎨 ${t('Look')}</button><button class="btn small" data-act="move">✋</button>${removable ? '<button class="btn small danger-soft" data-act="remove">🗑️</button>' : ''}</div>`;
}

function cityMenu(building: CityBuilding): string {
  const def = cityDef(building.kind);
  const cap = floorCap(building, currentEra());
  const people = building.floors * def.people;
  const cost = floorCost(building.floors);
  const grow =
    building.floors >= def.maxFloors
      ? note(t('🏙️ As tall as it gets!'))
      : building.floors >= cap
        ? note(t('🔒 Grow your town to build higher'))
        : `<button class="btn small upgrade${state.progress.coins < cost ? ' poor' : ''}" data-act="grow">⬆️ ${t('Add a floor · {cost} 🪙', { cost })}</button>`;
  return `<div class="pop-title">${building.look?.emoji ?? def.emoji} ${esc(building.name ?? t(def.name))}</div>
    <div class="pop-sub">${t('{floors} floors · {people} people', { floors: building.floors, people })}<br>${t(def.desc)}</div>
    ${grow}
    <div class="row"><button class="btn small" data-act="design">🎨 ${t('Look')}</button><button class="btn small" data-act="move">✋ ${t('Move')}</button><button class="btn small danger-soft" data-act="remove">🗑️</button></div>`;
}

function decorMenu(decor: Decor): string {
  const def = decorDef(decor.kind);
  return `<div class="pop-title">${def.emoji} ${t(def.name)}</div><div class="pop-sub">${t('Makes your town prettier and happier.')}</div>
    <div class="row"><button class="btn small" data-act="move">✋ ${t('Move')}</button><button class="btn small danger-soft" data-act="remove">🗑️ ${t('Remove')}</button></div>`;
}

export function showPopover(el: HTMLElement, target: PopoverTarget, onAction: (action: PopoverAction, event: MouseEvent) => void) {
  el.innerHTML = target.type === 'house' ? houseMenu(target.item) : target.type === 'city' ? cityMenu(target.item) : decorMenu(target.item);
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

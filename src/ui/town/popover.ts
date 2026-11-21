import {
  MAX_HOUSE_LEVEL,
  UPGRADE_LEVEL,
  cityDef,
  decorDef,
  houseDef,
  houseFloors,
  roomSlots,
  upgradeCost,
  wonderDef,
} from '../../core/catalog';
import {
  TERRAIN_NAMES,
  YIELD_ICONS,
  canClaim,
  floorCap,
  isOwned,
  isRuin,
  pageQuality,
  resourceAt,
  resourceDef,
  terrainAt,
  tileCost,
  wonderProgress,
  type Yields,
} from '../../core/rules';
import type { CityBuilding, Decor, House, Wonder } from '../../core/types';
import { sfx } from '../../game/audio';
import { currentEra, level } from '../../game/progress';
import { state } from '../../game/store';
import { num, t } from '../../i18n';
import { esc, fileNames } from '../../site';

export type PopoverAction = 'enter' | 'upgrade' | 'rename' | 'move' | 'remove' | 'grow' | 'design' | 'claim' | 'explore';

export type PopoverTarget =
  | { type: 'house'; item: House }
  | { type: 'city'; item: CityBuilding }
  | { type: 'decor'; item: Decor }
  | { type: 'wonder'; item: Wonder }
  | { type: 'tile'; item: { id: string; x: number; y: number } };

/** "🔬 2 · 🎭 1" for whatever a building makes. */
export function yieldLine(y: Partial<Yields>, times = 1): string {
  return (Object.keys(YIELD_ICONS) as (keyof Yields)[])
    .filter((k) => (y[k] ?? 0) > 0)
    .map((k) => `${YIELD_ICONS[k]} ${num(Math.round((y[k] ?? 0) * times * 10) / 10)}`)
    .join(' · ');
}

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

function pageYieldNote(house: House): string {
  const quality = pageQuality(house);
  const line = yieldLine(houseDef(house.kind).yields, quality * (1 + ((house.level ?? 1) - 1) * 0.25));
  if (!line) return '';
  const tip = quality < 1 ? `<br><small>✏️ ${t('Write your own words inside to make it work harder.')}</small>` : '';
  return `<div class="pop-yield">${t('Makes {what} a minute', { what: line })}${tip}</div>`;
}

function houseMenu(house: House): string {
  const def = houseDef(house.kind);
  const houseLevel = house.level ?? 1;
  const removable = house.kind !== 'townhall';
  const emoji = house.look?.emoji ?? def.emoji;
  return `<div class="pop-title">${emoji} ${esc(house.name)} <span class="pop-lv">${'★'.repeat(Math.min(houseLevel, 5))}${houseLevel > 5 ? `+${num(houseLevel - 5)}` : ''}</span></div>
    <div class="pop-sub">${t('On your website:')} <b>${t(def.web)}</b> · <code>${fileNames(state.town).get(house.id)}</code><br>${t('Room: {used} / {max} parts', { used: house.items.length, max: roomSlots(house.kind, houseLevel) })}</div>
    ${pageYieldNote(house)}
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
    ${def.yields ? `<div class="pop-yield">${t('Makes {what} a minute', { what: yieldLine(def.yields, building.floors) })}</div>` : ''}
    ${grow}
    <div class="row"><button class="btn small" data-act="design">🎨 ${t('Look')}</button><button class="btn small" data-act="move">✋ ${t('Move')}</button><button class="btn small danger-soft" data-act="remove">🗑️</button></div>`;
}

function decorMenu(decor: Decor): string {
  const def = decorDef(decor.kind);
  return `<div class="pop-title">${def.emoji} ${t(def.name)}</div><div class="pop-sub">${t('Makes your town prettier and happier.')}</div>
    <div class="row"><button class="btn small" data-act="move">✋ ${t('Move')}</button><button class="btn small danger-soft" data-act="remove">🗑️ ${t('Remove')}</button></div>`;
}

function wonderMenu(wonder: Wonder): string {
  const def = wonderDef(wonder.kind);
  const pct = Math.floor(wonderProgress(wonder, Date.now()) * 100);
  const status = wonder.done
    ? `<div class="pop-yield">${t('Makes {what} a minute', { what: yieldLine(def.yields) })}</div><div class="pop-note">🌐 ${t(def.gift)}</div>`
    : `<div class="progress"><i style="width:${pct}%"></i></div><div class="pop-note">🏗️ ${t('Being built… {pct}%', { pct })}</div>`;
  return `<div class="pop-title">${def.emoji} ${t(def.name)} <span class="pop-lv">${t('Wonder')}</span></div>${status}`;
}

function tileMenu({ x, y }: { x: number; y: number }): string {
  const world = state.town.world;
  const terrain = terrainAt(world, x, y);
  const resource = resourceAt(world, x, y);
  const info = TERRAIN_NAMES[terrain];
  const owned = isOwned(world, x, y);
  const lines: string[] = [];
  if (resource) {
    const r = resourceDef(resource);
    lines.push(
      `<div class="pop-yield">${r.emoji} <b>${t(r.name)}</b>: ${yieldLine(r.yields)} ${t('a minute, once it is inside your borders')}</div>`,
    );
  }
  if (isRuin(world, x, y)) {
    lines.push(
      owned
        ? `<button class="btn primary block" data-act="explore">🔦 ${t('Explore the ruins')}</button>`
        : note(`❓ ${t('Ancient ruins! Bring them inside your borders to explore them.')}`),
    );
  }
  if (!owned && canClaim(world, x, y)) {
    const cost = tileCost(world);
    lines.push(
      `<button class="btn small upgrade${state.progress.coins < cost ? ' poor' : ''}" data-act="claim">🚩 ${t('Claim this land · {cost} 🪙', { cost })}</button>`,
    );
  } else if (!owned) {
    lines.push(note(t('Too far away. Claim the land next to your borders first.')));
  } else if (terrain === 'water' || terrain === 'mountain') {
    lines.push(note(t('Nothing can be built here.')));
  }
  return `<div class="pop-title">${info.emoji} ${t(info.name)}</div>${lines.join('')}`;
}

function menuFor(target: PopoverTarget): string {
  if (target.type === 'house') return houseMenu(target.item);
  if (target.type === 'city') return cityMenu(target.item);
  if (target.type === 'wonder') return wonderMenu(target.item);
  if (target.type === 'tile') return tileMenu(target.item);
  return decorMenu(target.item);
}

export function showPopover(el: HTMLElement, target: PopoverTarget, onAction: (action: PopoverAction, event: MouseEvent) => void) {
  el.innerHTML = menuFor(target);
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

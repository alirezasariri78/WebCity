import { DECOR, HOUSES, THEMES, decorDef, houseDef, themeDef } from '../../core/catalog';
import type { DecorKind, HouseKind, ThemeId } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { checkpoint } from '../../game/history';
import { bump, level, reward } from '../../game/progress';
import { commit, state } from '../../game/store';
import { esc } from '../../site';
import { getMode, setMode } from '../town/townView';

type Tab = 'houses' | 'nature' | 'styles';

const BUILDABLE_HOUSES = HOUSES.filter((h) => h.kind !== 'townhall');
const THEME_XP_LIMIT = 6;

let bar: HTMLElement;
let tab: Tab = 'houses';
let renderedKey = '';

const lockedToast = (name: string, unlockLevel: number) => {
  sfx('error');
  events.emit('toast', { text: `🔒 ${name} unlocks at level ${unlockLevel}. Finish quests to level up!`, kind: 'bad' });
};

const poorToast = (cost: number) => {
  sfx('error');
  events.emit('toast', { text: `You need ${cost - state.progress.coins} more 🪙. Finish quests or wait for visitors!`, kind: 'bad' });
};

function isPlacing(type: 'house' | 'decor', kind: string) {
  const mode = getMode();
  return mode.type === type && mode.kind === kind;
}

function card(opts: {
  attr: string;
  kind: string;
  emoji: string;
  name: string;
  sub: string;
  cost?: number;
  locked: boolean;
  active: boolean;
  extra?: string;
}) {
  const poor = !opts.locked && opts.cost !== undefined && state.progress.coins < opts.cost;
  const classes = ['card-btn', opts.extra ?? '', opts.locked ? 'locked' : '', opts.active ? 'active' : '', poor ? 'poor' : '']
    .filter(Boolean)
    .join(' ');
  const cost = opts.cost === undefined ? '' : `<span class="cost">${opts.cost} 🪙</span>`;
  return `<button class="${classes}" ${opts.attr}="${opts.kind}"><span class="cb-emoji">${opts.locked ? '🔒' : opts.emoji}</span><b>${opts.name}</b><small>${opts.sub}</small>${cost}</button>`;
}

function cardsFor(current: Tab, playerLevel: number): string {
  if (current === 'houses') {
    return BUILDABLE_HOUSES.map((h) => {
      const locked = h.level > playerLevel;
      return card({
        attr: 'data-house',
        kind: h.kind,
        emoji: h.emoji,
        name: h.name,
        sub: locked ? `Level ${h.level}` : h.web,
        cost: h.cost,
        locked,
        active: isPlacing('house', h.kind),
      });
    }).join('');
  }
  if (current === 'nature') {
    return DECOR.map((d) => {
      const locked = d.level > playerLevel;
      return card({
        attr: 'data-decor',
        kind: d.kind,
        emoji: d.emoji,
        name: d.name,
        sub: locked ? `Level ${d.level}` : '&nbsp;',
        cost: d.cost,
        locked,
        active: isPlacing('decor', d.kind),
        extra: 'small-card',
      });
    }).join('');
  }
  return THEMES.map((t) => {
    const locked = t.level > playerLevel;
    const inUse = state.town.theme === t.id;
    const sub = locked ? `Level ${t.level}` : inUse ? '✓ Using now' : esc(t.desc);
    return card({ attr: 'data-theme', kind: t.id, emoji: t.emoji, name: t.name, sub, locked, active: inUse, extra: 'theme-card' }).replace(
      '<span class="cb-emoji">',
      `<span class="swatch" style="--a:${t.site.heroFrom};--b:${t.site.heroTo}"></span><span class="cb-emoji">`,
    );
  }).join('');
}

function chooseHouse(kind: HouseKind) {
  const def = houseDef(kind);
  if (def.level > level()) return lockedToast(def.name, def.level);
  if (state.progress.coins < def.cost) return poorToast(def.cost);
  sfx('click');
  setMode({ type: 'house', kind });
}

function chooseDecor(kind: DecorKind) {
  const def = decorDef(kind);
  if (def.level > level()) return lockedToast(def.name, def.level);
  if (state.progress.coins < def.cost) return poorToast(def.cost);
  sfx('click');
  setMode(isPlacing('decor', kind) ? { type: 'idle' } : { type: 'decor', kind });
}

function chooseTheme(id: ThemeId, at: MouseEvent) {
  const theme = themeDef(id);
  if (theme.level > level()) return lockedToast(`${theme.name} style`, theme.level);
  if (state.town.theme === id) return;
  checkpoint();
  state.town.theme = id;
  sfx('whoosh');
  events.emit('confetti', { x: at.clientX, y: at.clientY });
  events.emit('toast', { text: `${theme.emoji} Your town AND your website now use the ${theme.name} style!`, kind: 'good' });
  bump('themesTried');
  if (state.progress.stats.themesTried <= THEME_XP_LIMIT) reward(10, 0);
  commit();
}

export function mountBuildBar(el: HTMLElement) {
  bar = el;
  bar.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!target) return;
    const d = target.dataset;
    if (d.tab) {
      tab = d.tab as Tab;
      sfx('click');
      if (getMode().type !== 'idle') setMode({ type: 'idle' });
      updateBuildBar();
    } else if (d.house) chooseHouse(d.house as HouseKind);
    else if (d.decor) chooseDecor(d.decor as DecorKind);
    else if (d.theme) chooseTheme(d.theme as ThemeId, e);
  });
}

export function updateBuildBar() {
  if (!bar) return;
  const playerLevel = level();
  const costs = tab === 'houses' ? BUILDABLE_HOUSES.map((h) => h.cost) : tab === 'nature' ? DECOR.map((d) => d.cost) : [];
  const affordable = costs.map((c) => (state.progress.coins >= c ? 1 : 0)).join('');
  const key = `${tab}|${playerLevel}|${JSON.stringify(getMode())}|${state.town.theme}|${affordable}`;
  if (key === renderedKey) return;
  renderedKey = key;

  const tabButton = (id: Tab, label: string) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${label}</button>`;
  bar.innerHTML = `
    <div class="tabs">${tabButton('houses', '🏠 Houses <small>= pages</small>')}${tabButton('nature', '🌳 Nature')}${tabButton('styles', '🎨 Styles <small>= look</small>')}</div>
    <div class="cards">${cardsFor(tab, playerLevel)}</div>`;
}

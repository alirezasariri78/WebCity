import {
  CITY,
  CITY_TECH,
  DECOR,
  HOUSES,
  THEMES,
  WONDERS,
  cityDef,
  decorDef,
  houseDef,
  techDef,
  themeDef,
  wonderDef,
} from '../../core/catalog';
import { cityUnlocked, wonderState } from '../../core/rules';
import type { CityKind, DecorKind, HouseKind, ThemeId, WonderKind } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { checkpoint } from '../../game/history';
import { bump, level, reward } from '../../game/progress';
import { commit, state } from '../../game/store';
import { num, t } from '../../i18n';
import { esc } from '../../site';
import { getMode, setMode, startCustom } from '../town/townView';

type Tab = 'pages' | 'city' | 'wonders' | 'nature' | 'styles';

const PAGE_BUILDINGS = HOUSES.filter((h) => h.kind !== 'townhall');
const THEME_XP_LIMIT = 6;

let bar: HTMLElement;
let tab: Tab = 'pages';
let renderedKey = '';

export const currentBuildTab = () => tab;

const lockedToast = (name: string, unlockLevel: number) => {
  sfx('error');
  events.emit('toast', {
    text: t('🔒 {name} unlocks at level {level}. Finish quests to level up!', { name, level: unlockLevel }),
    kind: 'bad',
  });
};

const poorToast = (cost: number) => {
  sfx('error');
  events.emit('toast', {
    text: t('You need {coins} more 🪙. Finish quests or wait for visitors!', { coins: cost - state.progress.coins }),
    kind: 'bad',
  });
};

const techToast = (name: string, tech: string) => {
  sfx('error');
  events.emit('toast', { text: t('🔬 {name} needs the {tech} technology. Open the research tree!', { name, tech }), kind: 'bad' });
};

function isPlacing(type: 'house' | 'city' | 'decor' | 'wonder', kind: string) {
  const mode = getMode();
  return mode.type === type && mode.kind === kind;
}

interface CardOptions {
  attr: string;
  kind: string;
  emoji: string;
  name: string;
  sub: string;
  cost?: number;
  locked: boolean;
  active: boolean;
  extra?: string;
  swatch?: [string, string];
}

function card(o: CardOptions) {
  const poor = !o.locked && o.cost !== undefined && state.progress.coins < o.cost;
  const classes = ['card-btn', o.extra, o.locked && 'locked', o.active && 'active', poor && 'poor'].filter(Boolean).join(' ');
  const cost = o.cost === undefined ? '' : `<span class="cost">${num(o.cost)} 🪙</span>`;
  const swatch = o.swatch ? `<span class="swatch" style="--a:${o.swatch[0]};--b:${o.swatch[1]}"></span>` : '';
  return `<button class="${classes}" ${o.attr}="${o.kind}">${swatch}<span class="cb-emoji">${o.locked ? '🔒' : o.emoji}</span><b>${esc(o.name)}</b><small>${o.sub}</small>${cost}</button>`;
}

const levelLabel = (n: number) => t('Level {n}', { n });

function cardsFor(current: Tab, playerLevel: number): string {
  if (current === 'pages') {
    return PAGE_BUILDINGS.map((h) => {
      const locked = h.level > playerLevel;
      return card({
        attr: 'data-house',
        kind: h.kind,
        emoji: h.emoji,
        name: t(h.name),
        sub: locked ? levelLabel(h.level) : t(h.web),
        cost: h.cost,
        locked,
        active: isPlacing('house', h.kind),
      });
    }).join('');
  }
  if (current === 'city') {
    return CITY.map((c) => {
      const locked = !cityUnlocked(state.progress.research, c.kind);
      const tech = CITY_TECH[c.kind];
      return card({
        attr: 'data-city',
        kind: c.kind,
        emoji: c.emoji,
        name: t(c.name),
        sub: locked && tech ? `🔬 ${t(techDef(tech).name)}` : t(c.desc),
        cost: c.cost,
        locked,
        active: isPlacing('city', c.kind),
        extra: 'city-card',
      });
    }).join('');
  }
  if (current === 'wonders') {
    return WONDERS.map((w) => {
      const status = wonderState(state.town, state.progress.research, w);
      const sub =
        status === 'locked'
          ? `🔬 ${t(techDef(w.tech).name)}`
          : status === 'done'
            ? t('✓ Built')
            : status === 'building'
              ? t('🏗️ Being built…')
              : esc(t(w.gift));
      return card({
        attr: 'data-wonder',
        kind: w.kind,
        emoji: w.emoji,
        name: t(w.name),
        sub,
        cost: status === 'ready' ? w.cost : undefined,
        locked: status === 'locked',
        active: isPlacing('wonder', w.kind) || status === 'done',
        extra: 'wonder-card',
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
        name: t(d.name),
        sub: locked ? levelLabel(d.level) : '&nbsp;',
        cost: d.cost,
        locked,
        active: isPlacing('decor', d.kind),
        extra: 'small-card',
      });
    }).join('');
  }
  return THEMES.map((th) => {
    const locked = th.level > playerLevel;
    const inUse = state.town.theme === th.id;
    const sub = locked ? levelLabel(th.level) : inUse ? t('✓ Using now') : esc(t(th.desc));
    return card({
      attr: 'data-theme',
      kind: th.id,
      emoji: th.emoji,
      name: t(th.name),
      sub,
      locked,
      active: inUse,
      extra: 'theme-card',
      swatch: [th.site.heroFrom, th.site.heroTo],
    });
  }).join('');
}

function choose<K extends string>(def: { name: string; level: number; cost: number }, type: 'house' | 'city', kind: K) {
  if (def.level > level()) return lockedToast(t(def.name), def.level);
  if (state.progress.coins < def.cost) return poorToast(def.cost);
  sfx('click');
  if (kind === 'custom') return void startCustom(type);
  if (isPlacing(type, kind)) setMode({ type: 'idle' });
  else setMode(type === 'house' ? { type, kind: kind as unknown as HouseKind } : { type, kind: kind as unknown as CityKind });
}

function chooseCity(kind: CityKind) {
  const def = cityDef(kind);
  const tech = CITY_TECH[kind];
  if (tech && !cityUnlocked(state.progress.research, kind)) return techToast(t(def.name), t(techDef(tech).name));
  choose(def, 'city', kind);
}

function chooseWonder(kind: WonderKind) {
  const def = wonderDef(kind);
  const status = wonderState(state.town, state.progress.research, def);
  if (status === 'locked') return techToast(t(def.name), t(techDef(def.tech).name));
  if (status !== 'ready') return;
  if (state.progress.coins < def.cost) return poorToast(def.cost);
  sfx('click');
  setMode(isPlacing('wonder', kind) ? { type: 'idle' } : { type: 'wonder', kind });
}

function chooseDecor(kind: DecorKind) {
  const def = decorDef(kind);
  if (def.level > level()) return lockedToast(t(def.name), def.level);
  if (state.progress.coins < def.cost) return poorToast(def.cost);
  sfx('click');
  setMode(isPlacing('decor', kind) ? { type: 'idle' } : { type: 'decor', kind });
}

function chooseTheme(id: ThemeId, at: MouseEvent) {
  const theme = themeDef(id);
  if (theme.level > level()) return lockedToast(t(theme.name), theme.level);
  if (state.town.theme === id) return;
  checkpoint();
  state.town.theme = id;
  sfx('whoosh');
  events.emit('confetti', { x: at.clientX, y: at.clientY });
  events.emit('toast', {
    text: t('{emoji} Your town and your website now use the {name} style!', { emoji: theme.emoji, name: t(theme.name) }),
    kind: 'good',
  });
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
    } else if (d.house) choose(houseDef(d.house as HouseKind), 'house', d.house);
    else if (d.city) chooseCity(d.city as CityKind);
    else if (d.wonder) chooseWonder(d.wonder as WonderKind);
    else if (d.decor) chooseDecor(d.decor as DecorKind);
    else if (d.theme) chooseTheme(d.theme as ThemeId, e);
  });
}

export function updateBuildBar(force = false) {
  if (!bar) return;
  const playerLevel = level();
  const costs = tab === 'pages' ? PAGE_BUILDINGS : tab === 'city' ? CITY : tab === 'wonders' ? WONDERS : tab === 'nature' ? DECOR : [];
  const affordable = costs.map((c) => (state.progress.coins >= c.cost ? 1 : 0)).join('');
  const empire = `${state.progress.research.done.length}|${state.town.wonders.map((w) => `${w.kind}${w.done}`).join()}`;
  const key = `${tab}|${playerLevel}|${JSON.stringify(getMode())}|${state.town.theme}|${affordable}|${empire}`;
  if (key === renderedKey && !force) return;
  renderedKey = key;

  const tabButton = (id: Tab, label: string, hint: string) =>
    `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${label}${hint ? ` <small>${hint}</small>` : ''}</button>`;
  bar.innerHTML = `
    <div class="tabs">${tabButton('pages', `🏠 ${t('Pages')}`, t('= website pages'))}${tabButton('city', `🏙️ ${t('City')}`, t('= grows by itself'))}${tabButton('wonders', `🏛️ ${t('Wonders')}`, '')}${tabButton('nature', `🌳 ${t('Nature')}`, '')}${tabButton('styles', `🎨 ${t('Styles')}`, '')}</div>
    <div class="cards">${cardsFor(tab, playerLevel)}</div>`;
}

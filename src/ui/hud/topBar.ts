import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { achievementById, cityPopulation, currentEra, levelInfo, rating, upcomingEra } from '../../game/progress';
import { state } from '../../game/store';
import { getLang, num, t } from '../../i18n';

export interface TopBarActions {
  renameTown: () => void;
  openDesign: () => void;
  openPreview: () => void;
  openBadges: () => void;
  openMenu: () => void;
  switchLanguage: () => void;
}

let bar: HTMLElement;
const lastValues = new Map<string, string>();
let shownCoins = -1;

function setText(selector: string, value: string, asHtml = false) {
  if (lastValues.get(selector) === value) return;
  lastValues.set(selector, value);
  const el = bar.querySelector(selector)!;
  if (asHtml) el.innerHTML = value;
  else el.textContent = value;
}

function stars(count: number) {
  let html = '';
  for (let i = 1; i <= 5; i++) html += `<i class="${count >= i ? 'on' : count >= i - 0.5 ? 'half' : ''}">★</i>`;
  return html;
}

export function mountTopBar(el: HTMLElement, actions: TopBarActions) {
  bar = el;
  lastValues.clear();
  shownCoins = -1;
  bar.innerHTML = `
    <button class="town-name" data-rename title="${t('Rename your town')}" data-tour="name"><span class="logo"></span><span class="tn"></span><span class="edit">✏️</span></button>
    <div class="lvl" title="${t('Your level. Earn XP by building and finishing quests.')}" data-tour="level"><div class="lvl-badge"><small>${t('LV')}</small><b></b></div><div class="lvl-bar"><i></i><span></span></div></div>
    <div class="stat coins" title="${t('Coins: spend them on buildings, furniture and nature')}">🪙 <b></b></div>
    <div class="stat people" title="${t('People living in your town. More people = a bigger era.')}" data-tour="people"><span class="era-emoji"></span><span class="era-name"></span><b></b></div>
    <div class="stat rating" title="${t('Website rating: how good your website is')}"><span class="stars"></span></div>
    <div class="spacer"></div>
    <button class="btn design" data-design title="${t('Design Studio: the look of the whole website')}" data-tour="design">🎨 <span class="hide-sm">${t('Design')}</span></button>
    <button class="btn magic" data-preview data-tour="preview">🔮 <span class="hide-sm">${t('My website')}</span></button>
    <button class="round-btn lang-btn" data-lang title="${t('Language')}">${getLang() === 'fa' ? 'EN' : 'فا'}</button>
    <button class="round-btn" data-badges title="${t('Badges')}">🏆<i class="dot" hidden></i></button>
    <button class="round-btn" data-menu title="${t('Menu')}">⚙️</button>`;

  bar.querySelector('[data-rename]')!.addEventListener('click', actions.renameTown);
  bar.querySelector('[data-design]')!.addEventListener('click', actions.openDesign);
  bar.querySelector('[data-preview]')!.addEventListener('click', actions.openPreview);
  bar.querySelector('[data-lang]')!.addEventListener('click', actions.switchLanguage);
  bar.querySelector('[data-badges]')!.addEventListener('click', () => {
    bar.querySelector('[data-badges] .dot')!.setAttribute('hidden', '');
    actions.openBadges();
  });
  bar.querySelector('[data-menu]')!.addEventListener('click', actions.openMenu);
}

let achievementsBound = false;
export function bindAchievementToasts() {
  if (achievementsBound) return;
  achievementsBound = true;
  events.on('achievement', ({ id }) => {
    const badge = achievementById(id)!;
    sfx('badge');
    events.emit('toast', {
      text: t('🏆 Badge unlocked: {badge}! +{coins} 🪙', { badge: `${badge.emoji} ${t(badge.name)}`, coins: badge.coins }),
      kind: 'good',
    });
    bar.querySelector('[data-badges] .dot')?.removeAttribute('hidden');
  });
}

function animateCoins() {
  const el = bar.querySelector('.coins b')!;
  const box = bar.querySelector('.coins')!;
  const target = state.progress.coins;
  if (shownCoins < 0 || shownCoins === target) {
    shownCoins = target;
    el.textContent = num(target);
    return;
  }
  const from = shownCoins;
  const started = performance.now();
  shownCoins = target;
  box.classList.add(target > from ? 'up' : 'down');
  const step = (now: number) => {
    const k = Math.min(1, (now - started) / 500);
    el.textContent = num(Math.round(from + (target - from) * k));
    if (k < 1 && shownCoins === target) requestAnimationFrame(step);
    else box.classList.remove('up', 'down');
  };
  requestAnimationFrame(step);
}

export function updateTopBar() {
  if (!bar) return;
  const info = levelInfo();
  const era = currentEra();
  const next = upcomingEra();
  const people = cityPopulation();
  setText('.logo', state.town.logo);
  setText('.tn', state.town.name);
  setText('.lvl-badge b', num(info.level));
  const scale = String(info.pct);
  if (lastValues.get('xp') !== scale) {
    lastValues.set('xp', scale);
    (bar.querySelector('.lvl-bar i') as HTMLElement).style.transform = `scaleX(${scale})`;
  }
  setText('.lvl-bar span', t('{into} / {need} XP', { into: info.into, need: info.need }));
  setText('.era-emoji', era.emoji);
  setText('.era-name', t(era.name));
  setText('.people b', num(people));
  const peopleTitle = next
    ? t('{people} people · {more} more to become a {era}', { people, more: next.population - people, era: t(next.name) })
    : t('{people} people · the biggest era!', { people });
  if (lastValues.get('people-title') !== peopleTitle) {
    lastValues.set('people-title', peopleTitle);
    bar.querySelector('.people')!.setAttribute('title', peopleTitle);
  }
  setText('.rating .stars', stars(rating().stars), true);
  animateCoins();
}

import { events } from '../../game/events';
import { levelInfo, rating, visitors, achievementById } from '../../game/progress';
import { state } from '../../game/store';
import { sfx } from '../../game/audio';

export interface TopBarActions {
  renameTown: () => void;
  openDesign: () => void;
  openPreview: () => void;
  openBadges: () => void;
  openMenu: () => void;
}

let bar: HTMLElement;
const lastValues = new Map<string, string>();
let shownCoins = -1;

/** Writes to the page only when the value really changed. */
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
  bar.innerHTML = `
    <button class="town-name" data-rename title="Rename your town"><span class="logo"></span><span class="tn"></span><span class="edit">✏️</span></button>
    <div class="lvl" title="Your level. Earn XP by building and finishing quests."><div class="lvl-badge"><small>LV</small><b></b></div><div class="lvl-bar"><i></i><span></span></div></div>
    <div class="stat coins" title="Coins: spend them on houses, furniture and nature">🪙 <b></b></div>
    <div class="stat rating" title="Website rating: how good your website is"><span class="stars"></span><small></small></div>
    <div class="stat visitors" title="Visitors per hour. A better website gets more visitors, and visitors leave coins!">👥 <b></b><small>/h</small></div>
    <div class="spacer"></div>
    <button class="btn design" data-design title="Design Studio: the look of the whole website">🎨 <span class="hide-sm">Design</span></button>
    <button class="btn magic" data-preview>🔮 <span class="hide-sm">Magic Window</span></button>
    <button class="round-btn" data-badges title="Badges">🏆<i class="dot" hidden></i></button>
    <button class="round-btn" data-menu title="Menu">⚙️</button>`;

  bar.querySelector('[data-rename]')!.addEventListener('click', actions.renameTown);
  bar.querySelector('[data-design]')!.addEventListener('click', actions.openDesign);
  bar.querySelector('[data-preview]')!.addEventListener('click', actions.openPreview);
  bar.querySelector('[data-badges]')!.addEventListener('click', () => {
    bar.querySelector('[data-badges] .dot')!.setAttribute('hidden', '');
    actions.openBadges();
  });
  bar.querySelector('[data-menu]')!.addEventListener('click', actions.openMenu);

  events.on('achievement', ({ id }) => {
    const badge = achievementById(id)!;
    sfx('badge');
    events.emit('toast', { text: `🏆 Badge unlocked: ${badge.emoji} ${badge.name}! +${badge.coins} 🪙`, kind: 'good' });
    bar.querySelector('[data-badges] .dot')!.removeAttribute('hidden');
  });
}

function animateCoins() {
  const el = bar.querySelector('.coins b')!;
  const box = bar.querySelector('.coins')!;
  const target = state.progress.coins;
  if (shownCoins < 0 || shownCoins === target) {
    shownCoins = target;
    el.textContent = String(target);
    return;
  }
  const from = shownCoins;
  const started = performance.now();
  shownCoins = target;
  box.classList.add(target > from ? 'up' : 'down');
  const step = (now: number) => {
    const k = Math.min(1, (now - started) / 500);
    el.textContent = String(Math.round(from + (target - from) * k));
    if (k < 1 && shownCoins === target) requestAnimationFrame(step);
    else box.classList.remove('up', 'down');
  };
  requestAnimationFrame(step);
}

export function updateTopBar() {
  if (!bar) return;
  const info = levelInfo();
  const score = rating();
  setText('.logo', state.town.logo);
  setText('.tn', state.town.name);
  setText('.lvl-badge b', String(info.level));
  const width = `${Math.round(info.pct * 100)}%`;
  if (lastValues.get('xp-width') !== width) {
    lastValues.set('xp-width', width);
    (bar.querySelector('.lvl-bar i') as HTMLElement).style.transform = `scaleX(${info.pct})`;
  }
  setText('.lvl-bar span', `${info.into} / ${info.need} XP`);
  setText('.rating .stars', stars(score.stars), true);
  setText('.rating small', String(score.score));
  setText('.visitors b', String(visitors()));
  animateCoins();
}

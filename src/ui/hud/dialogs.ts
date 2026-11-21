import { ERAS, SITE_FEATURES, unlocksAt, type EraId } from '../../core/rules';
import type { Lang } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { newGame } from '../../game/factory';
import { checkpoint } from '../../game/history';
import { parseSave } from '../../game/persistence';
import { ACHIEVEMENTS, type AwayEarnings, type DailyGift } from '../../game/progress';
import { commit, replaceState, saveNow, state } from '../../game/store';
import { LANGUAGES, num, setLang, t } from '../../i18n';
import { esc } from '../../site';
import { pickFile } from '../common/download';
import { confirmModal, openModal } from '../common/modal';
import { exportWebsite, saveProjectFile } from '../magicWindow';

export const LOGOS = [
  '🏘️',
  '🏰',
  '🌻',
  '🍰',
  '☕',
  '🎨',
  '📚',
  '🚀',
  '🌊',
  '🐾',
  '🎸',
  '💼',
  '🌿',
  '⭐',
  '🍕',
  '💖',
  '🧁',
  '🛠️',
  '📷',
  '🎮',
];

/** Saves the choice and reloads, so every screen is rebuilt in the new language. */
export function setLanguage(lang: Lang) {
  state.settings.lang = lang;
  saveNow();
  location.reload();
}

/** First visit: rebuild the starter town so its names and texts are in the chosen language. */
function startInLanguage(lang: Lang) {
  setLang(lang);
  const fresh = newGame();
  fresh.settings = { ...fresh.settings, lang, welcomed: true };
  replaceState(fresh);
  location.reload();
}

export function chooseLanguage(onChosen: () => void) {
  const buttons = LANGUAGES.map(
    (l) =>
      `<button class="btn big lang-choice" data-lang="${l.id}" dir="${l.dir}"><span class="lang-mark">${l.id === 'fa' ? 'فا' : 'En'}</span>${l.name}</button>`,
  ).join('');
  const modal = openModal(
    `<div class="modal-icon">🌐</div><h2>Choose your language</h2><h2 dir="rtl">زبان را انتخاب کنید</h2><div class="lang-choices">${buttons}</div>`,
    {
      cls: 'center',
      dismissable: false,
    },
  );
  modal.el.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      const lang = b.dataset.lang as Lang;
      state.settings.welcomed = true;
      if (lang !== state.settings.lang) return startInLanguage(lang);
      saveNow();
      modal.close();
      onChosen();
    }),
  );
}

export function renameTown() {
  sfx('click');
  let logo = state.town.logo;
  const logos = LOGOS.map((l) => `<button type="button" class="logo-pick${l === logo ? ' on' : ''}" data-logo="${l}">${l}</button>`).join(
    '',
  );
  const modal =
    openModal(`<div class="modal-icon">🏷️</div><h2>${t('Name your town')}</h2><p class="muted">${t('This is also the name of your website.')}</p>
    <form class="prompt-form"><label class="field"><span>${t('Town name')}</span><input class="input" maxlength="32" value="${esc(state.town.name)}"></label>
    <div class="field"><span>${t('Logo')}</span><div class="logo-grid">${logos}</div></div>
    <div class="row end"><button class="btn primary">${t('Save ✓')}</button></div></form>`);
  const input = modal.el.querySelector('input')!;
  setTimeout(() => input.select(), 50);
  modal.el.querySelectorAll<HTMLButtonElement>('[data-logo]').forEach((b) =>
    b.addEventListener('click', () => {
      logo = b.dataset.logo!;
      modal.el.querySelectorAll('[data-logo]').forEach((x) => x.classList.toggle('on', x === b));
      sfx('pop');
    }),
  );
  modal.el.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    checkpoint();
    state.town.name = name;
    state.town.logo = logo;
    sfx('coin');
    commit();
    modal.close();
  });
}

const unlockList = (items: string[]) =>
  items.length
    ? `<div class="unlocks"><b>${t('New things unlocked:')}</b>${items.map((u) => `<div class="unlock">${esc(u)}</div>`).join('')}</div>`
    : '';

export function showLevelUp(level: number) {
  sfx('levelup');
  events.emit('confetti', { big: true });
  const modal = openModal(
    `<div class="levelup"><div class="burst"></div><div class="lv-num">${num(level)}</div><h2>${t('Level up!')}</h2><p class="muted">${t('You are now a level {level} Mayor.', { level })}</p>${unlockList(unlocksAt(level).map((u) => `${u.emoji} ${t(u.name)}${u.detail ? ` (${t(u.detail)})` : ''}`))}<button class="btn primary big" data-ok>${t('Awesome! 🎉')}</button></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-ok]')!.addEventListener('click', () => modal.close());
  commit();
}

export function showNewEra(id: EraId) {
  const era = ERAS.find((e) => e.id === id)!;
  sfx('levelup');
  events.emit('confetti', { big: true });
  const features = SITE_FEATURES.filter((f) => f.era === id).map((f) => `${f.emoji} ${t(f.name)}`);
  const perks = [
    t('🏢 Buildings can now grow up to {floors} floors', { floors: era.maxFloors }),
    t('⬆️ Page buildings can be upgraded to ★{level}', { level: era.maxPageLevel }),
    ...features,
  ];
  const modal = openModal(
    `<div class="levelup"><div class="burst"></div><div class="lv-num era">${era.emoji}</div><h2>${t('Your town is now a {era}!', { era: t(era.name) })}</h2><p class="muted">${t('More people moved in, and the town keeps growing.')}</p>${unlockList(perks)}<button class="btn primary big" data-ok>${t('Hooray! 🎉')}</button></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-ok]')!.addEventListener('click', () => modal.close());
}

export function openBadges() {
  sfx('click');
  const earned = state.progress.achievements;
  const s = state.progress.stats;
  const badges = ACHIEVEMENTS.map((a) => {
    const got = earned.includes(a.id);
    return `<div class="badge${got ? ' got' : ''}"><div class="b-emoji">${got ? a.emoji : '❔'}</div><b>${t(a.name)}</b><small>${t(a.desc)}</small><span class="cost">${got ? t('✓ Earned') : `+${num(a.coins)} 🪙`}</span></div>`;
  }).join('');
  const stat = (value: string | number, label: string) =>
    `<div><b>${typeof value === 'number' ? num(value) : value}</b><small>${t(label)}</small></div>`;
  openModal(`<h2>🏆 ${t('Your badges')} <span class="muted small">${num(earned.length)} / ${num(ACHIEVEMENTS.length)}</span></h2>
    <div class="badges">${badges}</div>
    <h3>📊 ${t('Your stats')}</h3>
    <div class="stats-grid">
      ${stat(s.housesBuilt, 'pages built')}${stat(s.cityBuilt, 'city buildings')}${stat(s.grown, 'floors grown')}
      ${stat(s.coinsEarned, 'coins earned')}${stat(`${num(state.progress.streak)}🔥`, 'day streak')}${stat(s.exports, 'websites downloaded')}
    </div>`);
}

async function openProjectFile() {
  const file = await pickFile('.json,application/json');
  if (!file) return;
  const data = parseSave(await file.text());
  if (!data) {
    events.emit('toast', { text: t('That file is not a Town Builder project.'), kind: 'bad' });
    return;
  }
  replaceState(data);
  location.reload();
}

async function startOver() {
  const ok = await confirmModal(
    t('Start over?'),
    t('Your current town will be deleted. Save a project file first if you want to keep it!'),
    t('Delete & start over'),
    '🔄',
  );
  if (!ok) return;
  const fresh = newGame();
  fresh.settings = { ...state.settings, tourDone: false };
  replaceState(fresh);
  location.reload();
}

const soundLabel = () => (state.settings.muted ? t('🔇 Sound is off') : t('🔊 Sound is on'));

export function openMenu(startTour: () => void) {
  sfx('click');
  const modal = openModal(`<h2>⚙️ ${t('Menu')}</h2>
    <div class="menu-list">
      <button class="btn block" data-action="export">⬇️ ${t('Download my website')}</button>
      <button class="btn block" data-action="save">💾 ${t('Save project file')} <small class="muted">${t('(to edit later on any computer)')}</small></button>
      <button class="btn block" data-action="open">📂 ${t('Open project file')}</button>
      <button class="btn block" data-action="sound">${soundLabel()}</button>
      <button class="btn block" data-action="tour">🧭 ${t('Show the tour again')}</button>
      <button class="btn block danger-soft" data-action="reset">🔄 ${t('Start a brand new town')}</button>
    </div>
    <p class="muted small">${t('Your town saves automatically in this browser.')}</p>`);

  const actions: Record<string, (button: HTMLButtonElement) => void> = {
    export: () => exportWebsite(),
    save: saveProjectFile,
    open: () => void openProjectFile(),
    sound: (button) => {
      state.settings.muted = !state.settings.muted;
      button.textContent = soundLabel();
      commit({ render: false });
      sfx('click');
    },
    tour: startTour,
    reset: () => void startOver(),
  };
  modal.el.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) =>
    button.addEventListener('click', () => {
      const action = button.dataset.action!;
      if (action !== 'sound') modal.close();
      actions[action](button);
    }),
  );
}

export function showDailyGift(daily: DailyGift | null, away: AwayEarnings | null) {
  const hasAway = !!away && (away.coins > 0 || away.newFloors > 0);
  if (!daily && !hasAway) return;
  const today = daily ? ((daily.streak - 1) % 7) + 1 : 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const cls = day < today ? ' past' : day === today ? ' today' : '';
    return `<div class="day${cls}"><small>${t('Day {n}', { n: day })}</small><span>${day === 7 ? '🎁' : '🪙'}</span><b>${num(20 + 10 * day)}</b></div>`;
  }).join('');
  const streak = daily
    ? `<div class="modal-icon">🔥</div><h2>${t('Day {n} streak!', { n: daily.streak })}</h2><p class="muted">${t('Come back every day for bigger gifts.')}</p><div class="days">${days}</div><div class="gift">+${num(daily.coins)} 🪙</div>`
    : '';
  const awayText = hasAway
    ? `<div class="away">${t('While you were away, {visitors} people visited your website and left {coins} 🪙.', { visitors: away.visitors, coins: away.coins })}${away.newFloors ? `<br>${t('🏗️ Your town grew {floors} new floors!', { floors: away.newFloors })}` : ''}</div>`
    : '';
  const modal = openModal(
    `<div class="daily">${streak}${awayText}<button class="btn primary big" data-ok>${t('Collect! ✨')}</button></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-ok]')!.addEventListener('click', (e) => {
    sfx('coin');
    events.emit('confetti', { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
    modal.close();
    commit();
  });
}

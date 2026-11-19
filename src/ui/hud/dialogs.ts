import { unlocksAt } from '../../core/rules';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { newGame } from '../../game/factory';
import { checkpoint } from '../../game/history';
import { parseSave } from '../../game/persistence';
import { ACHIEVEMENTS, type AwayEarnings, type DailyGift } from '../../game/progress';
import { commit, replaceState, state } from '../../game/store';
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

export function renameTown() {
  sfx('click');
  let logo = state.town.logo;
  const modal =
    openModal(`<div class="modal-icon">🏷️</div><h2>Name your town</h2><p class="muted">This is also the name of your website.</p>
    <form class="prompt-form"><label class="field"><span>Town name</span><input class="input" maxlength="32" value="${esc(state.town.name)}"></label>
    <div class="field"><span>Logo</span><div class="logo-grid">${LOGOS.map((l) => `<button type="button" class="logo-pick${l === logo ? ' on' : ''}" data-logo="${l}">${l}</button>`).join('')}</div></div>
    <div class="row end"><button class="btn primary">Save ✓</button></div></form>`);
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

export function showLevelUp(level: number) {
  sfx('levelup');
  events.emit('confetti', { big: true });
  const unlocks = unlocksAt(level);
  const list = unlocks.length
    ? `<div class="unlocks"><b>New things unlocked:</b>${unlocks.map((u) => `<div class="unlock">${esc(u)}</div>`).join('')}</div>`
    : '';
  const modal = openModal(
    `<div class="levelup"><div class="burst"></div><div class="lv-num">${level}</div><h2>Level up!</h2><p class="muted">You are now a level ${level} Mayor.</p>${list}<button class="btn primary big" data-ok>Awesome! 🎉</button></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-ok]')!.addEventListener('click', () => modal.close());
  commit();
}

export function openBadges() {
  sfx('click');
  const earned = state.progress.achievements;
  const s = state.progress.stats;
  const badges = ACHIEVEMENTS.map((a) => {
    const got = earned.includes(a.id);
    return `<div class="badge${got ? ' got' : ''}"><div class="b-emoji">${got ? a.emoji : '❔'}</div><b>${a.name}</b><small>${a.desc}</small><span class="cost">${got ? '✓ Earned' : `+${a.coins} 🪙`}</span></div>`;
  }).join('');
  const stat = (value: string | number, label: string) => `<div><b>${value}</b><small>${label}</small></div>`;
  openModal(`<h2>🏆 Your badges <span class="muted small">${earned.length} / ${ACHIEVEMENTS.length}</span></h2>
    <div class="badges">${badges}</div>
    <h3>📊 Your stats</h3>
    <div class="stats-grid">
      ${stat(s.housesBuilt, 'houses built')}${stat(s.furnitureAdded, 'furniture added')}${stat(s.decorPlaced, 'nature placed')}
      ${stat(s.coinsEarned, 'coins earned')}${stat(`${state.progress.streak}🔥`, 'day streak')}${stat(s.exports, 'websites downloaded')}
    </div>`);
}

async function openProjectFile() {
  const file = await pickFile('.json,application/json');
  if (!file) return;
  const data = parseSave(await file.text());
  if (!data) {
    events.emit('toast', { text: 'That file is not a Town Builder project.', kind: 'bad' });
    return;
  }
  replaceState(data);
  location.reload();
}

async function startOver() {
  const ok = await confirmModal(
    'Start over?',
    'Your current town will be deleted. Save a project file first if you want to keep it!',
    'Delete & start over',
    '🔄',
  );
  if (!ok) return;
  const fresh = newGame();
  fresh.settings.welcomed = true;
  replaceState(fresh);
  location.reload();
}

const soundLabel = () => (state.settings.muted ? '🔇 Sound is off' : '🔊 Sound is on');

export function openMenu() {
  sfx('click');
  const modal = openModal(`<h2>⚙️ Menu</h2>
    <div class="menu-list">
      <button class="btn block" data-action="export">⬇️ Download my website</button>
      <button class="btn block" data-action="save">💾 Save project file <small class="muted">(to edit later on any computer)</small></button>
      <button class="btn block" data-action="open">📂 Open project file</button>
      <button class="btn block" data-action="sound">${soundLabel()}</button>
      <button class="btn block" data-action="help">❓ How to play</button>
      <button class="btn block danger-soft" data-action="reset">🔄 Start a brand new town</button>
    </div>
    <p class="muted small">Your town saves automatically in this browser.</p>`);

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
    help: () => showWelcome(),
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

export function showWelcome(onDone?: () => void) {
  const step = (emoji: string, title: string, text: string) => `<div><span>${emoji}</span><b>${title}</b><small>${text}</small></div>`;
  const modal = openModal(
    `<div class="welcome"><div class="w-hero">🏘️</div><h2>Welcome, Mayor!</h2>
    <p class="muted">In this game you build a town, and your town <b>becomes a real website</b>.</p>
    <div class="w-steps">
      ${step('🏠', 'Houses are pages', 'Build a house → your website gets a new page.')}
      ${step('🛋️', 'Furniture is content', 'Go inside, add furniture → titles, text, pictures, forms, buttons.')}
      ${step('🎨', 'Style everything', 'Colours, fonts, corners, spacing… for one part, one page, or the whole site.')}
      ${step('🔮', 'Magic Window', 'See your real website at any time, then download it!')}
    </div>
    <p class="muted small">Finish quests ⭐ to earn coins and XP, level up to unlock new things, and come back every day for gifts.</p>
    <button class="btn primary big" data-go>Let's build! 🚀</button></div>`,
    { cls: 'center', onClose: onDone },
  );
  modal.el.querySelector('[data-go]')!.addEventListener('click', () => {
    sfx('fanfare');
    modal.close();
  });
}

export function showDailyGift(daily: DailyGift | null, away: AwayEarnings | null) {
  if (!daily && !(away && away.coins > 0)) return;
  const today = daily ? ((daily.streak - 1) % 7) + 1 : 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const cls = day < today ? ' past' : day === today ? ' today' : '';
    return `<div class="day${cls}"><small>Day ${day}</small><span>${day === 7 ? '🎁' : '🪙'}</span><b>${20 + 10 * day}</b></div>`;
  }).join('');
  const streak = daily
    ? `<div class="modal-icon">🔥</div><h2>Day ${daily.streak} streak!</h2><p class="muted">Come back every day for bigger gifts.</p><div class="days">${days}</div><div class="gift">+${daily.coins} 🪙</div>`
    : '';
  const awayText =
    away && away.coins > 0
      ? `<div class="away">While you were away, <b>${away.visitors}</b> people visited your website and left <b>${away.coins} 🪙</b>!</div>`
      : '';
  const modal = openModal(`<div class="daily">${streak}${awayText}<button class="btn primary big" data-ok>Collect! ✨</button></div>`, {
    cls: 'center',
  });
  modal.el.querySelector('[data-ok]')!.addEventListener('click', (e) => {
    sfx('coin');
    events.emit('confetti', { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
    modal.close();
    commit();
  });
}

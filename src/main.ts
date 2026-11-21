import './styles/index.css';
import { events } from './game/events';
import { checkEra, checkProgress, collectAwayEarnings, dailyCheckIn } from './game/progress';
import { commit, onChange, saveNow, state } from './game/store';
import { setLang } from './i18n';
import { initEffects } from './ui/common/fx';
import { openDesignStudio } from './ui/designStudio';
import { closeHouse, doRedo, doUndo, mountHouseEditor, openHouse, renderHouseEditor } from './ui/house/houseEditor';
import { mountBuildBar, updateBuildBar } from './ui/hud/buildBar';
import { chooseLanguage, openBadges, openMenu, renameTown, setLanguage, showDailyGift, showLevelUp, showNewEra } from './ui/hud/dialogs';
import { mountHelper, updateHelper } from './ui/hud/helper';
import { mountQuestCard, updateQuestCard } from './ui/hud/questCard';
import { bindAchievementToasts, mountTopBar, updateTopBar } from './ui/hud/topBar';
import { openMagicWindow } from './ui/magicWindow';
import { startTour } from './ui/tour';
import { mountTown, renderTown, start as startTown, stop as stopTown } from './ui/town/townView';
import type { EraId } from './core/rules';

setLang(state.settings.lang);

const app = document.getElementById('app')!;
app.innerHTML = `
  <header class="hud"></header>
  <main class="stage">
    <div class="view town-view"></div>
    <div class="view interior-view" hidden></div>
    <aside class="quest-card" data-tour="quest"></aside>
    <div class="helper"></div>
  </main>
  <nav class="build-bar" data-tour="build"></nav>`;

const $ = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
const townEl = $('.town-view');
const houseEl = $('.interior-view');
const buildBarEl = $('.build-bar');
let insideHouse = false;

function refreshHud() {
  updateTopBar();
  updateQuestCard();
  updateHelper();
  updateBuildBar();
}

function showTown() {
  insideHouse = false;
  closeHouse();
  houseEl.hidden = true;
  townEl.hidden = false;
  buildBarEl.hidden = false;
  app.classList.remove('inside');
  startTown();
  commit();
}

function enterHouse(id: string) {
  insideHouse = true;
  stopTown();
  townEl.hidden = true;
  buildBarEl.hidden = true;
  houseEl.hidden = false;
  app.classList.add('inside');
  openHouse(id);
  commit();
}

function tour() {
  if (insideHouse) showTown();
  startTour();
}

initEffects();
mountTopBar($('.hud'), {
  renameTown,
  openDesign: () => openDesignStudio(() => commit()),
  openPreview: () => openMagicWindow(),
  openBadges,
  openMenu: () => openMenu(tour),
  switchLanguage: () => setLanguage(state.settings.lang === 'fa' ? 'en' : 'fa'),
});
bindAchievementToasts();
mountQuestCard($('.quest-card'));
mountHelper($('.helper'));
mountBuildBar(buildBarEl);
mountTown(townEl, { onEnterHouse: enterHouse, onModeChange: updateBuildBar, onCoins: updateTopBar });
mountHouseEditor(houseEl, { onExit: showTown, onPreview: (id) => openMagicWindow(id), onProgress: refreshHud });

events.on('levelup', ({ level }) => setTimeout(() => showLevelUp(level), 400));
events.on('era', ({ era }) => setTimeout(() => showNewEra(era as EraId), 600));

onChange(() => {
  checkEra();
  refreshHud();
  if (insideHouse) renderHouseEditor();
  else renderTown();
});

addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
  if (!(e.ctrlKey || e.metaKey)) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    doUndo();
  } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
    e.preventDefault();
    doRedo();
  }
});

// Phones often close a tab without "beforeunload", so save whenever the page is hidden too.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveNow();
});

refreshHud();
checkEra();

const away = collectAwayEarnings();
const daily = dailyCheckIn();
if (!state.settings.welcomed) {
  chooseLanguage(() => startTour(() => showDailyGift(daily, null)));
} else if (!state.settings.tourDone) {
  startTour(() => showDailyGift(daily, away));
} else {
  showDailyGift(daily, away);
}
checkProgress();
commit();

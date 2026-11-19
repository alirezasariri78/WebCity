import './styles/index.css';
import { events } from './game/events';
import { checkProgress, collectAwayEarnings, dailyCheckIn } from './game/progress';
import { commit, onChange, state } from './game/store';
import { initEffects } from './ui/common/fx';
import { openDesignStudio } from './ui/designStudio';
import { closeHouse, doRedo, doUndo, mountHouseEditor, openHouse, renderHouseEditor } from './ui/house/houseEditor';
import { mountBuildBar, updateBuildBar } from './ui/hud/buildBar';
import { openBadges, openMenu, renameTown, showDailyGift, showLevelUp, showWelcome } from './ui/hud/dialogs';
import { mountHelper, updateHelper } from './ui/hud/helper';
import { mountQuestCard, updateQuestCard } from './ui/hud/questCard';
import { mountTopBar, updateTopBar } from './ui/hud/topBar';
import { openMagicWindow } from './ui/magicWindow';
import { mountTown, renderTown, start as startTown, stop as stopTown } from './ui/town/townView';

const app = document.getElementById('app')!;
app.innerHTML = `
  <header class="hud"></header>
  <main class="stage">
    <div class="view town-view"></div>
    <div class="view interior-view" hidden></div>
    <aside class="quest-card"></aside>
    <div class="helper"></div>
  </main>
  <nav class="build-bar"></nav>`;

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

initEffects();
mountTopBar($('.hud'), {
  renameTown,
  openDesign: () => openDesignStudio(() => commit()),
  openPreview: () => openMagicWindow(),
  openBadges,
  openMenu,
});
mountQuestCard($('.quest-card'));
mountHelper($('.helper'));
mountBuildBar(buildBarEl);
mountTown(townEl, { onEnterHouse: enterHouse, onModeChange: updateBuildBar, onCoins: updateTopBar });
mountHouseEditor(houseEl, { onExit: showTown, onPreview: (id) => openMagicWindow(id), onProgress: refreshHud });

events.on('levelup', ({ level }) => setTimeout(() => showLevelUp(level), 400));

onChange(() => {
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

refreshHud();

const away = collectAwayEarnings();
const daily = dailyCheckIn();
if (state.settings.welcomed) {
  showDailyGift(daily, away);
} else {
  state.settings.welcomed = true;
  showWelcome(() => showDailyGift(daily, null));
}
checkProgress();
commit();

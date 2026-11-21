import { sfx } from '../game/audio';
import { events } from '../game/events';
import { bump, reward } from '../game/progress';
import { commit, state } from '../game/store';
import { t } from '../i18n';
import { buildSite, esc, fileNames, makeZip, orderedHouses, pageHTML } from '../site';
import { download, fileSafeName } from './common/download';
import { openModal } from './common/modal';

let removeListener: (() => void) | null = null;

export function openMagicWindow(startHouseId?: string) {
  sfx('whoosh');
  bump('previews');
  commit({ render: false });

  let currentId = startHouseId ?? orderedHouses(state.town)[0].id;
  const domain = state.town.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'mytown';

  const modal = openModal(
    `<div class="mw">
      <div class="mw-head">
        <h2>🔮 ${t('My website')} <span class="muted small">${t('This is your real website!')}</span></h2>
        <div class="row">
          <div class="seg"><button data-device="desktop" class="on">🖥️ ${t('Computer')}</button><button data-device="phone">📱 ${t('Phone')}</button></div>
          <button class="btn primary" data-export>⬇️ ${t('Download website')}</button>
        </div>
      </div>
      <div class="browser">
        <div class="browser-bar"><span class="dots"><i></i><i></i><i></i></span><div class="address">🔒 <span>https://${esc(domain)}.site/</span><b data-address></b></div></div>
        <div class="browser-body"><iframe title="${t('Website preview')}" sandbox="allow-scripts allow-popups"></iframe></div>
      </div>
    </div>`,
    { cls: 'wide', onClose: () => removeListener?.() },
  );

  const frame = modal.el.querySelector('iframe')!;
  const body = modal.el.querySelector<HTMLElement>('.browser-body')!;
  const show = () => {
    const house = state.town.houses.find((h) => h.id === currentId) ?? orderedHouses(state.town)[0];
    currentId = house.id;
    frame.srcdoc = pageHTML(state.town, house, 'preview');
    const file = fileNames(state.town).get(house.id)!;
    modal.el.querySelector('[data-address]')!.textContent = file === 'index.html' ? '' : file;
  };
  show();

  const onMessage = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow) return;
    const data = (e.data ?? {}) as { tbNav?: string; tbForm?: boolean; tbEmptyLink?: boolean };
    if (data.tbNav) {
      const target = [...fileNames(state.town)].find(([, file]) => file === data.tbNav);
      if (!target) return;
      currentId = target[0];
      sfx('click');
      show();
    } else if (data.tbForm) {
      events.emit('toast', { text: t('📮 On your real website, this sends the message to your email.'), kind: 'info' });
    } else if (data.tbEmptyLink) {
      events.emit('toast', {
        text: t('🔔 This button goes nowhere yet. Go inside the building, click it, and choose "Goes to".'),
        kind: 'info',
      });
    }
  };
  addEventListener('message', onMessage);
  removeListener = () => removeEventListener('message', onMessage);

  modal.el.querySelectorAll<HTMLButtonElement>('[data-device]').forEach((button) =>
    button.addEventListener('click', () => {
      modal.el.querySelectorAll('[data-device]').forEach((b) => b.classList.toggle('on', b === button));
      body.classList.toggle('phone', button.dataset.device === 'phone');
      sfx('click');
    }),
  );
  modal.el.querySelector('[data-export]')!.addEventListener('click', (e) => exportWebsite(e as MouseEvent));
}

export function exportWebsite(e?: MouseEvent) {
  const files = [...buildSite(state.town), { path: 'town-project.json', content: JSON.stringify(state, null, 1) }];
  download(`${fileSafeName(state.town.name, 'my-website')}-website.zip`, makeZip(files));
  const first = state.progress.stats.exports === 0;
  bump('exports');
  sfx('fanfare');
  events.emit('confetti', { x: e?.clientX, y: e?.clientY, big: true });
  if (first) reward(50, 0, e && { x: e.clientX, y: e.clientY });
  events.emit('toast', { text: t('🚀 Website downloaded! Unzip it and open index.html. Read README.txt to put it online.'), kind: 'good' });
  commit();
}

export function saveProjectFile() {
  download(
    `${fileSafeName(state.town.name, 'town')}-project.json`,
    new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }),
  );
  sfx('coin');
  events.emit('toast', { text: t('💾 Project saved to your computer.'), kind: 'good' });
}

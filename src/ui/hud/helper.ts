import { sfx } from '../../game/audio';
import { rating } from '../../game/progress';
import { t } from '../../i18n';

export const TIPS = [
  'Every house is a page on your website. Every piece of furniture is a part of that page!',
  'Visitors leave coins at the Town Hall. A better website brings more visitors.',
  'Come back every day for a bigger daily gift. Keep your streak going! 🔥',
  'Drag the map to look around. Scroll or pinch to zoom.',
  'Inside a house, open 🔮 Live page and click any part of your page to edit it.',
  'Copy a style from one part and paste it on another to keep your site consistent.',
];
const NUDGE_EVERY_MS = 25_000;

let helper: HTMLElement;
let tipIndex = 0;

export function mountHelper(el: HTMLElement) {
  helper = el;
  helper.innerHTML = `<button class="helper-face" title="${t('Click me for a tip!')}">👵</button><div class="bubble"><b>${t('Rosa')}</b><span class="tip"></span><button class="btn small ghost" data-next>${t('Next tip ›')}</button></div>`;
  helper.querySelector('.helper-face')!.addEventListener('click', () => {
    helper.classList.toggle('open');
    sfx('click');
    tipIndex = 0;
    updateHelper();
  });
  helper.querySelector('[data-next]')!.addEventListener('click', () => {
    tipIndex++;
    sfx('click');
    updateHelper();
  });
  setInterval(() => {
    if (helper.classList.contains('open') || !rating().hints.length) return;
    helper.classList.add('nudge');
    setTimeout(() => helper.classList.remove('nudge'), 1200);
  }, NUDGE_EVERY_MS);
}

export function updateHelper() {
  if (!helper) return;
  const hints = rating().hints;
  const tips = hints.length ? hints.map((h) => t(h.text, h.vars)) : ['Your website is looking amazing! 🌟', ...TIPS].map((tip) => t(tip));
  const tip = tips[tipIndex % tips.length];
  const el = helper.querySelector('.tip')!;
  if (el.textContent !== tip) el.textContent = tip;
  helper.classList.toggle('has-hint', hints.length > 0);
}

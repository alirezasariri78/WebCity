import { sfx } from '../game/audio';
import { saveNow, state } from '../game/store';
import { num, t } from '../i18n';

interface Step {
  /** CSS selector of the thing to highlight. No target = a card in the middle. */
  target?: string;
  emoji: string;
  title: string;
  text: string;
}

export const TOUR_STEPS: Step[] = [
  {
    emoji: '👋',
    title: 'Welcome, Mayor!',
    text: 'In this game you build a town, and your town becomes a real website. Let me show you around. It takes one minute.',
  },
  {
    target: '.town-canvas',
    emoji: '🗺️',
    title: 'This is your town',
    text: 'Drag to look around and scroll (or pinch) to zoom. Click any building to see what it does.',
  },
  {
    target: '[data-tab="pages"]',
    emoji: '🏠',
    title: 'Pages',
    text: 'Every building here is a page of your website. The blue Town Hall is your home page. Click it, then "Go inside" to write on it.',
  },
  {
    target: '[data-tab="city"]',
    emoji: '🏙️',
    title: 'City buildings',
    text: 'Homes, shops and offices bring people and coins. They grow taller by themselves over time, all the way to skyscrapers.',
  },
  {
    target: '[data-tour="research"]',
    emoji: '🔬',
    title: 'Research',
    text: 'Science discovers new buildings and wonders, like in a strategy game. Choose what to learn next here.',
  },
  {
    target: '.town-canvas',
    emoji: '🚩',
    title: 'Your borders',
    text: 'The glowing line is your border. Tap land outside it to claim more, or let culture grow it. The fog hides land you have not explored yet, with ruins to find.',
  },
  {
    target: '.quest-card',
    emoji: '📜',
    title: 'Quests',
    text: 'Not sure what to do next? Follow the quest. Finish it and claim coins and XP.',
  },
  {
    target: '[data-tour="people"]',
    emoji: '👥',
    title: 'Your town grows',
    text: 'More people means a bigger era: Village, Town, City, Metropolis. Each era lets buildings grow higher and gives your website new extras.',
  },
  {
    target: '[data-tour="challenges"]',
    emoji: '🎯',
    title: 'Daily challenges',
    text: 'Three new challenges every day. Finish all three for a Golden Age.',
  },
  {
    target: '[data-tour="design"]',
    emoji: '🎨',
    title: 'Design Studio',
    text: 'Change colours, fonts, corners and the writing direction for your whole website here.',
  },
  {
    target: '[data-tour="preview"]',
    emoji: '🔮',
    title: 'Your real website',
    text: 'See your website at any time, on a computer or a phone, and download it when you are ready.',
  },
  {
    target: '.lang-btn',
    emoji: '🌐',
    title: 'English or Persian',
    text: 'Switch the game language here. Your progress is saved in this browser automatically.',
  },
];

const PADDING = 8;

export function startTour(onDone?: () => void) {
  let index = 0;
  const overlay = document.createElement('div');
  overlay.className = 'tour';
  overlay.innerHTML = `<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-live="polite"></div>`;
  document.body.appendChild(overlay);
  const hole = overlay.querySelector<HTMLElement>('.tour-hole')!;
  const card = overlay.querySelector<HTMLElement>('.tour-card')!;

  const finish = () => {
    overlay.remove();
    removeEventListener('resize', place);
    removeEventListener('keydown', onKey);
    state.settings.tourDone = true;
    saveNow();
    onDone?.();
  };

  function place() {
    const step = TOUR_STEPS[index];
    const target = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    const box = target?.getBoundingClientRect();
    if (!box || !box.width) {
      hole.style.cssText = `left:50%;top:45%;width:0;height:0`;
      card.style.cssText = `left:50%;top:50%;transform:translate(-50%,-50%)`;
      return;
    }
    hole.style.cssText = `left:${box.left - PADDING}px;top:${box.top - PADDING}px;width:${box.width + PADDING * 2}px;height:${box.height + PADDING * 2}px`;
    const cardWidth = Math.min(340, innerWidth - 32);
    const below = box.bottom + 16 + 200 < innerHeight;
    const centreX = Math.min(Math.max(box.left + box.width / 2, cardWidth / 2 + 16), innerWidth - cardWidth / 2 - 16);
    const big = box.height > innerHeight * 0.5;
    const top = big ? innerHeight / 2 - 90 : below ? box.bottom + 16 : Math.max(16, box.top - 16 - card.offsetHeight);
    card.style.cssText = `left:${centreX}px;top:${top}px;transform:translateX(-50%);width:${cardWidth}px`;
  }

  function render() {
    const step = TOUR_STEPS[index];
    const last = index === TOUR_STEPS.length - 1;
    card.innerHTML = `<div class="tour-emoji">${step.emoji}</div>
      <h3>${t(step.title)}</h3>
      <p>${t(step.text)}</p>
      <div class="tour-foot">
        <span class="tour-count">${num(index + 1)} / ${num(TOUR_STEPS.length)}</span>
        <button class="btn ghost small" data-skip>${t('Skip')}</button>
        ${index ? `<button class="btn small" data-back>${t('Back')}</button>` : ''}
        <button class="btn primary small" data-next>${last ? t("Let's build! 🚀") : t('Next')}</button>
      </div>`;
    card.querySelector('[data-skip]')!.addEventListener('click', finish);
    card.querySelector('[data-back]')?.addEventListener('click', () => go(-1));
    card.querySelector('[data-next]')!.addEventListener('click', () => (last ? finish() : go(1)));
    place();
    (card.querySelector('[data-next]') as HTMLButtonElement).focus();
  }

  function go(delta: number) {
    index = Math.max(0, Math.min(TOUR_STEPS.length - 1, index + delta));
    sfx('click');
    render();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') finish();
    else if (e.key === 'ArrowRight') go(document.dir === 'rtl' ? -1 : 1);
    else if (e.key === 'ArrowLeft') go(document.dir === 'rtl' ? 1 : -1);
  }

  addEventListener('resize', place);
  addEventListener('keydown', onKey);
  render();
}

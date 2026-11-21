import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { claimQuest, currentQuest, isStoryQuest, questNumber, questValue } from '../../game/progress';
import { commit } from '../../game/store';
import { num, t } from '../../i18n';
import { esc } from '../../site';

let card: HTMLElement;
let renderedKey = '';

export function mountQuestCard(el: HTMLElement) {
  card = el;
  card.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('button')) card.classList.toggle('open');
  });
  events.on('quest', ({ done }) => {
    if (done) {
      sfx('badge');
      events.emit('toast', {
        text: t('✅ Quest complete: {quest}! Claim your reward 🎁', { quest: t(currentQuest().title) }),
        kind: 'good',
      });
    }
    updateQuestCard();
  });
}

export function updateQuestCard() {
  if (!card) return;
  const quest = currentQuest();
  const value = questValue(quest);
  const done = value >= quest.goal;
  const key = `${questNumber()}|${value}|${quest.goal}`;
  if (key === renderedKey) return;
  renderedKey = key;

  card.classList.toggle('done', done);
  card.innerHTML = `
    <div class="q-top"><span class="q-num">${isStoryQuest() ? t('QUEST {n}', { n: questNumber() }) : t('BONUS QUEST')}</span><span class="q-reward">+${num(quest.xp)} XP · +${num(quest.coins)} 🪙</span></div>
    <div class="q-title"><span class="q-icon">${quest.icon}</span>${esc(t(quest.title))}</div>
    ${done ? '' : `<div class="q-desc">${esc(t(quest.desc))}</div>`}
    <div class="q-bar"><i style="transform:scaleX(${value / quest.goal})"></i><span>${num(value)} / ${num(quest.goal)}</span></div>
    ${done ? `<button class="btn claim" data-claim>🎁 ${t('Claim reward!')}</button>` : ''}`;
  card.querySelector('[data-claim]')?.addEventListener('click', (e) => {
    const { clientX: x, clientY: y } = e as MouseEvent;
    claimQuest({ x, y });
    commit();
  });
}

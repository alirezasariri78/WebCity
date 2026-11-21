import { TECHS, techDef, wonderDef } from '../../core/catalog';
import { YIELD_ICONS, availableTechs, canResearch, isResearched, researchProgress, techUnlocks, type Yields } from '../../core/rules';
import type { TechId, WonderKind } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { claimChallenge, isGoldenAge, startResearch, todaysChallenges, yields } from '../../game/progress';
import { commit, state } from '../../game/store';
import { num, t } from '../../i18n';
import { openModal } from '../common/modal';

export const YIELD_NAMES: Record<keyof Yields, string> = { food: 'Food', gold: 'Gold', science: 'Science', culture: 'Culture' };
export const YIELD_HINTS: Record<keyof Yields, string> = {
  food: 'Makes the city grow faster.',
  gold: 'Extra coins.',
  science: 'Discovers new technologies.',
  culture: 'Your borders grow by themselves.',
};

/** "🌾 4 · 🪙 6 · 🔬 3 · 🎭 2" */
export function yieldsHtml(y: Yields = yields()): string {
  return (Object.keys(YIELD_ICONS) as (keyof Yields)[])
    .map(
      (k) =>
        `<span class="yield y-${k}" title="${t(YIELD_NAMES[k])}: ${t(YIELD_HINTS[k])}">${YIELD_ICONS[k]} <b>${num(Math.round(y[k]))}</b></span>`,
    )
    .join('');
}

function techCard(id: TechId): string {
  const tech = techDef(id);
  const research = state.progress.research;
  const done = isResearched(research, id);
  const current = research.current === id;
  const open = canResearch(research, id);
  const status = done ? 'done' : current ? 'current' : open ? 'open' : 'locked';
  const gives = techUnlocks(id)
    .map((u) => u.emoji)
    .join(' ');
  const bar = current ? `<div class="progress"><i style="width:${Math.round(researchProgress(research) * 100)}%"></i></div>` : '';
  const foot = done ? `✓ ${t('Discovered')}` : current ? t('Researching…') : `🔬 ${num(tech.cost)}`;
  return `<button class="tech ${status}" data-tech="${id}" ${open && !current ? '' : 'tabindex="-1"'}>
    <span class="tech-emoji">${tech.emoji}</span><b>${t(tech.name)}</b><small>${t(tech.desc)}</small>
    <span class="tech-gives">${gives}</span>${bar}<span class="tech-foot">${foot}</span></button>`;
}

/** The research tree: columns of technologies, each needing the ones before it. */
export function openTechTree() {
  sfx('click');
  const tiers = [...new Set(TECHS.map((x) => x.tier))];
  const render = () =>
    `<div class="tree-head"><h2>🔬 ${t('Research')}</h2><p class="muted">${t('Science comes from schools, libraries and clever pages. Pick what to discover next.')}</p><div class="yields big">${yieldsHtml()}</div></div>
    <div class="tree">${tiers
      .map(
        (tier) =>
          `<div class="tier">${TECHS.filter((x) => x.tier === tier)
            .map((x) => techCard(x.id))
            .join('')}</div>`,
      )
      .join('')}</div>`;
  const modal = openModal(render(), { cls: 'wide tree-modal' });
  modal.el.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tech]');
    if (!button) return;
    const id = button.dataset.tech as TechId;
    if (!startResearch(id)) {
      sfx('error');
      if (!isResearched(state.progress.research, id))
        events.emit('toast', { text: t('🔒 Discover the technologies before it first.'), kind: 'bad' });
      return;
    }
    sfx('coin');
    commit();
    const fresh = document.createElement('div');
    fresh.innerHTML = render();
    modal.el.querySelector('.tree')!.replaceWith(fresh.querySelector('.tree')!);
    setTimeout(() => modal.close(), 450);
  });
}

export function showTechDiscovered(id: TechId) {
  const tech = techDef(id);
  const unlocks = techUnlocks(id)
    .map((u) => `<li>${u.emoji} ${t(u.name)}</li>`)
    .join('');
  const more = availableTechs(state.progress.research).length > 0;
  sfx('levelup');
  events.emit('confetti', { big: true });
  const modal = openModal(
    `<div class="levelup"><div class="burst"></div><div class="lv-num era">${tech.emoji}</div><h2>${t('You discovered {tech}!', { tech: t(tech.name) })}</h2>
    <p class="muted">${t(tech.desc)}</p>${unlocks ? `<ul class="unlocks">${unlocks}</ul>` : ''}
    <button class="btn primary big" data-next>${more ? `🔬 ${t('Choose the next discovery')}` : t('Amazing! 🎉')}</button></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-next]')!.addEventListener('click', () => {
    modal.close();
    if (more) setTimeout(openTechTree, 220);
  });
}

export function showWonderDone(kind: WonderKind) {
  const def = wonderDef(kind);
  sfx('fanfare');
  events.emit('confetti', { big: true });
  const modal = openModal(
    `<div class="levelup"><div class="burst"></div><div class="lv-num era">${def.emoji}</div><h2>${t('The {name} is finished!', { name: t(def.name) })}</h2>
    <p class="muted">${t('A wonder of the world, in your town.')}</p>
    <div class="unlocks"><b>🌐 ${t('Your website gets:')}</b> ${t(def.gift)}</div>
    <button class="btn primary big" data-ok>${t('Amazing! 🎉')}</button></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-ok]')!.addEventListener('click', () => modal.close());
}

/** The end: the Grand Launch is built, and the website is theirs. */
export function showVictory(onDownload: () => void, onPreview: () => void) {
  sfx('fanfare');
  events.emit('confetti', { big: true });
  setTimeout(() => events.emit('confetti', { big: true }), 700);
  const town = state.town;
  const p = state.progress;
  const modal = openModal(
    `<div class="victory"><div class="victory-rocket">🚀</div><h2>${t('You won! {name} is ready for the world.', { name: town.name })}</h2>
    <p>${t('You grew a village into a city, discovered every technology and launched your website.')}</p>
    <div class="victory-stats">
      <div><b>${num(town.houses.length)}</b><small>${t('pages')}</small></div>
      <div><b>${num(town.houses.reduce((n, h) => n + h.items.length, 0))}</b><small>${t('page parts')}</small></div>
      <div><b>${num(p.research.done.length)}</b><small>${t('technologies')}</small></div>
      <div><b>${num(town.wonders.filter((w) => w.done).length)}</b><small>${t('wonders')}</small></div>
    </div>
    <button class="btn primary big" data-download>⬇️ ${t('Download my website')}</button>
    <button class="btn big" data-preview>🔮 ${t('Look at it first')}</button>
    <p class="muted small">${t('You can keep playing: your city keeps growing and your website keeps getting better.')}</p></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-download]')!.addEventListener('click', () => {
    modal.close();
    onDownload();
  });
  modal.el.querySelector('[data-preview]')!.addEventListener('click', () => {
    modal.close();
    onPreview();
  });
}

export function openChallenges(onChange: () => void) {
  sfx('click');
  const render = () => {
    const list = todaysChallenges();
    const golden = isGoldenAge();
    const rows = list
      .map((c) => {
        if (!c.def) return '';
        const action = c.claimed
          ? `<span class="ch-done">✓</span>`
          : c.complete
            ? `<button class="btn primary small" data-claim="${c.id}">🎁 ${t('Claim')}</button>`
            : `<span class="ch-count">${num(c.done)} / ${num(c.def.amount)}</span>`;
        return `<div class="challenge${c.claimed ? ' claimed' : ''}"><span class="ch-emoji">${c.def.emoji}</span><div class="ch-body"><b>${t(c.def.title, { n: c.def.amount })}</b><div class="progress"><i style="width:${Math.round(c.pct * 100)}%"></i></div><small>+${num(c.def.coins)} 🪙 · +${num(c.def.xp)} XP</small></div>${action}</div>`;
      })
      .join('');
    return `<div class="modal-icon">🎯</div><h2>${t("Today's challenges")}</h2>
      <p class="muted">${t('New ones every day. Finish all three to start a Golden Age: everything makes 50% more for 10 minutes!')}</p>
      ${golden ? `<div class="golden-note">✨ ${t('Golden Age! Everything makes 50% more.')}</div>` : ''}
      <div class="challenges">${rows}</div>`;
  };
  const modal = openModal(render(), { cls: 'challenges-modal' });
  modal.el.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-claim]');
    if (!button) return;
    const r = button.getBoundingClientRect();
    if (!claimChallenge(button.dataset.claim!, { x: r.left + r.width / 2, y: r.top })) return;
    sfx('fanfare');
    events.emit('confetti', { x: r.left + r.width / 2, y: r.top });
    commit();
    onChange();
    const x = modal.el.querySelector('.modal-x');
    modal.el.innerHTML = '';
    if (x) modal.el.appendChild(x);
    modal.el.insertAdjacentHTML('beforeend', render());
  });
}

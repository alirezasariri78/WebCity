import type { RuinFind } from '../../game/progress';
import { t } from '../../i18n';
import { openModal } from '../common/modal';

export function showRuinFind(find: RuinFind) {
  const modal = openModal(
    `<div class="levelup"><div class="burst"></div><div class="lv-num era">${find.emoji}</div><h2>${t(find.title)}</h2><p class="muted">${t(find.text, find.vars)}</p><button class="btn primary big" data-ok>${t('Wonderful! ✨')}</button></div>`,
    { cls: 'center' },
  );
  modal.el.querySelector('[data-ok]')!.addEventListener('click', () => modal.close());
}

import { sfx } from '../../game/audio';
import { t } from '../../i18n';
import { esc } from '../../site';

export interface ModalHandle {
  el: HTMLElement;
  close: () => void;
}

export function openModal(html: string, opts: { cls?: string; onClose?: () => void; dismissable?: boolean } = {}): ModalHandle {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${opts.cls ?? ''}" role="dialog">${opts.dismissable === false ? '' : `<button class="modal-x" aria-label="${t('Close')}">✕</button>`}${html}</div>`;
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add('in'));
  const el = back.querySelector<HTMLElement>('.modal')!;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.classList.remove('in');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => back.remove(), 200);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && opts.dismissable !== false) close();
  };
  document.addEventListener('keydown', onKey);
  if (opts.dismissable !== false) {
    back.addEventListener('pointerdown', (e) => {
      if (e.target === back) close();
    });
    el.querySelector('.modal-x')?.addEventListener('click', () => {
      sfx('click');
      close();
    });
  }
  return { el, close };
}

export function promptModal(
  title: string,
  label: string,
  value: string,
  opts: { emoji?: string; max?: number } = {},
): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal(
      `<div class="modal-icon">${opts.emoji ?? '✏️'}</div><h2>${esc(title)}</h2>
      <form class="prompt-form"><label class="field"><span>${esc(label)}</span><input class="input" maxlength="${opts.max ?? 40}" value="${esc(value)}"></label>
      <div class="row end"><button type="button" class="btn ghost" data-cancel>${t('Cancel')}</button><button class="btn primary">${t('Save ✓')}</button></div></form>`,
      { onClose: () => !done && resolve(null) },
    );
    const input = m.el.querySelector('input')!;
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
    m.el.querySelector('[data-cancel]')!.addEventListener('click', () => m.close());
    m.el.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      done = true;
      resolve(v);
      m.close();
    });
  });
}

export function confirmModal(title: string, text: string, yes: string, emoji = '🤔'): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal(
      `<div class="modal-icon">${emoji}</div><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="row end"><button class="btn ghost" data-no>${t('Cancel')}</button><button class="btn danger" data-yes>${esc(yes)}</button></div>`,
      { onClose: () => !done && resolve(false) },
    );
    m.el.querySelector('[data-no]')!.addEventListener('click', () => m.close());
    m.el.querySelector('[data-yes]')!.addEventListener('click', () => {
      done = true;
      resolve(true);
      m.close();
    });
  });
}

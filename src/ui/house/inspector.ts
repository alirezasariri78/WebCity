import { furnitureDef, houseDef } from '../../core/catalog';
import { isStyled } from '../../core/design';
import type { Furniture, House, StyleProps } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { state } from '../../game/store';
import { esc, fileNames } from '../../site';
import { t } from '../../i18n';
import { bindStyleEditor, styleEditorHTML, type StyleTarget } from '../common/styleEditor';
import { bindFields, fieldHTML, type SaveValue } from './fields';
import { session } from './session';

export interface InspectorHost {
  deselect: () => void;
  rerender: () => void;
  savePartValue: (item: Furniture, ...args: Parameters<SaveValue>) => void;
  styleTarget: (read: () => StyleProps | undefined, write: (s: StyleProps) => void) => StyleTarget;
  beforeSeoChange: () => void;
  saveSeo: () => void;
}

const tabs = (items: [id: string, label: string][], active: string, attr: string) =>
  `<div class="seg tabs2">${items.map(([id, label]) => `<button ${attr}="${id}" class="${id === active ? 'on' : ''}">${label}</button>`).join('')}</div>`;

function bindTabs(el: HTMLElement, attr: string, choose: (id: string) => void) {
  el.querySelectorAll<HTMLButtonElement>(`[${attr}]`).forEach((b) =>
    b.addEventListener('click', () => {
      sfx('click');
      choose(b.getAttribute(attr)!);
    }),
  );
}

const defaultTitle = (house: House) => (house.kind === 'townhall' ? state.town.name : `${house.name} · ${state.town.name}`);

function seoHTML(house: House): string {
  const site = state.town.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `<div class="fields">
    <label class="field"><span>${t('Title in the browser tab & Google')}</span><input class="input" data-seo="seoTitle" maxlength="70" value="${esc(house.seoTitle ?? '')}" placeholder="${esc(defaultTitle(house))}"><small class="hint">${t('Short and clear. About 50–60 letters.')}</small></label>
    <label class="field"><span>${t('Description for Google')}</span><textarea class="input" rows="3" data-seo="seoDesc" maxlength="170" placeholder="${t('One or two sentences about this page.')}">${esc(house.seoDesc ?? '')}</textarea><small class="hint">${t('This shows under your link in search results.')}</small></label>
    <div class="serp"><div class="serp-url">${esc(site)}.site › ${esc(fileNames(state.town).get(house.id) ?? '')}</div><div class="serp-title"></div><div class="serp-desc"></div></div>
  </div>`;
}

function bindSeo(el: HTMLElement, house: House, host: InspectorHost) {
  const title = el.querySelector('.serp-title')!;
  const desc = el.querySelector('.serp-desc')!;
  const refresh = () => {
    title.textContent = house.seoTitle || defaultTitle(house);
    desc.textContent = house.seoDesc || state.town.site?.description || t('Add a description so people know what this page is about.');
  };
  refresh();
  el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-seo]').forEach((input) =>
    input.addEventListener('input', () => {
      host.beforeSeoChange();
      house[input.dataset.seo as 'seoTitle' | 'seoDesc'] = input.value;
      refresh();
      host.saveSeo();
    }),
  );
}

function renderPageSettings(el: HTMLElement, house: House, host: InspectorHost) {
  const isDesign = session.pageTab === 'design';
  const design = `<p class="muted small">${t('These looks apply to every part of this page. Parts can still have their own look.')}</p>
    <div class="style-ed">${styleEditorHTML('page', house.style)}</div>
    ${isStyled(house.style) ? `<button class="btn small block danger-soft" data-reset>↺ ${t('Reset page design')}</button>` : ''}`;

  el.innerHTML = `<div class="insp-head"><span class="insp-emoji">${house.look?.emoji ?? houseDef(house.kind).emoji}</span><div><h3>${t('Page design')}</h3><div class="muted small">${t('How the whole {name} page looks', { name: `<b>${esc(house.name)}</b>` })}</div></div></div>
    ${tabs(
      [
        ['design', `🎨 ${t('Design')}`],
        ['seo', `🔎 ${t('Google & tab')}`],
      ],
      session.pageTab,
      'data-page-tab',
    )}
    ${isDesign ? design : seoHTML(house)}`;

  bindTabs(el, 'data-page-tab', (id) => {
    session.pageTab = id as typeof session.pageTab;
    host.rerender();
  });
  if (!isDesign) {
    bindSeo(el, house, host);
    return;
  }
  const target = host.styleTarget(
    () => house.style,
    (s) => (house.style = s),
  );
  bindStyleEditor(el.querySelector('.style-ed')!, target);
  el.querySelector('[data-reset]')?.addEventListener('click', () => {
    target.beforeChange(false);
    house.style = {};
    sfx('delete');
    target.changed();
  });
}

function renderPart(el: HTMLElement, item: Furniture, host: InspectorHost) {
  const def = furnitureDef(item.kind);
  const isContent = session.partTab === 'content';
  const content = def.fields.length
    ? def.fields.map((field) => fieldHTML(field, item)).join('')
    : `<p class="muted">${t('Nothing to write here. Try the 🎨 Style tab!')}</p>`;
  const style = `<div class="style-ed">${styleEditorHTML('part', item.style)}</div>
    <div class="row style-actions">
      <button class="btn small" data-copy>📋 ${t('Copy style')}</button>
      <button class="btn small" data-paste ${session.copiedStyle ? '' : 'disabled'}>📌 ${t('Paste style')}</button>
      <button class="btn small danger-soft" data-reset ${isStyled(item.style) ? '' : 'disabled'}>↺ ${t('Reset')}</button>
    </div>`;

  el.innerHTML = `<div class="insp-head"><span class="insp-emoji">${def.emoji}</span><div><h3>${t(def.name)}</h3><div class="muted small">${t('On your website:')} <b>${t(def.web)}</b></div></div><button class="icon-btn" data-deselect title="${t('Page design')}">✕</button></div>
    ${tabs(
      [
        ['content', `✏️ ${t('Content')}`],
        ['style', `🎨 ${t('Style')}${isStyled(item.style) ? ' •' : ''}`],
      ],
      session.partTab,
      'data-part-tab',
    )}
    ${isContent ? `<div class="fields">${content}</div>` : style}`;

  el.querySelector('[data-deselect]')!.addEventListener('click', host.deselect);
  bindTabs(el, 'data-part-tab', (id) => {
    session.partTab = id as typeof session.partTab;
    host.rerender();
  });

  if (isContent) {
    bindFields(el, item, (key, value, rebuild) => host.savePartValue(item, key, value, rebuild));
    return;
  }

  const target = host.styleTarget(
    () => item.style,
    (s) => (item.style = s),
  );
  bindStyleEditor(el.querySelector('.style-ed')!, target);
  el.querySelector('[data-copy]')!.addEventListener('click', () => {
    session.copiedStyle = { ...item.style };
    sfx('coin');
    events.emit('toast', { text: t('📋 Style copied! Select another part and press Paste.'), kind: 'info' });
    host.rerender();
  });
  el.querySelector('[data-paste]')!.addEventListener('click', () => {
    if (!session.copiedStyle) return;
    target.beforeChange(false);
    item.style = { ...session.copiedStyle };
    sfx('pop');
    target.changed();
  });
  el.querySelector('[data-reset]')!.addEventListener('click', () => {
    target.beforeChange(false);
    item.style = {};
    sfx('delete');
    target.changed();
  });
}

export function renderInspector(el: HTMLElement, house: House, item: Furniture | undefined, host: InspectorHost) {
  if (item) renderPart(el, item, host);
  else renderPageSettings(el, house, host);
}

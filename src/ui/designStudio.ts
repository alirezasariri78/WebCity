import { THEMES, resolveImage, themeDef } from '../core/catalog';
import { isStyled } from '../core/design';
import type { ThemeId } from '../core/types';
import { sfx } from '../game/audio';
import { events } from '../game/events';
import { checkpoint } from '../game/history';
import { bump, level, reward } from '../game/progress';
import { commit, state } from '../game/store';
import { esc, orderedHouses, pageHTML } from '../site';
import { shrinkImage } from './common/download';
import { openModal } from './common/modal';
import { bindStyleEditor, styleEditorHTML } from './common/styleEditor';
import { LOGOS } from './hud/dialogs';

type Tab = 'look' | 'brand' | 'footer';

const LANGUAGES: [code: string, name: string][] = [
  ['en', 'English'],
  ['fa', 'فارسی (Persian)'],
  ['ar', 'العربية (Arabic)'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['tr', 'Türkçe'],
];
const PREVIEW_WIDTH = 1200;

let tab: Tab = 'look';

export function openDesignStudio(onClose: () => void) {
  sfx('whoosh');
  const modal = openModal(
    `<div class="studio">
      <div class="studio-head"><h2>🎨 Design Studio <span class="muted small">The look of your whole website</span></h2>
        <div class="seg"><button data-tab="look">🎨 Look</button><button data-tab="brand">🏷️ Name & logo</button><button data-tab="footer">📄 Footer & Google</button></div></div>
      <div class="studio-body"><div class="studio-panel"></div><div class="studio-preview"><div class="mini-label">🔮 Home page preview</div><div class="studio-frame"><iframe title="Preview" sandbox="allow-scripts"></iframe></div></div></div>
    </div>`,
    { cls: 'wide', onClose },
  );
  const panel = modal.el.querySelector<HTMLElement>('.studio-panel')!;
  const frame = modal.el.querySelector('iframe')!;
  let previewTimer: ReturnType<typeof setTimeout> | undefined;

  const refreshPreview = (delay = 150) => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const box = frame.parentElement!;
      const scale = box.clientWidth / PREVIEW_WIDTH;
      frame.style.width = `${PREVIEW_WIDTH}px`;
      frame.style.height = `${box.clientHeight / scale}px`;
      frame.style.transform = `scale(${scale})`;
      frame.srcdoc = pageHTML(state.town, orderedHouses(state.town)[0], 'preview');
    }, delay);
  };

  const saved = (redraw = true) => {
    commit({ render: false });
    if (redraw) render();
    refreshPreview();
  };

  const renderLook = () => {
    const playerLevel = level();
    const themes = THEMES.map((t) => {
      const locked = t.level > playerLevel;
      return `<button class="theme-chip${state.town.theme === t.id ? ' on' : ''}${locked ? ' locked' : ''}" data-theme="${t.id}" style="--a:${t.site.heroFrom};--b:${t.site.heroTo}"><span></span>${locked ? '🔒' : t.emoji} ${t.name}</button>`;
    }).join('');
    panel.innerHTML = `<h3>Town style <small class="muted">(a quick full look)</small></h3>
      <div class="theme-pick">${themes}</div>
      <h3>Fine-tune <small class="muted">(changes every page)</small></h3>
      <div class="style-ed">${styleEditorHTML('site', state.town.style)}</div>
      ${isStyled(state.town.style) ? '<button class="btn small block danger-soft" data-reset>↺ Reset to the town style</button>' : ''}`;

    panel.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((b) =>
      b.addEventListener('click', () => {
        const theme = themeDef(b.dataset.theme as ThemeId);
        if (theme.level > level()) {
          sfx('error');
          events.emit('toast', { text: `🔒 ${theme.name} unlocks at level ${theme.level}.`, kind: 'bad' });
          return;
        }
        if (state.town.theme === theme.id) return;
        checkpoint();
        state.town.theme = theme.id;
        bump('themesTried');
        sfx('whoosh');
        saved();
      }),
    );
    bindStyleEditor(panel.querySelector('.style-ed')!, {
      read: () => state.town.style,
      write: (s) => (state.town.style = s),
      beforeChange: (merge) => checkpoint(merge),
      changed: () => saved(),
      changing: () => saved(false),
    });
    panel.querySelector('[data-reset]')?.addEventListener('click', () => {
      checkpoint();
      state.town.style = {};
      sfx('delete');
      saved();
    });
  };

  const renderBrand = () => {
    const site = (state.town.site ??= {});
    const logos = LOGOS.map((l) => `<button class="logo-pick${l === state.town.logo ? ' on' : ''}" data-logo="${l}">${l}</button>`).join(
      '',
    );
    const logoPreview = site.logoImage
      ? `<div class="logo-prev"><img src="${esc(resolveImage(site.logoImage))}" alt=""><button class="btn small danger-soft" data-remove-logo>Remove</button></div>`
      : '';
    const languages = LANGUAGES.map(
      ([code, name]) => `<option value="${code}"${(site.lang ?? 'en') === code ? ' selected' : ''}>${name}</option>`,
    ).join('');
    panel.innerHTML = `<label class="field"><span>Website name</span><input class="input" data-name maxlength="40" value="${esc(state.town.name)}"></label>
      <div class="field"><span>Logo (emoji)</span><div class="logo-grid">${logos}</div></div>
      <div class="field"><span>Or upload a logo picture</span>${logoPreview}
        <label class="btn small upload">📁 Upload logo<input type="file" accept="image/*" data-logo-upload hidden></label>
        <small class="hint">A small, wide picture works best (PNG with see-through background).</small></div>
      <label class="field"><span>Language of the website</span><select class="input" data-lang>${languages}</select></label>`;

    panel.querySelector<HTMLInputElement>('[data-name]')!.addEventListener('input', (e) => {
      checkpoint(true);
      state.town.name = (e.target as HTMLInputElement).value || 'My Town';
      saved(false);
    });
    panel.querySelectorAll<HTMLButtonElement>('[data-logo]').forEach((b) =>
      b.addEventListener('click', () => {
        checkpoint();
        state.town.logo = b.dataset.logo!;
        sfx('pop');
        saved();
      }),
    );
    panel.querySelector<HTMLInputElement>('[data-logo-upload]')!.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      checkpoint();
      site.logoImage = await shrinkImage(file, 400);
      sfx('coin');
      const used = (state.progress.toolsUsed ??= []);
      if (!used.includes('logo')) {
        used.push('logo');
        reward(15, 10);
        events.emit('toast', { text: '🏷️ Your own logo! Very professional.', kind: 'good' });
      }
      saved();
    });
    panel.querySelector('[data-remove-logo]')?.addEventListener('click', () => {
      checkpoint();
      delete site.logoImage;
      saved();
    });
    panel.querySelector<HTMLSelectElement>('[data-lang]')!.addEventListener('change', (e) => {
      site.lang = (e.target as HTMLSelectElement).value;
      saved(false);
    });
  };

  const renderFooter = () => {
    const site = (state.town.site ??= {});
    panel.innerHTML = `<label class="field"><span>Footer text (bottom of every page)</span><input class="input" data-footer value="${esc(site.footer ?? '')}" placeholder="© ${new Date().getFullYear()} ${esc(state.town.name)}"></label>
      <label class="switch"><input type="checkbox" data-hide-built${site.hideBuiltWith ? ' checked' : ''}><i></i><span>Hide "Built with Town Builder"</span></label>
      <label class="field"><span>Website description for Google</span><textarea class="input" rows="3" maxlength="170" data-description placeholder="What is your website about? One or two sentences.">${esc(site.description ?? '')}</textarea><small class="hint">Each page can also have its own (inside the house → 🎨 Page design → 🔎 Google & tab).</small></label>`;
    panel.querySelector<HTMLInputElement>('[data-footer]')!.addEventListener('input', (e) => {
      checkpoint(true);
      site.footer = (e.target as HTMLInputElement).value;
      saved(false);
    });
    panel.querySelector<HTMLInputElement>('[data-hide-built]')!.addEventListener('change', (e) => {
      site.hideBuiltWith = (e.target as HTMLInputElement).checked;
      saved(false);
    });
    panel.querySelector<HTMLTextAreaElement>('[data-description]')!.addEventListener('input', (e) => {
      checkpoint(true);
      site.description = (e.target as HTMLTextAreaElement).value;
      saved(false);
    });
  };

  const render = () => {
    modal.el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    ({ look: renderLook, brand: renderBrand, footer: renderFooter })[tab]();
  };

  modal.el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      tab = b.dataset.tab as Tab;
      sfx('click');
      render();
    }),
  );
  render();
  refreshPreview(50);
}

import { PICTURES, pictureRef, resolveImage } from '../../core/catalog';
import { CONTROLS, DEFAULT_ON_TOGGLES, FONTS, GROUPS, SWATCHES, groupOf, type Control, type GroupId, type Scope } from '../../core/design';
import type { StyleKey, StyleProps } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { bump, level, reward } from '../../game/progress';
import { saveNow, state } from '../../game/store';
import { num, t } from '../../i18n';
import { esc } from '../../site';
import { shrinkImage } from './download';

export interface StyleTarget {
  read: () => StyleProps | undefined;
  write: (style: StyleProps) => void;
  /** Called before every change; `merge` groups quick repeated changes into one undo step. */
  beforeChange: (merge: boolean) => void;
  /** Full redraw (the panel is rebuilt). */
  changed: () => void;
  /** Light update while dragging a slider or colour picker. */
  changing: () => void;
}

/** The tools beginners see first. Everything else is one click away. */
const BASIC_GROUPS = new Set<GroupId>(['layout', 'colors', 'shapes']);
const openGroups = new Set<GroupId>(['layout', 'colors']);
const hasValue = (v: string | undefined) => v !== undefined && v !== '';

let fontPreviewLoaded = false;
function loadFontPreviews() {
  if (fontPreviewLoaded) return;
  fontPreviewLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  const families = FONTS.map((f) => `family=${f.query.split(':')[0]}`).join('&');
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap&text=Aaآب`;
  document.head.appendChild(link);
}

const isToggleOn = (key: StyleKey, value: string | undefined) => (DEFAULT_ON_TOGGLES.includes(key) ? value !== '0' : value === '1');

function controlHTML(c: Control, value: string | undefined, locked: boolean): string {
  const reset = hasValue(value) ? `<button class="sc-clear" data-clear="${c.key}" title="${t('Back to default')}">↺</button>` : '';
  const head = `<div class="sc-head"><span>${esc(t(c.label))}</span>${reset}</div>`;
  const hint = c.hint ? `<small class="hint">${esc(t(c.hint))}</small>` : '';
  if (locked) return `<div class="sc locked">${head}<div class="sc-lock">🔒 ${t('Level {n}', { n: c.level })}</div></div>`;

  switch (c.type) {
    case 'color': {
      const current = value?.toLowerCase();
      const swatches = SWATCHES.map(
        (s) =>
          `<button class="sw${current === s ? ' on' : ''}" style="background:${s}" data-key="${c.key}" data-value="${s}" title="${s}"></button>`,
      ).join('');
      const custom = !!value && !SWATCHES.includes(current!);
      const pickerValue = value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#7c5cff';
      return `<div class="sc">${head}<div class="swatches">${swatches}<label class="sw custom${custom ? ' on' : ''}" title="${t('Any colour')}" style="${value ? `background:${esc(value)}` : ''}">🎨<input type="color" data-color="${c.key}" value="${esc(pickerValue)}"></label></div>${hint}</div>`;
    }
    case 'range': {
      const number = hasValue(value) ? Number(value) : undefined;
      const start = number ?? (Number(c.placeholder) || Math.round(((c.min ?? 0) + (c.max ?? 100)) / 2));
      const shown = number === undefined ? t('Auto') : `${num(number)}${c.unit ?? ''}`;
      return `<div class="sc">${head}<div class="range"><input type="range" data-range="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${start}"${number === undefined ? ' class="unset"' : ''}><output>${shown}</output></div>${hint}</div>`;
    }
    case 'segment': {
      const options = c
        .options!.map(
          (o) => `<button class="${value === o.value ? 'on' : ''}" data-key="${c.key}" data-value="${o.value}">${esc(t(o.label))}</button>`,
        )
        .join('');
      return `<div class="sc">${head}<div class="seg wrap-seg">${options}</div>${hint}</div>`;
    }
    case 'font': {
      loadFontPreviews();
      const fonts = FONTS.map(
        (f) =>
          `<button class="font${value === f.name ? ' on' : ''}" data-key="${c.key}" data-value="${esc(f.name)}"><b style="font-family:${esc(f.stack)}">${f.name === 'Vazirmatn' ? 'آب' : 'Aa'}</b><span>${esc(f.name)}</span><small>${t(f.feel)}</small></button>`,
      ).join('');
      return `<div class="sc">${head}<div class="fonts">${fonts}</div></div>`;
    }
    case 'image': {
      const pictures = Object.entries(PICTURES)
        .map(
          ([id, p]) =>
            `<button class="pic" data-key="${c.key}" data-value="${pictureRef(id)}" title="${t(p.label)}" style="background:linear-gradient(135deg,${p.from},${p.to})">${p.emoji}</button>`,
        )
        .join('');
      const preview = value ? `<img class="sc-img" src="${esc(resolveImage(value))}" alt="">` : '';
      return `<div class="sc">${head}${preview}<div class="pic-grid">${pictures}</div><label class="btn small upload">📁 ${t('My own picture')}<input type="file" accept="image/*" data-upload="${c.key}" hidden></label></div>`;
    }
    case 'toggle':
      return `<div class="sc"><label class="switch"><input type="checkbox" data-toggle="${c.key}"${isToggleOn(c.key, value) ? ' checked' : ''}><i></i><span>${esc(t(c.label))}</span></label>${hint}</div>`;
    case 'text':
      return `<div class="sc">${head}<input class="input" data-text="${c.key}" value="${esc(value ?? '')}">${hint}</div>`;
    case 'code':
      return `<div class="sc">${head}<textarea class="input code" rows="4" data-text="${c.key}" spellcheck="false" dir="ltr">${esc(value ?? '')}</textarea>${hint}</div>`;
  }
}

export function styleEditorHTML(scope: Scope, style: StyleProps | undefined): string {
  const playerLevel = level();
  const current = style ?? {};
  const showAll = state.settings.allTools;
  const groups = GROUPS.filter((g) => showAll || BASIC_GROUPS.has(g.id))
    .map((group) => {
      const controls = CONTROLS.filter((c) => c.group === group.id && c.scopes.includes(scope));
      if (!controls.length) return '';
      const locked = group.level > playerLevel;
      const used = controls.filter((c) => hasValue(current[c.key])).length;
      const open = openGroups.has(group.id) && !locked ? ' open' : '';
      const subtitle = locked ? `${t('Level {n}', { n: group.level })} · ${t(group.tool)}` : t(group.tool);
      return `<details class="sgroup${locked ? ' locked' : ''}" data-group="${group.id}"${open}>
      <summary><span class="sg-emoji">${locked ? '🔒' : group.emoji}</span><b>${t(group.name)}</b>${used ? `<i class="sg-count">${num(used)}</i>` : ''}<small>${subtitle}</small></summary>
      <div class="sg-body">${controls.map((c) => controlHTML(c, current[c.key], locked || c.level > playerLevel)).join('')}</div></details>`;
    })
    .join('');
  const toggle = `<button class="btn small block ghost all-tools" data-all-tools>${showAll ? t('Fewer tools ▴') : t('Show all design tools ▾')}</button>`;
  return groups + toggle;
}

function rewardFirstUse(key: StyleKey, at?: { x: number; y: number }) {
  const group = groupOf(key);
  const used = (state.progress.toolsUsed ??= []);
  if (!group || used.includes(group.id)) return;
  used.push(group.id);
  sfx('badge');
  events.emit('toast', { text: t('{emoji} New tool unlocked: {tool}!', { emoji: group.emoji, tool: t(group.tool) }), kind: 'good' });
  reward(12, 6, at);
}

export function bindStyleEditor(root: HTMLElement, target: StyleTarget) {
  const apply = (
    key: StyleKey,
    value: string | undefined,
    opts: { merge?: boolean; live?: boolean; at?: { x: number; y: number } } = {},
  ) => {
    target.beforeChange(!!opts.merge);
    const style: StyleProps = { ...target.read() };
    const before = style[key];
    if (hasValue(value)) style[key] = value;
    else delete style[key];
    target.write(style);
    if (!hasValue(before) && hasValue(value)) {
      bump('styled');
      rewardFirstUse(key, opts.at);
    }
    if (opts.live) target.changing();
    else target.changed();
  };

  root.querySelector('[data-all-tools]')?.addEventListener('click', () => {
    state.settings.allTools = !state.settings.allTools;
    saveNow();
    sfx('click');
    target.changed();
  });

  root.querySelectorAll<HTMLDetailsElement>('details.sgroup').forEach((details) =>
    details.addEventListener('toggle', () => {
      const id = details.dataset.group as GroupId;
      if (!details.classList.contains('locked')) {
        if (details.open) openGroups.add(id);
        else openGroups.delete(id);
        return;
      }
      if (!details.open) return;
      details.open = false;
      const group = GROUPS.find((g) => g.id === id)!;
      sfx('error');
      events.emit('toast', {
        text: t('🔒 {tool} unlocks at level {n}. Keep building!', { tool: t(group.tool), n: group.level }),
        kind: 'bad',
      });
    }),
  );

  root.querySelectorAll<HTMLButtonElement>('[data-key][data-value]').forEach((button) =>
    button.addEventListener('click', (e) => {
      const key = button.dataset.key as StyleKey;
      const value = button.dataset.value!;
      sfx('pop');
      apply(key, target.read()?.[key] === value ? undefined : value, { at: { x: e.clientX, y: e.clientY } });
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-clear]').forEach((button) =>
    button.addEventListener('click', () => {
      sfx('delete');
      apply(button.dataset.clear as StyleKey, undefined);
    }),
  );
  root.querySelectorAll<HTMLInputElement>('[data-color]').forEach((input) => {
    input.addEventListener('input', () => {
      (input.parentElement as HTMLElement).style.background = input.value;
      apply(input.dataset.color as StyleKey, input.value, { merge: true, live: true });
    });
    input.addEventListener('change', () => target.changed());
  });
  root.querySelectorAll<HTMLInputElement>('[data-range]').forEach((input) => {
    const output = input.nextElementSibling as HTMLOutputElement;
    const control = CONTROLS.find((c) => c.key === input.dataset.range)!;
    input.addEventListener('input', () => {
      input.classList.remove('unset');
      output.textContent = `${num(input.value)}${control.unit ?? ''}`;
      apply(control.key, input.value, { merge: true, live: true });
    });
    input.addEventListener('change', () => target.changed());
  });
  root.querySelectorAll<HTMLInputElement>('[data-toggle]').forEach((input) =>
    input.addEventListener('change', () => {
      sfx('click');
      const key = input.dataset.toggle as StyleKey;
      const defaultOn = DEFAULT_ON_TOGGLES.includes(key);
      apply(key, input.checked === defaultOn ? undefined : input.checked ? '1' : '0');
    }),
  );
  root
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-text]')
    .forEach((input) =>
      input.addEventListener('input', () => apply(input.dataset.text as StyleKey, input.value, { merge: true, live: true })),
    );
  root.querySelectorAll<HTMLInputElement>('[data-upload]').forEach((input) =>
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        apply(input.dataset.upload as StyleKey, await shrinkImage(file));
      } catch {
        events.emit('toast', { text: t('Could not read that picture. Try a JPG or PNG.'), kind: 'bad' });
      }
    }),
  );
}

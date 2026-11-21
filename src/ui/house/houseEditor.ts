import { MAX_HOUSE_LEVEL, UPGRADE_LEVEL, furnitureDef, houseDef, roomSlots } from '../../core/catalog';
import { applyTextEdit } from '../../core/rules';
import type { Furniture, FurnitureKind, House, StyleProps } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { makeFurniture, uid } from '../../game/factory';
import { canRedo, canUndo, checkpoint, redo, undo } from '../../game/history';
import { bump, level, reward, spend } from '../../game/progress';
import { commit, state } from '../../game/store';
import { t } from '../../i18n';
import { esc, fileNames, orderedHouses } from '../../site';
import { promptModal } from '../common/modal';
import type { StyleTarget } from '../common/styleEditor';
import { nextSpan, renderDecor, type Tool } from './decorate';
import { renderInspector, type InspectorHost } from './inspector';
import { LivePage } from './livePage';
import { applyMood, moodSheet, paintSheet, paintStyle } from './moods';
import { renderPalette } from './palette';
import { currentHouse, selectedPart, session } from './session';

export interface HouseEditorOptions {
  onExit: () => void;
  onPreview: (houseId: string) => void;
  onProgress: () => void;
}

type Sheet = 'add' | 'mood' | 'more' | null;

/** Parts whose words cannot be typed straight onto the page; they open the notepad instead. */
const NOTEPAD_KINDS = new Set<FurnitureKind>([
  'photowall',
  'mailbox',
  'form',
  'buttons',
  'html',
  'video',
  'map',
  'social',
  'spacer',
  'painting',
]);
const WIDE_SCREEN = '(min-width: 900px)';

let root: HTMLElement;
let options: HouseEditorOptions;
let tool: Tool = 'arrange';
let sheet: Sheet = null;
let paint = '#ffd54f';

const live = new LivePage(
  (id) => {
    if (id === session.selectedId) return;
    sfx('click');
    select(id, false);
  },
  (id, before, after) => typedOnPage(id, before, after),
);

const part = (selector: string) => root.querySelector<HTMLElement>(selector)!;
const isWide = () => matchMedia(WIDE_SCREEN).matches;

export function mountHouseEditor(el: HTMLElement, opts: HouseEditorOptions) {
  root = el;
  options = opts;
  matchMedia(WIDE_SCREEN).addEventListener('change', () => session.houseId && renderHouseEditor());
}

export function openHouse(id: string) {
  session.houseId = id;
  session.selectedId = null;
  session.view = 'room';
  tool = 'arrange';
  sheet = null;
  bump('visits');
  renderHouseEditor();
}

export function closeHouse() {
  live.detach();
  shownFor = '';
}

let shownFor = '';
/** Everything the house screen shows. Background ticks (coins, science…) leave it alone. */
const houseSignature = () => {
  const house = currentHouse();
  const town = state.town;
  return JSON.stringify([house, town.style, town.theme, town.site, town.name, town.logo, town.houses.map((h) => h.name)]);
};

/** Redraws the house screen only if something it shows has changed. */
export function refreshHouseEditor() {
  if (houseSignature() !== shownFor) renderHouseEditor();
}

export const TOOLS: { id: Tool | 'add' | 'more'; emoji: string; label: string }[] = [
  { id: 'add', emoji: '🛋️', label: 'Add' },
  { id: 'arrange', emoji: '✋', label: 'Arrange' },
  { id: 'paint', emoji: '🖌️', label: 'Paint' },
  { id: 'mood', emoji: '💡', label: 'Mood' },
  { id: 'write', emoji: '✏️', label: 'Write' },
  { id: 'more', emoji: '⚙️', label: 'More' },
];

export const TOOL_HINTS: Record<Tool, string> = {
  arrange: 'Tap furniture to pick it up. Drag it to move it. ↔ changes its size.',
  paint: 'Pick a colour, then tap furniture or the wall.',
  mood: 'Change the lights, wallpaper, rug and lettering. Your page changes with the room.',
  write: 'Tap furniture, then tap any words on your page and type.',
};

export function renderHouseEditor() {
  const house = currentHouse();
  if (!house || !root) return;
  if (session.selectedId && !house.items.some((f) => f.id === session.selectedId)) session.selectedId = null;
  shownFor = houseSignature();
  const def = houseDef(house.kind);
  const wide = isWide();
  const showRoom = wide || session.view === 'room';
  const showLive = wide || session.view === 'live';
  const pageOptions = orderedHouses(state.town)
    .map(
      (p) =>
        `<option value="${p.id}"${p.id === house.id ? ' selected' : ''}>${p.look?.emoji ?? houseDef(p.kind).emoji} ${esc(p.name)}</option>`,
    )
    .join('');
  const dock = TOOLS.map((x) => {
    const on = x.id === tool || x.id === sheet;
    return `<button class="dock-btn${on ? ' on' : ''}" data-tool="${x.id}"><span>${x.emoji}</span><small>${t(x.label)}</small></button>`;
  }).join('');

  root.innerHTML = `
  <div class="int-top">
    <button class="btn" data-exit>${t('← Town')}</button>
    <div class="int-title"><span class="int-emoji">${house.look?.emoji ?? def.emoji}</span><div><button class="linklike" data-rename>${esc(house.name)} ✏️</button><div class="muted small hide-sm">${t(def.web)} · <code>${fileNames(state.town).get(house.id)}</code></div></div></div>
    <select class="input page-switch hide-sm" data-switch title="${t('Jump to another page')}">${pageOptions}</select>
    <div class="row tight"><button class="icon-btn big" data-undo title="${t('Undo (Ctrl+Z)')}">↶</button><button class="icon-btn big" data-redo title="${t('Redo (Ctrl+Y)')}">↷</button></div>
    <button class="btn magic" data-preview>🔮 <span class="hide-sm">${t('Preview')}</span></button>
  </div>
  <div class="int-body${wide ? ' split' : ''}">
    <section class="room-side"${showRoom ? '' : ' hidden'}>
      ${wide ? '' : `<div class="view-switch seg"><button data-view="room" class="on">🛋️ ${t('Room')}</button><button data-view="live">🔮 ${t('Your page')}</button></div>`}
      <div class="tool-hint">${t(TOOL_HINTS[tool])}</div>
      ${tool === 'paint' ? `<div class="paint-bar">${paintSheet(paint)}</div>` : ''}
      <div class="room-host"></div>
      <div class="sheet${sheet ? ' open' : ''}" ${sheet ? '' : 'hidden'}><div class="sheet-head"><b class="sheet-title"></b><button class="icon-btn" data-close-sheet aria-label="${t('Close')}">✕</button></div><div class="sheet-body"></div></div>
      <nav class="dock">${dock}</nav>
    </section>
    <section class="live-side"${showLive ? '' : ' hidden'}>
      <div class="live-bar">${wide ? '' : `<div class="view-switch seg"><button data-view="room">🛋️ ${t('Room')}</button><button data-view="live" class="on">🔮 ${t('Your page')}</button></div>`}
        <div class="seg"><button data-device="desktop" class="${live.device === 'desktop' ? 'on' : ''}">🖥️</button><button data-device="phone" class="${live.device === 'phone' ? 'on' : ''}">📱</button></div>
        <span class="muted small live-hint">${t('Tap a part, then tap its words to type')}</span></div>
      <div class="live"><div class="live-box"><iframe title="${t('Your page')}" sandbox="allow-scripts"></iframe></div></div>
    </section>
  </div>`;

  if (showRoom) refreshRoom();
  if (sheet) renderSheet();
  refreshUndo();
  bindTopBar(house);
  bindDock();
  if (showLive) live.attach(part('.live'), house, session.selectedId);
  else live.detach();
}

function bindTopBar(house: House) {
  part('[data-exit]').addEventListener('click', () => {
    sfx('whoosh');
    live.detach();
    options.onExit();
  });
  part('[data-preview]').addEventListener('click', () => options.onPreview(house.id));
  part('[data-rename]').addEventListener('click', async () => {
    const name = await promptModal(t('Rename page'), t('This name shows in your website menu.'), house.name, {
      emoji: houseDef(house.kind).emoji,
      max: 24,
    });
    if (!name) return;
    checkpoint();
    house.name = name;
    commit({ render: false });
    renderHouseEditor();
  });
  part('[data-switch]').addEventListener('change', (e) => {
    sfx('whoosh');
    openHouse((e.target as HTMLSelectElement).value);
  });
  part('[data-undo]').addEventListener('click', doUndo);
  part('[data-redo]').addEventListener('click', doRedo);
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
    b.addEventListener('click', () => {
      if (session.view === b.dataset.view) return;
      session.view = b.dataset.view as typeof session.view;
      sfx('click');
      if (session.view === 'live') bump('previews');
      renderHouseEditor();
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-device]').forEach((b) =>
    b.addEventListener('click', () => {
      live.device = b.dataset.device as typeof live.device;
      root.querySelectorAll('[data-device]').forEach((x) => x.classList.toggle('on', x === b));
      sfx('click');
      live.resize();
    }),
  );
}

function bindDock() {
  root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) =>
    b.addEventListener('click', () => {
      sfx('click');
      const id = b.dataset.tool!;
      if (id === 'add' || id === 'more') {
        sheet = sheet === id ? null : id;
      } else {
        tool = id as Tool;
        sheet = tool === 'mood' ? (sheet === 'mood' ? null : 'mood') : null;
      }
      renderHouseEditor();
    }),
  );
  root.querySelector('[data-close-sheet]')?.addEventListener('click', () => {
    sheet = null;
    if (tool === 'mood') tool = 'arrange';
    renderHouseEditor();
  });
  root.querySelector('.paint-bar')?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-paint]');
    if (!b) return;
    paint = b.dataset.paint!;
    sfx('pop');
    root.querySelectorAll('.paint-bar .paint').forEach((x) => x.classList.toggle('on', x === b));
  });
  root.querySelector('[data-paint-any]')?.addEventListener('input', (e) => {
    paint = (e.target as HTMLInputElement).value;
  });
}

function renderSheet() {
  const body = part('.sheet-body');
  const title = part('.sheet-title');
  if (sheet === 'add') {
    title.textContent = `🛋️ ${t('Furniture shop')}`;
    renderPalette(body, addFurniture);
    body.querySelector('h3')?.remove();
  } else if (sheet === 'mood') {
    title.textContent = `💡 ${t('Room mood')}`;
    body.innerHTML = moodSheet(currentHouse()!);
    body.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-mood]');
      if (!b) return;
      checkpoint();
      if (!applyMood(currentHouse()!, b.dataset.mood!)) return;
      sfx('pop');
      bump('styled');
      changed();
      body.innerHTML = moodSheet(currentHouse()!);
    });
  } else if (sheet === 'more') {
    title.textContent = session.selectedId ? `⚙️ ${t('All settings for this part')}` : `⚙️ ${t('All settings for this page')}`;
    renderInspector(body, currentHouse()!, selectedPart(), inspectorHost);
  }
}

export function doUndo() {
  if (!undo()) return;
  sfx('whoosh');
  events.emit('toast', { text: t('↶ Undone'), kind: 'info' });
}

export function doRedo() {
  if (!redo()) return;
  sfx('whoosh');
  events.emit('toast', { text: t('↷ Redone'), kind: 'info' });
}

function refreshUndo() {
  root.querySelector('[data-undo]')?.toggleAttribute('disabled', !canUndo());
  root.querySelector('[data-redo]')?.toggleAttribute('disabled', !canRedo());
}

// The room

function refreshRoom() {
  const host = root.querySelector<HTMLElement>('.room-host');
  const house = currentHouse();
  if (!host || !house) return;
  renderDecor(host, house, session.selectedId, tool, roomSlots(house.kind, house.level), {
    select: (id) => select(id),
    move: moveFurniture,
    duplicate: duplicateFurniture,
    remove: removeFurniture,
    resize: resizeFurniture,
    paint: paintThing,
    write: writeOn,
    add: () => {
      sfx('click');
      sheet = 'add';
      renderHouseEditor();
    },
  });
}

function select(id: string | null, scroll = true) {
  session.selectedId = id;
  refreshRoom();
  if (sheet === 'more') renderSheet();
  live.select(id, scroll);
}

/** Something about the page changed: save, redraw the room and update the live page. */
function changed() {
  commit({ render: false });
  shownFor = houseSignature();
  refreshRoom();
  live.update(currentHouse()!, session.selectedId);
  options.onProgress();
  refreshUndo();
}

function roomIsFull(house: House): boolean {
  const slots = roomSlots(house.kind, house.level);
  if (house.items.length < slots) return false;
  const houseLevel = house.level ?? 1;
  const advice =
    houseLevel >= MAX_HOUSE_LEVEL
      ? t('This building is as big as it gets. Remove something, or build another page!')
      : level() >= UPGRADE_LEVEL
        ? t('Upgrade this building on the map to get more room!')
        : t('Upgrades unlock at level {n}. Until then, build another page!', { n: UPGRADE_LEVEL });
  sfx('error');
  events.emit('toast', { text: `${t('🏠 The room is full ({n} parts).', { n: slots })} ${advice}`, kind: 'bad' });
  return true;
}

function addFurniture(kind: FurnitureKind, button: HTMLElement) {
  const house = currentHouse()!;
  const def = furnitureDef(kind);
  if (def.level > level()) {
    sfx('error');
    events.emit('toast', {
      text: t('🔒 {name} unlocks at level {level}. Keep building to level up!', { name: t(def.name), level: def.level }),
      kind: 'bad',
    });
    return;
  }
  if (roomIsFull(house) || (def.cost && !spend(def.cost))) return;
  checkpoint();
  const item = makeFurniture(kind);
  const after = house.items.findIndex((f) => f.id === session.selectedId);
  house.items.splice(after < 0 ? house.items.length : after + 1, 0, item);
  sfx('pop');
  bump('furnitureAdded');
  const r = button.getBoundingClientRect();
  reward(6, 0, { x: r.right - 30, y: r.top });
  session.selectedId = item.id;
  sheet = null;
  tool = 'arrange';
  commit({ render: false });
  renderHouseEditor();
  options.onProgress();
  root.querySelector(`[data-id="${item.id}"]`)?.classList.add('dropped');
  root.querySelector(`[data-id="${item.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function moveFurniture(id: string, toIndex: number) {
  const items = currentHouse()!.items;
  const from = items.findIndex((f) => f.id === id);
  if (from < 0 || toIndex < 0 || toIndex >= items.length || from === toIndex) return;
  checkpoint();
  const [moved] = items.splice(from, 1);
  items.splice(toIndex, 0, moved);
  sfx('pop');
  changed();
}

function duplicateFurniture(id: string) {
  const house = currentHouse()!;
  const index = house.items.findIndex((f) => f.id === id);
  if (index < 0 || roomIsFull(house)) return;
  checkpoint();
  const copy: Furniture = { ...structuredClone(house.items[index]), id: uid() };
  house.items.splice(index + 1, 0, copy);
  sfx('pop');
  session.selectedId = copy.id;
  changed();
}

function removeFurniture(id: string) {
  const house = currentHouse()!;
  const index = house.items.findIndex((f) => f.id === id);
  if (index < 0) return;
  checkpoint();
  house.items.splice(index, 1);
  if (session.selectedId === id) session.selectedId = null;
  sfx('delete');
  changed();
}

function resizeFurniture(id: string) {
  const item = currentHouse()!.items.find((f) => f.id === id);
  if (!item) return;
  checkpoint();
  const span = nextSpan(item.style?.span);
  item.style = { ...item.style, span };
  if (span === 'full') delete item.style.span;
  sfx('pop');
  bump('styled');
  changed();
}

function paintThing(id: string | null) {
  const house = currentHouse()!;
  checkpoint();
  if (id) {
    const item = house.items.find((f) => f.id === id);
    if (!item) return;
    item.style = paintStyle(item.style, paint);
  } else {
    house.style = paintStyle(house.style, paint);
  }
  sfx('pop');
  bump('painted');
  bump('styled');
  changed();
  const target = id ? root.querySelector(`[data-id="${id}"]`) : root.querySelector('.deco-wall');
  target?.classList.add('splash');
}

function writeOn(id: string) {
  const item = currentHouse()!.items.find((f) => f.id === id);
  if (!item) return;
  session.selectedId = id;
  if (NOTEPAD_KINDS.has(item.kind)) {
    session.partTab = 'content';
    sheet = 'more';
    renderHouseEditor();
    return;
  }
  if (!isWide()) {
    session.view = 'live';
    renderHouseEditor();
  } else {
    select(id);
  }
  events.emit('toast', { text: t('✏️ Tap the words on your page and type. Press Enter when you are done.'), kind: 'info' });
}

/** The player typed straight onto the page. */
function typedOnPage(id: string, before: string, after: string) {
  const item = currentHouse()?.items.find((f) => f.id === id);
  if (!item) return;
  checkpoint();
  const props = { ...item.props };
  const key = applyTextEdit(props, before, after);
  if (!key) return;
  savePartValue(item, key, props[key]);
}

// Advanced settings ("More")

const inspectorHost: InspectorHost = {
  deselect: () => select(null, false),
  rerender: () => renderSheet(),
  savePartValue: savePartValue,
  beforeSeoChange: () => checkpoint(true),
  saveSeo: () => commit({ render: false }),
  styleTarget: (read: () => StyleProps | undefined, write: (s: StyleProps) => void): StyleTarget => ({
    read,
    write,
    beforeChange: (merge) => checkpoint(merge),
    changed: () => {
      changed();
      renderSheet();
    },
    changing: () => {
      commit({ render: false });
      shownFor = houseSignature();
      live.update(currentHouse()!, session.selectedId);
    },
  }),
};

function savePartValue(item: Furniture, key: string, value: string, rebuild = false) {
  checkpoint(!rebuild);
  item.props[key] = value;
  if (!item.edited) {
    item.edited = true;
    bump('edits');
    const r = root.querySelector(`[data-id="${item.id}"]`)?.getBoundingClientRect() ?? root.querySelector('.live')?.getBoundingClientRect();
    reward(4, 3, r && { x: r.left + r.width / 2, y: r.top + 20 });
    sfx('coin');
  }
  commit({ render: false });
  shownFor = houseSignature();
  options.onProgress();
  refreshUndo();
  if (rebuild && sheet === 'more') renderSheet();
  refreshRoom();
  live.update(currentHouse()!, session.selectedId);
}

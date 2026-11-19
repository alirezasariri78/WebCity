import { MAX_HOUSE_LEVEL, UPGRADE_LEVEL, furnitureDef, houseDef, roomSlots } from '../../core/catalog';
import type { Furniture, FurnitureKind, House, StyleProps } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { makeFurniture, uid } from '../../game/factory';
import { canRedo, canUndo, checkpoint, redo, undo } from '../../game/history';
import { bump, level, reward, spend } from '../../game/progress';
import { commit, state } from '../../game/store';
import { esc, fileNames, orderedHouses } from '../../site';
import { promptModal } from '../common/modal';
import type { StyleTarget } from '../common/styleEditor';
import { renderInspector, type InspectorHost } from './inspector';
import { LivePage } from './livePage';
import { renderPalette } from './palette';
import { renderRoom, summary } from './room';
import { currentHouse, selectedPart, session } from './session';

export interface HouseEditorOptions {
  onExit: () => void;
  onPreview: (houseId: string) => void;
  onProgress: () => void;
}

let root: HTMLElement;
let options: HouseEditorOptions;
const live = new LivePage((id) => {
  if (id === session.selectedId) return;
  sfx('click');
  select(id, false);
  root.querySelector(`[data-item="${id}"]`)?.scrollIntoView({ block: 'nearest' });
});

const part = (selector: string) => root.querySelector<HTMLElement>(selector)!;

export function mountHouseEditor(el: HTMLElement, opts: HouseEditorOptions) {
  root = el;
  options = opts;
}

export function openHouse(id: string) {
  session.houseId = id;
  session.selectedId = currentHouse()?.items[0]?.id ?? null;
  bump('visits');
  renderHouseEditor();
}

export function closeHouse() {
  live.detach();
}

export function renderHouseEditor() {
  const house = currentHouse();
  if (!house || !root) return;
  if (session.selectedId && !house.items.some((f) => f.id === session.selectedId)) session.selectedId = null;
  const def = houseDef(house.kind);
  const isLive = session.view === 'live';
  const pageOptions = orderedHouses(state.town)
    .map((p) => `<option value="${p.id}"${p.id === house.id ? ' selected' : ''}>${houseDef(p.kind).emoji} ${esc(p.name)}</option>`)
    .join('');

  root.innerHTML = `
  <div class="int-top">
    <button class="btn" data-exit>← Town</button>
    <div class="int-title"><span class="int-emoji">${def.emoji}</span><div><button class="linklike" data-rename>${esc(house.name)} ✏️</button><div class="muted small">${def.web} · <code>${fileNames(state.town).get(house.id)}</code></div></div></div>
    <select class="input page-switch" data-switch title="Jump to another house">${pageOptions}</select>
    <div class="row tight"><button class="icon-btn big" data-undo title="Undo (Ctrl+Z)">↶</button><button class="icon-btn big" data-redo title="Redo (Ctrl+Y)">↷</button></div>
    <button class="btn${session.selectedId ? '' : ' active-soft'}" data-page>🎨 Page design</button>
    <button class="btn magic" data-preview>🔮 Preview</button>
  </div>
  <div class="int-body">
    <aside class="palette panel"></aside>
    <section class="center">
      <div class="center-tabs">
        <div class="seg"><button data-view="room" class="${isLive ? '' : 'on'}">🛋️ Room</button><button data-view="live" class="${isLive ? 'on' : ''}">🔮 Live page</button></div>
        <div class="seg"${isLive ? '' : ' hidden'}><button data-device="desktop" class="${live.device === 'desktop' ? 'on' : ''}">🖥️</button><button data-device="phone" class="${live.device === 'phone' ? 'on' : ''}">📱</button></div>
        <span class="muted small center-hint">${isLive ? 'Click any part of the page to edit it' : 'Click furniture to edit · drag to reorder'}</span>
      </div>
      <div class="room" style="--wall:${def.wall};--trim:${def.roof}"${isLive ? ' hidden' : ''}>
        <div class="room-wall"><div class="room-window"></div><div class="room-window"></div></div>
        <div class="room-floor"></div>
        <div class="room-content"></div>
      </div>
      <div class="live"${isLive ? '' : ' hidden'}><div class="live-box"><iframe title="Live page" sandbox="allow-scripts"></iframe></div></div>
    </section>
    <aside class="inspector panel"></aside>
  </div>`;

  renderPalette(part('.palette'), addFurniture);
  refreshRoom();
  refreshInspector();
  refreshUndo();
  bindTopBar(house);
  if (isLive) live.attach(part('.live'), house, session.selectedId);
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
    const name = await promptModal('Rename page', 'This name shows in your website menu.', house.name, {
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
  part('[data-page]').addEventListener('click', () => select(null));
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

export function doUndo() {
  if (!undo()) return;
  sfx('whoosh');
  events.emit('toast', { text: '↶ Undone', kind: 'info' });
}

export function doRedo() {
  if (!redo()) return;
  sfx('whoosh');
  events.emit('toast', { text: '↷ Redone', kind: 'info' });
}

function refreshUndo() {
  root.querySelector('[data-undo]')?.toggleAttribute('disabled', !canUndo());
  root.querySelector('[data-redo]')?.toggleAttribute('disabled', !canRedo());
}

// Furniture list

function refreshRoom() {
  renderRoom(part('.room-content'), currentHouse()!, session.selectedId, {
    select: (id) => select(id),
    move: moveFurniture,
    duplicate: duplicateFurniture,
    remove: removeFurniture,
  });
}

function select(id: string | null, scroll = true) {
  session.selectedId = id;
  root.querySelectorAll<HTMLElement>('[data-item]').forEach((c) => c.classList.toggle('selected', c.dataset.item === id));
  root.querySelector('[data-page]')?.classList.toggle('active-soft', !id);
  refreshInspector();
  live.select(id, scroll);
}

function structureChanged() {
  commit({ render: false });
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
      ? 'This house is as big as it gets. Remove something, or build another house!'
      : level() >= UPGRADE_LEVEL
        ? 'Upgrade this house on the map to get more room!'
        : `House upgrades unlock at level ${UPGRADE_LEVEL}. Until then, build another house for more pages!`;
  sfx('error');
  events.emit('toast', { text: `🏠 The room is full (${slots} pieces). ${advice}`, kind: 'bad' });
  return true;
}

function addFurniture(kind: FurnitureKind, button: HTMLElement) {
  const house = currentHouse()!;
  const def = furnitureDef(kind);
  if (def.level > level()) {
    sfx('error');
    events.emit('toast', { text: `🔒 ${def.name} unlocks at level ${def.level}. Keep building to level up!`, kind: 'bad' });
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
  session.partTab = 'content';
  select(item.id);
  structureChanged();
  root.querySelector(`[data-item="${item.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function moveFurniture(id: string, toIndex: number) {
  const items = currentHouse()!.items;
  const from = items.findIndex((f) => f.id === id);
  if (from < 0 || toIndex < 0 || toIndex >= items.length || from === toIndex) return;
  checkpoint();
  const [moved] = items.splice(from, 1);
  items.splice(toIndex, 0, moved);
  sfx('pop');
  structureChanged();
}

function duplicateFurniture(id: string) {
  const house = currentHouse()!;
  const index = house.items.findIndex((f) => f.id === id);
  if (index < 0 || roomIsFull(house)) return;
  checkpoint();
  const copy: Furniture = { ...structuredClone(house.items[index]), id: uid() };
  house.items.splice(index + 1, 0, copy);
  sfx('pop');
  select(copy.id, false);
  structureChanged();
}

function removeFurniture(id: string) {
  const house = currentHouse()!;
  const index = house.items.findIndex((f) => f.id === id);
  if (index < 0) return;
  checkpoint();
  house.items.splice(index, 1);
  if (session.selectedId === id) session.selectedId = house.items[Math.min(index, house.items.length - 1)]?.id ?? null;
  sfx('delete');
  structureChanged();
  refreshInspector();
}

// Inspector

const inspectorHost: InspectorHost = {
  deselect: () => select(null, false),
  rerender: () => refreshInspector(),
  savePartValue: savePartValue,
  beforeSeoChange: () => checkpoint(true),
  saveSeo: () => commit({ render: false }),
  styleTarget: (read: () => StyleProps | undefined, write: (s: StyleProps) => void): StyleTarget => ({
    read,
    write,
    beforeChange: (merge) => checkpoint(merge),
    changed: () => {
      commit({ render: false });
      refreshInspector();
      refreshRoom();
      live.update(currentHouse()!, session.selectedId);
      options.onProgress();
      refreshUndo();
    },
    changing: () => {
      commit({ render: false });
      live.update(currentHouse()!, session.selectedId);
    },
  }),
};

function refreshInspector() {
  renderInspector(part('.inspector'), currentHouse()!, selectedPart(), inspectorHost);
}

function savePartValue(item: Furniture, key: string, value: string, rebuild = false) {
  checkpoint(!rebuild);
  item.props[key] = value;
  if (!item.edited) {
    item.edited = true;
    bump('edits');
    const r = root.querySelector(`[data-item="${item.id}"]`)?.getBoundingClientRect();
    reward(4, 3, r && { x: r.left + r.width / 2, y: r.top });
    sfx('coin');
  }
  commit({ render: false });
  options.onProgress();
  refreshUndo();
  if (rebuild) refreshInspector();

  const card = root.querySelector(`[data-item="${item.id}"]`);
  if (card) {
    card.querySelector('.item-sum')!.textContent = summary(item);
    card.querySelector('.new-badge')?.remove();
  }
  live.update(currentHouse()!, session.selectedId);
}

import { MAX_LAND, decorDef, houseDef, houseScale, landSize, roomSlots, themeDef, upgradeCost } from '../../core/catalog';
import { buildRoads, type Tile } from '../../core/rules';
import type { DecorKind, HouseKind } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { makeHouse, uid } from '../../game/factory';
import { checkpoint, clearHistory } from '../../game/history';
import { bump, earnPassive, income, level, reward, spend } from '../../game/progress';
import { commit, state, version } from '../../game/store';
import { decorAnims, decorArt, houseAnims, houseArt, houseTop, DECOR_VARIANTS } from '../../render/art';
import { TILE_H, TILE_W, iso, toGrid } from '../../render/geometry';
import { TownRenderer } from '../../render/renderer';
import { isAnimating, type Scene, type SceneObject, type SpriteRef } from '../../render/scene';
import { onSpriteReady } from '../../render/sprites';
import { confirmModal, promptModal } from '../common/modal';
import { showPopover, type PopoverAction } from './popover';
import { spawnBubble, treasureOf, treasurePrize } from './treasure';
import { VillagerCrowd } from './villagers';

export type PlaceMode =
  { type: 'idle' } | { type: 'house'; kind: HouseKind } | { type: 'decor'; kind: DecorKind } | { type: 'move'; id: string };

export interface TownViewOptions {
  onEnterHouse: (id: string) => void;
  onModeChange: () => void;
  onCoins: () => void;
}

const INCOME_INTERVAL_MS = 20_000;
const IDLE_AFTER_MS = 4000;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.6;
const DRAG_THRESHOLD_PX = 6;

const scene: Scene = {
  theme: themeDef('meadow'),
  land: 7,
  maxLand: MAX_LAND,
  nextLevel: 2,
  roads: new Set(),
  roadKey: '',
  objects: [],
  villagers: [],
  bubbles: [],
  floats: [],
  puffs: [],
  selected: null,
  hovered: null,
  bornAt: new Map(),
  pokedAt: new Map(),
  hover: null,
};

let root: HTMLElement;
let canvas: HTMLCanvasElement;
let popover: HTMLElement;
let hint: HTMLElement;
let renderer: TownRenderer;
let options: TownViewOptions;

let mode: PlaceMode = { type: 'idle' };
let selected: string | null = null;
let hoverTile: Tile | null = null;
let userMovedCamera = false;
let lastInput = 0;
let needsDraw = true;
let running = false;
let builtFor = '';

const crowd = new VillagerCrowd();

export const getMode = () => mode;

export function mountTown(el: HTMLElement, opts: TownViewOptions) {
  root = el;
  options = opts;
  root.innerHTML = `
    <div class="sky" aria-hidden="true"><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div><div class="cloud c4"></div></div>
    <canvas class="town-canvas" aria-label="Your town"></canvas>
    <div class="popover" hidden></div>
    <div class="place-hint" hidden></div>
    <div class="map-tools">
      <button class="round-btn" data-zoom="in" title="Zoom in">＋</button>
      <button class="round-btn" data-zoom="out" title="Zoom out">－</button>
      <button class="round-btn" data-zoom="fit" title="Center the town">⌖</button>
    </div>`;
  canvas = root.querySelector('canvas')!;
  popover = root.querySelector('.popover')!;
  hint = root.querySelector('.place-hint')!;
  renderer = new TownRenderer(canvas);
  onSpriteReady(() => (needsDraw = true));

  bindInput();
  bindZoomButtons();
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode.type !== 'idle') setMode({ type: 'idle' });
  });
  new ResizeObserver(() => {
    if (!root.clientWidth) return;
    renderer.resize();
    if (!userMovedCamera) fit();
    needsDraw = true;
  }).observe(root);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  renderTown();
  start();
  setInterval(earnIncome, INCOME_INTERVAL_MS);
  scheduleBubble();
}

/** Starts the draw loop. The loop stops itself while the map is hidden. */
export function start() {
  if (running || document.hidden) return;
  running = true;
  needsDraw = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

export function stop() {
  running = false;
}

// Camera

export function fit() {
  userMovedCamera = false;
  const n = landSize(level());
  const w = root.clientWidth || innerWidth;
  const h = root.clientHeight || innerHeight;
  const centre = iso((n - 1) / 2, (n - 1) / 2);
  const cam = renderer.camera;
  cam.scale = Math.max(0.4, Math.min(1.5, Math.min(w / (n * TILE_W + 40), (h - 40) / (n * TILE_H + 110))));
  cam.x = w / 2 - centre.x * cam.scale;
  cam.y = h / 2 - (centre.y - 30) * cam.scale;
  cameraMoved();
}

function cameraMoved() {
  placePopover();
  needsDraw = true;
}

function zoomAt(sx: number, sy: number, factor: number) {
  userMovedCamera = true;
  const cam = renderer.camera;
  const world = renderer.toWorld(sx, sy);
  cam.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.scale * factor));
  cam.x = sx - world.x * cam.scale;
  cam.y = sy - world.y * cam.scale;
  cameraMoved();
}

function bindZoomButtons() {
  root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.zoom === 'fit') fit();
      else zoomAt(root.clientWidth / 2, root.clientHeight / 2, b.dataset.zoom === 'in' ? 1.2 : 1 / 1.2);
    }),
  );
}

// Placing things

export function setMode(next: PlaceMode) {
  mode = next;
  selected = null;
  popover.hidden = true;
  root.classList.toggle('placing', next.type !== 'idle');
  updateHint();
  options.onModeChange();
  renderTown();
}

function updateHint() {
  if (mode.type === 'idle') {
    hint.hidden = true;
    return;
  }
  const what =
    mode.type === 'house'
      ? `${houseDef(mode.kind).emoji} ${houseDef(mode.kind).name}`
      : mode.type === 'decor'
        ? `${decorDef(mode.kind).emoji} ${decorDef(mode.kind).name}`
        : 'it';
  const more = mode.type === 'decor' ? ' (click again to place more!)' : '';
  hint.hidden = false;
  hint.innerHTML = `Click on your land to place <b>${what}</b>${more} <button class="btn small ghost" data-cancel>Done</button>`;
  hint.querySelector('[data-cancel]')!.addEventListener('click', () => setMode({ type: 'idle' }));
}

const findHouse = (id: string | null) => state.town.houses.find((h) => h.id === id);
const findDecor = (id: string | null) => state.town.decor.find((d) => d.id === id);
const occupantAt = (gx: number, gy: number) =>
  state.town.houses.find((h) => h.x === gx && h.y === gy) ?? state.town.decor.find((d) => d.x === gx && d.y === gy);

function inLand(gx: number, gy: number) {
  const n = landSize(level());
  return gx >= 0 && gy >= 0 && gx < n && gy < n;
}

function canPlace(gx: number, gy: number) {
  if (!inLand(gx, gy)) return false;
  const occupant = occupantAt(gx, gy);
  return !occupant || (mode.type === 'move' && occupant.id === mode.id);
}

const uniqueName = (base: string) => {
  const taken = new Set(state.town.houses.map((h) => h.name));
  let name = base;
  for (let i = 2; taken.has(name); i++) name = `${base} ${i}`;
  return name;
};

function place(gx: number, gy: number, at: { x: number; y: number }) {
  if (!canPlace(gx, gy)) {
    sfx('error');
    if (!inLand(gx, gy)) events.emit('toast', { text: '🔒 That land is locked. Level up to make your land bigger!', kind: 'bad' });
    return;
  }
  checkpoint();
  if (mode.type === 'house') placeHouse(mode.kind, gx, gy, at);
  else if (mode.type === 'decor') placeDecor(mode.kind, gx, gy, at);
  else if (mode.type === 'move') moveObject(mode.id, gx, gy);
}

function placeHouse(kind: HouseKind, gx: number, gy: number, at: { x: number; y: number }) {
  const def = houseDef(kind);
  if (!spend(def.cost)) return;
  const house = makeHouse(kind, gx, gy, uniqueName(def.name));
  state.town.houses.push(house);
  scene.bornAt.set(house.id, performance.now());
  dust(gx, gy, 18, '#f5f0e6');
  sfx('build');
  events.emit('confetti', { x: at.x, y: at.y - 40 });
  bump('housesBuilt');
  reward(30, 0, { x: at.x, y: at.y - 60 });
  setMode({ type: 'idle' });
  selected = house.id;
  commit();
  renderTown();
  openPopover();
  events.emit('toast', { text: `🎉 ${house.name} built! Your website now has a new page.`, kind: 'good' });
}

function placeDecor(kind: DecorKind, gx: number, gy: number, at: { x: number; y: number }) {
  if (!spend(decorDef(kind).cost)) return;
  const decor = { id: uid(), kind, x: gx, y: gy };
  state.town.decor.push(decor);
  scene.bornAt.set(decor.id, performance.now());
  dust(gx, gy, 8, '#e8ffd8');
  sfx('pop');
  bump('decorPlaced');
  reward(3, 0, { x: at.x, y: at.y - 40 });
  commit();
}

function moveObject(id: string, gx: number, gy: number) {
  const target = findHouse(id) ?? findDecor(id);
  if (target) {
    target.x = gx;
    target.y = gy;
    scene.bornAt.set(target.id, performance.now());
    dust(gx, gy, 10);
  }
  sfx('pop');
  setMode({ type: 'idle' });
  commit();
}

// Little effects in the world

function dust(gx: number, gy: number, count: number, color = '#fff') {
  const c = iso(gx, gy);
  const now = performance.now();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    scene.puffs.push({
      x: c.x,
      y: c.y,
      vx: Math.cos(angle) * (0.6 + Math.random() * 0.6),
      vy: Math.sin(angle) * 0.35 - 0.1,
      r: 4 + Math.random() * 5,
      born: now,
      life: 600 + Math.random() * 300,
      color,
    });
  }
  needsDraw = true;
}

function floatAt(gx: number, gy: number, height: number, text: string, color = '#ffb800') {
  const c = iso(gx, gy);
  scene.floats.push({ x: c.x, y: c.y - height, text, color, born: performance.now() });
}

// Scene (rebuilt only when the town or mode changed)

function houseObject(house: (typeof state.town.houses)[number], night: boolean): SceneObject {
  const kind = house.kind;
  const scale = houseScale(house.level);
  return {
    id: house.id,
    key: `house:${kind}:${night ? 'night' : 'day'}`,
    make: () => houseArt(kind, night),
    gx: house.x,
    gy: house.y,
    scale,
    anims: houseAnims(kind),
    seed: house.x * 3 + house.y * 7,
    label: house.name,
    stars: house.level ?? 1,
    top: houseTop(kind) * scale,
  };
}

function decorObject(decor: (typeof state.town.decor)[number]): SceneObject {
  const variant = (decor.x * 7 + decor.y * 13) % DECOR_VARIANTS;
  const kind = decor.kind;
  return {
    id: decor.id,
    key: `decor:${kind}:${variant}`,
    make: () => decorArt(kind, variant),
    gx: decor.x,
    gy: decor.y,
    scale: 1,
    anims: decorAnims(kind),
    seed: decor.x * 1.7 + decor.y * 2.3,
    top: 50,
  };
}

export function renderTown() {
  if (!root) return;
  const key = `${version}|${JSON.stringify(mode)}`;
  needsDraw = true;
  if (key === builtFor) return;
  builtFor = key;

  const theme = themeDef(state.town.theme);
  const night = !!theme.night;
  root.style.setProperty('--water-a', theme.water[0]);
  root.style.setProperty('--water-b', theme.water[1]);
  root.classList.toggle('night', night);

  const playerLevel = level();
  scene.theme = theme;
  scene.land = landSize(playerLevel);
  scene.nextLevel = playerLevel + 1;
  const network = buildRoads(state.town, scene.land);
  scene.roads = network.roads;
  scene.roadKey = [...network.roads].sort().join(';');

  const moving = mode.type === 'move' ? mode.id : null;
  scene.objects = [
    ...state.town.houses.filter((h) => h.id !== moving).map((h) => houseObject(h, night)),
    ...state.town.decor.filter((d) => d.id !== moving).map(decorObject),
  ].sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);

  scene.bubbles = scene.bubbles.filter((b) => state.town.houses.some((h) => h.x === b.gx && h.y === b.gy));
  crowd.update(network.paths, state.town.houses.length);
  scene.villagers = crowd.views;
  updateHover();
  placePopover();
}

function ghost(): (SpriteRef & { scale: number }) | null {
  const night = !!scene.theme.night;
  const house = (kind: HouseKind, scale = 1) => ({
    key: `house:${kind}:${night ? 'night' : 'day'}`,
    make: () => houseArt(kind, night),
    scale,
  });
  const decor = (kind: DecorKind) => ({ key: `decor:${kind}:0`, make: () => decorArt(kind, 0), scale: 1 });
  if (mode.type === 'house') return house(mode.kind);
  if (mode.type === 'decor') return decor(mode.kind);
  if (mode.type === 'move') {
    const h = findHouse(mode.id);
    if (h) return house(h.kind, houseScale(h.level));
    const d = findDecor(mode.id);
    if (d) return decor(d.kind);
  }
  return null;
}

function updateHover() {
  scene.hover =
    mode.type !== 'idle' && hoverTile
      ? { ...hoverTile, ok: canPlace(hoverTile.gx, hoverTile.gy), ghost: inLand(hoverTile.gx, hoverTile.gy) ? ghost() : null }
      : null;
  scene.selected = selected;
  needsDraw = true;
}

// Mouse, touch and wheel

function bindInput() {
  let press: { x: number; y: number; camX: number; camY: number } | null = null;
  let dragging = false;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;

  const local = (e: PointerEvent | WheelEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    lastInput = performance.now();
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
    press = { x: e.clientX, y: e.clientY, camX: renderer.camera.x, camY: renderer.camera.y };
    dragging = false;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    lastInput = performance.now();
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, distance / pinchDistance);
      pinchDistance = distance;
      dragging = true;
      return;
    }

    if (press) {
      const dx = e.clientX - press.x;
      const dy = e.clientY - press.y;
      if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) dragging = true;
      if (dragging) {
        userMovedCamera = true;
        renderer.camera.x = press.camX + dx;
        renderer.camera.y = press.camY + dy;
        root.classList.add('panning');
        cameraMoved();
        return;
      }
    }

    if (mode.type !== 'idle') {
      const world = renderer.toWorld(p.x, p.y);
      const tile = toGrid(world.x, world.y);
      if (tile.gx !== hoverTile?.gx || tile.gy !== hoverTile?.gy) {
        hoverTile = tile;
        updateHover();
      }
    } else if (!press) {
      const hit = renderer.pick(scene, p.x, p.y);
      const hovered = hit?.type === 'object' ? hit.id : null;
      if (hovered !== scene.hovered) {
        scene.hovered = hovered;
        canvas.style.cursor = hit ? 'pointer' : '';
        needsDraw = true;
      }
    }
  });

  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    root.classList.remove('panning');
    if (press && !dragging && e.type === 'pointerup') handleClick(e, local(e));
    press = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => {
    scene.hovered = null;
    hoverTile = null;
    updateHover();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      lastInput = performance.now();
      const p = local(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
}

function handleClick(e: PointerEvent, p: { x: number; y: number }) {
  if (mode.type !== 'idle') {
    const world = renderer.toWorld(p.x, p.y);
    const tile = toGrid(world.x, world.y);
    place(tile.gx, tile.gy, { x: e.clientX, y: e.clientY });
    return;
  }
  const hit = renderer.pick(scene, p.x, p.y);
  if (hit?.type === 'bubble') {
    collectBubble(hit.id, { x: e.clientX, y: e.clientY });
    return;
  }
  if (hit && hit.id !== selected) {
    sfx('click');
    selected = hit.id;
    scene.pokedAt.set(hit.id, performance.now());
  } else {
    selected = null;
  }
  updateHover();
  if (selected) openPopover();
  else popover.hidden = true;
}

// House / decoration menu

function openPopover() {
  const target = findHouse(selected) ?? findDecor(selected);
  if (!target) return;
  showPopover(popover, target, (action, event) => void onPopoverAction(action, event));
  placePopover();
}

async function onPopoverAction(action: PopoverAction, event: MouseEvent) {
  const house = findHouse(selected);
  const decor = findDecor(selected);
  if (action === 'enter' && house) {
    selected = null;
    popover.hidden = true;
    updateHover();
    options.onEnterHouse(house.id);
  } else if (action === 'upgrade' && house) {
    upgrade(house, event);
  } else if (action === 'rename' && house) {
    const name = await promptModal('Rename house', 'The name also becomes the menu link on your website.', house.name, {
      emoji: houseDef(house.kind).emoji,
      max: 24,
    });
    if (name) {
      checkpoint();
      house.name = name;
      commit();
      openPopover();
    }
  } else if (action === 'move') {
    setMode({ type: 'move', id: (house ?? decor)!.id });
  } else if (action === 'remove') {
    await remove(house, decor);
  }
}

function upgrade(house: (typeof state.town.houses)[number], event: MouseEvent) {
  const houseLevel = house.level ?? 1;
  if (!spend(upgradeCost(house.kind, houseLevel))) return;
  checkpoint();
  house.level = houseLevel + 1;
  scene.bornAt.set(house.id, performance.now());
  dust(house.x, house.y, 22, '#ffe08a');
  sfx('levelup');
  bump('upgrades');
  events.emit('confetti', { x: event.clientX, y: event.clientY });
  reward(25 + house.level * 10, 0, { x: event.clientX, y: event.clientY - 30 });
  events.emit('toast', {
    text: `⬆️ ${house.name} is now ★${house.level}! Room for ${roomSlots(house.kind, house.level)} furniture, and more visitor coins.`,
    kind: 'good',
  });
  commit();
  renderTown();
  openPopover();
}

async function remove(house?: (typeof state.town.houses)[number], decor?: (typeof state.town.decor)[number]) {
  if (house) {
    const refund = Math.floor(houseDef(house.kind).cost / 2);
    const ok = await confirmModal(
      `Remove ${house.name}?`,
      `This page and everything inside it will disappear from your website. You get ${refund} 🪙 back.`,
      'Remove',
      '🏚️',
    );
    if (!ok) return;
    state.town.houses = state.town.houses.filter((h) => h.id !== house.id);
    state.progress.coins += refund;
    dust(house.x, house.y, 20, '#cfcfcf');
  } else if (decor) {
    state.town.decor = state.town.decor.filter((d) => d.id !== decor.id);
    state.progress.coins += Math.floor(decorDef(decor.kind).cost / 2);
    dust(decor.x, decor.y, 10, '#cfcfcf');
  }
  sfx('delete');
  clearHistory();
  selected = null;
  popover.hidden = true;
  commit();
}

function placePopover() {
  if (!popover || popover.hidden || !selected) return;
  const target = findHouse(selected) ?? findDecor(selected);
  if (!target) {
    popover.hidden = true;
    return;
  }
  const c = iso(target.x, target.y);
  const cam = renderer.camera;
  const x = cam.x + c.x * cam.scale;
  const y = cam.y + (c.y + TILE_H / 2 + 18) * cam.scale;
  const width = popover.offsetWidth || 270;
  const left = Math.round(Math.max(8, Math.min(root.clientWidth - width - 8, x - width / 2)));
  const top = Math.round(Math.max(8, Math.min(root.clientHeight - popover.offsetHeight - 8, y)));
  popover.style.translate = `${left}px ${top}px`;
}

// Treasure bubbles and income

function scheduleBubble() {
  setTimeout(
    () => {
      scheduleBubble();
      if (document.hidden) return;
      const bubble = spawnBubble(state.town.houses, scene.bubbles, performance.now());
      if (!bubble) return;
      scene.bubbles.push(bubble);
      sfx('pop');
      needsDraw = true;
    },
    22_000 + Math.random() * 20_000,
  );
}

function collectBubble(id: string, at: { x: number; y: number }) {
  const bubble = scene.bubbles.find((b) => b.id === id);
  if (!bubble) return;
  scene.bubbles = scene.bubbles.filter((b) => b.id !== id);
  const kind = treasureOf(bubble.emoji);
  const prize = treasurePrize(kind, level());
  dust(bubble.gx, bubble.gy, 12, '#ffe08a');
  bump('collected');
  const label = kind === 'gem' ? `+${prize.xp} XP` : `${kind === 'gift' ? '🎁 ' : ''}+${prize.coins} 🪙`;
  floatAt(bubble.gx, bubble.gy, bubble.top + 20, label, kind === 'gem' ? '#7c5cff' : '#ffb800');
  if (kind === 'gift') events.emit('confetti', at);
  reward(prize.xp, prize.coins);
  sfx('coin');
  commit({ render: false });
  options.onCoins();
}

function earnIncome() {
  if (document.hidden) return;
  const coins = income();
  earnPassive(coins);
  const hall = state.town.houses.find((h) => h.kind === 'townhall');
  if (hall) floatAt(hall.x, hall.y, 90, `+${coins} 🪙`);
  needsDraw = true;
  commit({ render: false });
  options.onCoins();
}

// Draw loop

let last = 0;
let skipFrame = false;
export const perf = { frames: 0, drawMs: 0 };

function frame(now: number) {
  if (!running) return;
  requestAnimationFrame(frame);
  if (!root.clientWidth) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  crowd.step(dt);

  const idle = now - lastInput > IDLE_AFTER_MS && !isAnimating(scene);
  skipFrame = idle && !needsDraw && !skipFrame;
  if (skipFrame) return;

  needsDraw = false;
  const t0 = performance.now();
  renderer.draw(scene, now);
  perf.frames++;
  perf.drawMs += performance.now() - t0;
}

if (import.meta.env.DEV) {
  Object.assign(window, {
    __town: {
      perf,
      scene,
      renderer: () => renderer,
      drawOnce: () => {
        const t0 = performance.now();
        renderer.draw(scene, t0);
        return performance.now() - t0;
      },
    },
  });
}

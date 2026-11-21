import { MAX_LAND, cityDef, cityLook, decorDef, houseDef, houseLook, landSize, roomSlots, themeDef, upgradeCost } from '../../core/catalog';
import { ERAS, buildRoads, floorCap, type Tile } from '../../core/rules';
import type { BuildingLook, CityBuilding, CityKind, Decor, DecorKind, House, HouseKind } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { makeHouse, uid } from '../../game/factory';
import { checkpoint, clearHistory } from '../../game/history';
import { bump, cityPopulation, currentEra, earnPassive, growCity, income, level, reward, spend } from '../../game/progress';
import { commit, state, version } from '../../game/store';
import { t } from '../../i18n';
import { CAR_VARIANTS, DECOR_VARIANTS, VILLAGER_VARIANTS, carArt, decorAnims, decorArt, villagerArt } from '../../render/art';
import { cityVisual, houseVisual } from '../../render/buildings';
import { TILE_H, TILE_W, iso, toGrid } from '../../render/geometry';
import { TownRenderer } from '../../render/renderer';
import { isAnimating, type Scene, type SceneObject, type SpriteRef } from '../../render/scene';
import { onSpriteReady } from '../../render/sprites';
import { confirmModal, promptModal } from '../common/modal';
import { openBuildingDesigner } from './designer';
import { floorCost, showPopover, type PopoverAction, type PopoverTarget } from './popover';
import { spawnBubble, treasureOf, treasurePrize } from './treasure';
import { Crowd } from './villagers';

export type PlaceMode =
  | { type: 'idle' }
  | { type: 'house'; kind: HouseKind; look?: BuildingLook; name?: string }
  | { type: 'city'; kind: CityKind; look?: BuildingLook; name?: string }
  | { type: 'decor'; kind: DecorKind }
  | { type: 'move'; id: string };

export interface TownViewOptions {
  onEnterHouse: (id: string) => void;
  onModeChange: () => void;
  onCoins: () => void;
}

type Point = { x: number; y: number };

const INCOME_INTERVAL_MS = 20_000;
const GROWTH_INTERVAL_MS = 35_000;
const IDLE_AFTER_MS = 4000;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.6;
const DRAG_THRESHOLD_PX = 6;
const MAX_PEOPLE = 60;
const MAX_CARS = 24;
const CITY_ERA_INDEX = ERAS.findIndex((e) => e.id === 'city');

const scene: Scene = {
  theme: themeDef('meadow'),
  land: 10,
  maxLand: MAX_LAND,
  nextLevel: 2,
  roads: new Set(),
  roadKey: '',
  paved: false,
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

const people = new Crowd({
  keyPrefix: 'villager',
  variants: VILLAGER_VARIANTS,
  art: villagerArt,
  speed: [0.6, 1.2],
  rest: [1, 4],
  bob: true,
});
const cars = new Crowd({ keyPrefix: 'car', variants: CAR_VARIANTS, art: carArt, speed: [2.2, 3.4], rest: [0.5, 2], bob: false });

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

export const getMode = () => mode;

export function mountTown(el: HTMLElement, opts: TownViewOptions) {
  root = el;
  options = opts;
  root.innerHTML = `
    <div class="sky" aria-hidden="true"><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div><div class="cloud c4"></div></div>
    <canvas class="town-canvas" aria-label="${t('Your town')}"></canvas>
    <div class="popover" hidden></div>
    <div class="place-hint" hidden></div>
    <div class="map-tools">
      <button class="round-btn" data-zoom="in" title="${t('Zoom in')}">＋</button>
      <button class="round-btn" data-zoom="out" title="${t('Zoom out')}">－</button>
      <button class="round-btn" data-zoom="fit" title="${t('Center the town')}">⌖</button>
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
  setInterval(growOnce, GROWTH_INTERVAL_MS);
  scheduleBubble();
}

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
  cam.scale = Math.max(MIN_ZOOM, Math.min(1.5, Math.min(w / (n * TILE_W + 40), (h - 40) / (n * TILE_H + 160))));
  cam.x = w / 2 - centre.x * cam.scale;
  cam.y = h / 2 - (centre.y - 50) * cam.scale;
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

// Finding things

const findHouse = (id: string | null) => state.town.houses.find((h) => h.id === id);
const findCity = (id: string | null) => state.town.city.find((c) => c.id === id);
const findDecor = (id: string | null) => state.town.decor.find((d) => d.id === id);
const findAny = (id: string | null) => findHouse(id) ?? findCity(id) ?? findDecor(id);

const occupantAt = (gx: number, gy: number) =>
  [...state.town.houses, ...state.town.city, ...state.town.decor].find((o) => o.x === gx && o.y === gy);

function targetOf(id: string | null): PopoverTarget | null {
  const house = findHouse(id);
  if (house) return { type: 'house', item: house };
  const city = findCity(id);
  if (city) return { type: 'city', item: city };
  const decor = findDecor(id);
  return decor ? { type: 'decor', item: decor } : null;
}

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

/** Custom buildings are designed first, then placed. */
export async function startCustom(type: 'house' | 'city') {
  const kind = 'custom';
  const look = type === 'house' ? houseLook(kind) : cityLook(kind);
  const result = await openBuildingDesigner({
    title: t('Design your building'),
    look,
    name: t(type === 'house' ? houseDef(kind).name : cityDef(kind).name),
    houseKind: type === 'house' ? kind : undefined,
    floors: 1,
  });
  if (result) setMode({ type, kind, look: result.look, name: result.name });
}

function modeLabel(): string {
  if (mode.type === 'house') return `${mode.look?.emoji ?? houseDef(mode.kind).emoji} ${mode.name ?? t(houseDef(mode.kind).name)}`;
  if (mode.type === 'city') return `${mode.look?.emoji ?? cityDef(mode.kind).emoji} ${mode.name ?? t(cityDef(mode.kind).name)}`;
  if (mode.type === 'decor') return `${decorDef(mode.kind).emoji} ${t(decorDef(mode.kind).name)}`;
  return t('it');
}

function updateHint() {
  if (mode.type === 'idle') {
    hint.hidden = true;
    return;
  }
  const repeat = mode.type === 'decor' || mode.type === 'city' ? ` ${t('(click again to place more!)')}` : '';
  hint.hidden = false;
  hint.innerHTML = `${t('Click on your land to place {what}', { what: `<b>${modeLabel()}</b>` })}${repeat} <button class="btn small ghost" data-cancel>${t('Done')}</button>`;
  hint.querySelector('[data-cancel]')!.addEventListener('click', () => setMode({ type: 'idle' }));
}

function place(gx: number, gy: number, at: Point) {
  if (!canPlace(gx, gy)) {
    sfx('error');
    if (!inLand(gx, gy)) events.emit('toast', { text: t('🔒 That land is locked. Level up to make your land bigger!'), kind: 'bad' });
    return;
  }
  checkpoint();
  if (mode.type === 'house') placeHouse(mode.kind, gx, gy, at, mode.look, mode.name);
  else if (mode.type === 'city') placeCity(mode.kind, gx, gy, at, mode.look, mode.name);
  else if (mode.type === 'decor') placeDecor(mode.kind, gx, gy, at);
  else if (mode.type === 'move') moveObject(mode.id, gx, gy);
}

function celebrateBuild(gx: number, gy: number, at: Point) {
  dust(gx, gy, 18, '#f5f0e6');
  sfx('build');
  events.emit('confetti', { x: at.x, y: at.y - 40 });
}

function placeHouse(kind: HouseKind, gx: number, gy: number, at: Point, look?: BuildingLook, name?: string) {
  const def = houseDef(kind);
  if (!spend(def.cost)) return;
  const house = { ...makeHouse(kind, gx, gy, uniqueName(name ?? t(def.name))), look };
  state.town.houses.push(house);
  scene.bornAt.set(house.id, performance.now());
  celebrateBuild(gx, gy, at);
  bump('housesBuilt');
  reward(30, 0, { x: at.x, y: at.y - 60 });
  setMode({ type: 'idle' });
  selected = house.id;
  commit();
  renderTown();
  openPopover();
  events.emit('toast', { text: t('🎉 {name} built! Your website now has a new page.', { name: house.name }), kind: 'good' });
}

function placeCity(kind: CityKind, gx: number, gy: number, at: Point, look?: BuildingLook, name?: string) {
  if (!spend(cityDef(kind).cost)) return;
  const building: CityBuilding = { id: uid(), kind, x: gx, y: gy, floors: 1, builtAt: Date.now(), look, name };
  state.town.city.push(building);
  scene.bornAt.set(building.id, performance.now());
  celebrateBuild(gx, gy, at);
  bump('cityBuilt');
  reward(8, 0, { x: at.x, y: at.y - 60 });
  commit();
}

function placeDecor(kind: DecorKind, gx: number, gy: number, at: Point) {
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
  const target = findAny(id);
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
  needsDraw = true;
}

// Scene (rebuilt only when the town or the mode changed)

function toObject(id: string, gx: number, gy: number, visual: ReturnType<typeof houseVisual>, label?: string, stars?: number): SceneObject {
  return { id, gx, gy, ...visual, seed: gx * 3 + gy * 7, label, stars };
}

function decorObject(decor: Decor): SceneObject {
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
  const eraIndex = ERAS.indexOf(currentEra());
  scene.theme = theme;
  scene.land = landSize(playerLevel);
  scene.nextLevel = playerLevel + 1;
  scene.paved = eraIndex >= CITY_ERA_INDEX;
  const network = buildRoads(state.town, scene.land);
  scene.roads = network.roads;
  scene.roadKey = [...network.roads].sort().join(';');

  const moving = mode.type === 'move' ? mode.id : null;
  scene.objects = [
    ...state.town.houses.filter((h) => h.id !== moving).map((h) => toObject(h.id, h.x, h.y, houseVisual(h, night), h.name, h.level ?? 1)),
    ...state.town.city.filter((c) => c.id !== moving).map((c) => toObject(c.id, c.x, c.y, cityVisual(c, night))),
    ...state.town.decor.filter((d) => d.id !== moving).map(decorObject),
  ].sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);

  scene.bubbles = scene.bubbles.filter((b) => state.town.houses.some((h) => h.x === b.gx && h.y === b.gy));
  const population = cityPopulation();
  people.update(network.paths, Math.min(MAX_PEOPLE, 3 + Math.round(population / 6)));
  cars.update(network.paths, scene.paved ? Math.min(MAX_CARS, 2 + Math.round(population / 30)) : 0);
  scene.villagers = [...people.views, ...cars.views];
  updateHover();
  placePopover();
}

function ghost(): (SpriteRef & { scale: number }) | null {
  const night = !!scene.theme.night;
  if (mode.type === 'house') {
    const preview = { id: '', kind: mode.kind, name: '', x: 0, y: 0, items: [], builtAt: 0, look: mode.look };
    return houseVisual(preview, night);
  }
  if (mode.type === 'city') return cityVisual({ id: '', kind: mode.kind, x: 0, y: 0, floors: 1, builtAt: 0, look: mode.look }, night);
  if (mode.type === 'decor') {
    const kind = mode.kind;
    return { key: `decor:${kind}:0`, make: () => decorArt(kind, 0), scale: 1 };
  }
  if (mode.type === 'move') {
    const house = findHouse(mode.id);
    if (house) return houseVisual(house, night);
    const city = findCity(mode.id);
    if (city) return cityVisual(city, night);
    const decor = findDecor(mode.id);
    if (decor) return { key: `decor:${decor.kind}:0`, make: () => decorArt(decor.kind, 0), scale: 1 };
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
  const pointers = new Map<number, Point>();
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

function handleClick(e: PointerEvent, p: Point) {
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

// Building menu

function openPopover() {
  const target = targetOf(selected);
  if (!target) return;
  showPopover(popover, target, (action, event) => void onPopoverAction(target, action, event));
  placePopover();
}

async function onPopoverAction(target: PopoverTarget, action: PopoverAction, event: MouseEvent) {
  if (action === 'move') return setMode({ type: 'move', id: target.item.id });
  if (action === 'remove') return remove(target);
  if (action === 'design') return redesign(target);
  if (target.type === 'house') {
    const house = target.item;
    if (action === 'enter') {
      selected = null;
      popover.hidden = true;
      updateHover();
      options.onEnterHouse(house.id);
    } else if (action === 'upgrade') {
      upgradeHouse(house, event);
    } else if (action === 'rename') {
      const name = await promptModal(t('Rename house'), t('The name also becomes the menu link on your website.'), house.name, {
        emoji: house.look?.emoji ?? houseDef(house.kind).emoji,
        max: 24,
      });
      if (!name) return;
      checkpoint();
      house.name = name;
      commit();
      openPopover();
    }
  } else if (target.type === 'city' && action === 'grow') {
    addFloor(target.item, event);
  }
}

async function redesign(target: PopoverTarget) {
  if (target.type === 'decor') return;
  const isHouse = target.type === 'house';
  const item = target.item;
  const look = isHouse ? houseLook(item.kind as HouseKind, item.look) : cityLook(item.kind as CityKind, item.look);
  const floors = isHouse ? ((item as House).level ?? 1) : (item as CityBuilding).floors;
  const currentName = isHouse ? (item as House).name : ((item as CityBuilding).name ?? t(cityDef(item.kind as CityKind).name));
  const result = await openBuildingDesigner({
    title: t('Change the look'),
    look: { ...look },
    name: currentName,
    houseKind: isHouse && floors < 3 ? (item.kind as HouseKind) : undefined,
    floors: isHouse ? (floors < 3 ? 1 : floors * 2) : floors,
  });
  if (!result) return;
  checkpoint();
  item.look = result.look;
  if (isHouse) (item as House).name = result.name;
  else (item as CityBuilding).name = result.name;
  bump('styled');
  commit();
  renderTown();
  openPopover();
}

function upgradeHouse(house: House, event: MouseEvent) {
  const houseLevel = house.level ?? 1;
  if (!spend(upgradeCost(house.kind, houseLevel))) return;
  checkpoint();
  house.level = houseLevel + 1;
  scene.bornAt.set(house.id, performance.now());
  dust(house.x, house.y, 22, '#ffe08a');
  sfx('levelup');
  bump('upgrades');
  events.emit('confetti', { x: event.clientX, y: event.clientY });
  reward(20 + house.level * 10, 0, { x: event.clientX, y: event.clientY - 30 });
  events.emit('toast', {
    text: t('⬆️ {name} is now ★{level}! Room for {slots} parts, and more visitors.', {
      name: house.name,
      level: house.level,
      slots: roomSlots(house.kind, house.level),
    }),
    kind: 'good',
  });
  commit();
  renderTown();
  openPopover();
}

function addFloor(building: CityBuilding, event: MouseEvent) {
  if (building.floors >= floorCap(building, currentEra())) return;
  if (!spend(floorCost(building.floors))) return;
  building.floors++;
  scene.bornAt.set(building.id, performance.now());
  dust(building.x, building.y, 14, '#ffe08a');
  sfx('build');
  bump('grown');
  reward(5, 0, { x: event.clientX, y: event.clientY - 30 });
  commit();
  renderTown();
  openPopover();
}

async function remove(target: PopoverTarget) {
  const item = target.item;
  if (target.type === 'house') {
    const refund = Math.floor(houseDef(target.item.kind).cost / 2);
    const ok = await confirmModal(
      t('Remove {name}?', { name: target.item.name }),
      t('This page and everything inside it will disappear from your website. You get {coins} 🪙 back.', { coins: refund }),
      t('Remove'),
      '🏚️',
    );
    if (!ok) return;
    state.town.houses = state.town.houses.filter((h) => h.id !== item.id);
    state.progress.coins += refund;
  } else if (target.type === 'city') {
    state.town.city = state.town.city.filter((c) => c.id !== item.id);
    state.progress.coins += Math.floor(cityDef(target.item.kind).cost / 2);
  } else {
    state.town.decor = state.town.decor.filter((d) => d.id !== item.id);
    state.progress.coins += Math.floor(decorDef(target.item.kind).cost / 2);
  }
  dust(item.x, item.y, 16, '#cfcfcf');
  sfx('delete');
  clearHistory();
  selected = null;
  popover.hidden = true;
  commit();
}

function placePopover() {
  if (!popover || popover.hidden || !selected) return;
  const target = findAny(selected);
  if (!target) {
    popover.hidden = true;
    return;
  }
  const c = iso(target.x, target.y);
  const cam = renderer.camera;
  const x = cam.x + c.x * cam.scale;
  const y = cam.y + (c.y + TILE_H / 2 + 18) * cam.scale;
  const width = popover.offsetWidth || 280;
  const left = Math.round(Math.max(8, Math.min(root.clientWidth - width - 8, x - width / 2)));
  const top = Math.round(Math.max(8, Math.min(root.clientHeight - popover.offsetHeight - 8, y)));
  popover.style.translate = `${left}px ${top}px`;
}

// Treasure, income and growth

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
    20_000 + Math.random() * 18_000,
  );
}

function collectBubble(id: string, at: Point) {
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
  commit({ render: false });
  options.onCoins();
}

/** The town grows by itself: a building somewhere gets a new floor. */
function growOnce() {
  if (document.hidden) return;
  const grown = growCity(1);
  if (!grown.length) return;
  for (const building of grown) {
    scene.bornAt.set(building.id, performance.now());
    dust(building.x, building.y, 10, '#ffffff');
    floatAt(building.x, building.y, cityVisual(building, false).top + 10, t('⬆ new floor'), '#2fbf71');
  }
  sfx('pop');
  commit();
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
  people.step(dt);
  cars.step(dt);

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

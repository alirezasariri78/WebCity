import { cityDef, cityLook, decorDef, houseDef, houseLook, roomSlots, themeDef, upgradeCost, wonderDef } from '../../core/catalog';
import {
  ERAS,
  buildRoads,
  explored,
  floorCap,
  isBuildable,
  isOwned,
  isRuin,
  resourceAt,
  ruinsLeft,
  terrainAt,
  tileIndex,
  type Tile,
} from '../../core/rules';
import type { BuildingLook, CityBuilding, CityKind, Decor, DecorKind, House, HouseKind, Wonder, WonderKind } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { makeHouse, uid } from '../../game/factory';
import { checkpoint, clearHistory } from '../../game/history';
import {
  buyTile,
  bump,
  cityPopulation,
  currentEra,
  earnPassive,
  empireTick,
  exploreRuin,
  growCity,
  growthSteps,
  income,
  isGoldenAge,
  level,
  reward,
  spend,
  startWonder,
} from '../../game/progress';
import { commit, state, version } from '../../game/store';
import { t } from '../../i18n';
import {
  CAR_VARIANTS,
  DECOR_VARIANTS,
  FOREST_VARIANTS,
  MOUNTAIN_VARIANTS,
  VILLAGER_VARIANTS,
  carArt,
  decorAnims,
  decorArt,
  forestArt,
  mountainArt,
  ruinArt,
  villagerArt,
} from '../../render/art';
import { cityVisual, houseVisual, wonderVisual } from '../../render/buildings';
import { TILE_H, TILE_W, iso, toGrid } from '../../render/geometry';
import { TownRenderer } from '../../render/renderer';
import { isAnimating, type Scene, type SceneObject, type SpriteRef } from '../../render/scene';
import { onSpriteReady } from '../../render/sprites';
import { confirmModal, promptModal } from '../common/modal';
import { openBuildingDesigner } from './designer';
import { showRuinFind } from './ruins';
import { floorCost, showPopover, type PopoverAction, type PopoverTarget } from './popover';
import { spawnBubble, treasureOf, treasurePrize } from './treasure';
import { Crowd } from './villagers';

export type PlaceMode =
  | { type: 'idle' }
  | { type: 'house'; kind: HouseKind; look?: BuildingLook; name?: string }
  | { type: 'city'; kind: CityKind; look?: BuildingLook; name?: string }
  | { type: 'decor'; kind: DecorKind }
  | { type: 'wonder'; kind: WonderKind }
  | { type: 'move'; id: string };

export interface TownViewOptions {
  onEnterHouse: (id: string) => void;
  onModeChange: () => void;
  onCoins: () => void;
}

type Point = { x: number; y: number };

const INCOME_INTERVAL_MS = 20_000;
const GROWTH_INTERVAL_MS = 35_000;
const EMPIRE_INTERVAL_MS = 10_000;
const IDLE_AFTER_MS = 4000;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.6;
const DRAG_THRESHOLD_PX = 6;
const MAX_PEOPLE = 60;
const MAX_CARS = 24;
const CITY_ERA_INDEX = ERAS.findIndex((e) => e.id === 'city');

const scene: Scene = {
  theme: themeDef('meadow'),
  world: { seed: 0, size: 1, owned: [], cleared: [], ruins: [], culture: 0 },
  groundKey: '',
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
  setInterval(tickEmpire, EMPIRE_INTERVAL_MS);
  events.on('border', ({ tiles }) => celebrateBorder(tiles));
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

/** Frames the land inside the borders. */
export function fit() {
  userMovedCamera = false;
  const world = state.town.world;
  const xs = world.owned.map((i) => i % world.size);
  const ys = world.owned.map((i) => Math.floor(i / world.size));
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const n = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) + 3;
  const w = root.clientWidth || innerWidth;
  const h = root.clientHeight || innerHeight;
  const centre = iso((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  const cam = renderer.camera;
  cam.scale = Math.max(MIN_ZOOM, Math.min(1.3, Math.min(w / (n * TILE_W + 40), (h - 40) / (n * TILE_H + 160))));
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
const findWonder = (id: string | null) => state.town.wonders.find((w) => w.id === id);
const findAny = (id: string | null) => findHouse(id) ?? findCity(id) ?? findDecor(id) ?? findWonder(id);

const occupantAt = (gx: number, gy: number) =>
  [...state.town.houses, ...state.town.city, ...state.town.decor, ...state.town.wonders].find((o) => o.x === gx && o.y === gy);

/** Selected empty land is remembered as "tile:x,y". */
const tileOf = (id: string | null) => {
  const match = id?.match(/^(?:tile|ruin):(\d+),(\d+)$/);
  return match ? { id: id!, x: Number(match[1]), y: Number(match[2]) } : null;
};

function targetOf(id: string | null): PopoverTarget | null {
  const house = findHouse(id);
  if (house) return { type: 'house', item: house };
  const city = findCity(id);
  if (city) return { type: 'city', item: city };
  const decor = findDecor(id);
  if (decor) return { type: 'decor', item: decor };
  const wonder = findWonder(id);
  if (wonder) return { type: 'wonder', item: wonder };
  const tile = tileOf(id);
  return tile ? { type: 'tile', item: tile } : null;
}

function canPlace(gx: number, gy: number) {
  if (!isBuildable(state.town.world, gx, gy)) return false;
  const occupant = occupantAt(gx, gy);
  return !occupant || (mode.type === 'move' && occupant.id === mode.id);
}

/** Why a tile cannot be used, in words the player understands. */
function whyNot(gx: number, gy: number): string {
  const world = state.town.world;
  if (!isOwned(world, gx, gy)) return t('🚩 That land is outside your borders. Click it to claim it, or let your culture grow.');
  const terrain = terrainAt(world, gx, gy);
  if (terrain === 'water' || terrain === 'mountain') return t('🌊 You cannot build on water or mountains.');
  if (resourceAt(world, gx, gy)) return t('🌾 Keep resource tiles free: your city is already using them.');
  if (isRuin(world, gx, gy)) return t('❓ Explore the ruins first.');
  return t('Something is already standing there.');
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
  if (mode.type === 'wonder') return `${wonderDef(mode.kind).emoji} ${t(wonderDef(mode.kind).name)}`;
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
    events.emit('toast', { text: whyNot(gx, gy), kind: 'bad' });
    return;
  }
  checkpoint();
  clearForest(gx, gy);
  if (mode.type === 'house') placeHouse(mode.kind, gx, gy, at, mode.look, mode.name);
  else if (mode.type === 'wonder') placeWonder(mode.kind, gx, gy, at);
  else if (mode.type === 'city') placeCity(mode.kind, gx, gy, at, mode.look, mode.name);
  else if (mode.type === 'decor') placeDecor(mode.kind, gx, gy, at);
  else if (mode.type === 'move') moveObject(mode.id, gx, gy);
}

/** Building in a forest cuts it down, and the wood is sold. */
function clearForest(gx: number, gy: number) {
  const world = state.town.world;
  if (mode.type === 'move' || terrainAt(world, gx, gy) !== 'forest') return;
  world.cleared.push(tileIndex(world, gx, gy));
  earnPassive(5);
  floatAt(gx, gy, 40, '🪵 +5 🪙', '#8d6e63');
}

function placeWonder(kind: WonderKind, gx: number, gy: number, at: Point) {
  const wonder = startWonder(kind, gx, gy);
  if (!wonder) return;
  scene.bornAt.set(wonder.id, performance.now());
  celebrateBuild(gx, gy, at);
  reward(50, 0, { x: at.x, y: at.y - 60 });
  setMode({ type: 'idle' });
  commit();
  events.emit('toast', {
    text: t('🏗️ Work on the {name} has started! Come back when it is finished.', { name: t(wonderDef(kind).name) }),
    kind: 'good',
  });
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

function wonderObject(wonder: Wonder, night: boolean, now: number): SceneObject {
  const def = wonderDef(wonder.kind);
  const label = wonder.done ? `${def.emoji} ${t(def.name)}` : `🏗️ ${t(def.name)}`;
  return { id: wonder.id, gx: wonder.x, gy: wonder.y, ...wonderVisual(wonder, night, now), seed: 3, label };
}

/** Forests, mountains and ruins on the land the player has seen. */
function sceneryObjects(): SceneObject[] {
  const world = state.town.world;
  const objects: SceneObject[] = [];
  const seen = explored(world);
  const taken = new Set(occupantsKeys());
  const ruins = new Set(ruinsLeft(world));
  for (const i of seen) {
    const x = i % world.size;
    const y = Math.floor(i / world.size);
    if (taken.has(`${x},${y}`)) continue;
    const terrain = terrainAt(world, x, y);
    const base = { gx: x, gy: y, scale: 1, anims: [], seed: x + y };
    if (ruins.has(i)) {
      objects.push({ ...base, id: `ruin:${x},${y}`, key: 'ruin', make: ruinArt, top: 60 });
    } else if (terrain === 'forest') {
      const variant = (x * 7 + y * 3) % FOREST_VARIANTS;
      objects.push({ ...base, id: `forest:${i}`, key: `forest:${variant}`, make: () => forestArt(variant), top: 50, inert: true });
    } else if (terrain === 'mountain') {
      const variant = (x * 5 + y * 11) % MOUNTAIN_VARIANTS;
      objects.push({ ...base, id: `mountain:${i}`, key: `mountain:${variant}`, make: () => mountainArt(variant), top: 70, inert: true });
    }
  }
  return objects;
}

const occupantsKeys = () =>
  [...state.town.houses, ...state.town.city, ...state.town.decor, ...state.town.wonders].map((o) => `${o.x},${o.y}`);

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

  const eraIndex = ERAS.indexOf(currentEra());
  const world = state.town.world;
  scene.theme = theme;
  scene.world = world;
  scene.paved = eraIndex >= CITY_ERA_INDEX;
  const network = buildRoads(state.town);
  scene.roads = network.roads;
  scene.roadKey = [...network.roads].sort().join(';');
  scene.groundKey = `${theme.id}|${scene.paved}|${world.seed}|${world.owned.length}|${world.cleared.length}|${world.ruins.length}|${scene.roadKey}`;
  root.classList.toggle('golden', isGoldenAge());
  const now = Date.now();

  const moving = mode.type === 'move' ? mode.id : null;
  scene.objects = [
    ...state.town.houses.filter((h) => h.id !== moving).map((h) => toObject(h.id, h.x, h.y, houseVisual(h, night), h.name, h.level ?? 1)),
    ...state.town.city.filter((c) => c.id !== moving).map((c) => toObject(c.id, c.x, c.y, cityVisual(c, night))),
    ...state.town.decor.filter((d) => d.id !== moving).map(decorObject),
    ...state.town.wonders.filter((w) => w.id !== moving).map((w) => wonderObject(w, night, now)),
    ...sceneryObjects(),
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
  if (mode.type === 'wonder') return wonderVisual({ id: '', kind: mode.kind, x: 0, y: 0, startedAt: 0, done: true }, night, 0);
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
      ? {
          ...hoverTile,
          ok: canPlace(hoverTile.gx, hoverTile.gy),
          ghost: isOwned(state.town.world, hoverTile.gx, hoverTile.gy) ? ghost() : null,
        }
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
  const world = renderer.toWorld(p.x, p.y);
  const tile = toGrid(world.x, world.y);
  const tileId =
    state.town.world && explored(state.town.world).has(tileIndex(state.town.world, tile.gx, tile.gy)) ? `tile:${tile.gx},${tile.gy}` : null;
  const id = hit?.id ?? tileId;
  if (id && id !== selected) {
    sfx('click');
    selected = id;
    if (hit) scene.pokedAt.set(hit.id, performance.now());
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
  if (target.type === 'tile') return tileAction(target.item, action, event);
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

function tileAction(tile: { x: number; y: number }, action: PopoverAction, event: MouseEvent) {
  if (action === 'claim') {
    if (!buyTile(tile.x, tile.y)) return;
    sfx('build');
    reward(10, 0, { x: event.clientX, y: event.clientY - 30 });
    commit();
    openPopover();
  } else if (action === 'explore') {
    const find = exploreRuin(tile.x, tile.y);
    if (!find) return;
    selected = null;
    popover.hidden = true;
    dust(tile.x, tile.y, 24, '#ffe08a');
    sfx('fanfare');
    events.emit('confetti', { x: event.clientX, y: event.clientY });
    commit();
    showRuinFind(find);
  }
}

async function redesign(target: PopoverTarget) {
  if (target.type === 'decor' || target.type === 'wonder' || target.type === 'tile') return;
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
  } else if (target.type === 'wonder' || target.type === 'tile') {
    return;
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
  const target = findAny(selected) ?? tileOf(selected);
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
  const grown = growCity(growthSteps());
  if (!grown.length) return;
  for (const building of grown) {
    scene.bornAt.set(building.id, performance.now());
    dust(building.x, building.y, 10, '#ffffff');
    floatAt(building.x, building.y, cityVisual(building, false).top + 10, t('⬆ new floor'), '#2fbf71');
  }
  sfx('pop');
  commit();
}

/** Science, culture and wonders move forward every few seconds. */
function tickEmpire() {
  if (document.hidden) return;
  const before = `${state.town.world.owned.length}|${state.progress.research.done.length}|${state.town.wonders.filter((w) => w.done).length}`;
  empireTick(EMPIRE_INTERVAL_MS / 60_000);
  const after = `${state.town.world.owned.length}|${state.progress.research.done.length}|${state.town.wonders.filter((w) => w.done).length}`;
  const building = state.town.wonders.some((w) => !w.done);
  if (before !== after || building) commit();
  else commit({ render: false });
  options.onCoins();
}

function celebrateBorder(tiles: number[]) {
  const world = state.town.world;
  for (const i of tiles) dust(i % world.size, Math.floor(i / world.size), 10, '#d9ccff');
  sfx('pop');
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

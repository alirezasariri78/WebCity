import type { ResourceKind, Terrain, Town, World } from '../types';

export const WORLD_SIZE = 40;
export const START = { x: 20, y: 20 } as const;
/** Borders start as a square this many tiles around the Town Hall. */
export const START_RADIUS = 3;
/** How far beyond the borders the fog lifts. */
export const SIGHT = 3;

const TERRAINS: Terrain[] = ['grass', 'forest', 'hill', 'mountain', 'water', 'sand'];
const code = (t: Terrain) => TERRAINS.indexOf(t);

export interface ResourceDef {
  kind: ResourceKind;
  name: string;
  emoji: string;
  yields: Partial<Yields>;
}

export interface Yields {
  food: number;
  gold: number;
  science: number;
  culture: number;
}

export const RESOURCES: ResourceDef[] = [
  { kind: 'wheat', name: 'Wheat', emoji: '🌾', yields: { food: 2 } },
  { kind: 'fish', name: 'Fish', emoji: '🐟', yields: { food: 2 } },
  { kind: 'gold', name: 'Gold', emoji: '🪙', yields: { gold: 3 } },
  { kind: 'gems', name: 'Gems', emoji: '💎', yields: { gold: 2, culture: 1 } },
  { kind: 'marble', name: 'Marble', emoji: '🏛️', yields: { culture: 2 } },
  { kind: 'crystal', name: 'Crystals', emoji: '🔮', yields: { science: 2 } },
];

export const resourceDef = (kind: ResourceKind) => RESOURCES.find((r) => r.kind === kind)!;

export const TERRAIN_NAMES: Record<Terrain, { name: string; emoji: string }> = {
  grass: { name: 'Grassland', emoji: '🌱' },
  forest: { name: 'Forest', emoji: '🌲' },
  hill: { name: 'Hills', emoji: '⛰️' },
  mountain: { name: 'Mountains', emoji: '🏔️' },
  water: { name: 'Lake', emoji: '🌊' },
  sand: { name: 'Beach', emoji: '🏖️' },
};

interface WorldMap {
  terrain: Uint8Array;
  resources: Map<number, ResourceKind>;
  ruins: number[];
}

/** Repeatable "random" number in [0, 1) for a tile. */
export function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function noise(x: number, y: number, seed: number, scale: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sx = smooth(fx - x0);
  const sy = smooth(fy - y0);
  const top = hash(x0, y0, seed) * (1 - sx) + hash(x0 + 1, y0, seed) * sx;
  const bottom = hash(x0, y0 + 1, seed) * (1 - sx) + hash(x0 + 1, y0 + 1, seed) * sx;
  return top * (1 - sy) + bottom * sy;
}

const chebyshev = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

function generate(seed: number, size: number): WorldMap {
  const terrain = new Uint8Array(size * size);
  const resources = new Map<number, ResourceKind>();
  const half = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fromStart = chebyshev(x, y, START.x, START.y);
      const edge = Math.max(Math.abs(x - half + 0.5), Math.abs(y - half + 0.5)) / half;
      let height = 0.65 * noise(x, y, seed, 9) + 0.35 * noise(x, y, seed + 7, 4) - Math.max(0, edge - 0.72) * 1.8;
      if (fromStart <= START_RADIUS + 1) height = 0.5 + (height - 0.5) * 0.3;
      const moisture = noise(x, y, seed + 31, 6);
      let t: Terrain =
        height < 0.33
          ? 'water'
          : height < 0.37
            ? 'sand'
            : height > 0.74
              ? 'mountain'
              : height > 0.64
                ? 'hill'
                : moisture > 0.58
                  ? 'forest'
                  : 'grass';
      if (fromStart <= 2) t = 'grass';
      const i = y * size + x;
      terrain[i] = code(t);

      const r = hash(x, y, seed + 99);
      if (fromStart <= START_RADIUS) continue;
      if (t === 'water' && edge < 0.9 && r < 0.07) resources.set(i, 'fish');
      else if (t === 'grass' && r < 0.035) resources.set(i, 'wheat');
      else if (t === 'grass' && r < 0.05) resources.set(i, 'marble');
      else if (t === 'hill' && r < 0.14) resources.set(i, 'gold');
      else if (t === 'hill' && r < 0.22) resources.set(i, 'gems');
      else if (t === 'forest' && r < 0.04) resources.set(i, 'crystal');
    }
  }

  // Something to discover right away: wheat inside the borders, gold just outside them.
  resources.set((START.y + 1) * size + START.x - 2, 'wheat');
  const gold = (START.y + START_RADIUS + 1) * size + START.x + START_RADIUS + 1;
  terrain[gold] = code('hill');
  resources.set(gold, 'gold');

  const ruins: number[] = [];
  const near = (START.y + 1) * size + START.x - START_RADIUS - 2;
  terrain[near] = code('grass');
  resources.delete(near);
  ruins.push(near);
  for (let tries = 0; ruins.length < 7 && tries < 4000; tries++) {
    const x = Math.floor(hash(tries, 1, seed + 5) * size);
    const y = Math.floor(hash(tries, 2, seed + 5) * size);
    const i = y * size + x;
    const t = TERRAINS[terrain[i]];
    if (t === 'water' || t === 'mountain' || resources.has(i) || chebyshev(x, y, START.x, START.y) < 6) continue;
    if (ruins.some((j) => chebyshev(x, y, j % size, Math.floor(j / size)) < 5)) continue;
    ruins.push(i);
  }
  return { terrain, resources, ruins };
}

const maps = new Map<string, WorldMap>();
function worldMap(world: World): WorldMap {
  const key = `${world.seed}|${world.size}`;
  let map = maps.get(key);
  if (!map) {
    map = generate(world.seed, world.size);
    maps.set(key, map);
  }
  return map;
}

/** Sets built from saved arrays, rebuilt only when the array grows. */
const sets = new WeakMap<number[], { length: number; set: Set<number> }>();
export function setOf(list: number[]): Set<number> {
  const cached = sets.get(list);
  if (cached && cached.length === list.length) return cached.set;
  const set = new Set(list);
  sets.set(list, { length: list.length, set });
  return set;
}

export const tileIndex = (world: World, x: number, y: number) => y * world.size + x;
export const inWorld = (world: World, x: number, y: number) => x >= 0 && y >= 0 && x < world.size && y < world.size;

export function terrainAt(world: World, x: number, y: number): Terrain {
  if (!inWorld(world, x, y)) return 'water';
  const i = tileIndex(world, x, y);
  if (setOf(world.cleared).has(i)) return 'grass';
  return TERRAINS[worldMap(world).terrain[i]];
}

export function resourceAt(world: World, x: number, y: number): ResourceKind | undefined {
  if (!inWorld(world, x, y)) return undefined;
  const i = tileIndex(world, x, y);
  return setOf(world.cleared).has(i) ? undefined : worldMap(world).resources.get(i);
}

/** Ruins still waiting to be explored. */
export function ruinsLeft(world: World): number[] {
  const found = setOf(world.ruins);
  const cleared = setOf(world.cleared);
  return worldMap(world).ruins.filter((i) => !found.has(i) && !cleared.has(i));
}

export const isRuin = (world: World, x: number, y: number) => inWorld(world, x, y) && ruinsLeft(world).includes(tileIndex(world, x, y));

export const isOwned = (world: World, x: number, y: number) => inWorld(world, x, y) && setOf(world.owned).has(tileIndex(world, x, y));

export const isPassable = (t: Terrain) => t !== 'water' && t !== 'mountain';

/** Can a building go here (ignoring what already stands on it)? */
export function isBuildable(world: World, x: number, y: number): boolean {
  return isOwned(world, x, y) && isPassable(terrainAt(world, x, y)) && !resourceAt(world, x, y) && !isRuin(world, x, y);
}

const exploredCache = new WeakMap<number[], { length: number; set: Set<number> }>();
/** Tiles the player can see: the borders plus a few tiles of sight around them. */
export function explored(world: World): Set<number> {
  const cached = exploredCache.get(world.owned);
  if (cached && cached.length === world.owned.length) return cached.set;
  const set = new Set<number>();
  for (const i of world.owned) {
    const ox = i % world.size;
    const oy = Math.floor(i / world.size);
    for (let dy = -SIGHT; dy <= SIGHT; dy++) {
      for (let dx = -SIGHT; dx <= SIGHT; dx++) {
        if (inWorld(world, ox + dx, oy + dy)) set.add(tileIndex(world, ox + dx, oy + dy));
      }
    }
  }
  exploredCache.set(world.owned, { length: world.owned.length, set });
  return set;
}

export const isExplored = (world: World, x: number, y: number) => inWorld(world, x, y) && explored(world).has(tileIndex(world, x, y));

/** Unowned tiles touching the borders. */
export function borderTiles(world: World): number[] {
  const owned = setOf(world.owned);
  const result = new Set<number>();
  for (const i of world.owned) {
    const ox = i % world.size;
    const oy = Math.floor(i / world.size);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = ox + dx;
        const y = oy + dy;
        if (inWorld(world, x, y) && !owned.has(tileIndex(world, x, y))) result.add(tileIndex(world, x, y));
      }
    }
  }
  return [...result].sort((a, b) => a - b);
}

export const canClaim = (world: World, x: number, y: number) => inWorld(world, x, y) && borderTiles(world).includes(tileIndex(world, x, y));

const START_TILES = (START_RADIUS * 2 + 1) ** 2;
const extraTiles = (world: World) => Math.max(0, world.owned.length - START_TILES);

/** Coins to buy the next tile. */
export const tileCost = (world: World) => 20 + extraTiles(world) * 4;

/** Culture needed before the borders grow by themselves. */
export const cultureNeeded = (world: World) => 10 + extraTiles(world) * 2;

/** The tile the borders grow into: resources first, then good land next to many owned tiles. */
export function bestTileToClaim(world: World): number | undefined {
  const owned = setOf(world.owned);
  let best: number | undefined;
  let bestScore = -Infinity;
  for (const i of borderTiles(world)) {
    const x = i % world.size;
    const y = Math.floor(i / world.size);
    const t = terrainAt(world, x, y);
    let neighbours = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (owned.has(tileIndex(world, x + dx, y + dy))) neighbours++;
    }
    const score =
      (resourceAt(world, x, y) ? 12 : 0) +
      (isRuin(world, x, y) ? 6 : 0) +
      (t === 'mountain' ? -3 : t === 'water' ? -1 : 2) +
      neighbours * 1.5 +
      hash(x, y, world.seed + 3);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function createWorld(seed: number, centre: { x: number; y: number } = START): World {
  const world: World = { seed, size: WORLD_SIZE, owned: [], cleared: [], ruins: [], culture: 0 };
  for (let y = centre.y - START_RADIUS; y <= centre.y + START_RADIUS; y++) {
    for (let x = centre.x - START_RADIUS; x <= centre.x + START_RADIUS; x++) world.owned.push(tileIndex(world, x, y));
  }
  return world;
}

/** Every resource inside the borders. */
export function ownedResources(world: World): ResourceKind[] {
  const result: ResourceKind[] = [];
  for (const i of world.owned) {
    const r = resourceAt(world, i % world.size, Math.floor(i / world.size));
    if (r) result.push(r);
  }
  return result;
}

/** Things that stand on tiles: buildings, decorations and wonders. */
export const occupants = (town: Town) => [...town.houses, ...town.city, ...town.decor, ...town.wonders];

import { describe, expect, it } from 'vitest';
import {
  START,
  START_RADIUS,
  WORLD_SIZE,
  bestTileToClaim,
  borderTiles,
  canClaim,
  createWorld,
  cultureNeeded,
  explored,
  isBuildable,
  isOwned,
  isPassable,
  resourceAt,
  ruinsLeft,
  terrainAt,
  tileCost,
  tileIndex,
} from '../../src/core/rules';

const SEEDS = [1, 42, 777, 123456];

describe('world map', () => {
  it('is the same every time for the same seed', () => {
    const a = createWorld(42);
    const b = createWorld(42);
    for (let y = 0; y < WORLD_SIZE; y += 3) {
      for (let x = 0; x < WORLD_SIZE; x += 3) expect(terrainAt(a, x, y)).toBe(terrainAt(b, x, y));
    }
  });

  it('always starts on open grass around the Town Hall', () => {
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) expect(terrainAt(world, START.x + dx, START.y + dy)).toBe('grass');
      }
    }
  });

  it('has varied land: water, forests and mountains somewhere', () => {
    const world = createWorld(42);
    const seen = new Set<string>();
    for (let y = 0; y < WORLD_SIZE; y++) for (let x = 0; x < WORLD_SIZE; x++) seen.add(terrainAt(world, x, y));
    expect(seen).toContain('water');
    expect(seen).toContain('forest');
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('puts something to discover close to the start', () => {
    for (const seed of SEEDS) {
      const world = createWorld(seed);
      expect(resourceAt(world, START.x - 2, START.y + 1)).toBe('wheat');
      expect(ruinsLeft(world).length).toBeGreaterThan(3);
    }
  });

  it('treats everything outside the map as water', () => {
    const world = createWorld(1);
    expect(terrainAt(world, -1, 5)).toBe('water');
    expect(isPassable(terrainAt(world, WORLD_SIZE, 0))).toBe(false);
  });
});

describe('borders', () => {
  it('start as a square around the Town Hall', () => {
    const world = createWorld(7);
    expect(world.owned).toHaveLength((START_RADIUS * 2 + 1) ** 2);
    expect(isOwned(world, START.x + START_RADIUS, START.y)).toBe(true);
    expect(isOwned(world, START.x + START_RADIUS + 1, START.y)).toBe(false);
  });

  it('only lets you build on owned, open land', () => {
    const world = createWorld(7);
    expect(isBuildable(world, START.x + 1, START.y)).toBe(true);
    expect(isBuildable(world, START.x + START_RADIUS + 2, START.y)).toBe(false);
    expect(isBuildable(world, START.x - 2, START.y + 1)).toBe(false);
  });

  it('can be extended to touching tiles only, and gets pricier', () => {
    const world = createWorld(7);
    const x = START.x + START_RADIUS + 1;
    expect(canClaim(world, x, START.y)).toBe(true);
    expect(canClaim(world, x + 3, START.y)).toBe(false);
    const cost = tileCost(world);
    const culture = cultureNeeded(world);
    world.owned.push(tileIndex(world, x, START.y));
    expect(tileCost(world)).toBeGreaterThan(cost);
    expect(cultureNeeded(world)).toBeGreaterThan(culture);
  });

  it('grows towards the best touching tile', () => {
    const world = createWorld(7);
    const best = bestTileToClaim(world)!;
    expect(borderTiles(world)).toContain(best);
    expect(world.owned).not.toContain(best);
  });

  it('lifts the fog a few tiles beyond the borders', () => {
    const world = createWorld(7);
    const seen = explored(world);
    expect(seen.has(tileIndex(world, START.x + START_RADIUS + 3, START.y))).toBe(true);
    expect(seen.has(tileIndex(world, START.x + START_RADIUS + 4, START.y))).toBe(false);
  });

  it('turns cleared tiles into grass', () => {
    const world = createWorld(42);
    let forest: [number, number] | undefined;
    for (let i = 0; i < WORLD_SIZE * WORLD_SIZE && !forest; i++) {
      const x = i % WORLD_SIZE;
      const y = Math.floor(i / WORLD_SIZE);
      if (terrainAt(world, x, y) === 'forest') forest = [x, y];
    }
    expect(forest).toBeDefined();
    world.cleared.push(tileIndex(world, ...forest!));
    expect(terrainAt(world, ...forest!)).toBe('grass');
  });
});

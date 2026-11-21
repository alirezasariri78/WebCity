import { makeFurniture, makeHouse, newGame } from '../src/game/factory';
import { WORLD_SIZE } from '../src/core/rules';
import type { Furniture, FurnitureKind, House, HouseKind, SaveData, Town, World } from '../src/core/types';

/** A world that is flat grass everywhere and fully owned, so tests do not depend on the terrain. */
export function flatWorld(size = WORLD_SIZE): World {
  const all = Array.from({ length: size * size }, (_, i) => i);
  return { seed: 1, size, owned: [...all], cleared: [...all], ruins: [], culture: 0 };
}

export function town(overrides: Partial<Town> = {}): Town {
  return { ...newGame().town, city: [], wonders: [], world: flatWorld(), ...overrides };
}

export function house(kind: HouseKind, x: number, y: number, extra: Partial<House> = {}): House {
  return { ...makeHouse(kind, x, y), ...extra };
}

export function part(kind: FurnitureKind, props: Record<string, string> = {}, extra: Partial<Furniture> = {}): Furniture {
  return { ...makeFurniture(kind, props), ...extra };
}

export function save(overrides: (data: SaveData) => void = () => {}): SaveData {
  const data = newGame();
  overrides(data);
  return data;
}

/** Parses an HTML string so tests can query it like a real page. */
export const parseHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html');

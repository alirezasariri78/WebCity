import { makeFurniture, makeHouse, newGame } from '../src/game/factory';
import type { Furniture, FurnitureKind, House, HouseKind, SaveData, Town } from '../src/core/types';

export function town(overrides: Partial<Town> = {}): Town {
  return { ...newGame().town, ...overrides };
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

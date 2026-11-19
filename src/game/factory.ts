import { furnitureDef, houseDef } from '../core/catalog';
import type { Furniture, FurnitureKind, House, HouseKind, SaveData } from '../core/types';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function makeFurniture(kind: FurnitureKind, props?: Record<string, string>): Furniture {
  return { id: uid(), kind, props: { ...furnitureDef(kind).defaults, ...props } };
}

export function makeHouse(kind: HouseKind, x: number, y: number, name = houseDef(kind).name): House {
  return {
    id: uid(),
    kind,
    name,
    x,
    y,
    items: houseDef(kind).template.map((t) => makeFurniture(t.kind, t.props)),
    builtAt: Date.now(),
  };
}

export function newGame(): SaveData {
  return {
    version: 1,
    town: {
      name: 'My Town',
      logo: '🏘️',
      theme: 'meadow',
      houses: [makeHouse('townhall', 3, 3, 'Home')],
      decor: [
        { id: uid(), kind: 'tree', x: 1, y: 1 },
        { id: uid(), kind: 'tree', x: 5, y: 1 },
        { id: uid(), kind: 'flowers', x: 2, y: 5 },
      ],
    },
    progress: {
      xp: 0,
      coins: 100,
      questIndex: 0,
      questBase: 0,
      achievements: [],
      streak: 0,
      lastDay: '',
      lastSeen: Date.now(),
      stats: {
        housesBuilt: 0,
        furnitureAdded: 0,
        edits: 0,
        decorPlaced: 0,
        exports: 0,
        previews: 0,
        visits: 0,
        themesTried: 0,
        coinsEarned: 0,
        upgrades: 0,
        collected: 0,
        styled: 0,
      },
      seenLevel: 1,
      toolsUsed: [],
    },
    settings: { muted: false, welcomed: false },
  };
}

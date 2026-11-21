import { furnitureDef, houseDef } from '../core/catalog';
import { START, createWorld } from '../core/rules/world';
import type { Furniture, FurnitureKind, House, HouseKind, SaveData } from '../core/types';
import { getLang, t } from '../i18n';

/** New furniture starts with example text in the player's language. */
const translated = (props: Record<string, string> = {}) => Object.fromEntries(Object.entries(props).map(([key, value]) => [key, t(value)]));

export const uid = () => Math.random().toString(36).slice(2, 10);

export function makeFurniture(kind: FurnitureKind, props?: Record<string, string>): Furniture {
  return { id: uid(), kind, props: { ...translated(furnitureDef(kind).defaults), ...translated(props) } };
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

export const newSeed = () => Math.floor(Math.random() * 1_000_000);

export function newGame(seed = newSeed()): SaveData {
  const { x, y } = START;
  return {
    version: 1,
    town: {
      name: t('My Town'),
      logo: '🏘️',
      theme: 'meadow',
      houses: [makeHouse('townhall', x, y, t('Home'))],
      decor: [
        { id: uid(), kind: 'tree', x: x - 2, y: y - 2 },
        { id: uid(), kind: 'tree', x: x + 2, y: y - 2 },
        { id: uid(), kind: 'flowers', x: x - 1, y: y + 2 },
      ],
      city: [
        { id: uid(), kind: 'home', x: x + 3, y, floors: 1, builtAt: Date.now() },
        { id: uid(), kind: 'home', x: x + 3, y: y + 2, floors: 1, builtAt: Date.now() },
      ],
      world: createWorld(seed),
      wonders: [],
      site: getLang() === 'en' ? undefined : { lang: getLang() },
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
        cityBuilt: 0,
        grown: 0,
        tiles: 0,
        techs: 0,
        ruins: 0,
        wonders: 0,
        painted: 0,
      },
      research: { current: null, points: 0, done: [] },
      seenLevel: 1,
      toolsUsed: [],
    },
    settings: { muted: false, welcomed: false, lang: getLang(), tourDone: false, allTools: false },
  };
}

import { levelFromXp } from '../core/rules/levels';
import { START, WORLD_SIZE, createWorld, tileIndex } from '../core/rules/world';
import type { SaveData, Town, World } from '../core/types';
import { newGame, newSeed } from './factory';

/** Kept from the project's first name, so towns saved back then still load. */
export const SAVE_KEY = 'town-builder-save-v1';

export function isSaveData(value: unknown): value is SaveData {
  const data = value as SaveData | null;
  return !!data && data.version === 1 && Array.isArray(data.town?.houses) && data.town.houses.length > 0;
}

/** Old towns lived on a fixed square in the corner. Move them to the middle of a new world, on flat land. */
function worldForOldTown(town: Town, xp: number): World {
  const objects = [...town.houses, ...(town.city ?? []), ...town.decor];
  const land = Math.max(Math.min(28, 9 + levelFromXp(xp)), ...objects.map((o) => Math.max(o.x, o.y) + 1));
  const shift = Math.max(0, Math.min(WORLD_SIZE - land, START.x - Math.floor(land / 2)));
  for (const o of objects) {
    o.x += shift;
    o.y += shift;
  }
  const world = createWorld(newSeed());
  world.owned = [];
  for (let y = shift; y < shift + land; y++) {
    for (let x = shift; x < shift + land; x++) world.owned.push(tileIndex(world, x, y));
  }
  world.cleared = [...world.owned];
  return world;
}

/** Fills in anything added in later versions so old saves keep working. */
export function migrate(data: SaveData): SaveData {
  const fresh = newGame();
  const town = { ...data.town, city: data.town.city ?? [] };
  if (!town.world) town.world = worldForOldTown(town, data.progress?.xp ?? 0);
  town.wonders ??= [];
  return {
    ...data,
    town,
    progress: {
      ...fresh.progress,
      ...data.progress,
      stats: { ...fresh.progress.stats, ...data.progress?.stats },
      research: data.progress?.research ?? fresh.progress.research,
    },
    settings: { ...fresh.settings, ...data.settings, tourDone: data.settings?.tourDone ?? !!data.settings?.welcomed },
  };
}

export function parseSave(json: string | null): SaveData | null {
  if (!json) return null;
  try {
    const data: unknown = JSON.parse(json);
    return isSaveData(data) ? migrate(data) : null;
  } catch {
    return null;
  }
}

export function loadSave(): SaveData {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY)) ?? newGame();
  } catch {
    return newGame();
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

import type { SaveData } from '../core/types';
import { newGame } from './factory';

export const SAVE_KEY = 'town-builder-save-v1';

export function isSaveData(value: unknown): value is SaveData {
  const data = value as SaveData | null;
  return !!data && data.version === 1 && Array.isArray(data.town?.houses) && data.town.houses.length > 0;
}

/** Fills in anything added in later versions so old saves keep working. */
export function migrate(data: SaveData): SaveData {
  const fresh = newGame();
  return {
    ...data,
    progress: {
      ...fresh.progress,
      ...data.progress,
      stats: { ...fresh.progress.stats, ...data.progress?.stats },
    },
    settings: { ...fresh.settings, ...data.settings },
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

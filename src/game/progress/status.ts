import { incomePerTick, levelFromXp, levelProgress, rateTown, visitorsPerHour, type Rating } from '../../core/rules';
import { state, version } from '../store';
import { yields } from './empire';

export const level = () => levelFromXp(state.progress.xp);
export const levelInfo = () => levelProgress(state.progress.xp);

let cached: { version: number; rating: Rating } | null = null;

/** Website rating for the current town, recalculated only after a change. */
export function rating(): Rating {
  if (cached?.version !== version) cached = { version, rating: rateTown(state.town) };
  return cached.rating;
}

export const visitors = () => visitorsPerHour(state.town, rating().score);
/** Coins per income tick (every 20 seconds): visitors plus a third of the gold made each minute. */
export const income = () => incomePerTick(state.town, rating().score) + Math.round(yields().gold / 3);

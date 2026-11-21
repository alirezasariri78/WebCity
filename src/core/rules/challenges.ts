import type { ChallengeDay, Stats } from '../types';
import { hash } from './world';

export interface ChallengeDef {
  id: string;
  emoji: string;
  /** English title with {n}. */
  title: string;
  stat: keyof Stats;
  amount: number;
  coins: number;
  xp: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'floors', emoji: '🏗️', title: 'Grow {n} new floors', stat: 'grown', amount: 8, coins: 40, xp: 30 },
  { id: 'furniture', emoji: '🛋️', title: 'Add {n} pieces of furniture', stat: 'furnitureAdded', amount: 3, coins: 30, xp: 30 },
  { id: 'write', emoji: '✏️', title: 'Write your own words in {n} parts', stat: 'edits', amount: 3, coins: 40, xp: 40 },
  { id: 'nature', emoji: '🌳', title: 'Plant {n} trees or flowers', stat: 'decorPlaced', amount: 5, coins: 25, xp: 20 },
  { id: 'treasure', emoji: '💎', title: 'Pop {n} treasure bubbles', stat: 'collected', amount: 3, coins: 30, xp: 25 },
  { id: 'build', emoji: '🏘️', title: 'Build {n} city buildings', stat: 'cityBuilt', amount: 3, coins: 40, xp: 30 },
  { id: 'land', emoji: '🗺️', title: 'Claim {n} new tiles of land', stat: 'tiles', amount: 3, coins: 45, xp: 35 },
  { id: 'paint', emoji: '🖌️', title: 'Paint {n} things in your rooms', stat: 'painted', amount: 4, coins: 30, xp: 30 },
  { id: 'peek', emoji: '🔮', title: 'Look at your website {n} times', stat: 'previews', amount: 2, coins: 20, xp: 20 },
  { id: 'upgrade', emoji: '⬆️', title: 'Upgrade {n} buildings', stat: 'upgrades', amount: 1, coins: 50, xp: 40 },
];

export const DAILY_COUNT = 3;
export const GOLDEN_AGE_MS = 10 * 60_000;

export const challengeDef = (id: string) => CHALLENGES.find((c) => c.id === id);

/** Three different challenges for a day, the same for everyone on that day. */
export function pickChallenges(day: string): ChallengeDef[] {
  const seed = [...day].reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7) | 0;
  return [...CHALLENGES]
    .map((c, i) => ({ c, r: hash(i, 3, seed) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, DAILY_COUNT)
    .map((x) => x.c);
}

export function newChallengeDay(day: string, stats: Stats): ChallengeDay {
  return { day, picks: pickChallenges(day).map((c) => ({ id: c.id, base: stats[c.stat] })), claimed: [] };
}

export function challengeProgress(pick: ChallengeDay['picks'][number], stats: Stats) {
  const def = challengeDef(pick.id);
  if (!def) return { def: undefined, done: 0, pct: 0, complete: false };
  const done = Math.max(0, Math.min(def.amount, stats[def.stat] - pick.base));
  return { def, done, pct: done / def.amount, complete: done >= def.amount };
}

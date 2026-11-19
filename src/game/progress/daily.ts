import { dailyCoins, dayKey, nextStreak, offlineMinutes } from '../../core/rules';
import { state } from '../store';
import { earnPassive } from './rewards';
import { income, visitors } from './status';

export interface DailyGift {
  streak: number;
  coins: number;
}

export interface AwayEarnings {
  minutes: number;
  coins: number;
  visitors: number;
}

export function dailyCheckIn(now = Date.now()): DailyGift | null {
  const p = state.progress;
  const streak = nextStreak(p.lastDay, p.streak, now);
  if (streak === null) return null;
  p.streak = streak;
  p.lastDay = dayKey(now);
  const coins = dailyCoins(streak);
  earnPassive(coins);
  return { streak, coins };
}

/** Coins earned while the game was closed. */
export function collectAwayEarnings(now = Date.now()): AwayEarnings | null {
  const minutes = offlineMinutes(state.progress.lastSeen, now);
  if (!minutes) return null;
  const coins = Math.floor(minutes * income() * 1.5);
  earnPassive(coins);
  return { minutes, coins, visitors: Math.floor((visitors() * minutes) / 60) };
}

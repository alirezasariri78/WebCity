const DAY_MS = 86_400_000;
const MAX_STREAK_BONUS_DAYS = 7;
const MAX_OFFLINE_MINUTES = 180;
const MIN_OFFLINE_MINUTES = 3;

export const dayKey = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Streak after checking in on `now`. Returns null if already checked in today. */
export function nextStreak(lastDay: string, streak: number, now: number): number | null {
  const today = dayKey(now);
  if (lastDay === today) return null;
  return lastDay === dayKey(now - DAY_MS) ? streak + 1 : 1;
}

export const dailyCoins = (streak: number) => 20 + 10 * Math.min(streak, MAX_STREAK_BONUS_DAYS);

/** Minutes worth paying out for time away, or 0 when the break was too short. */
export function offlineMinutes(lastSeen: number, now: number): number {
  const minutes = Math.min(MAX_OFFLINE_MINUTES, Math.floor((now - lastSeen) / 60_000));
  return minutes < MIN_OFFLINE_MINUTES ? 0 : minutes;
}

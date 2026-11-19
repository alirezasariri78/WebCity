import { describe, expect, it } from 'vitest';
import { dailyCoins, dayKey, nextStreak, offlineMinutes } from '../../src/core/rules';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 19, 12);

describe('daily streak', () => {
  it('starts a streak on the first visit', () => {
    expect(nextStreak('', 0, now)).toBe(1);
  });

  it('grows when you come back the next day', () => {
    expect(nextStreak(dayKey(now - DAY), 4, now)).toBe(5);
  });

  it('resets after a missed day', () => {
    expect(nextStreak(dayKey(now - 2 * DAY), 9, now)).toBe(1);
  });

  it('gives nothing twice on the same day', () => {
    expect(nextStreak(dayKey(now), 3, now)).toBeNull();
  });

  it('gives bigger gifts up to day 7, then stays the same', () => {
    expect(dailyCoins(2)).toBeGreaterThan(dailyCoins(1));
    expect(dailyCoins(7)).toBe(dailyCoins(30));
  });
});

describe('time away', () => {
  it('ignores short breaks', () => {
    expect(offlineMinutes(now - 60_000, now)).toBe(0);
  });

  it('counts whole minutes', () => {
    expect(offlineMinutes(now - 10 * 60_000 - 30_000, now)).toBe(10);
  });

  it('is capped at three hours', () => {
    expect(offlineMinutes(now - 2 * DAY, now)).toBe(180);
  });
});

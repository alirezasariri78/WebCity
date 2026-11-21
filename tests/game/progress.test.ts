import { beforeEach, describe, expect, it, vi } from 'vitest';
import { xpForLevel } from '../../src/core/rules';
import { events } from '../../src/game/events';
import { newGame } from '../../src/game/factory';
import {
  ACHIEVEMENTS,
  REPEATING_LENGTH,
  STORY_LENGTH,
  advanceQuest,
  bump,
  checkProgress,
  claimQuest,
  collectAwayEarnings,
  currentQuest,
  dailyCheckIn,
  isQuestDone,
  level,
  rating,
  reward,
  spend,
} from '../../src/game/progress';
import { replaceState, state, touch } from '../../src/game/store';

beforeEach(() => {
  replaceState(newGame());
  vi.useFakeTimers();
});

describe('rewards', () => {
  it('adds XP and coins and tracks coins earned', () => {
    reward(10, 5);
    expect(state.progress.xp).toBe(10);
    expect(state.progress.coins).toBe(105);
    expect(state.progress.stats.coinsEarned).toBe(5);
  });

  it('announces a level up once', () => {
    const levelUps: number[] = [];
    events.on('levelup', ({ level }) => levelUps.push(level));
    reward(xpForLevel(3), 0);
    checkProgress();
    expect(levelUps).toEqual([3]);
    expect(level()).toBe(3);
  });

  it('only spends coins you have', () => {
    expect(spend(1000)).toBe(false);
    expect(state.progress.coins).toBe(100);
    expect(spend(40)).toBe(true);
    expect(state.progress.coins).toBe(60);
  });
});

describe('quests', () => {
  it('starts with naming the town', () => {
    expect(currentQuest().title).toBe('Name your town');
    expect(isQuestDone(currentQuest())).toBe(false);
  });

  it('can be claimed when done, and pays out', () => {
    state.town.name = 'Bakery';
    const xp = currentQuest().xp;
    claimQuest();
    expect(state.progress.questIndex).toBe(1);
    expect(state.progress.xp).toBe(xp);
  });

  it('cannot be claimed before it is done', () => {
    claimQuest();
    expect(state.progress.questIndex).toBe(0);
  });

  it('continues with repeating quests that count from when they start', () => {
    state.progress.questIndex = STORY_LENGTH - 1;
    state.progress.stats.furnitureAdded = 50;
    advanceQuest();
    const quest = currentQuest();
    expect(quest.title).toMatch(/Add \d+ furniture/);
    expect(quest.value()).toBe(0);
    bump('furnitureAdded', quest.goal);
    expect(isQuestDone(currentQuest())).toBe(true);
  });

  it('makes repeating quests bigger each round', () => {
    state.progress.questIndex = STORY_LENGTH;
    const first = currentQuest().goal;
    for (let i = 0; i < REPEATING_LENGTH; i++) advanceQuest();
    expect(currentQuest().goal).toBe(first + 1);
  });

  it('emits an event when a quest becomes done', () => {
    const seen: boolean[] = [];
    events.on('quest', ({ done }) => seen.push(done));
    state.town.name = 'Done';
    checkProgress();
    expect(seen).toContain(true);
  });
});

describe('badges', () => {
  it('have unique ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('are awarded once, with their coins', () => {
    state.progress.stats.housesBuilt = 1;
    checkProgress();
    checkProgress();
    expect(state.progress.achievements.filter((id) => id === 'first_house')).toHaveLength(1);
    expect(state.progress.coins).toBe(100 + ACHIEVEMENTS.find((a) => a.id === 'first_house')!.coins);
  });
});

describe('rating cache', () => {
  it('recalculates only after a change', () => {
    const first = rating();
    expect(rating()).toBe(first);
    state.town.name = 'Renamed';
    touch();
    expect(rating()).not.toBe(first);
    expect(rating().score).toBeGreaterThan(first.score);
  });
});

describe('daily gifts and time away', () => {
  it('gives the daily gift once per day', () => {
    vi.setSystemTime(new Date('2026-11-19T10:00:00Z'));
    const gift = dailyCheckIn();
    expect(gift).toEqual({ streak: 1, coins: 30 });
    expect(dailyCheckIn()).toBeNull();
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
    expect(dailyCheckIn()?.streak).toBe(2);
  });

  it('pays coins for time away', () => {
    const now = Date.now();
    state.progress.lastSeen = now - 60 * 60_000;
    const away = collectAwayEarnings(now);
    expect(away!.minutes).toBe(60);
    expect(away!.coins).toBeGreaterThan(0);
    expect(state.progress.coins).toBeGreaterThanOrEqual(100 + away!.coins);
  });

  it('pays nothing for a short break', () => {
    state.progress.lastSeen = Date.now();
    expect(collectAwayEarnings()).toBeNull();
  });
});

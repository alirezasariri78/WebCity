import { describe, expect, it } from 'vitest';
import { maxBubbles, spawnBubble, treasureOf, treasurePrize } from '../../src/ui/town/treasure';
import { house } from '../helpers';

const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('treasure bubbles', () => {
  const houses = [house('townhall', 3, 3), house('cottage', 1, 1), house('post', 5, 5)];

  it('appears over a house that has no bubble yet', () => {
    const bubble = spawnBubble(houses, [], 0, sequence(0, 0.5, 0.5))!;
    expect(bubble).not.toBeNull();
    expect(houses.some((h) => h.x === bubble.gx && h.y === bubble.gy)).toBe(true);
  });

  it('never stacks two bubbles on one house', () => {
    const bubbles = [];
    for (let i = 0; i < 10; i++) {
      const b = spawnBubble(houses, bubbles, i);
      if (b) bubbles.push(b);
    }
    const spots = bubbles.map((b) => `${b.gx},${b.gy}`);
    expect(new Set(spots).size).toBe(spots.length);
    expect(bubbles.length).toBeLessThanOrEqual(maxBubbles(houses.length));
  });

  it('picks rare treasure by weight', () => {
    expect(treasureOf(spawnBubble(houses, [], 0, sequence(0, 0.1, 0))!.emoji)).toBe('coin');
    expect(treasureOf(spawnBubble(houses, [], 0, sequence(0, 0.8, 0))!.emoji)).toBe('gem');
    expect(treasureOf(spawnBubble(houses, [], 0, sequence(0, 0.99, 0))!.emoji)).toBe('gift');
  });

  it('gives bigger prizes at higher levels', () => {
    expect(treasurePrize('coin', 10).coins).toBeGreaterThan(treasurePrize('coin', 1).coins);
    expect(treasurePrize('gem', 5).xp).toBeGreaterThan(0);
    expect(treasurePrize('gift', 1).coins).toBeGreaterThan(treasurePrize('coin', 1).coins);
  });

  it('allows more bubbles in bigger towns, up to five', () => {
    expect(maxBubbles(1)).toBe(1);
    expect(maxBubbles(100)).toBe(5);
  });
});

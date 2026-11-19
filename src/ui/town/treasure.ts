import { houseScale } from '../../core/catalog';
import type { House } from '../../core/types';
import { uid } from '../../game/factory';
import { houseTop } from '../../render/art';
import type { Bubble } from '../../render/scene';

export type TreasureKind = 'coin' | 'gem' | 'gift';

const TREASURES: { kind: TreasureKind; emoji: string; weight: number }[] = [
  { kind: 'coin', emoji: '🪙', weight: 70 },
  { kind: 'gem', emoji: '💎', weight: 22 },
  { kind: 'gift', emoji: '🎁', weight: 8 },
];

export const treasureOf = (emoji: string): TreasureKind => TREASURES.find((t) => t.emoji === emoji)?.kind ?? 'coin';

export const maxBubbles = (houseCount: number) => Math.min(5, 1 + Math.floor(houseCount / 2));

export function treasurePrize(kind: TreasureKind, level: number): { xp: number; coins: number } {
  if (kind === 'gem') return { xp: 12 + level * 3, coins: 0 };
  if (kind === 'gift') return { xp: 15, coins: 20 + level * 4 };
  return { xp: 2, coins: 4 + level * 2 };
}

function rollTreasure(random: number) {
  let roll = random * 100;
  return TREASURES.find((t) => (roll -= t.weight) < 0) ?? TREASURES[0];
}

/** Picks a free house and puts a treasure bubble over it, or returns null if none fits. */
export function spawnBubble(houses: House[], bubbles: Bubble[], now: number, random = Math.random): Bubble | null {
  if (bubbles.length >= maxBubbles(houses.length)) return null;
  const free = houses.filter((h) => !bubbles.some((b) => b.gx === h.x && b.gy === h.y));
  if (!free.length) return null;
  const house = free[Math.floor(random() * free.length)];
  return {
    id: uid(),
    gx: house.x,
    gy: house.y,
    top: houseTop(house.kind) * houseScale(house.level),
    emoji: rollTreasure(random()).emoji,
    born: now,
    seed: random() * 6,
  };
}

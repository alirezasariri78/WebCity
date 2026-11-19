import { furnitureDef } from '../catalog';
import type { Town } from '../types';
import { allItems, countImages, hasContactEmail, hasEditedTitle, homeOf } from './townQueries';

export interface Rating {
  score: number;
  stars: number;
  hints: string[];
}

export const DEFAULT_TOWN_NAME = 'My Town';

/** Scores a website from 0 to 100 and explains how to improve it. */
export function rateTown(town: Town): Rating {
  const hints: string[] = [];
  let score = 0;
  const check = (passed: boolean, points: number, hint: string) => {
    if (passed) score += points;
    else hints.push(hint);
  };

  const home = homeOf(town);
  check(town.name !== DEFAULT_TOWN_NAME, 10, 'Give your town a real name. It becomes the name of your website!');
  check(hasEditedTitle(home), 15, 'Change the Big Sign in your Town Hall so visitors know who you are.');
  check((home?.items.length ?? 0) >= 3, 10, 'Your Town Hall (home page) looks empty. Add more furniture inside.');
  check(town.houses.length >= 3, 10, 'Build more houses. Every house adds a new page to your website.');
  check(hasContactEmail(town), 15, 'Visitors cannot reach you! Build a Post Office and put your email in the Mailbox.');
  check(countImages(town) >= 2, 10, 'Websites with pictures feel alive. Hang a Painting somewhere.');

  const thin = town.houses.find((h) => h.items.length < 2);
  check(!thin, 10, `"${thin?.name}" has almost nothing inside. Add some furniture!`);

  const items = allItems(town);
  const written = items.filter((f) => f.edited || furnitureDef(f.kind).fields.length === 0).length;
  const writtenRatio = items.length ? written / items.length : 0;
  score += Math.round(writtenRatio * 20);
  if (writtenRatio < 0.8) hints.push('Some furniture still has the example words. Click it and write your own!');

  return { score, stars: Math.round(score / 10) / 2, hints };
}

export const visitorsPerHour = (town: Town, score: number) => 4 + score * 3 + town.houses.length * 6 + town.decor.length;

/** Coins the town earns per income tick. */
export function incomePerTick(town: Town, score: number): number {
  const upgrades = town.houses.reduce((sum, h) => sum + (h.level ?? 1) - 1, 0);
  return Math.max(1, Math.round(score / 25) + Math.floor(town.houses.length / 3) + upgrades + Math.floor(town.decor.length / 10));
}

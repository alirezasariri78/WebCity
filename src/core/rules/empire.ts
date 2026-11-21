import { CITY_TECH, TECHS, WONDERS, cityDef, houseDef, techDef, wonderDef, type WonderDef } from '../catalog';
import type { CityKind, House, Research, SiteFeature, TechId, Town, Wonder, WonderKind } from '../types';
import { ownedResources, resourceDef, type Yields } from './world';

export const YIELD_ICONS: Record<keyof Yields, string> = { food: '🌾', gold: '🪙', science: '🔬', culture: '🎭' };

const empty = (): Yields => ({ food: 0, gold: 0, science: 0, culture: 0 });

function add(total: Yields, extra: Partial<Yields>, times = 1) {
  for (const key of Object.keys(extra) as (keyof Yields)[]) total[key] += (extra[key] ?? 0) * times;
}

/** A page that is filled in with your own words works harder (40% for an empty page, 100% from three written parts). */
export const pageQuality = (house: House) => 0.4 + 0.6 * Math.min(1, house.items.filter((i) => i.edited).length / 3);

const pageYields = (house: House) => {
  const y = empty();
  add(y, houseDef(house.kind).yields, pageQuality(house) * (1 + ((house.level ?? 1) - 1) * 0.25));
  return y;
};

export const isResearched = (research: Research, id: TechId) => research.done.includes(id);

/** Food, gold, science and culture per minute. */
export function townYields(town: Town, research: Research): Yields {
  const total = empty();
  for (const house of town.houses) add(total, pageYields(house));
  for (const building of town.city) {
    const def = cityDef(building.kind);
    if (def.yields) add(total, def.yields, building.floors);
    if (building.kind === 'shop' && isResearched(research, 'trade')) total.gold += building.floors;
  }
  for (const resource of ownedResources(town.world)) add(total, resourceDef(resource).yields);
  for (const wonder of town.wonders) if (wonder.done) add(total, wonderDef(wonder.kind).yields);
  total.food += town.decor.length * 0.1;
  if (isResearched(research, 'philosophy')) total.culture *= 1.15;
  if (isResearched(research, 'electricity')) total.science *= 1.1;
  for (const key of Object.keys(total) as (keyof Yields)[]) total[key] = Math.round(total[key] * 10) / 10;
  return total;
}

// Research

export const canResearch = (research: Research, id: TechId) =>
  !isResearched(research, id) && techDef(id).requires.every((r) => isResearched(research, r));

export const availableTechs = (research: Research) => TECHS.filter((t) => canResearch(research, t.id));

/** Adds science. Returns the technology that was finished, if any. */
export function addScience(research: Research, science: number): TechId | null {
  if (!research.current) {
    research.points = Math.min(research.points + science, 60);
    return null;
  }
  research.points += science;
  const tech = techDef(research.current);
  if (research.points < tech.cost) return null;
  research.points -= tech.cost;
  research.done.push(tech.id);
  research.current = null;
  return tech.id;
}

export const researchProgress = (research: Research) =>
  research.current ? Math.min(1, research.points / techDef(research.current).cost) : 0;

export const cityUnlocked = (research: Research, kind: CityKind) => {
  const tech = CITY_TECH[kind];
  return !tech || isResearched(research, tech);
};

/** Everything a technology gives, for the "you discovered…" screen. */
export function techUnlocks(id: TechId): { emoji: string; name: string }[] {
  const city = (Object.entries(CITY_TECH) as [CityKind, TechId][])
    .filter(([, tech]) => tech === id)
    .map(([kind]) => ({ emoji: cityDef(kind).emoji, name: cityDef(kind).name }));
  const wonders = WONDERS.filter((w) => w.tech === id).map((w) => ({ emoji: w.emoji, name: w.name }));
  return [...city, ...wonders];
}

// Wonders

export const wonderProgress = (wonder: Wonder, now: number) =>
  wonder.done ? 1 : Math.min(1, (now - wonder.startedAt) / (wonderDef(wonder.kind).minutes * 60_000));

export const hasWonder = (town: Town, kind: WonderKind) => town.wonders.some((w) => w.kind === kind);

export const isWonderDone = (town: Town, kind: WonderKind) => town.wonders.some((w) => w.kind === kind && w.done);

export function wonderState(town: Town, research: Research, def: WonderDef): 'locked' | 'ready' | 'building' | 'done' {
  const wonder = town.wonders.find((w) => w.kind === def.kind);
  if (wonder) return wonder.done ? 'done' : 'building';
  return isResearched(research, def.tech) ? 'ready' : 'locked';
}

/** Marks wonders whose time is up as done. Returns the ones that just finished. */
export function finishWonders(town: Town, now: number): Wonder[] {
  const finished = town.wonders.filter((w) => !w.done && wonderProgress(w, now) >= 1);
  for (const w of finished) w.done = true;
  return finished;
}

export const WONDER_FEATURES: Record<WonderKind, SiteFeature> = {
  gardens: 'heroGlow',
  library: 'search',
  lighthouse: 'contactFab',
  colosseum: 'lightbox',
  observatory: 'darkToggle',
  needle: 'installable',
  launch: 'seoPack',
};

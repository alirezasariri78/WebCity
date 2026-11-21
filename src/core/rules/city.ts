import { cityDef } from '../catalog';
import type { CityBuilding, SiteFeature, Town, WonderKind } from '../types';
import { isWonderDone } from './empire';

export type EraId = 'village' | 'town' | 'city' | 'metropolis';

export interface Era {
  id: EraId;
  name: string;
  emoji: string;
  /** Population needed to reach this era. */
  population: number;
  /** Tallest a city building may grow in this era. */
  maxFloors: number;
  /** Highest upgrade level for page buildings in this era. */
  maxPageLevel: number;
}

export const ERAS: Era[] = [
  { id: 'village', name: 'Village', emoji: '🛖', population: 0, maxFloors: 3, maxPageLevel: 4 },
  { id: 'town', name: 'Town', emoji: '🏘️', population: 40, maxFloors: 8, maxPageLevel: 6 },
  { id: 'city', name: 'City', emoji: '🏙️', population: 160, maxFloors: 20, maxPageLevel: 8 },
  { id: 'metropolis', name: 'Metropolis', emoji: '🌆', population: 500, maxFloors: 70, maxPageLevel: 10 },
];

export function population(town: Town): number {
  const city = town.city.reduce((sum, b) => sum + b.floors * cityDef(b.kind).people, 0);
  return city + town.houses.length * 2;
}

export function eraFor(people: number): Era {
  let era = ERAS[0];
  for (const e of ERAS) if (people >= e.population) era = e;
  return era;
}

export const nextEra = (era: Era): Era | undefined => ERAS[ERAS.indexOf(era) + 1];

export const floorCap = (building: CityBuilding, era: Era) => Math.min(cityDef(building.kind).maxFloors, era.maxFloors);

export const canGrow = (building: CityBuilding, era: Era) => building.floors < floorCap(building, era);

/** Schools, hospitals and nature make people happy, and happy towns grow faster (0.3 – 1). */
export function happiness(town: Town): number {
  const services = town.city.filter((b) => b.kind === 'school' || b.kind === 'hospital' || b.kind === 'stadium').length;
  const nature = town.decor.length;
  return Math.min(1, 0.3 + services * 0.12 + nature * 0.015);
}

/** Coins the city buildings bring in per income tick. */
export const cityIncome = (town: Town) => town.city.reduce((sum, b) => sum + b.floors * cityDef(b.kind).income, 0);

/**
 * Picks the buildings that grow one floor this tick. Smaller buildings grow first,
 * so the skyline rises evenly. `random` is injectable for tests.
 */
export function pickGrowth(town: Town, era: Era, steps: number, random = Math.random): CityBuilding[] {
  const chance = happiness(town);
  const grown: CityBuilding[] = [];
  const floors = new Map(town.city.map((b) => [b.id, b.floors]));
  for (let i = 0; i < steps; i++) {
    const candidates = town.city.filter((b) => (floors.get(b.id) ?? 0) < floorCap(b, era));
    if (!candidates.length || random() > chance) continue;
    candidates.sort((a, b) => floors.get(a.id)! - floors.get(b.id)!);
    const pick = candidates[Math.floor(random() * Math.min(3, candidates.length))];
    floors.set(pick.id, floors.get(pick.id)! + 1);
    grown.push(pick);
  }
  return grown;
}

/** Growth steps owed for time spent away (one every 5 minutes, at most 40). */
export const offlineGrowthSteps = (minutesAway: number) => Math.min(40, Math.floor(minutesAway / 5));

export interface SiteFeatureDef {
  id: SiteFeature;
  name: string;
  emoji: string;
  desc: string;
  /** Unlocked by reaching an era… */
  era?: EraId;
  /** …or by finishing a wonder. */
  wonder?: WonderKind;
}

/** Website extras that unlock as the town grows. */
export const SITE_FEATURES: SiteFeatureDef[] = [
  {
    id: 'backToTop',
    name: 'Back-to-top button',
    emoji: '⬆️',
    desc: 'A round button that jumps back to the top of long pages.',
    era: 'town',
  },
  {
    id: 'readingBar',
    name: 'Reading progress bar',
    emoji: '📏',
    desc: 'A thin bar at the top that fills up as visitors scroll.',
    era: 'city',
  },
  { id: 'pageFade', name: 'Smooth page changes', emoji: '✨', desc: 'Pages fade softly in and out.', era: 'metropolis' },
  {
    id: 'heroGlow',
    name: 'Glowing banner',
    emoji: '🌺',
    desc: 'A softly moving colour glow behind the first part of every page.',
    wonder: 'gardens',
  },
  { id: 'search', name: 'Website search', emoji: '🔍', desc: 'A search box that finds anything on your website.', wonder: 'library' },
  { id: 'contactFab', name: 'Contact button', emoji: '💬', desc: 'A floating "Contact us" button on every page.', wonder: 'lighthouse' },
  { id: 'lightbox', name: 'Big pictures', emoji: '🖼️', desc: 'Visitors can tap any picture to see it big.', wonder: 'colosseum' },
  {
    id: 'darkToggle',
    name: 'Dark mode switch',
    emoji: '🌙',
    desc: 'Visitors can switch your site to dark colours.',
    wonder: 'observatory',
  },
  {
    id: 'installable',
    name: 'Install as an app',
    emoji: '📲',
    desc: 'Your website can be installed on phones like an app.',
    wonder: 'needle',
  },
  {
    id: 'seoPack',
    name: 'Google-ready',
    emoji: '🚀',
    desc: 'Share previews for social media and a robots file for search engines.',
    wonder: 'launch',
  },
];

const eraIndex = (id: EraId) => ERAS.findIndex((e) => e.id === id);

export const isFeatureUnlocked = (feature: SiteFeatureDef, town: Town) =>
  feature.wonder ? isWonderDone(town, feature.wonder) : eraIndex(eraFor(population(town)).id) >= eraIndex(feature.era ?? 'village');

/** Unlocked features the player has not switched off. */
export function activeFeatures(town: Town): SiteFeature[] {
  return SITE_FEATURES.filter((f) => isFeatureUnlocked(f, town) && town.site?.features?.[f.id] !== false).map((f) => f.id);
}

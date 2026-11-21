import { eraFor, nextEra, offlineGrowthSteps, pickGrowth, population, type Era } from '../../core/rules';
import type { CityBuilding } from '../../core/types';
import { events } from '../events';
import { state } from '../store';
import { earnPassive } from './rewards';

export const cityPopulation = () => population(state.town);
export const currentEra = (): Era => eraFor(cityPopulation());
export const upcomingEra = () => nextEra(currentEra());

let lastEra = '';

/** Announces a new era once, when the population crosses its threshold. */
export function checkEra() {
  const era = currentEra();
  if (lastEra && era.id !== lastEra) events.emit('era', { era: era.id });
  lastEra = era.id;
}

const TAX_PER_FLOOR = 2;

/** Lets the city grow `steps` times. Returns the buildings that got a new floor. */
export function growCity(steps: number, random = Math.random): CityBuilding[] {
  const grown = pickGrowth(state.town, currentEra(), steps, random);
  for (const building of grown) building.floors++;
  if (grown.length) {
    state.progress.stats.grown += grown.length;
    earnPassive(grown.length * TAX_PER_FLOOR);
    checkEra();
  }
  return grown;
}

/** Growth that happened while the game was closed. */
export function growWhileAway(minutesAway: number) {
  return growCity(offlineGrowthSteps(minutesAway));
}

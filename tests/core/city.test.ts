import { describe, expect, it } from 'vitest';
import { cityDef } from '../../src/core/catalog';
import { ERAS, activeFeatures, canGrow, eraFor, floorCap, nextEra, offlineGrowthSteps, pickGrowth, population } from '../../src/core/rules';
import type { CityBuilding, CityKind } from '../../src/core/types';
import { town } from '../helpers';

let nextId = 0;
const building = (kind: CityKind, floors = 1): CityBuilding => ({ id: `b${nextId++}`, kind, x: nextId, y: 0, floors, builtAt: 0 });
const era = (id: string) => ERAS.find((e) => e.id === id)!;

describe('population and eras', () => {
  it('counts people living in every floor, plus two per page building', () => {
    const t = town({ city: [building('home', 3), building('office', 2)] });
    expect(population(t)).toBe(3 * cityDef('home').people + 2 * cityDef('office').people + t.houses.length * 2);
  });

  it('moves through the eras as the town grows', () => {
    expect(eraFor(0).id).toBe('village');
    expect(eraFor(39).id).toBe('village');
    expect(eraFor(40).id).toBe('town');
    expect(eraFor(160).id).toBe('city');
    expect(eraFor(10_000).id).toBe('metropolis');
    expect(nextEra(era('city'))?.id).toBe('metropolis');
    expect(nextEra(era('metropolis'))).toBeUndefined();
  });

  it('lets buildings grow taller in later eras', () => {
    for (let i = 1; i < ERAS.length; i++) {
      expect(ERAS[i].maxFloors).toBeGreaterThan(ERAS[i - 1].maxFloors);
      expect(ERAS[i].population).toBeGreaterThan(ERAS[i - 1].population);
    }
  });
});

describe('growth', () => {
  it('never grows a building past its own limit or the era limit', () => {
    const shop = building('shop', 1);
    expect(floorCap(shop, era('metropolis'))).toBe(cityDef('shop').maxFloors);
    expect(floorCap(building('office'), era('village'))).toBe(era('village').maxFloors);
    expect(canGrow(building('home', era('village').maxFloors), era('village'))).toBe(false);
  });

  it('grows the smallest buildings first, one floor per step', () => {
    const tall = building('home', 3);
    const small = building('home', 1);
    const t = town({ city: [tall, small] });
    const grown = pickGrowth(t, era('city'), 1, () => 0);
    expect(grown).toEqual([small]);
  });

  it('stops when everything has reached the cap', () => {
    const t = town({ city: [building('home', 2), building('shop', 1)] });
    const grown = pickGrowth(t, era('village'), 50, () => 0);
    const village = era('village');
    for (const b of t.city) {
      const extra = grown.filter((g) => g === b).length;
      expect(b.floors + extra).toBeLessThanOrEqual(floorCap(b, village));
    }
    expect(grown.length).toBe(t.city.reduce((sum, b) => sum + floorCap(b, village) - b.floors, 0));
  });

  it('does not change the town itself', () => {
    const t = town({ city: [building('home', 1)] });
    pickGrowth(t, era('city'), 5, () => 0);
    expect(t.city[0].floors).toBe(1);
  });

  it('skips steps when the roll fails', () => {
    const t = town({ city: [building('home', 1)] });
    expect(pickGrowth(t, era('city'), 10, () => 0.99)).toEqual([]);
  });

  it('owes one growth step per five minutes away, up to a limit', () => {
    expect(offlineGrowthSteps(4)).toBe(0);
    expect(offlineGrowthSteps(25)).toBe(5);
    expect(offlineGrowthSteps(60 * 24 * 7)).toBe(40);
  });
});

describe('website extras', () => {
  it('unlocks extras with the era and respects switches', () => {
    const village = town();
    expect(activeFeatures(village)).toEqual([]);

    const city = town({ city: [building('home', 20), building('home', 20)] });
    expect(eraFor(population(city)).id).toBe('city');
    expect(activeFeatures(city)).toEqual(['backToTop', 'readingBar', 'darkToggle']);

    city.site = { features: { darkToggle: false } };
    expect(activeFeatures(city)).toEqual(['backToTop', 'readingBar']);
  });
});

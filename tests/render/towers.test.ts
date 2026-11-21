import { describe, expect, it } from 'vitest';
import { CITY, cityLook } from '../../src/core/catalog';
import { CAR_VARIANTS, carArt, towerArt, towerHeight, towerTop, type Art } from '../../src/render/art';

const isValid = ({ box: [x0, y0, x1, y1], svg }: Art) => {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">${svg}</svg>`,
    'image/svg+xml',
  );
  return !doc.querySelector('parsererror') && x1 > x0 && y1 > y0;
};

describe('towers', () => {
  it.each(CITY.map((c) => c.kind))('draws a valid %s at every height, day and night', (kind) => {
    const def = CITY.find((c) => c.kind === kind)!;
    for (const floors of [1, 2, 5, 12, def.maxFloors]) {
      for (const night of [false, true]) {
        expect(isValid(towerArt({ look: cityLook(kind), floors, night, trim: def.trim }))).toBe(true);
      }
    }
  });

  it('gets taller with every floor', () => {
    let last = 0;
    for (let floors = 1; floors <= 70; floors++) {
      const height = towerHeight(floors);
      expect(height).toBeGreaterThan(last);
      last = height;
    }
    expect(towerTop(cityLook('office'), 30)).toBeGreaterThan(towerHeight(30));
  });

  it('draws every car colour', () => {
    for (let v = 0; v < CAR_VARIANTS; v++) expect(isValid(carArt(v))).toBe(true);
  });
});

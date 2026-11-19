import { describe, expect, it } from 'vitest';
import { DECOR, HOUSES } from '../../src/core/catalog';
import { DECOR_VARIANTS, VILLAGER_VARIANTS, decorArt, houseArt, houseTop, shade, villagerArt, type Art } from '../../src/render/art';
import { iso, toGrid } from '../../src/render/geometry';

function parseSvg(art: Art) {
  const [x0, y0, x1, y1] = art.box;
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">${art.svg}</svg>`,
    'image/svg+xml',
  );
  return doc;
}

const isValid = (art: Art) => !parseSvg(art).querySelector('parsererror');
const hasPositiveBox = ({ box: [x0, y0, x1, y1] }: Art) => x1 > x0 && y1 > y0;

describe('isometric grid', () => {
  it('maps tiles to the screen and back', () => {
    for (let gx = -3; gx < 20; gx++) {
      for (let gy = -3; gy < 20; gy++) {
        const { x, y } = iso(gx, gy);
        expect(toGrid(x, y)).toEqual({ gx, gy });
        expect(toGrid(x + 10, y + 5)).toEqual({ gx, gy });
      }
    }
  });
});

describe('artwork', () => {
  it.each(HOUSES.map((h) => h.kind))('draws a valid %s by day and by night', (kind) => {
    for (const night of [false, true]) {
      const art = houseArt(kind, night);
      expect(isValid(art)).toBe(true);
      expect(hasPositiveBox(art)).toBe(true);
    }
    expect(houseTop(kind)).toBeGreaterThan(0);
  });

  it.each(DECOR.map((d) => d.kind))('draws every variant of %s', (kind) => {
    for (let v = 0; v < DECOR_VARIANTS; v++) expect(isValid(decorArt(kind, v))).toBe(true);
  });

  it('draws every villager', () => {
    for (let v = 0; v < VILLAGER_VARIANTS; v++) expect(isValid(villagerArt(v))).toBe(true);
  });

  it('lightens and darkens colours', () => {
    expect(shade('#808080', 0)).toBe('#808080');
    expect(shade('#000000', 1)).toBe('#ffffff');
    expect(shade('#ffffff', -1)).toBe('#000000');
    expect(shade('#102030', -0.5)).toBe('#081018');
  });
});

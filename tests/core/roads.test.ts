import { describe, expect, it } from 'vitest';
import { buildRoads } from '../../src/core/rules';
import { house, town } from '../helpers';

const isNeighbour = (a: { gx: number; gy: number }, b: { gx: number; gy: number }) => Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy) === 1;

describe('roads', () => {
  it('connects every house to the Town Hall with a walkable path', () => {
    const t = town({ decor: [], houses: [house('townhall', 3, 3), house('cottage', 0, 0), house('post', 6, 2)] });
    const { paths } = buildRoads(t, 7);
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(path[0]).toEqual({ gx: 3, gy: 3 });
      for (let i = 1; i < path.length; i++) expect(isNeighbour(path[i - 1], path[i])).toBe(true);
    }
  });

  it('finds the shortest way', () => {
    const t = town({ decor: [], houses: [house('townhall', 0, 0), house('cottage', 3, 0)] });
    const { paths, roads } = buildRoads(t, 7);
    expect(paths[0]).toHaveLength(4);
    expect(roads).toEqual(new Set(['1,0', '2,0']));
  });

  it('never puts a road on a house or a decoration', () => {
    const t = town({
      houses: [house('townhall', 0, 0), house('cottage', 4, 0)],
      decor: [{ id: 'd', kind: 'tree', x: 2, y: 0 }],
    });
    const { roads } = buildRoads(t, 7);
    expect(roads.has('2,0')).toBe(false);
    expect(roads.has('0,0')).toBe(false);
    expect(roads.has('4,0')).toBe(false);
  });

  it('skips houses that are walled in', () => {
    const t = town({
      houses: [house('townhall', 0, 0), house('cottage', 6, 6)],
      decor: [
        { id: 'a', kind: 'tree', x: 5, y: 6 },
        { id: 'b', kind: 'tree', x: 6, y: 5 },
      ],
    });
    expect(buildRoads(t, 7).paths).toHaveLength(0);
  });

  it('stays inside the land', () => {
    const t = town({ decor: [], houses: [house('townhall', 0, 0), house('cottage', 2, 2)] });
    for (const key of buildRoads(t, 3).roads) {
      const [x, y] = key.split(',').map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(3);
    }
  });

  it('handles a town without a Town Hall', () => {
    expect(buildRoads(town({ houses: [] }), 7)).toEqual({ roads: new Set(), paths: [] });
  });
});

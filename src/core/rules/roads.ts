import type { Town } from '../types';

export interface Tile {
  gx: number;
  gy: number;
}

export interface RoadNetwork {
  /** "x,y" keys of every road tile. */
  roads: Set<string>;
  /** One walking path per reachable building, from the Town Hall to it. */
  paths: Tile[][];
}

const key = (x: number, y: number) => `${x},${y}`;
const NEIGHBOURS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;

/**
 * Shortest roads from the Town Hall to every building (breadth-first search).
 * Buildings and decorations block the way; a building can only be a destination.
 */
export function buildRoads(town: Town, size: number): RoadNetwork {
  const hall = town.houses.find((h) => h.kind === 'townhall');
  if (!hall) return { roads: new Set(), paths: [] };

  const blocked = new Set([...town.houses, ...town.decor, ...(town.city ?? [])].map((o) => key(o.x, o.y)));
  const previous = new Map<string, Tile | null>([[key(hall.x, hall.y), null]]);
  const queue: Tile[] = [{ gx: hall.x, gy: hall.y }];

  for (let i = 0; i < queue.length; i++) {
    const { gx, gy } = queue[i];
    const isStart = i === 0;
    if (!isStart && blocked.has(key(gx, gy))) continue;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || previous.has(key(nx, ny))) continue;
      previous.set(key(nx, ny), { gx, gy });
      queue.push({ gx: nx, gy: ny });
    }
  }

  const roads = new Set<string>();
  const paths: Tile[][] = [];
  for (const building of [...town.houses, ...(town.city ?? [])]) {
    if (building === hall || !previous.has(key(building.x, building.y))) continue;
    const path: Tile[] = [];
    for (let tile: Tile | null = { gx: building.x, gy: building.y }; tile; tile = previous.get(key(tile.gx, tile.gy)) ?? null) {
      path.unshift(tile);
      if (!blocked.has(key(tile.gx, tile.gy))) roads.add(key(tile.gx, tile.gy));
    }
    paths.push(path);
  }
  return { roads, paths };
}

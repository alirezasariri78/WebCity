export const TILE_W = 96;
export const TILE_H = 48;

export interface GridPos {
  gx: number;
  gy: number;
}

/** Grid tile → world position of the tile centre (isometric projection). */
export const iso = (gx: number, gy: number) => ({ x: ((gx - gy) * TILE_W) / 2, y: ((gx + gy) * TILE_H) / 2 });

/** World position → nearest grid tile. Inverse of `iso`. */
export function toGrid(wx: number, wy: number): GridPos {
  const a = wx / (TILE_W / 2);
  const b = wy / (TILE_H / 2);
  return { gx: Math.round((a + b) / 2), gy: Math.round((b - a) / 2) };
}

/** Back-to-front drawing order for isometric tiles. */
export const depthOf = (gx: number, gy: number) => gx + gy;

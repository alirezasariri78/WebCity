import { shade } from './art';
import { TILE_H, TILE_W, iso } from './geometry';
import type { Scene } from './scene';

const CLIFF_DEPTH = 22;
const MAX_CACHE_PX = 4096;

export function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) {
  const w = (TILE_W / 2) * scale;
  const h = (TILE_H / 2) * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx - w, cy);
  ctx.closePath();
}

function grassPattern(ctx: CanvasRenderingContext2D, color: string): CanvasPattern | null {
  const tile = document.createElement('canvas');
  tile.width = 24;
  tile.height = 12;
  const g = tile.getContext('2d')!;
  g.strokeStyle = shade(color, -0.18);
  g.globalAlpha = 0.55;
  g.beginPath();
  g.moveTo(3, 9);
  g.lineTo(4.5, 5);
  g.lineTo(6, 9);
  g.moveTo(15, 4);
  g.lineTo(16.5, 1);
  g.lineTo(18, 4);
  g.stroke();
  return ctx.createPattern(tile, 'repeat');
}

function drawCliffs(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { land: n, theme } = scene;
  for (let i = 0; i < n; i++) {
    const right = iso(n - 1, i);
    ctx.fillStyle = theme.side[1];
    ctx.beginPath();
    ctx.moveTo(right.x, right.y + TILE_H / 2);
    ctx.lineTo(right.x + TILE_W / 2, right.y);
    ctx.lineTo(right.x + TILE_W / 2, right.y + CLIFF_DEPTH);
    ctx.lineTo(right.x, right.y + TILE_H / 2 + CLIFF_DEPTH);
    ctx.fill();

    const left = iso(i, n - 1);
    ctx.fillStyle = theme.side[0];
    ctx.beginPath();
    ctx.moveTo(left.x - TILE_W / 2, left.y);
    ctx.lineTo(left.x, left.y + TILE_H / 2);
    ctx.lineTo(left.x, left.y + TILE_H / 2 + CLIFF_DEPTH);
    ctx.lineTo(left.x - TILE_W / 2, left.y + CLIFF_DEPTH);
    ctx.fill();
  }
}

function drawNextLand(ctx: CanvasRenderingContext2D, scene: Scene) {
  const n = scene.land;
  if (n >= scene.maxLand) return;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  for (let x = 0; x <= n; x++) {
    for (let y = 0; y <= n; y++) {
      if (x < n && y < n) continue;
      const c = iso(x, y);
      diamond(ctx, c.x, c.y, 0.92);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
  const corner = iso(n, n);
  ctx.font = '600 13px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillText(`🔒 Lv ${scene.nextLevel}`, corner.x, corner.y + 5);
}

function drawTiles(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { theme, land: n, roads } = scene;
  const grass = grassPattern(ctx, theme.ground[0]);
  const grassEdge = shade(theme.ground[0], -0.08);
  const roadEdge = shade(theme.road, -0.12);
  const pebble = shade(theme.road, -0.15);
  ctx.lineWidth = 1;

  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      const c = iso(x, y);
      const isRoad = roads.has(`${x},${y}`);
      diamond(ctx, c.x, c.y);
      ctx.fillStyle = isRoad ? theme.road : theme.ground[(x + y) % 2];
      ctx.fill();
      ctx.strokeStyle = isRoad ? roadEdge : grassEdge;
      ctx.stroke();
      if (isRoad) {
        ctx.fillStyle = pebble;
        ctx.beginPath();
        ctx.arc(c.x - 10, c.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(c.x + 12, c.y + 4, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (grass) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.fillStyle = grass;
        diamond(ctx, 0, 0);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

export function drawGround(ctx: CanvasRenderingContext2D, scene: Scene) {
  drawCliffs(ctx, scene);
  drawNextLand(ctx, scene);
  drawTiles(ctx, scene);
}

function bounds(land: number) {
  const m = land + 1;
  return { x0: -m * (TILE_W / 2) - 4, y0: -TILE_H / 2 - 4, x1: m * (TILE_W / 2) + 4, y1: m * TILE_H + CLIFF_DEPTH + 30 };
}

/**
 * Keeps the ground as one cached bitmap and only repaints it when the land, roads,
 * theme or zoom bucket change. Panning just moves the bitmap.
 */
export class GroundCache {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  rebuilds = 0;

  draw(ctx: CanvasRenderingContext2D, scene: Scene, pixelsPerUnit: number) {
    const b = bounds(scene.land);
    const width = b.x1 - b.x0;
    const height = b.y1 - b.y0;
    const bucket = 2 ** (Math.ceil(Math.log2(pixelsPerUnit) * 3) / 3);

    if (width * bucket > MAX_CACHE_PX || height * bucket > MAX_CACHE_PX) {
      drawGround(ctx, scene);
      return;
    }

    const key = `${scene.theme.id}|${scene.land}|${scene.roadKey}|${bucket.toFixed(3)}`;
    if (key !== this.key || !this.canvas) {
      this.key = key;
      this.canvas ??= document.createElement('canvas');
      this.canvas.width = Math.ceil(width * bucket);
      this.canvas.height = Math.ceil(height * bucket);
      const g = this.canvas.getContext('2d')!;
      g.setTransform(bucket, 0, 0, bucket, -b.x0 * bucket, -b.y0 * bucket);
      g.clearRect(b.x0, b.y0, width, height);
      drawGround(g, scene);
      this.rebuilds++;
    }
    ctx.drawImage(this.canvas, b.x0, b.y0, width, height);
  }
}

import { explored, hash, inWorld, isOwned, resourceAt, resourceDef, terrainAt, tileIndex } from '../core/rules';
import type { Terrain, World } from '../core/types';
import { shade } from './art';
import { TILE_H, TILE_W, iso } from './geometry';
import type { Scene } from './scene';

const CHUNK = 8;
const MARGIN = 26;
const MAX_BUCKET = 2.5;
const MAX_CHUNKS = 36;
const ASPHALT = '#6b7280';
const SAND = '#f0dca0';
const ROCK = '#a9a39a';
const FOG = '#e6edf7';
const BORDER = '#ffffff';

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

interface Palette {
  grass: [string, string];
  edge: string;
  water: [string, string];
  road: string;
  roadEdge: string;
}

function palette(scene: Scene): Palette {
  const road = scene.paved ? ASPHALT : scene.theme.road;
  return {
    grass: scene.theme.ground,
    edge: shade(scene.theme.ground[0], -0.08),
    water: scene.theme.water,
    road,
    roadEdge: shade(road, -0.12),
  };
}

function tileColor(t: Terrain, x: number, y: number, p: Palette): string {
  const alt = (x + y) % 2;
  if (t === 'water') return alt ? p.water[0] : shade(p.water[0], 0.04);
  if (t === 'sand') return alt ? SAND : shade(SAND, -0.04);
  if (t === 'mountain') return ROCK;
  if (t === 'forest') return shade(p.grass[alt], -0.1);
  if (t === 'hill') return shade(p.grass[alt], 0.05);
  return p.grass[alt];
}

function drawDetail(ctx: CanvasRenderingContext2D, t: Terrain, cx: number, cy: number, x: number, y: number, seed: number) {
  const r = hash(x, y, seed);
  if (t === 'water') {
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const ox = (r - 0.5) * 20;
    ctx.moveTo(cx - 10 + ox, cy);
    ctx.quadraticCurveTo(cx - 5 + ox, cy - 3, cx + ox, cy);
    ctx.quadraticCurveTo(cx + 5 + ox, cy + 3, cx + 10 + ox, cy);
    ctx.stroke();
  } else if (t === 'hill') {
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy + 2, 16, 7, 0, Math.PI, 0);
    ctx.ellipse(cx + 12, cy + 6, 12, 5, 0, Math.PI, 0);
    ctx.fill();
  } else if (t === 'grass' && r < 0.3) {
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 12 + r * 30, cy + 3);
    ctx.lineTo(cx - 10.5 + r * 30, cy - 1);
    ctx.lineTo(cx - 9 + r * 30, cy + 3);
    ctx.stroke();
  }
}

function drawLaneMarks(ctx: CanvasRenderingContext2D, cx: number, cy: number, roads: Set<string>, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  if (roads.has(`${x + 1},${y}`) || roads.has(`${x - 1},${y}`)) {
    ctx.moveTo(cx - TILE_W / 4, cy - TILE_H / 4);
    ctx.lineTo(cx + TILE_W / 4, cy + TILE_H / 4);
  }
  if (roads.has(`${x},${y + 1}`) || roads.has(`${x},${y - 1}`)) {
    ctx.moveTo(cx + TILE_W / 4, cy - TILE_H / 4);
    ctx.lineTo(cx - TILE_W / 4, cy + TILE_H / 4);
  }
  ctx.stroke();
  ctx.restore();
}

/** Wheat fields, fishing spots, gold… painted flat on the ground with their emoji. */
function drawResource(ctx: CanvasRenderingContext2D, world: World, x: number, y: number, cx: number, cy: number, owned: boolean) {
  const kind = resourceAt(world, x, y);
  if (!kind) return;
  if (kind === 'wheat') {
    ctx.save();
    diamond(ctx, cx, cy, 0.8);
    ctx.clip();
    ctx.strokeStyle = '#e0b84a';
    ctx.lineWidth = 3;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 9 - 20, cy - 12);
      ctx.lineTo(cx + i * 9 + 20, cy + 12);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = owned ? 1 : 0.75;
  ctx.font = '20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(resourceDef(kind).emoji, cx, cy - 2);
  ctx.globalAlpha = 1;
}

function drawFog(ctx: CanvasRenderingContext2D, cx: number, cy: number, x: number, y: number, seed: number) {
  diamond(ctx, cx, cy, 1.04);
  ctx.fillStyle = FOG;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (let i = 0; i < 3; i++) {
    const r = hash(x * 3 + i, y, seed + 17);
    ctx.beginPath();
    ctx.arc(cx + (r - 0.5) * 34, cy + (hash(x, y * 3 + i, seed) - 0.5) * 14, 9 + r * 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A bright line along the edges where owned land meets the outside. */
function drawBorder(ctx: CanvasRenderingContext2D, world: World, x: number, y: number, cx: number, cy: number) {
  const w = TILE_W / 2;
  const h = TILE_H / 2;
  const top: [number, number] = [cx, cy - h];
  const right: [number, number] = [cx + w, cy];
  const bottom: [number, number] = [cx, cy + h];
  const left: [number, number] = [cx - w, cy];
  const edges: [number, number, [number, number], [number, number]][] = [
    [1, 0, right, bottom],
    [-1, 0, left, top],
    [0, 1, bottom, left],
    [0, -1, top, right],
  ];
  for (const [dx, dy, a, b] of edges) {
    if (isOwned(world, x + dx, y + dy)) continue;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.strokeStyle = 'rgba(124,92,255,.55)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
}

function drawTile(ctx: CanvasRenderingContext2D, scene: Scene, p: Palette, seen: Set<number>, x: number, y: number) {
  const world = scene.world;
  const c = iso(x, y);
  if (!seen.has(tileIndex(world, x, y))) {
    drawFog(ctx, c.x, c.y, x, y, world.seed);
    return;
  }
  const t = terrainAt(world, x, y);
  const isRoad = scene.roads.has(`${x},${y}`);
  diamond(ctx, c.x, c.y);
  ctx.fillStyle = isRoad ? p.road : tileColor(t, x, y, p);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isRoad ? p.roadEdge : t === 'water' ? shade(p.water[0], -0.06) : p.edge;
  ctx.stroke();
  if (isRoad && scene.paved) drawLaneMarks(ctx, c.x, c.y, scene.roads, x, y);
  else if (!isRoad) drawDetail(ctx, t, c.x, c.y, x, y, world.seed);
  const owned = isOwned(world, x, y);
  drawResource(ctx, world, x, y, c.x, c.y, owned);
  if (!owned) {
    diamond(ctx, c.x, c.y, 1.01);
    ctx.fillStyle = 'rgba(20,30,70,.16)';
    ctx.fill();
  }
}

interface Chunk {
  canvas: HTMLCanvasElement;
  key: string;
  used: number;
}

function chunkBounds(cx: number, cy: number) {
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  const x1 = x0 + CHUNK - 1;
  const y1 = y0 + CHUNK - 1;
  return {
    left: iso(x0, y1).x - TILE_W / 2 - MARGIN,
    right: iso(x1, y0).x + TILE_W / 2 + MARGIN,
    top: iso(x0, y0).y - TILE_H / 2 - MARGIN,
    bottom: iso(x1, y1).y + TILE_H / 2 + MARGIN,
  };
}

/**
 * The ground is cut into chunks of 8×8 tiles. Each chunk is painted once into its own bitmap
 * and only repainted when the land, roads or zoom bucket change; only visible chunks are drawn.
 */
export class GroundCache {
  private chunks = new Map<string, Chunk>();
  rebuilds = 0;

  draw(ctx: CanvasRenderingContext2D, scene: Scene, pixelsPerUnit: number, view: { x0: number; y0: number; x1: number; y1: number }) {
    const wanted = 2 ** (Math.ceil(Math.log2(pixelsPerUnit) * 3) / 3);
    const bucket = Math.min(MAX_BUCKET, wanted);
    const count = Math.ceil(scene.world.size / CHUNK);
    const frame = performance.now();
    for (let cy = 0; cy < count; cy++) {
      for (let cx = 0; cx < count; cx++) {
        const b = chunkBounds(cx, cy);
        if (b.right < view.x0 || b.left > view.x1 || b.bottom < view.y0 || b.top > view.y1) continue;
        const id = `${cx},${cy}`;
        const key = `${scene.groundKey}|${bucket.toFixed(3)}`;
        let chunk = this.chunks.get(id);
        if (!chunk || chunk.key !== key) chunk = this.paint(id, cx, cy, key, bucket, scene);
        chunk.used = frame;
        ctx.drawImage(chunk.canvas, b.left, b.top, b.right - b.left, b.bottom - b.top);
      }
    }
  }

  private paint(id: string, cx: number, cy: number, key: string, bucket: number, scene: Scene): Chunk {
    const b = chunkBounds(cx, cy);
    const chunk = this.chunks.get(id) ?? this.newChunk(id);
    chunk.key = key;
    chunk.canvas.width = Math.ceil((b.right - b.left) * bucket);
    chunk.canvas.height = Math.ceil((b.bottom - b.top) * bucket);
    const g = chunk.canvas.getContext('2d')!;
    g.setTransform(bucket, 0, 0, bucket, -b.left * bucket, -b.top * bucket);
    const p = palette(scene);
    const seen = explored(scene.world);
    const world = scene.world;
    for (let s = 0; s < CHUNK * 2 - 1; s++) {
      for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x++) {
        const y = cy * CHUNK + s - (x - cx * CHUNK);
        if (y < cy * CHUNK || y >= (cy + 1) * CHUNK || !inWorld(world, x, y)) continue;
        drawTile(g, scene, p, seen, x, y);
      }
    }
    for (let y = cy * CHUNK; y < (cy + 1) * CHUNK; y++) {
      for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x++) {
        if (inWorld(world, x, y) && isOwned(world, x, y)) drawBorder(g, world, x, y, iso(x, y).x, iso(x, y).y);
      }
    }
    this.rebuilds++;
    return chunk;
  }

  private newChunk(id: string): Chunk {
    if (this.chunks.size >= MAX_CHUNKS) {
      const oldest = [...this.chunks.entries()].sort((a, b) => a[1].used - b[1].used)[0];
      oldest[1].canvas.width = 0;
      this.chunks.delete(oldest[0]);
    }
    const chunk = { canvas: document.createElement('canvas'), key: '', used: 0 };
    this.chunks.set(id, chunk);
    return chunk;
  }
}

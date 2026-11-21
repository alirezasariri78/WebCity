import type { Art } from './art';

/**
 * A pre-drawn picture. `image` is an ImageBitmap where supported, which the browser
 * keeps on the GPU, so drawing it each frame is a cheap texture copy.
 */
export interface Sprite {
  image: CanvasImageSource;
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** Alpha mask at 1 world unit per pixel, for pixel-accurate clicking. */
  alpha: Uint8ClampedArray | null;
}

const RESOLUTION = Math.min(4, Math.max(2, Math.ceil((globalThis.devicePixelRatio || 1) * 2)));
const HIT_ALPHA = 40;

const cache = new Map<string, Sprite | 'loading'>();
let onReady: () => void = () => {};

export const onSpriteReady = (listener: () => void) => (onReady = listener);
export const spriteCacheSize = () => cache.size;

function canvas(width: number, height: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(width));
  c.height = Math.max(1, Math.ceil(height));
  return c;
}

function alphaMask(source: HTMLCanvasElement, w: number, h: number): Uint8ClampedArray | null {
  try {
    const small = canvas(w, h);
    const ctx = small.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, small.width, small.height);
    const rgba = ctx.getImageData(0, 0, small.width, small.height).data;
    const mask = new Uint8ClampedArray(small.width * small.height);
    for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3];
    return mask;
  } catch {
    return null;
  }
}

async function toGpu(source: HTMLCanvasElement): Promise<CanvasImageSource> {
  if (typeof createImageBitmap !== 'function') return source;
  try {
    return await createImageBitmap(source);
  } catch {
    return source;
  }
}

async function rasterize(art: Art): Promise<Sprite> {
  const [x0, y0, x1, y1] = art.box;
  const w = x1 - x0;
  const h = y1 - y0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w * RESOLUTION)}" height="${Math.ceil(h * RESOLUTION)}" viewBox="${x0} ${y0} ${w} ${h}">${art.svg}</svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const full = canvas(w * RESOLUTION, h * RESOLUTION);
  full.getContext('2d')!.drawImage(img, 0, 0, full.width, full.height);
  return { image: await toGpu(full), x0, y0, w, h, alpha: alphaMask(full, w, h) };
}

/** Most sprites kept in GPU memory. Growing buildings create new sizes, so old ones are let go. */
const MAX_SPRITES = 260;

function evictOldest() {
  for (const [key, value] of cache) {
    if (cache.size <= MAX_SPRITES) return;
    if (value === 'loading') continue;
    if (typeof ImageBitmap !== 'undefined' && value.image instanceof ImageBitmap) value.image.close();
    cache.delete(key);
  }
}

/** Returns the cached sprite, or null while it is still being drawn (it is started on first request). */
export function sprite(key: string, make: () => Art): Sprite | null {
  const hit = cache.get(key);
  if (hit === 'loading') return null;
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  cache.set(key, 'loading');
  if (cache.size > MAX_SPRITES) evictOldest();
  rasterize(make())
    .then((s) => {
      cache.set(key, s);
      onReady();
    })
    .catch(() => cache.delete(key));
  return null;
}

/** Cached bitmaps drawn with the 2D canvas API (labels, bubbles, glows). */
const painted = new Map<string, Sprite>();

export function paintedSprite(
  key: string,
  w: number,
  h: number,
  ox: number,
  oy: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): Sprite {
  let s = painted.get(key);
  if (!s) {
    const c = canvas(w * RESOLUTION, h * RESOLUTION);
    const ctx = c.getContext('2d')!;
    ctx.scale(RESOLUTION, RESOLUTION);
    ctx.translate(ox, oy);
    paint(ctx);
    s = { image: c, x0: -ox, y0: -oy, w, h, alpha: null };
    painted.set(key, s);
  }
  return s;
}

/** Is a local point (relative to the sprite anchor) on a visible pixel? */
export function spriteHit(s: Sprite, lx: number, ly: number): boolean {
  const x = Math.floor(lx - s.x0);
  const y = Math.floor(ly - s.y0);
  const width = Math.ceil(s.w);
  if (x < 0 || y < 0 || x >= width || y >= Math.ceil(s.h)) return false;
  return !s.alpha || s.alpha[y * width + x] > HIT_ALPHA;
}

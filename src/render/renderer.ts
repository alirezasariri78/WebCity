import { bobOffset, drawEffect, swayAngle } from './effects';
import { TILE_H, iso } from './geometry';
import { GroundCache, diamond } from './ground';
import type { Camera, Scene, SceneObject, Villager } from './scene';
import { nextSpriteFrame, paintedSprite, sprite, spriteHit, type Sprite } from './sprites';

const MAX_PIXEL_RATIO = 2;
const POP_MS = 600;
const POKE_MS = 350;
const FLOAT_MS = 1800;
const BUBBLE_RADIUS = 15;
const BUBBLE_LIFT = 18;

const elastic = (k: number) => 1 - 2 ** (-9 * k) * Math.cos(k * 11);

export type Pick = { type: 'bubble' | 'object'; id: string };

/**
 * Draws the town on a 2D canvas. Everything static is pre-rendered into GPU bitmaps
 * (sprites, the ground, labels), so a frame is mostly cheap `drawImage` calls.
 */
export class TownRenderer {
  readonly camera: Camera = { x: 0, y: 0, scale: 1 };
  private readonly ctx: CanvasRenderingContext2D;
  private readonly ground = new GroundCache();
  private readonly villagerBuffer: Villager[] = [];
  private pixelRatio = 1;
  private width = 0;
  private height = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    // Not `desynchronized`: that low-latency mode skips the compositor and makes the map
    // flicker on many Windows graphics cards, under the quest card and buttons above it.
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.resize();
  }

  get groundRebuilds() {
    return this.ground.rebuilds;
  }

  /** Some ground is still being repainted after a zoom, so another frame is needed. */
  get groundBusy() {
    return this.ground.busy;
  }

  get size() {
    return { width: this.width, height: this.height };
  }

  resize() {
    this.pixelRatio = Math.min(MAX_PIXEL_RATIO, globalThis.devicePixelRatio || 1);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.round(this.width * this.pixelRatio));
    this.canvas.height = Math.max(1, Math.round(this.height * this.pixelRatio));
  }

  toWorld(sx: number, sy: number) {
    const { x, y, scale } = this.camera;
    return { x: (sx - x) / scale, y: (sy - y) / scale };
  }

  draw(scene: Scene, time: number) {
    nextSpriteFrame();
    const { ctx, camera, pixelRatio } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(pixelRatio * camera.scale, 0, 0, pixelRatio * camera.scale, pixelRatio * camera.x, pixelRatio * camera.y);

    this.ground.draw(ctx, scene, camera.scale * pixelRatio, this.visibleBounds());
    this.drawHoverTile(scene);
    this.drawObjectsAndVillagers(scene, time);
    this.drawGhost(scene, time);
    this.drawLabels(scene);
    this.drawBubbles(scene, time);
    this.drawPuffs(scene, time);
    this.drawFloats(scene, time);
  }

  /** What is under a screen point: bubbles first, then objects from front to back. */
  pick(scene: Scene, sx: number, sy: number): Pick | null {
    const w = this.toWorld(sx, sy);
    for (const b of scene.bubbles) {
      const c = iso(b.gx, b.gy);
      if (Math.hypot(w.x - c.x, w.y - (c.y - b.top - BUBBLE_LIFT)) < BUBBLE_RADIUS + 5) return { type: 'bubble', id: b.id };
    }
    for (let i = scene.objects.length - 1; i >= 0; i--) {
      const o = scene.objects[i];
      if (o.inert) continue;
      const s = sprite(o.key, o.make);
      if (!s) continue;
      const c = iso(o.gx, o.gy);
      if (spriteHit(s, (w.x - c.x) / o.scale, (w.y - c.y) / o.scale)) return { type: 'object', id: o.id };
    }
    return null;
  }

  private visibleBounds() {
    const { x, y, scale } = this.camera;
    return { x0: -x / scale - 80, y0: -y / scale - 40, x1: (this.width - x) / scale + 80, y1: (this.height - y) / scale + 160 };
  }

  private drawHoverTile(scene: Scene) {
    if (!scene.hover) return;
    const c = iso(scene.hover.gx, scene.hover.gy);
    diamond(this.ctx, c.x, c.y);
    this.ctx.fillStyle = scene.hover.ok ? 'rgba(47,191,113,.35)' : 'rgba(255,90,90,.35)';
    this.ctx.fill();
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = scene.hover.ok ? '#2fbf71' : '#ff5a5a';
    this.ctx.stroke();
  }

  private drawObjectsAndVillagers(scene: Scene, time: number) {
    const view = this.visibleBounds();
    const villagers = this.villagerBuffer;
    villagers.length = 0;
    for (const v of scene.villagers) if (v.alpha > 0) villagers.push(v);
    villagers.sort((a, b) => a.gx + a.gy - (b.gx + b.gy));

    let next = 0;
    const night = !!scene.theme.night;
    for (const o of scene.objects) {
      const depth = o.gx + o.gy;
      while (next < villagers.length && villagers[next].gx + villagers[next].gy + 0.5 < depth) this.drawVillager(villagers[next++], time);
      const c = iso(o.gx, o.gy);
      if (c.x < view.x0 || c.x > view.x1 || c.y < view.y0 || c.y > view.y1) continue;
      this.drawObject(scene, o, c.x, c.y, time, night);
    }
    while (next < villagers.length) this.drawVillager(villagers[next++], time);
  }

  private stamp(s: Sprite, x = 0, y = 0, scale = 1) {
    this.ctx.drawImage(s.image, x + s.x0 * scale, y + s.y0 * scale, s.w * scale, s.h * scale);
  }

  private drawVillager(v: Villager, time: number) {
    const s = sprite(v.key, v.make);
    if (!s) return;
    const c = iso(v.gx, v.gy);
    const y = c.y + 6 - (v.moving && v.bob ? Math.abs(Math.sin(time / 110 + v.seed)) * 1.6 : 0);
    const { ctx } = this;
    ctx.globalAlpha = v.alpha;
    if (v.flip) {
      ctx.save();
      ctx.translate(c.x, y);
      ctx.scale(-1, 1);
      this.stamp(s);
      ctx.restore();
    } else {
      this.stamp(s, c.x, y);
    }
    ctx.globalAlpha = 1;
  }

  private drawObject(scene: Scene, o: SceneObject, x: number, y: number, time: number, night: boolean) {
    const s = sprite(o.key, o.make);
    if (!s) return;
    const born = scene.bornAt.get(o.id);
    const poked = scene.pokedAt.get(o.id);
    const isSelected = scene.selected === o.id;
    const isHovered = scene.hovered === o.id && !isSelected;

    if (!o.anims.length && born === undefined && poked === undefined && !isSelected && !isHovered) {
      this.stamp(s, x, y, o.scale);
      return;
    }

    let sx = o.scale;
    let sy = o.scale;
    let offsetY = 0;
    let angle = 0;

    if (born !== undefined) {
      const k = (time - born) / POP_MS;
      if (k >= 1) scene.bornAt.delete(o.id);
      else {
        const e = elastic(Math.max(0, k));
        sx *= e;
        sy *= e;
        offsetY = -(1 - Math.min(1, k * 2)) * 30;
      }
    }
    if (poked !== undefined) {
      const k = (time - poked) / POKE_MS;
      if (k >= 1) scene.pokedAt.delete(o.id);
      else {
        const squash = Math.sin(k * Math.PI * 2) * (1 - k) * 0.1;
        sx *= 1 + squash;
        sy *= 1 - squash;
      }
    }
    for (const a of o.anims) {
      if (a.kind === 'sway') angle = swayAngle(time, o.seed);
      if (a.kind === 'bob') offsetY += bobOffset(time, o.seed);
    }

    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y + offsetY);
    if (angle) ctx.rotate(angle);
    ctx.scale(sx, sy);
    if (isSelected) {
      ctx.shadowColor = '#7c5cff';
      ctx.shadowBlur = 16;
      this.stamp(s);
      ctx.shadowColor = 'transparent';
    }
    this.stamp(s);
    if (isHovered) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.14;
      this.stamp(s);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    for (const a of o.anims) drawEffect(ctx, a, time, o.seed, night);
    ctx.restore();
  }

  private drawGhost(scene: Scene, time: number) {
    const ghost = scene.hover?.ghost;
    if (!scene.hover || !ghost) return;
    const s = sprite(ghost.key, ghost.make);
    if (!s) return;
    const c = iso(scene.hover.gx, scene.hover.gy);
    this.ctx.globalAlpha = scene.hover.ok ? 0.7 : 0.35;
    this.stamp(s, c.x, c.y - 4 + Math.sin(time / 200) * 2, ghost.scale);
    this.ctx.globalAlpha = 1;
  }

  private labelSprite(text: string, night: boolean): Sprite {
    const font = '600 11px Fredoka, sans-serif';
    const width = Math.ceil(measureText(text, font)) + 18;
    return paintedSprite(`label:${night ? 'n' : 'd'}:${text}`, width, 18, width / 2, 9, (g) => {
      g.fillStyle = night ? 'rgba(20,24,50,.85)' : 'rgba(255,255,255,.92)';
      g.beginPath();
      g.roundRect(-width / 2, -9, width, 18, 9);
      g.fill();
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = night ? '#fff' : '#23264a';
      g.fillText(text, 0, 1);
    });
  }

  private drawLabels(scene: Scene) {
    const view = this.visibleBounds();
    const night = !!scene.theme.night;
    for (const o of scene.objects) {
      if (!o.label) continue;
      const c = iso(o.gx, o.gy);
      if (c.x < view.x0 || c.x > view.x1 || c.y < view.y0 || c.y > view.y1) continue;
      const text = o.stars && o.stars > 1 ? `${o.label} ${'★'.repeat(o.stars)}` : o.label;
      this.stamp(this.labelSprite(text, night), c.x, c.y + TILE_H / 2 + 4);
    }
  }

  private bubbleSprite(emoji: string): Sprite {
    const size = 48;
    return paintedSprite(`bubble:${emoji}`, size, size, size / 2, size / 2 - 4, (g) => {
      g.shadowColor = 'rgba(0,0,0,.25)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(0, 0, BUBBLE_RADIUS, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.beginPath();
      g.moveTo(-5, 12);
      g.lineTo(0, 20);
      g.lineTo(5, 12);
      g.fill();
      g.strokeStyle = '#ffb800';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(0, 0, BUBBLE_RADIUS, 0, Math.PI * 2);
      g.stroke();
      g.font = '16px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(emoji, 0, 1);
    });
  }

  private drawBubbles(scene: Scene, time: number) {
    for (const b of scene.bubbles) {
      const c = iso(b.gx, b.gy);
      const pop = elastic(Math.min(1, ((time - b.born) / 1000) * 3));
      this.stamp(this.bubbleSprite(b.emoji), c.x, c.y - b.top - BUBBLE_LIFT + Math.sin(time / 300 + b.seed) * 4, pop);
    }
  }

  private drawPuffs(scene: Scene, time: number) {
    const { ctx } = this;
    for (let i = scene.puffs.length - 1; i >= 0; i--) {
      const p = scene.puffs[i];
      const k = (time - p.born) / p.life;
      if (k >= 1) {
        scene.puffs.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x + p.vx * k * 40, p.y + p.vy * k * 40, p.r * (0.6 + k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloats(scene: Scene, time: number) {
    if (!scene.floats.length) return;
    const { ctx } = this;
    ctx.font = '700 20px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    for (let i = scene.floats.length - 1; i >= 0; i--) {
      const f = scene.floats[i];
      const k = (time - f.born) / FLOAT_MS;
      if (k >= 1) {
        scene.floats.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = 1 - k * k;
      const y = f.y - k * 50;
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;
const widths = new Map<string, number>();

function measureText(text: string, font: string): number {
  const key = `${font}|${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    measureCtx ??= document.createElement('canvas').getContext('2d')!;
    measureCtx.font = font;
    w = measureCtx.measureText(text).width;
    widths.set(key, w);
  }
  return w;
}

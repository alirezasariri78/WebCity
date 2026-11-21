import type { Tile } from '../../core/rules';
import type { Art } from '../../render/art';
import type { Villager } from '../../render/scene';

interface Walker {
  view: Villager;
  path: Tile[];
  t: number;
  speed: number;
  direction: 1 | -1;
  wait: number;
}

export interface CrowdKind {
  keyPrefix: string;
  variants: number;
  art: (variant: number) => Art;
  /** Tiles per second. */
  speed: [min: number, max: number];
  /** Seconds to rest at each end of a trip. */
  rest: [min: number, max: number];
  bob: boolean;
}

const FADE_PER_SECOND = 4;

const samePath = (a: Tile[], b: Tile[]) => a.length === b.length && a.every((p, i) => p.gx === b[i].gx && p.gy === b[i].gy);
const randomOf = <T>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)];
const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);

/** Things that travel the roads: people walking, or cars driving. */
export class Crowd {
  private walkers: Walker[] = [];
  private paths: Tile[][] = [];

  constructor(private readonly kind: CrowdKind) {}

  get views(): Villager[] {
    return this.walkers.map((w) => w.view);
  }

  update(paths: Tile[][], wanted: number) {
    this.paths = paths;
    const count = paths.length ? wanted : 0;
    this.walkers.length = Math.min(this.walkers.length, count);
    while (this.walkers.length < count) this.walkers.push(this.spawn(this.walkers.length));

    for (const w of this.walkers) {
      const same = paths.find((p) => samePath(p, w.path));
      if (same) w.path = same;
      else {
        w.path = randomOf(paths) ?? [];
        w.t = Math.random() * Math.max(0, w.path.length - 1);
      }
    }
  }

  private spawn(index: number): Walker {
    const variant = index % this.kind.variants;
    return {
      view: {
        key: `${this.kind.keyPrefix}:${variant}`,
        make: () => this.kind.art(variant),
        gx: 0,
        gy: 0,
        flip: false,
        moving: false,
        alpha: 0,
        seed: index * 1.3,
        bob: this.kind.bob,
      },
      path: [],
      t: 0,
      speed: between(this.kind.speed),
      direction: 1,
      wait: between(this.kind.rest),
    };
  }

  step(dt: number) {
    for (const w of this.walkers) this.stepOne(w, dt);
  }

  private stepOne(w: Walker, dt: number) {
    const v = w.view;
    const last = w.path.length - 1;
    if (last < 1) {
      v.alpha = 0;
      return;
    }
    if (w.wait > 0) {
      w.wait -= dt;
      v.moving = false;
      v.alpha = Math.max(0, v.alpha - dt * FADE_PER_SECOND);
      return;
    }

    w.t += w.direction * w.speed * dt;
    if (w.t >= last || w.t <= 0) {
      w.t = Math.max(0, Math.min(last, w.t));
      w.wait = between(this.kind.rest);
      if (w.t <= 0) {
        w.path = randomOf(this.paths) ?? w.path;
        w.direction = 1;
      } else {
        w.direction = -1;
      }
      return;
    }

    v.alpha = Math.min(1, v.alpha + dt * FADE_PER_SECOND);
    v.moving = true;
    const i = Math.floor(w.t);
    const k = w.t - i;
    const a = w.path[i];
    const b = w.path[Math.min(last, i + 1)];
    v.gx = a.gx + (b.gx - a.gx) * k;
    v.gy = a.gy + (b.gy - a.gy) * k;
    const screenDx = (b.gx - b.gy - (a.gx - a.gy)) * w.direction;
    if (screenDx) v.flip = screenDx < 0;
  }
}

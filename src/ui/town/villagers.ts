import type { Tile } from '../../core/rules';
import { VILLAGER_VARIANTS, villagerArt } from '../../render/art';
import type { Villager } from '../../render/scene';

interface Walker {
  view: Villager;
  path: Tile[];
  t: number;
  speed: number;
  direction: 1 | -1;
  wait: number;
}

const MAX_VILLAGERS = 18;
const FADE_PER_SECOND = 4;

const samePath = (a: Tile[], b: Tile[]) => a.length === b.length && a.every((p, i) => p.gx === b[i].gx && p.gy === b[i].gy);
const randomOf = <T>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

/** Little people walking up and down the roads between houses. */
export class VillagerCrowd {
  private walkers: Walker[] = [];
  private paths: Tile[][] = [];

  get views(): Villager[] {
    return this.walkers.map((w) => w.view);
  }

  update(paths: Tile[][], houseCount: number) {
    this.paths = paths;
    const wanted = paths.length ? Math.min(MAX_VILLAGERS, 2 + Math.round(houseCount * 1.5)) : 0;
    this.walkers.length = Math.min(this.walkers.length, wanted);
    while (this.walkers.length < wanted) this.walkers.push(this.spawn(this.walkers.length));

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
    const variant = index % VILLAGER_VARIANTS;
    return {
      view: {
        key: `villager:${variant}`,
        make: () => villagerArt(variant),
        gx: 0,
        gy: 0,
        flip: false,
        moving: false,
        alpha: 0,
        seed: index * 1.3,
      },
      path: [],
      t: 0,
      speed: 0.6 + Math.random() * 0.6,
      direction: 1,
      wait: Math.random() * 3,
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
      w.wait = 1 + Math.random() * 3;
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

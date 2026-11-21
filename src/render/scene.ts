import type { ThemeDef } from '../core/catalog';
import type { Anim, Art } from './art';

export interface SpriteRef {
  key: string;
  make: () => Art;
}

export interface SceneObject extends SpriteRef {
  id: string;
  gx: number;
  gy: number;
  scale: number;
  anims: Anim[];
  seed: number;
  label?: string;
  stars?: number;
  /** Height of the object's top above its tile, in world units. */
  top: number;
}

export interface Villager extends SpriteRef {
  gx: number;
  gy: number;
  flip: boolean;
  moving: boolean;
  alpha: number;
  seed: number;
  /** Walkers bob up and down; cars glide. */
  bob: boolean;
}

export interface Bubble {
  id: string;
  gx: number;
  gy: number;
  top: number;
  emoji: string;
  born: number;
  seed: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
}

export interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  born: number;
  life: number;
  color: string;
}

export interface Hover {
  gx: number;
  gy: number;
  ok: boolean;
  ghost: (SpriteRef & { scale: number }) | null;
}

export interface Scene {
  theme: ThemeDef;
  land: number;
  maxLand: number;
  nextLevel: number;
  roads: Set<string>;
  roadKey: string;
  /** Paved streets with lane marks once the town becomes a city. */
  paved: boolean;
  /** Sorted back-to-front. */
  objects: SceneObject[];
  villagers: Villager[];
  bubbles: Bubble[];
  floats: FloatText[];
  puffs: Puff[];
  selected: string | null;
  hovered: string | null;
  bornAt: Map<string, number>;
  pokedAt: Map<string, number>;
  hover: Hover | null;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/** Has anything short-lived (pop-ins, dust, floating numbers) still to finish? */
export const isAnimating = (scene: Scene) =>
  scene.bornAt.size > 0 || scene.pokedAt.size > 0 || scene.puffs.length > 0 || scene.floats.length > 0;

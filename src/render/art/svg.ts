export type Point = [number, number];

/** An SVG drawing and the box it covers around its anchor (the centre of its tile). */
export interface Art {
  svg: string;
  box: [x0: number, y0: number, x1: number, y1: number];
}

export type AnimKind = 'smoke' | 'flag' | 'orb' | 'sway' | 'glow' | 'spray' | 'duck' | 'blades' | 'fire' | 'bob' | 'blink';

/** A moving detail drawn live on top of a sprite, at an offset from its anchor. */
export interface Anim {
  kind: AnimKind;
  x: number;
  y: number;
}

export const formatPoints = (points: Point[]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const rgb = (channel((n >> 16) & 255) << 16) | (channel((n >> 8) & 255) << 8) | channel(n & 255);
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

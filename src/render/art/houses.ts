import { houseDef, type HouseDef } from '../../core/catalog';
import type { HouseKind } from '../../core/types';
import { formatPoints, shade, type Anim, type Art, type Point } from './svg';

const n1 = (n: number) => n.toFixed(1);
const SPIRE_HEIGHT = 58;
const ROOF_HEIGHT = 30;
const EAVES = 1.18;

interface Body {
  def: HouseDef;
  kind: HouseKind;
  /** half width / half depth of the footprint */
  hw: number;
  hh: number;
  /** wall height and roof height */
  height: number;
  roofHeight: number;
  /** a point on the left (t: corner → front) or right (t: front → corner) wall, `h` above ground */
  left: (t: number, h: number) => Point;
  right: (t: number, h: number) => Point;
}

function bodyOf(kind: HouseKind): Body {
  const def = houseDef(kind);
  const hw = kind === 'townhall' || kind === 'castle' ? 38 : 30;
  const hh = hw / 2;
  return {
    def,
    kind,
    hw,
    hh,
    height: def.height,
    roofHeight: def.roof3d === 'spire' ? SPIRE_HEIGHT : ROOF_HEIGHT,
    left: (t, h) => [-hw + t * hw, t * hh - h],
    right: (t, h) => [t * hw, hh - t * hh - h],
  };
}

const polygon = (points: Point[], fill: string, extra = '') => `<polygon points="${formatPoints(points)}" fill="${fill}"${extra}/>`;

const quad = (wall: Body['left'], t0: number, t1: number, h0: number, h1: number): Point[] => [
  wall(t0, h0),
  wall(t1, h0),
  wall(t1, h1),
  wall(t0, h1),
];

function walls(b: Body): string {
  const { hw, hh, height: H, def } = b;
  return [
    `<ellipse cx="4" cy="4" rx="${hw * 1.25}" ry="${hh * 1.25}" fill="#000" opacity=".16"/>`,
    polygon(
      [
        [-hw, 0],
        [0, hh],
        [0, hh - H],
        [-hw, -H],
      ],
      shade(def.wall, -0.12),
    ),
    polygon(
      [
        [0, hh],
        [hw, 0],
        [hw, -H],
        [0, hh - H],
      ],
      def.wall,
    ),
    polygon(quad(b.left, 0, 1, 0, 5), shade(def.wall, -0.3)),
    polygon(quad(b.right, 0, 1, 0, 5), shade(def.wall, -0.22)),
    `<line x1="0" y1="${hh}" x2="0" y2="${hh - H}" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>`,
  ].join('');
}

function windows(b: Body, night: boolean): string {
  const glass = night ? '#ffd95e' : '#bfe6ff';
  const frame = ` stroke="${night ? '#ffb300' : '#6fa9d6'}" stroke-width="1.2"${night ? ' filter="url(#glow)"' : ''}`;
  const rows = b.height > 50 ? [0.38, 0.68] : [0.45];
  return rows
    .map((row) => {
      const h0 = b.height * row;
      const h1 = h0 + 11;
      return [
        polygon(quad(b.left, 0.18, 0.4, h0, h1), glass, frame),
        polygon(quad(b.left, 0.58, 0.8, h0, h1), glass, frame),
        polygon(quad(b.right, 0.66, 0.86, h0, h1), glass, frame),
      ].join('');
    })
    .join('');
}

function door(b: Body): string {
  const [kx, ky] = b.right(0.4, 8);
  return [
    polygon(quad(b.right, 0.24, 0.46, 0, Math.min(20, b.height * 0.55)), '#7a4a2a'),
    polygon(quad(b.right, 0.27, 0.43, 2, Math.min(18, b.height * 0.5)), '#9b6239'),
    `<circle cx="${n1(kx)}" cy="${n1(ky)}" r="1.3" fill="#ffd54a"/>`,
  ].join('');
}

function roofCorners(b: Body) {
  const { hw, hh, height: H } = b;
  return {
    left: [-hw * EAVES, -H] as Point,
    front: [0, hh * EAVES - H] as Point,
    right: [hw * EAVES, -H] as Point,
    back: [0, -hh * EAVES - H] as Point,
  };
}

function pointedRoof(b: Body): string {
  const { def, height: H } = b;
  const c = roofCorners(b);
  const apex: Point = [0, -H - b.roofHeight];
  let svg = '';

  if (b.kind === 'maphouse') {
    for (const k of [0.25, 0.65]) {
      svg += polygon(quad(b.left, 0, 1, H * k, H * k + 9), shade(def.roof, -0.15));
      svg += polygon(quad(b.right, 0, 1, H * k, H * k + 9), def.roof);
    }
  }
  svg += polygon([c.left, c.front, apex], shade(def.roof, -0.12));
  svg += polygon([c.front, c.right, apex], def.roof);
  svg += `<line x1="0" y1="${n1(c.front[1])}" x2="0" y2="${n1(apex[1])}" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>`;
  svg += `<polyline points="${formatPoints([c.left, c.front, c.right])}" fill="none" stroke="${shade(def.roof, -0.35)}" stroke-width="2" stroke-linejoin="round"/>`;

  if (b.kind === 'cottage') {
    const x = b.hw * 0.42;
    const y = -H - b.roofHeight * 0.48;
    svg += polygon(
      [
        [x - 5, y],
        [x, y + 2.5],
        [x, y - 14],
        [x - 5, y - 16.5],
      ],
      '#a1553a',
    );
    svg += polygon(
      [
        [x, y + 2.5],
        [x + 5, y],
        [x + 5, y - 16.5],
        [x, y - 14],
      ],
      '#c06a48',
    );
  }
  return svg;
}

function battlements(from: Point, to: Point, count: number, fill: string): string {
  let svg = '';
  for (let i = 0; i < count; i += 2) {
    const at = (t: number): Point => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    const p0 = at(i / count);
    const p1 = at((i + 1) / count);
    svg += polygon([p0, p1, [p1[0], p1[1] - 8], [p0[0], p0[1] - 8]], fill);
  }
  return svg;
}

function flatRoof(b: Body): string {
  const { def, height: H } = b;
  const c = roofCorners(b);
  let svg = polygon([c.left, c.front, c.right, c.back], shade(def.wall, -0.05), ` stroke="${shade(def.wall, -0.3)}" stroke-width="1.5"`);

  if (def.roof3d === 'castle') {
    svg += battlements(c.left, c.front, 9, shade(def.wall, -0.18));
    svg += battlements(c.front, c.right, 9, shade(def.wall, -0.06));
    svg += `<line x1="0" y1="${-H}" x2="0" y2="${-H - 34}" stroke="#4e342e" stroke-width="2.5"/>`;
    svg += polygon(
      [b.right(0.15, H - 6), b.right(0.3, H - 6), b.right(0.3, H * 0.45), b.right(0.225, H * 0.38), b.right(0.15, H * 0.45)],
      def.roof,
    );
    return svg;
  }

  const awning = (t: number, h: number, out: number): Point => {
    const [x, y] = b.right(t, h);
    return [x + out * 0.9, y + out * 0.9];
  };
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const t0 = 0.08 + (i * 0.84) / stripes;
    const t1 = 0.08 + ((i + 1) * 0.84) / stripes;
    svg += polygon(
      [awning(t0, H * 0.82, 0), awning(t1, H * 0.82, 0), awning(t1, H * 0.6, 9), awning(t0, H * 0.6, 9)],
      i % 2 ? '#ffffff' : def.roof,
    );
  }
  svg += `<rect x="-16" y="${-H - 20}" width="32" height="14" rx="4" fill="${def.roof}" stroke="#fff" stroke-width="1.5"/>`;
  svg += `<text x="0" y="${-H - 9.5}" font-size="10" text-anchor="middle">${def.emoji}</text>`;
  if (b.kind === 'cafe' || b.kind === 'news') {
    svg += `<rect x="${-b.hw * 0.5 - 4}" y="${-H - 18}" width="8" height="14" fill="#8d6e63"/>`;
  }
  return svg;
}

function domeRoof(b: Body): string {
  const { def, height: H } = b;
  const c = roofCorners(b);
  const rx = b.hw * 0.78;
  const base = -H;
  let svg = polygon([c.left, c.front, c.right, c.back], shade(def.wall, -0.06));
  svg += `<path d="M${n1(-rx)},${n1(base)} A${n1(rx)},${n1(rx * 1.05)} 0 0 1 ${n1(rx)},${n1(base)} A${n1(rx)},${n1(rx * 0.5)} 0 0 1 ${n1(-rx)},${n1(base)}Z" fill="${def.roof}"/>`;
  svg += `<path d="M${n1(-rx * 0.55)},${n1(base - rx * 0.55)} A${n1(rx)},${n1(rx)} 0 0 1 ${n1(-rx * 0.1)},${n1(base - rx * 0.95)}" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>`;

  if (b.kind === 'townhall' || b.kind === 'bank') {
    for (const t of [0.12, 0.88]) {
      const [x, y] = b.right(t, 0);
      svg += `<rect x="${n1(x - 2.5)}" y="${n1(y - H + 4)}" width="5" height="${H - 4}" fill="#fff" opacity=".85"/>`;
    }
  }
  if (b.kind === 'townhall') {
    const top = base - rx * 1.05;
    svg += `<line x1="0" y1="${n1(top)}" x2="0" y2="${n1(top - 26)}" stroke="#555" stroke-width="2"/>`;
  }
  return svg;
}

const ROOFS: Record<HouseDef['roof3d'], (b: Body) => string> = {
  pyramid: pointedRoof,
  spire: pointedRoof,
  flat: flatRoof,
  castle: flatRoof,
  dome: domeRoof,
};

const NIGHT_GLOW =
  '<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

export function houseArt(kind: HouseKind, night = false): Art {
  const b = bodyOf(kind);
  const svg = (night ? NIGHT_GLOW : '') + walls(b) + windows(b, night) + door(b) + ROOFS[b.def.roof3d](b);
  return { svg, box: [-b.hw * 1.6, -(b.height + b.roofHeight + 46), b.hw * 1.6, b.hh * 1.6 + 8] };
}

/** Height of the roof top above the tile centre (used to place bubbles over houses). */
export const houseTop = (kind: HouseKind) => {
  const b = bodyOf(kind);
  return b.height + b.roofHeight + 6;
};

export function houseAnims(kind: HouseKind): Anim[] {
  const { def, hw, height: H, roofHeight } = bodyOf(kind);
  if (kind === 'cottage') return [{ kind: 'smoke', x: hw * 0.42 - 2.5, y: -(H + roofHeight * 0.48 + 20) }];
  if (kind === 'townhall') return [{ kind: 'flag', x: 0, y: -(H + hw * 0.78 * 1.05 + 26) }];
  if (kind === 'castle') return [{ kind: 'flag', x: 0, y: -(H + 34) }];
  if (def.roof3d === 'spire') return [{ kind: 'orb', x: 0, y: -(H + roofHeight + 4) }];
  if (kind === 'cafe' || kind === 'news') return [{ kind: 'smoke', x: -hw * 0.5, y: -(H + 22) }];
  return [];
}

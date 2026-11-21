import type { BuildingTrim } from '../../core/catalog';
import type { BuildingLook } from '../../core/types';
import { formatPoints, shade, type Anim, type Art, type Point } from './svg';

const n1 = (n: number) => n.toFixed(1);
const HALF_WIDTH = 30;
const GROUND_FLOOR = 14;

export interface TowerOptions {
  look: BuildingLook;
  floors: number;
  night?: boolean;
  trim?: BuildingTrim;
  seed?: number;
}

/** Floors above the 10th add less height, and above the 30th even less, so a skyscraper still fits on screen. */
const rise = (floors: number) => {
  const f = Math.max(1, floors);
  return Math.min(f - 1, 9) * 11 + Math.max(0, Math.min(f, 30) - 10) * 8 + Math.max(0, f - 30) * 6;
};

/** Spacing between window rows: the height above the ground floor shared evenly. */
export const floorHeight = (floors: number) => (floors <= 1 ? 11 : rise(floors) / (floors - 1));

export const towerHeight = (floors: number) => GROUND_FLOOR + rise(floors);

const roofExtra = (look: BuildingLook, floors: number) =>
  look.shape === 'pyramid' ? 28 : look.shape === 'spire' ? 26 + floors * 1.2 : look.shape === 'dome' ? 30 : floors >= 15 ? 34 : 14;

/** Height of the very top above the tile centre. */
export const towerTop = (look: BuildingLook, floors: number) => towerHeight(floors) + roofExtra(look, floors) + 6;

const polygon = (points: Point[], fill: string, extra = '') => `<polygon points="${formatPoints(points)}" fill="${fill}"${extra}/>`;

/** Cheap repeatable "random" number from a few integers. */
const hash = (a: number, b: number, c: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Frame {
  hw: number;
  hh: number;
  H: number;
  left: (t: number, h: number) => Point;
  right: (t: number, h: number) => Point;
}

const quad = (wall: Frame['left'], t0: number, t1: number, h0: number, h1: number): Point[] => [
  wall(t0, h0),
  wall(t1, h0),
  wall(t1, h1),
  wall(t0, h1),
];

function walls(f: Frame, wall: string, glass: boolean): string {
  const leftColor = glass ? shade(wall, -0.25) : shade(wall, -0.12);
  let svg = `<ellipse cx="4" cy="4" rx="${f.hw * 1.3}" ry="${f.hh * 1.3}" fill="#000" opacity=".18"/>`;
  svg += polygon(
    [
      [-f.hw, 0],
      [0, f.hh],
      [0, f.hh - f.H],
      [-f.hw, -f.H],
    ],
    leftColor,
  );
  svg += polygon(
    [
      [0, f.hh],
      [f.hw, 0],
      [f.hw, -f.H],
      [0, f.hh - f.H],
    ],
    wall,
  );
  if (glass) {
    svg += `<polygon points="${formatPoints([
      [0, f.hh - f.H],
      [f.hw, -f.H],
      [f.hw, -f.H * 0.45],
      [0, f.hh - f.H * 0.45],
    ])}" fill="#fff" opacity=".12"/>`;
  }
  svg += polygon(quad(f.left, 0, 1, 0, 4), shade(wall, -0.35));
  svg += polygon(quad(f.right, 0, 1, 0, 4), shade(wall, -0.28));
  svg += `<line x1="0" y1="${f.hh}" x2="0" y2="${n1(f.hh - f.H)}" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>`;
  return svg;
}

function windows(f: Frame, floors: number, night: boolean, glass: boolean, seed: number): string {
  const step = floorHeight(floors);
  const size = Math.min(7, step - 3);
  const dark = glass ? '#5d7fa3' : '#9fc6e8';
  let svg = '';
  for (let floor = 1; floor < floors; floor++) {
    const h0 = GROUND_FLOOR + (floor - 1) * step + (step - size) / 2;
    const h1 = h0 + size;
    for (let i = 0; i < 3; i++) {
      const t0 = 0.12 + i * 0.29;
      const t1 = t0 + 0.2;
      const litLeft = night && hash(floor, i, seed) > 0.45;
      const litRight = night && hash(floor, i + 7, seed) > 0.45;
      svg += polygon(quad(f.left, t0, t1, h0, h1), litLeft ? '#ffd95e' : night ? '#2c3a55' : shade(dark, -0.15));
      svg += polygon(quad(f.right, t0, t1, h0, h1), litRight ? '#ffe082' : night ? '#34446a' : dark);
    }
  }
  return svg;
}

function groundFloor(f: Frame, look: BuildingLook, trim: BuildingTrim): string {
  let svg = polygon(quad(f.right, 0.3, 0.52, 0, 11), '#6d4c41');
  svg += polygon(quad(f.left, 0.2, 0.42, 4, 10), '#bfe6ff');
  svg += polygon(quad(f.left, 0.58, 0.8, 4, 10), '#bfe6ff');
  if (trim === 'awning') {
    for (let i = 0; i < 6; i++) {
      const t0 = 0.06 + i * 0.15;
      const at = (t: number, h: number, out: number): Point => {
        const [x, y] = f.right(t, h);
        return [x + out, y + out];
      };
      svg += polygon([at(t0, 13, 0), at(t0 + 0.15, 13, 0), at(t0 + 0.15, 9, 7), at(t0, 9, 7)], i % 2 ? '#fff' : look.roof);
    }
  }
  if (look.emoji) {
    const [x, y] = f.right(0.75, 9);
    svg += `<rect x="${n1(x - 7)}" y="${n1(y - 7)}" width="14" height="12" rx="3" fill="#fff" stroke="${look.roof}" stroke-width="1.2"/><text x="${n1(x)}" y="${n1(y + 2.5)}" font-size="8" text-anchor="middle">${look.emoji}</text>`;
  }
  return svg;
}

function roof(f: Frame, look: BuildingLook, floors: number, trim: BuildingTrim): string {
  const eaves = 1.15;
  const L: Point = [-f.hw * eaves, -f.H];
  const B: Point = [0, f.hh * eaves - f.H];
  const R: Point = [f.hw * eaves, -f.H];
  const T: Point = [0, -f.hh * eaves - f.H];
  const top = (fill: string) => polygon([L, B, R, T], fill, ` stroke="${shade(fill, -0.25)}" stroke-width="1.2"`);
  let svg = '';

  if (look.shape === 'pyramid') {
    const apex: Point = [0, -f.H - 28];
    svg += polygon([L, B, apex], shade(look.roof, -0.12)) + polygon([B, R, apex], look.roof);
    svg += `<polyline points="${formatPoints([L, B, R])}" fill="none" stroke="${shade(look.roof, -0.35)}" stroke-width="2"/>`;
  } else if (look.shape === 'dome') {
    const rx = f.hw * 0.78;
    svg += top(shade(look.wall, -0.06));
    svg += `<path d="M${n1(-rx)},${n1(-f.H)} A${n1(rx)},${n1(rx * 1.05)} 0 0 1 ${n1(rx)},${n1(-f.H)} A${n1(rx)},${n1(rx * 0.5)} 0 0 1 ${n1(-rx)},${n1(-f.H)}Z" fill="${look.roof}"/>`;
  } else {
    svg += top(look.shape === 'castle' ? shade(look.wall, -0.08) : look.roof);
    svg += polygon([L, B, [B[0], B[1] - 4], [L[0], L[1] - 4]], shade(look.wall, -0.2));
    svg += polygon([B, R, [R[0], R[1] - 4], [B[0], B[1] - 4]], shade(look.wall, -0.1));
    if (floors >= 8 && look.shape === 'flat') {
      svg += `<rect x="-12" y="${n1(-f.H - 12)}" width="10" height="8" fill="#b0bec5"/><rect x="4" y="${n1(-f.H - 9)}" width="8" height="6" fill="#90a4ae"/>`;
    }
    if (floors >= 15 || look.shape === 'spire') {
      const tip = look.shape === 'spire' ? 26 + floors * 1.2 : 34;
      svg += polygon(
        [
          [-4, -f.H],
          [4, -f.H],
          [0, -f.H - tip],
        ],
        shade(look.roof, -0.2),
      );
      svg += `<line x1="0" y1="${n1(-f.H - tip)}" x2="0" y2="${n1(-f.H - tip - 6)}" stroke="#555" stroke-width="1.5"/>`;
    }
  }

  if (trim === 'cross') {
    const [x, y] = f.right(0.5, f.H - 8);
    svg += `<rect x="${n1(x - 6)}" y="${n1(y - 6)}" width="12" height="12" rx="2" fill="#fff"/><rect x="${n1(x - 1.6)}" y="${n1(y - 4.5)}" width="3.2" height="9" fill="#e53935"/><rect x="${n1(x - 4.5)}" y="${n1(y - 1.6)}" width="9" height="3.2" fill="#e53935"/>`;
  }
  if (trim === 'chimney') {
    svg += `<rect x="-${n1(f.hw * 0.6)}" y="${n1(-f.H - 22)}" width="8" height="22" fill="#8d6e63"/><rect x="-${n1(f.hw * 0.6 + 1)}" y="${n1(-f.H - 24)}" width="10" height="4" fill="#6d4c41"/>`;
  }
  if (trim === 'flag') {
    svg += `<line x1="0" y1="${n1(-f.H)}" x2="0" y2="${n1(-f.H - 26)}" stroke="#555" stroke-width="1.6"/>`;
  }
  return svg;
}

function stadium(night: boolean): string {
  return `<ellipse cx="3" cy="5" rx="46" ry="24" fill="#000" opacity=".18"/>
    <ellipse cx="0" cy="0" rx="44" ry="22" fill="#cfd8dc"/><ellipse cx="0" cy="-10" rx="44" ry="22" fill="#eceff1"/>
    <path d="M-44,0 L-44,-10 A44,22 0 0 0 44,-10 L44,0 A44,22 0 0 1 -44,0Z" fill="#b0bec5"/>
    <ellipse cx="0" cy="-10" rx="34" ry="16" fill="#90a4ae"/><ellipse cx="0" cy="-8" rx="28" ry="12" fill="#4caf50"/>
    <ellipse cx="0" cy="-8" rx="10" ry="4.5" fill="none" stroke="#fff" stroke-width="1.2"/><line x1="0" y1="-20" x2="0" y2="4" stroke="#fff" stroke-width="1"/>
    ${[-36, 36].map((x) => `<line x1="${x}" y1="-10" x2="${x}" y2="-34" stroke="#607d8b" stroke-width="2"/><rect x="${x - 5}" y="-40" width="10" height="6" rx="1" fill="${night ? '#fff59d' : '#eceff1'}"/>`).join('')}`;
}

export function towerArt({ look, floors, night = false, trim = 'none', seed = 0 }: TowerOptions): Art {
  if (trim === 'stadium') return { svg: stadium(night), box: [-52, -50, 52, 32] };
  const glass = trim === 'glass';
  const wall = glass ? (night ? '#3d5a80' : look.wall) : look.wall;
  const f: Frame = {
    hw: HALF_WIDTH,
    hh: HALF_WIDTH / 2,
    H: towerHeight(floors),
    left: (t, h) => [-HALF_WIDTH + t * HALF_WIDTH, (t * HALF_WIDTH) / 2 - h],
    right: (t, h) => [t * HALF_WIDTH, HALF_WIDTH / 2 - (t * HALF_WIDTH) / 2 - h],
  };
  const svg = walls(f, wall, glass) + windows(f, floors, night, glass, seed) + groundFloor(f, look, trim) + roof(f, look, floors, trim);
  const top = towerTop(look, floors) + 12;
  return { svg, box: [-HALF_WIDTH * 1.5, -top, HALF_WIDTH * 1.5, HALF_WIDTH * 0.8 + 6] };
}

export function towerAnims(look: BuildingLook, floors: number, trim: BuildingTrim): Anim[] {
  const H = towerHeight(floors);
  const anims: Anim[] = [];
  if (trim === 'chimney') anims.push({ kind: 'smoke', x: -HALF_WIDTH * 0.6 + 4, y: -H - 30 });
  if (trim === 'flag') anims.push({ kind: 'flag', x: 0, y: -H - 26 });
  if (look.shape !== 'pyramid' && look.shape !== 'dome' && (floors >= 15 || look.shape === 'spire')) {
    const tip = look.shape === 'spire' ? 26 + floors * 1.2 : 34;
    anims.push({ kind: 'blink', x: 0, y: -H - tip - 6 });
  }
  return anims;
}

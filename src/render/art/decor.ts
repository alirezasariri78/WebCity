import type { DecorKind } from '../../core/types';
import { formatPoints, type Anim, type Art, type Point } from './svg';

const n1 = (n: number) => n.toFixed(1);
const shadow = (rx: number) => `<ellipse cx="2" cy="2" rx="${rx}" ry="${rx / 2}" fill="#000" opacity=".15"/>`;
const polygon = (points: Point[], fill: string) => `<polygon points="${formatPoints(points)}" fill="${fill}"/>`;

export const DECOR_VARIANTS = 3;
const VARIANT_SEEDS = [0.15, 0.5, 0.85];

function leafyTree(colors: string[], trunk: string, seed: number, blossoms: boolean): string {
  const k = 0.85 + seed * 0.3;
  let svg = `${shadow(16)}<rect x="-3" y="-22" width="6" height="22" rx="2" fill="${trunk}"/>
    <circle cx="0" cy="${-34 * k}" r="${17 * k}" fill="${colors[1]}"/><circle cx="${-9 * k}" cy="${-28 * k}" r="${11 * k}" fill="${colors[0]}"/>
    <circle cx="${9 * k}" cy="${-30 * k}" r="${12 * k}" fill="${colors[2]}"/><circle cx="${-4 * k}" cy="${-44 * k}" r="${7 * k}" fill="${colors[3]}"/>`;
  if (blossoms) {
    for (let i = 0; i < 6; i++) svg += `<circle cx="${n1(-14 + i * 6)}" cy="${n1(-28 - ((i * 7) % 20))}" r="1.6" fill="#fff"/>`;
  }
  return svg;
}

function flowers(seed: number): string {
  const colors = ['#ff6b8b', '#ffd54a', '#b388ff', '#ff8a65', '#4fc3f7'];
  let svg = '';
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4 + seed * 6;
    const r = 4 + (i % 3) * 6;
    const x = Math.cos(angle) * r * 1.4;
    const y = Math.sin(angle) * r * 0.6;
    const color = colors[(i + Math.floor(seed * 5)) % colors.length];
    svg += `<line x1="${n1(x)}" y1="${n1(y)}" x2="${n1(x)}" y2="${n1(y - 7)}" stroke="#3d8b37" stroke-width="1.5"/><circle cx="${n1(x)}" cy="${n1(y - 8)}" r="3.4" fill="${color}"/><circle cx="${n1(x)}" cy="${n1(y - 8)}" r="1.2" fill="#fff8"/>`;
  }
  return svg;
}

const DRAWINGS: Record<DecorKind, (seed: number) => string> = {
  tree: (seed) => leafyTree(['#4caf50', '#43a047', '#66bb6a', '#81c784'], '#8d5a3b', seed, false),
  sakura: (seed) => leafyTree(['#f48fb1', '#f06292', '#f8bbd0', '#fce4ec'], '#6d4c41', seed, true),
  pine: () =>
    `${shadow(13)}<rect x="-2.5" y="-12" width="5" height="12" fill="#6d4430"/>` +
    polygon(
      [
        [-16, -10],
        [16, -10],
        [0, -34],
      ],
      '#2e7d32',
    ) +
    polygon(
      [
        [-13, -24],
        [13, -24],
        [0, -46],
      ],
      '#388e3c',
    ) +
    polygon(
      [
        [-9, -37],
        [9, -37],
        [0, -56],
      ],
      '#43a047',
    ),
  bush: () =>
    `${shadow(14)}<circle cx="-6" cy="-7" r="9" fill="#5cae4f"/><circle cx="6" cy="-8" r="10" fill="#6cc05c"/><circle cx="0" cy="-14" r="8" fill="#7ccf6a"/><circle cx="3" cy="-9" r="2" fill="#ff5a7a"/>`,
  hedge: () =>
    shadow(22) +
    polygon(
      [
        [-26, -4],
        [0, 9],
        [0, -9],
        [-26, -22],
      ],
      '#3f8f3a',
    ) +
    polygon(
      [
        [0, 9],
        [26, -4],
        [26, -22],
        [0, -9],
      ],
      '#4caf50',
    ) +
    polygon(
      [
        [-26, -22],
        [0, -9],
        [26, -22],
        [0, -35],
      ],
      '#66bb6a',
    ),
  flowers,
  rock: () =>
    shadow(12) +
    polygon(
      [
        [-12, 0],
        [-9, -10],
        [1, -14],
        [11, -7],
        [12, 0],
      ],
      '#9e9e9e',
    ) +
    polygon(
      [
        [-9, -10],
        [1, -14],
        [2, -5],
        [-6, -3],
      ],
      '#bdbdbd',
    ),
  mushroom: () =>
    `${shadow(9)}<rect x="-3" y="-12" width="6" height="12" rx="2" fill="#fff3e0"/><path d="M-12,-11 A12,10 0 0 1 12,-11 Z" fill="#e53935"/><circle cx="-5" cy="-15" r="2" fill="#fff"/><circle cx="4" cy="-17" r="1.6" fill="#fff"/><circle cx="7" cy="-13" r="1.3" fill="#fff"/>`,
  lamp: () =>
    `${shadow(6)}<rect x="-1.5" y="-34" width="3" height="34" fill="#37474f"/><rect x="-6" y="-44" width="12" height="11" rx="2" fill="#fff8e1" stroke="#37474f" stroke-width="2"/>`,
  bench: () =>
    shadow(14) +
    polygon(
      [
        [-14, -8],
        [6, 2],
        [14, -2],
        [-6, -12],
      ],
      '#a1683f',
    ) +
    polygon(
      [
        [-14, -8],
        [-6, -12],
        [-6, -22],
        [-14, -18],
      ],
      '#8d5a35',
    ) +
    '<line x1="-12" y1="-7" x2="-12" y2="0" stroke="#5d3b22" stroke-width="2"/><line x1="12" y1="-2" x2="12" y2="4" stroke="#5d3b22" stroke-width="2"/>',
  fountain: () =>
    `${shadow(24)}<ellipse cx="0" cy="0" rx="26" ry="13" fill="#b0bec5"/><ellipse cx="0" cy="-3" rx="22" ry="10" fill="#4fc3f7"/><ellipse cx="-6" cy="-5" rx="9" ry="3" fill="#fff" opacity=".35"/><rect x="-3" y="-26" width="6" height="24" fill="#cfd8dc"/><ellipse cx="0" cy="-26" rx="10" ry="4" fill="#cfd8dc"/>`,
  pond: () =>
    '<ellipse cx="0" cy="0" rx="34" ry="16" fill="#3d9bd6"/><ellipse cx="-8" cy="-3" rx="14" ry="4" fill="#fff" opacity=".25"/><ellipse cx="-12" cy="4" rx="6" ry="3" fill="#66bb6a"/><ellipse cx="16" cy="6" rx="4" ry="2" fill="#66bb6a"/>',
  windmill: () =>
    shadow(18) +
    polygon(
      [
        [-16, 0],
        [0, 7],
        [0, -50],
        [-10, -55],
      ],
      '#d7ccc8',
    ) +
    polygon(
      [
        [0, 7],
        [16, 0],
        [10, -55],
        [0, -50],
      ],
      '#efebe9',
    ) +
    polygon(
      [
        [-12, -52],
        [0, -47],
        [12, -52],
        [0, -70],
      ],
      '#8d6e63',
    ) +
    polygon(
      [
        [2, -8],
        [9, -11],
        [9, -24],
        [2, -21],
      ],
      '#6d4c41',
    ),
  statue: () =>
    shadow(16) +
    polygon(
      [
        [-16, -4],
        [0, 4],
        [0, -10],
        [-16, -18],
      ],
      '#90a4ae',
    ) +
    polygon(
      [
        [0, 4],
        [16, -4],
        [16, -18],
        [0, -10],
      ],
      '#b0bec5',
    ) +
    polygon(
      [
        [-16, -18],
        [0, -10],
        [16, -18],
        [0, -26],
      ],
      '#cfd8dc',
    ) +
    '<rect x="-5" y="-50" width="10" height="28" rx="4" fill="#b0bec5"/><circle cx="0" cy="-56" r="7" fill="#cfd8dc"/><path d="M5,-46 L16,-62" stroke="#b0bec5" stroke-width="4" stroke-linecap="round"/><circle cx="17" cy="-65" r="4" fill="#ffd54a"/>',
  campfire: () => {
    const stones = [0, 1, 2, 3, 4, 5]
      .map((i) => `<circle cx="${n1(Math.cos(i) * 12)}" cy="${n1(Math.sin(i) * 5)}" r="3.5" fill="#9e9e9e"/>`)
      .join('');
    return `${shadow(14)}${stones}<rect x="-11" y="-5" width="22" height="5" rx="2" fill="#6d4c41" transform="rotate(18)"/><rect x="-11" y="-5" width="22" height="5" rx="2" fill="#795548" transform="rotate(-18)"/>`;
  },
  balloon: () =>
    `<ellipse cx="2" cy="2" rx="10" ry="5" fill="#000" opacity=".12"/><g transform="translate(0,-52)"><path d="M-22,-40 A22,24 0 1 1 22,-40 C22,-22 8,-12 6,0 L-6,0 C-8,-12 -22,-22 -22,-40Z" fill="#ff7043"/><path d="M-8,-62 C-14,-46 -10,-20 -6,0 L6,0 C10,-20 14,-46 8,-62Z" fill="#ffca28"/><path d="M-22,-42 L22,-42" stroke="#fff" stroke-opacity=".4" stroke-width="3"/><line x1="-6" y1="0" x2="-5" y2="10" stroke="#5d4037"/><line x1="6" y1="0" x2="5" y2="10" stroke="#5d4037"/><rect x="-7" y="10" width="14" height="10" rx="2" fill="#8d6e63"/></g>`,
};

const TALL: Partial<Record<DecorKind, number>> = { windmill: -110, statue: -90, balloon: -140 };

export function decorArt(kind: DecorKind, variant = 0): Art {
  return {
    svg: DRAWINGS[kind](VARIANT_SEEDS[variant % DECOR_VARIANTS]),
    box: [-44, TALL[kind] ?? -72, 44, 24],
  };
}

const ANIMS: Partial<Record<DecorKind, Anim[]>> = {
  tree: [{ kind: 'sway', x: 0, y: 0 }],
  pine: [{ kind: 'sway', x: 0, y: 0 }],
  sakura: [{ kind: 'sway', x: 0, y: 0 }],
  lamp: [{ kind: 'glow', x: 0, y: -38 }],
  fountain: [{ kind: 'spray', x: 0, y: -28 }],
  pond: [{ kind: 'duck', x: 6, y: -2 }],
  windmill: [{ kind: 'blades', x: 0, y: -50 }],
  campfire: [{ kind: 'fire', x: 0, y: -5 }],
  balloon: [{ kind: 'bob', x: 0, y: 0 }],
};

export const decorAnims = (kind: DecorKind): Anim[] => ANIMS[kind] ?? [];

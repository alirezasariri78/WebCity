import { formatPoints, shade, type Art, type Point } from './svg';

const n1 = (n: number) => n.toFixed(1);
const polygon = (points: Point[], fill: string, extra = '') => `<polygon points="${formatPoints(points)}" fill="${fill}"${extra}/>`;

export const FOREST_VARIANTS = 4;
export const MOUNTAIN_VARIANTS = 3;

function pine(x: number, y: number, k: number, dark: boolean): string {
  const green = dark ? ['#1b5e20', '#2e7d32', '#388e3c'] : ['#2e7d32', '#388e3c', '#43a047'];
  return (
    `<rect x="${n1(x - 2 * k)}" y="${n1(y - 9 * k)}" width="${n1(4 * k)}" height="${n1(9 * k)}" fill="#5d4037"/>` +
    polygon(
      [
        [x - 12 * k, y - 7 * k],
        [x + 12 * k, y - 7 * k],
        [x, y - 27 * k],
      ],
      green[0],
    ) +
    polygon(
      [
        [x - 9 * k, y - 18 * k],
        [x + 9 * k, y - 18 * k],
        [x, y - 36 * k],
      ],
      green[1],
    ) +
    polygon(
      [
        [x - 6 * k, y - 28 * k],
        [x + 6 * k, y - 28 * k],
        [x, y - 43 * k],
      ],
      green[2],
    )
  );
}

function roundTree(x: number, y: number, k: number): string {
  return `<rect x="${n1(x - 2 * k)}" y="${n1(y - 12 * k)}" width="${n1(4 * k)}" height="${n1(12 * k)}" fill="#6d4c41"/><circle cx="${n1(x)}" cy="${n1(y - 20 * k)}" r="${n1(11 * k)}" fill="#43a047"/><circle cx="${n1(x - 5 * k)}" cy="${n1(y - 17 * k)}" r="${n1(7 * k)}" fill="#388e3c"/><circle cx="${n1(x + 4 * k)}" cy="${n1(y - 25 * k)}" r="${n1(5 * k)}" fill="#66bb6a"/>`;
}

/** A small group of trees filling one tile. */
export function forestArt(variant: number): Art {
  const spots: [number, number, number, 'pine' | 'round'][][] = [
    [
      [-14, -2, 0.8, 'pine'],
      [10, -6, 0.9, 'pine'],
      [-2, 8, 0.75, 'round'],
    ],
    [
      [-12, 2, 0.85, 'round'],
      [8, -4, 1, 'pine'],
      [14, 8, 0.7, 'pine'],
    ],
    [
      [-16, 0, 0.7, 'pine'],
      [0, -8, 0.95, 'pine'],
      [12, 4, 0.8, 'round'],
      [-2, 10, 0.65, 'pine'],
    ],
    [
      [-10, -4, 0.9, 'round'],
      [12, -2, 0.8, 'round'],
      [0, 9, 0.8, 'pine'],
    ],
  ];
  const trees = spots[variant % spots.length]
    .sort((a, b) => a[1] - b[1])
    .map(([x, y, k, kind]) => (kind === 'pine' ? pine(x, y, k, variant % 2 === 0) : roundTree(x, y, k)))
    .join('');
  return { svg: `<ellipse cx="0" cy="4" rx="30" ry="12" fill="#000" opacity=".12"/>${trees}`, box: [-34, -56, 34, 22] };
}

/** Rocky peaks with snow on top. Nothing can be built here. */
export function mountainArt(variant: number): Art {
  const tall = [58, 70, 50][variant % 3];
  const rock = ['#8d8d8d', '#9e9e9e', '#8a8378'][variant % 3];
  const peak = (x: number, h: number, w: number) =>
    polygon(
      [
        [x - w, 6],
        [x, -h],
        [x + w, 6],
      ],
      rock,
    ) +
    polygon(
      [
        [x, -h],
        [x + w, 6],
        [x + w * 0.2, 6],
      ],
      shade(rock, -0.22),
    ) +
    polygon(
      [
        [x - w * 0.32, -h * 0.62],
        [x, -h],
        [x + w * 0.32, -h * 0.62],
        [x + w * 0.1, -h * 0.55],
        [x - w * 0.08, -h * 0.66],
      ],
      '#ffffff',
    );
  return {
    svg: `<ellipse cx="0" cy="6" rx="40" ry="14" fill="#000" opacity=".15"/>${peak(-16, tall * 0.7, 22)}${peak(10, tall, 28)}`,
    box: [-44, -tall - 4, 44, 22],
  };
}

/** Old stones and a broken arch, waiting to be explored. */
export function ruinArt(): Art {
  const stone = '#b0a48f';
  return {
    svg: `<ellipse cx="0" cy="4" rx="28" ry="11" fill="#000" opacity=".14"/>
      <rect x="-20" y="-30" width="8" height="30" fill="${stone}"/><rect x="12" y="-24" width="8" height="24" fill="${shade(stone, -0.12)}"/>
      <path d="M-20 -30 Q-4 -46 10 -34" stroke="${stone}" stroke-width="7" fill="none"/>
      <rect x="-6" y="-6" width="12" height="7" rx="2" fill="${shade(stone, -0.2)}"/><rect x="4" y="-3" width="9" height="5" rx="2" fill="${stone}"/>
      <circle cx="-14" cy="-34" r="3" fill="#7cb342"/><circle cx="16" cy="-26" r="2.5" fill="#7cb342"/>
      <text x="0" y="-48" font-size="16" text-anchor="middle">❓</text>`,
    box: [-30, -64, 30, 18],
  };
}

/** Wooden scaffolding with a crane, for a wonder under construction. */
export function scaffoldArt(height: number): Art {
  const h = Math.max(24, height);
  let svg = `<ellipse cx="0" cy="4" rx="36" ry="14" fill="#000" opacity=".15"/>`;
  svg += polygon(
    [
      [-30, 0],
      [0, 15],
      [30, 0],
      [0, -15],
    ],
    '#c8b08a',
  );
  for (const x of [-24, -8, 8, 24]) svg += `<line x1="${x}" y1="0" x2="${x}" y2="${-h}" stroke="#8d6e63" stroke-width="2.5"/>`;
  for (let y = 0; y > -h; y -= 14) svg += `<line x1="-26" y1="${y}" x2="26" y2="${y - 6}" stroke="#a1887f" stroke-width="2"/>`;
  svg += `<line x1="18" y1="${-h}" x2="18" y2="${-h - 26}" stroke="#f9a825" stroke-width="3"/><line x1="-22" y1="${-h - 24}" x2="40" y2="${-h - 24}" stroke="#f9a825" stroke-width="3"/><line x1="34" y1="${-h - 24}" x2="34" y2="${-h - 6}" stroke="#555" stroke-width="1.2"/><rect x="30" y="${-h - 7}" width="8" height="6" fill="#8d6e63"/>`;
  return { svg, box: [-40, -h - 32, 44, 20] };
}

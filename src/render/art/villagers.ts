import type { Art } from './svg';

const SHIRTS = ['#ef5350', '#42a5f5', '#ffca28', '#ab47bc', '#26a69a', '#ff7043', '#ec407a', '#8d6e63'];
const SKINS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const HAIR = ['#3e2723', '#212121', '#ffb74d', '#8d6e63', '#d84315'];

export const VILLAGER_VARIANTS = SHIRTS.length;

const CAR_COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#f5f5f5'];
export const CAR_VARIANTS = CAR_COLORS.length;

export function carArt(variant: number): Art {
  const body = CAR_COLORS[variant % CAR_COLORS.length];
  return {
    svg: `<ellipse cx="0" cy="1" rx="11" ry="4" fill="#000" opacity=".22"/><rect x="-10" y="-9" width="20" height="8" rx="3" fill="${body}"/><rect x="-6" y="-14" width="11" height="6" rx="2" fill="${body}"/><rect x="-4.5" y="-13" width="3.5" height="4" fill="#bfe6ff"/><rect x="0" y="-13" width="3.5" height="4" fill="#bfe6ff"/><circle cx="-6" cy="-1" r="2.4" fill="#263238"/><circle cx="6" cy="-1" r="2.4" fill="#263238"/><rect x="8" y="-7" width="2" height="2" fill="#fff59d"/>`,
    box: [-13, -17, 13, 6],
  };
}

export function villagerArt(variant: number): Art {
  const shirt = SHIRTS[variant % SHIRTS.length];
  const skin = SKINS[(variant * 3) % SKINS.length];
  const hair = HAIR[(variant * 7) % HAIR.length];
  return {
    svg: `<ellipse cx="0" cy="0" rx="5" ry="2.5" fill="#000" opacity=".2"/><rect x="-4" y="-14" width="8" height="10" rx="3.5" fill="${shirt}"/><rect x="-3" y="-5" width="2.5" height="5" fill="#455a64"/><rect x="0.5" y="-5" width="2.5" height="5" fill="#455a64"/><circle cx="0" cy="-18" r="4.5" fill="${skin}"/><path d="M-4.5,-19 A4.5,4.5 0 0 1 4.5,-19 L4.5,-20.5 A4.5,3 0 0 0 -4.5,-20.5Z" fill="${hair}"/><circle cx="1.8" cy="-18" r=".8" fill="#333"/>`,
    box: [-8, -26, 8, 4],
  };
}

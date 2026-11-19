import type { Art } from './svg';

const SHIRTS = ['#ef5350', '#42a5f5', '#ffca28', '#ab47bc', '#26a69a', '#ff7043', '#ec407a', '#8d6e63'];
const SKINS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const HAIR = ['#3e2723', '#212121', '#ffb74d', '#8d6e63', '#d84315'];

export const VILLAGER_VARIANTS = SHIRTS.length;

export function villagerArt(variant: number): Art {
  const shirt = SHIRTS[variant % SHIRTS.length];
  const skin = SKINS[(variant * 3) % SKINS.length];
  const hair = HAIR[(variant * 7) % HAIR.length];
  return {
    svg: `<ellipse cx="0" cy="0" rx="5" ry="2.5" fill="#000" opacity=".2"/><rect x="-4" y="-14" width="8" height="10" rx="3.5" fill="${shirt}"/><rect x="-3" y="-5" width="2.5" height="5" fill="#455a64"/><rect x="0.5" y="-5" width="2.5" height="5" fill="#455a64"/><circle cx="0" cy="-18" r="4.5" fill="${skin}"/><path d="M-4.5,-19 A4.5,4.5 0 0 1 4.5,-19 L4.5,-20.5 A4.5,3 0 0 0 -4.5,-20.5Z" fill="${hair}"/><circle cx="1.8" cy="-18" r=".8" fill="#333"/>`,
    box: [-8, -26, 8, 4],
  };
}

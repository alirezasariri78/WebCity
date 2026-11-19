import type { DecorKind, FurnitureKind, HouseKind, ThemeId } from '../types';
import { DECOR } from './decor';
import { FURNITURE } from './furniture';
import { HOUSES } from './houses';
import type { DecorDef, FurnitureDef, HouseDef, ThemeDef } from './schema';
import { THEMES } from './themes';

export * from './schema';
export { DECOR, FURNITURE, HOUSES, THEMES };
export { PICTURES, isBuiltInPicture, pictureRef, resolveImage, type Picture } from './pictures';

const byKey = <K extends string, T>(list: T[], key: (item: T) => K) => new Map<K, T>(list.map((item) => [key(item), item]));

const furnitureByKind = byKey(FURNITURE, (f) => f.kind);
const houseByKind = byKey(HOUSES, (h) => h.kind);
const decorByKind = byKey(DECOR, (d) => d.kind);
const themeById = byKey(THEMES, (t) => t.id);

export const furnitureDef = (kind: FurnitureKind): FurnitureDef => furnitureByKind.get(kind)!;
export const houseDef = (kind: HouseKind): HouseDef => houseByKind.get(kind)!;
export const decorDef = (kind: DecorKind): DecorDef => decorByKind.get(kind)!;
export const themeDef = (id: ThemeId): ThemeDef => themeById.get(id) ?? THEMES[0];

export const MAX_LAND = 16;
export const MAX_CONTENT_LEVEL = 15;
export const UPGRADE_LEVEL = 3;
export const MAX_HOUSE_LEVEL = 3;

export const landSize = (playerLevel: number) => Math.min(MAX_LAND, 6 + playerLevel);

/** Upgraded houses are drawn bigger on the map. */
export const houseScale = (houseLevel = 1) => 1 + (houseLevel - 1) * 0.12;

export const roomSlots = (kind: HouseKind, houseLevel = 1) => (kind === 'townhall' ? 7 : 5) + (houseLevel - 1) * 4;

export const upgradeCost = (kind: HouseKind, houseLevel = 1) => Math.round(Math.max(60, houseDef(kind).cost) * (0.8 + houseLevel * 0.7));

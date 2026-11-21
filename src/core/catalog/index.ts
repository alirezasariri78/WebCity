import type { BuildingLook, CityKind, DecorKind, FurnitureKind, HouseKind, ThemeId } from '../types';
import { CITY } from './city';
import { DECOR } from './decor';
import { FURNITURE } from './furniture';
import { HOUSES } from './houses';
import type { CityDef, DecorDef, FurnitureDef, HouseDef, ThemeDef } from './schema';
import { THEMES } from './themes';

export * from './schema';
export { CITY, DECOR, FURNITURE, HOUSES, THEMES };
export { PICTURES, isBuiltInPicture, pictureRef, resolveImage, type Picture } from './pictures';

const byKey = <K extends string, T>(list: T[], key: (item: T) => K) => new Map<K, T>(list.map((item) => [key(item), item]));

const furnitureByKind = byKey(FURNITURE, (f) => f.kind);
const houseByKind = byKey(HOUSES, (h) => h.kind);
const cityByKind = byKey(CITY, (c) => c.kind);
const decorByKind = byKey(DECOR, (d) => d.kind);
const themeById = byKey(THEMES, (t) => t.id);

export const furnitureDef = (kind: FurnitureKind): FurnitureDef => furnitureByKind.get(kind)!;
export const houseDef = (kind: HouseKind): HouseDef => houseByKind.get(kind)!;
export const cityDef = (kind: CityKind): CityDef => cityByKind.get(kind)!;
export const decorDef = (kind: DecorKind): DecorDef => decorByKind.get(kind)!;
export const themeDef = (id: ThemeId): ThemeDef => themeById.get(id) ?? THEMES[0];

export const MAX_LAND = 28;
export const MAX_CONTENT_LEVEL = 15;
export const UPGRADE_LEVEL = 3;
export const MAX_HOUSE_LEVEL = 10;

/** Side length of the buildable land. Starts at 10×10 and grows with every level. */
export const landSize = (playerLevel: number) => Math.min(MAX_LAND, 9 + playerLevel);

/** Floors of a page building at each upgrade level (level 10 is a skyscraper). */
const PAGE_FLOORS = [1, 1, 2, 3, 5, 8, 12, 16, 22, 30];
export const houseFloors = (houseLevel = 1) => PAGE_FLOORS[Math.min(PAGE_FLOORS.length, Math.max(1, houseLevel)) - 1];

/** Levels 1–2 keep the original little house; from level 3 a page becomes a tower. */
export const isTowerLevel = (houseLevel = 1) => houseLevel >= 3;

export const houseScale = (houseLevel = 1) => (isTowerLevel(houseLevel) ? 1 : 1 + (houseLevel - 1) * 0.12);

export const roomSlots = (kind: HouseKind, houseLevel = 1) => (kind === 'townhall' ? 10 : 6) + (houseLevel - 1) * 3;

export const upgradeCost = (kind: HouseKind, houseLevel = 1) =>
  Math.round(Math.max(60, houseDef(kind).cost) * (0.8 + houseLevel * 0.7) * (houseLevel > 4 ? 1.5 : 1));

export const houseLook = (kind: HouseKind, look?: BuildingLook): BuildingLook => {
  const def = houseDef(kind);
  return look ?? { wall: def.wall, roof: def.roof, shape: def.roof3d, emoji: def.emoji };
};

export const cityLook = (kind: CityKind, look?: BuildingLook): BuildingLook => {
  const def = cityDef(kind);
  return look ?? { wall: def.wall, roof: def.roof, shape: def.shape, emoji: def.emoji };
};

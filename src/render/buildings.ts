import { cityDef, cityLook, houseFloors, houseLook, houseScale, isTowerLevel } from '../core/catalog';
import type { BuildingLook, CityBuilding, House } from '../core/types';
import { houseAnims, houseArt, houseTop, towerAnims, towerArt, towerTop, type Anim, type Art } from './art';

export interface BuildingVisual {
  key: string;
  make: () => Art;
  anims: Anim[];
  scale: number;
  /** Height of the roof top above the tile, in world units. */
  top: number;
}

const lookKey = (look?: BuildingLook) => (look ? `${look.wall}${look.roof}${look.shape}${look.emoji ?? ''}` : '');
/** Only a few window patterns, so buildings of the same size can share one sprite. */
const seedOf = (x: number, y: number) => (x * 31 + y * 17) % 4;

/** What a page building looks like: a little house at first, a tower once it has been upgraded enough. */
export function houseVisual(house: House, night: boolean): BuildingVisual {
  const level = house.level ?? 1;
  const time = night ? 'night' : 'day';
  if (!isTowerLevel(level)) {
    const scale = houseScale(level);
    return {
      key: `house:${house.kind}:${time}:${lookKey(house.look)}`,
      make: () => houseArt(house.kind, night, house.look),
      anims: houseAnims(house.kind, house.look),
      scale,
      top: houseTop(house.kind, house.look) * scale,
    };
  }
  const look = houseLook(house.kind, house.look);
  const floors = houseFloors(level);
  const seed = seedOf(house.x, house.y);
  return {
    key: `page-tower:${floors}:${time}:${lookKey(look)}:${seed}`,
    make: () => towerArt({ look, floors, night, seed }),
    anims: towerAnims(look, floors, 'none'),
    scale: 1,
    top: towerTop(look, floors),
  };
}

export function cityVisual(building: CityBuilding, night: boolean): BuildingVisual {
  const def = cityDef(building.kind);
  const look = cityLook(building.kind, building.look);
  const floors = building.floors;
  const seed = seedOf(building.x, building.y);
  return {
    key: `city:${building.kind}:${floors}:${night ? 'night' : 'day'}:${lookKey(building.look)}:${seed}`,
    make: () => towerArt({ look, floors, night, trim: def.trim, seed }),
    anims: towerAnims(look, floors, def.trim),
    scale: 1,
    top: def.trim === 'stadium' ? 40 : towerTop(look, floors),
  };
}

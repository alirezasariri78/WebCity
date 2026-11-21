import { cityDef, cityLook, houseFloors, houseLook, houseScale, isTowerLevel, wonderDef } from '../core/catalog';
import { wonderProgress } from '../core/rules';
import type { BuildingLook, CityBuilding, House, Wonder } from '../core/types';
import { houseAnims, houseArt, houseTop, scaffoldArt, towerAnims, towerArt, towerTop, type Anim, type Art } from './art';

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

/** A wonder: scaffolding while it is being built, then a big landmark. */
export function wonderVisual(wonder: Wonder, night: boolean, now: number): BuildingVisual {
  const def = wonderDef(wonder.kind);
  const look: BuildingLook = { wall: def.wall, roof: def.roof, shape: def.shape, emoji: def.emoji };
  if (!wonder.done) {
    const step = Math.floor(wonderProgress(wonder, now) * 5);
    const height = 20 + step * 14;
    return { key: `scaffold:${step}`, make: () => scaffoldArt(height), anims: [], scale: 1, top: height + 30 };
  }
  return {
    key: `wonder:${wonder.kind}:${night ? 'night' : 'day'}`,
    make: () => towerArt({ look, floors: def.floors, night, trim: def.shape === 'castle' ? 'stadium' : 'none', seed: 1 }),
    anims: [...towerAnims(look, def.floors, 'none'), { kind: 'glow', x: 0, y: -towerTop(look, def.floors) }],
    scale: 1.25,
    top: towerTop(look, def.floors) * 1.25,
  };
}

import type { Furniture, House, StyleProps } from '../../core/types';
import { state } from '../../game/store';

/** What the house editor is currently looking at. */
export const session = {
  houseId: null as string | null,
  selectedId: null as string | null,
  view: 'room' as 'room' | 'live',
  device: 'desktop' as 'desktop' | 'phone',
  partTab: 'content' as 'content' | 'style',
  pageTab: 'design' as 'design' | 'seo',
  copiedStyle: null as StyleProps | null,
};

export const currentHouse = (): House | undefined => state.town.houses.find((h) => h.id === session.houseId);

export const selectedPart = (): Furniture | undefined => currentHouse()?.items.find((f) => f.id === session.selectedId);

import { furnitureDef } from '../catalog';
import type { Furniture, House, Town } from '../types';

const DEFAULT_FORM_SIZE = 3;
const FORM_KINDS = new Set(['mailbox', 'form']);

export const homeOf = (town: Town): House | undefined => town.houses.find((h) => h.kind === 'townhall');

export const allItems = (town: Town): Furniture[] => town.houses.flatMap((h) => h.items);

export const isForm = (item: Furniture) => FORM_KINDS.has(item.kind);

export function countFormFields(json: string | undefined): number {
  if (!json) return DEFAULT_FORM_SIZE;
  try {
    const fields: unknown = JSON.parse(json);
    return Array.isArray(fields) ? fields.length : 0;
  } catch {
    return 0;
  }
}

export const largestForm = (town: Town) =>
  Math.max(
    0,
    ...allItems(town)
      .filter(isForm)
      .map((f) => countFormFields(f.props.fields)),
  );

export function countImages(town: Town): number {
  return allItems(town).reduce((total, item) => {
    if (item.kind === 'painting' || item.kind === 'product') return total + (item.props.src ? 1 : 0);
    if (item.kind === 'photowall') return total + (item.props.images ?? '').split(',').filter(Boolean).length;
    return total;
  }, 0);
}

export const hasEditedTitle = (house: House | undefined) =>
  !!house?.items.some((f) => (f.kind === 'sign' || f.kind === 'banner') && f.edited);

export function hasContactEmail(town: Town): boolean {
  const placeholder = furnitureDef('mailbox').defaults.email;
  return allItems(town).some((f) => f.kind === 'mailbox' && !!f.props.email && f.props.email !== placeholder);
}

export const hasHouse = (town: Town, kind: House['kind']) => town.houses.some((h) => h.kind === kind);

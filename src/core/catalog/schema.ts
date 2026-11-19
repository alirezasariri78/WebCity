import type { DecorKind, FurnitureKind, HouseKind, ThemeId } from '../types';

export interface Option {
  value: string;
  label: string;
}

export type FieldType = 'text' | 'textarea' | 'select' | 'image' | 'images' | 'link' | 'rows' | 'formfields' | 'code';

export interface RowColumn {
  key: string;
  label: string;
  type: 'text' | 'link' | 'select';
  options?: Option[];
}

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: Option[];
  hint?: string;
  columns?: RowColumn[];
  addLabel?: string;
}

export interface FurnitureDef {
  kind: FurnitureKind;
  /** Name inside the game. */
  name: string;
  /** What it becomes on the website. */
  web: string;
  emoji: string;
  level: number;
  cost: number;
  fields: Field[];
  defaults: Record<string, string>;
}

export type RoofShape = 'pyramid' | 'flat' | 'spire' | 'dome' | 'castle';

export interface HouseDef {
  kind: HouseKind;
  name: string;
  web: string;
  emoji: string;
  level: number;
  cost: number;
  desc: string;
  wall: string;
  roof: string;
  height: number;
  roof3d: RoofShape;
  template: { kind: FurnitureKind; props?: Record<string, string> }[];
}

export interface DecorDef {
  kind: DecorKind;
  name: string;
  emoji: string;
  level: number;
  cost: number;
}

export interface SitePalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  accent: string;
  heroFrom: string;
  heroTo: string;
  font: string;
  headingFont: string;
  fontUrl: string;
  radius: string;
}

export interface ThemeDef {
  id: ThemeId;
  name: string;
  emoji: string;
  level: number;
  desc: string;
  ground: [string, string];
  side: [string, string];
  road: string;
  water: [string, string];
  night?: boolean;
  site: SitePalette;
}

export const BUTTON_VARIANTS: Option[] = [
  { value: 'primary', label: 'Filled' },
  { value: 'outline', label: 'Outline' },
  { value: 'soft', label: 'Soft' },
  { value: 'ghost', label: 'Text only' },
];

export const BUTTON_SIZES: Option[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

export const DEFAULT_CONTACT_FIELDS = JSON.stringify([
  { id: 'f1', type: 'text', label: 'Your name', placeholder: 'Jane Smith', required: true, half: true },
  { id: 'f2', type: 'email', label: 'Your email', placeholder: 'jane@mail.com', required: true, half: true },
  { id: 'f3', type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: true },
]);

import type { Option } from '../catalog/schema';
import type { StyleKey } from '../types';

export type Scope = 'site' | 'page' | 'part';
export type ControlType = 'color' | 'range' | 'segment' | 'font' | 'image' | 'toggle' | 'text' | 'code';

export interface Control {
  key: StyleKey;
  label: string;
  type: ControlType;
  group: GroupId;
  level: number;
  scopes: Scope[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Option[];
  hint?: string;
  placeholder?: string;
}

export type GroupId = 'colors' | 'layout' | 'shapes' | 'depth' | 'text' | 'background' | 'forms' | 'motion' | 'header' | 'advanced';

export interface Group {
  id: GroupId;
  name: string;
  emoji: string;
  level: number;
  tool: string;
}

export const GROUPS: Group[] = [
  { id: 'colors', name: 'Colours', emoji: '🎨', level: 1, tool: 'Paint Bucket' },
  { id: 'layout', name: 'Size & position', emoji: '📐', level: 2, tool: 'Measuring Tape' },
  { id: 'shapes', name: 'Corners', emoji: '⬜', level: 3, tool: 'Sandpaper' },
  { id: 'depth', name: 'Shadow & border', emoji: '🌗', level: 4, tool: 'Lamp' },
  { id: 'text', name: 'Text & fonts', emoji: '🔤', level: 5, tool: 'Quill' },
  { id: 'background', name: 'Background', emoji: '🌈', level: 6, tool: 'Wallpaper' },
  { id: 'forms', name: 'Form inputs', emoji: '📝', level: 3, tool: 'Ink Pot' },
  { id: 'motion', name: 'Motion', emoji: '✨', level: 7, tool: 'Magic Dust' },
  { id: 'header', name: 'Menu bar', emoji: '🧭', level: 2, tool: 'Signpost' },
  { id: 'advanced', name: 'Advanced', emoji: '🧪', level: 10, tool: 'Wizard Lab' },
];

const EVERYWHERE: Scope[] = ['site', 'page', 'part'];
const PAGE_AND_PART: Scope[] = ['page', 'part'];
const SITE_AND_PAGE: Scope[] = ['site', 'page'];

const segment = (labels: Record<string, string>): Option[] => Object.entries(labels).map(([value, label]) => ({ value, label }));

export const CONTROLS: Control[] = [
  { key: 'bg', label: 'Background colour', type: 'color', group: 'colors', level: 1, scopes: EVERYWHERE },
  { key: 'text', label: 'Text colour', type: 'color', group: 'colors', level: 1, scopes: EVERYWHERE },
  { key: 'accent', label: 'Main colour (buttons, links)', type: 'color', group: 'colors', level: 1, scopes: EVERYWHERE },
  { key: 'surface', label: 'Card colour', type: 'color', group: 'colors', level: 1, scopes: EVERYWHERE },

  {
    key: 'align',
    label: 'Line up text',
    type: 'segment',
    group: 'layout',
    level: 1,
    scopes: EVERYWHERE,
    options: segment({ left: '⇤ Left', center: '↔ Center', right: 'Right ⇥' }),
  },
  {
    key: 'width',
    label: 'Width',
    type: 'segment',
    group: 'layout',
    level: 2,
    scopes: EVERYWHERE,
    options: segment({ narrow: 'Narrow', normal: 'Normal', wide: 'Wide', full: 'Full' }),
  },
  {
    key: 'pad',
    label: 'Space around',
    type: 'range',
    group: 'layout',
    level: 2,
    scopes: EVERYWHERE,
    min: 0,
    max: 160,
    step: 4,
    unit: 'px',
    placeholder: '56',
  },

  {
    key: 'radius',
    label: 'Card corners',
    type: 'range',
    group: 'shapes',
    level: 3,
    scopes: EVERYWHERE,
    min: 0,
    max: 40,
    step: 1,
    unit: 'px',
  },
  {
    key: 'btnRadius',
    label: 'Button corners',
    type: 'range',
    group: 'shapes',
    level: 3,
    scopes: EVERYWHERE,
    min: 0,
    max: 40,
    step: 1,
    unit: 'px',
    hint: '40 = fully round pill',
  },

  {
    key: 'shadow',
    label: 'Shadow',
    type: 'segment',
    group: 'depth',
    level: 4,
    scopes: EVERYWHERE,
    options: segment({ 0: 'None', 1: 'Soft', 2: 'Normal', 3: 'Strong', 4: 'Glow' }),
  },
  {
    key: 'border',
    label: 'Border thickness',
    type: 'range',
    group: 'depth',
    level: 4,
    scopes: EVERYWHERE,
    min: 0,
    max: 8,
    step: 1,
    unit: 'px',
    placeholder: '1',
  },
  { key: 'borderColor', label: 'Border colour', type: 'color', group: 'depth', level: 4, scopes: EVERYWHERE },

  { key: 'headingFont', label: 'Title font', type: 'font', group: 'text', level: 5, scopes: EVERYWHERE },
  { key: 'font', label: 'Text font', type: 'font', group: 'text', level: 5, scopes: EVERYWHERE },
  {
    key: 'size',
    label: 'Title size',
    type: 'range',
    group: 'text',
    level: 5,
    scopes: EVERYWHERE,
    min: 60,
    max: 180,
    step: 5,
    unit: '%',
    placeholder: '100',
  },
  {
    key: 'weight',
    label: 'Title thickness',
    type: 'segment',
    group: 'text',
    level: 5,
    scopes: EVERYWHERE,
    options: segment({ 400: 'Thin', 600: 'Medium', 800: 'Bold' }),
  },
  {
    key: 'spacing',
    label: 'Letter spacing',
    type: 'range',
    group: 'text',
    level: 5,
    scopes: EVERYWHERE,
    min: -3,
    max: 10,
    step: 0.5,
    unit: 'px',
    placeholder: '0',
  },

  {
    key: 'bg2',
    label: 'Gradient second colour',
    type: 'color',
    group: 'background',
    level: 6,
    scopes: EVERYWHERE,
    hint: 'Pick a background colour AND this one to get a smooth blend.',
  },
  { key: 'bgImage', label: 'Background picture', type: 'image', group: 'background', level: 6, scopes: PAGE_AND_PART },
  {
    key: 'overlay',
    label: 'Darken picture',
    type: 'range',
    group: 'background',
    level: 6,
    scopes: PAGE_AND_PART,
    min: 0,
    max: 85,
    step: 5,
    unit: '%',
    placeholder: '40',
  },
  {
    key: 'pattern',
    label: 'Pattern',
    type: 'segment',
    group: 'background',
    level: 6,
    scopes: EVERYWHERE,
    options: segment({ none: 'None', dots: '• Dots', grid: '# Grid', lines: '/ Lines' }),
  },

  {
    key: 'inputs',
    label: 'Input boxes',
    type: 'segment',
    group: 'forms',
    level: 3,
    scopes: EVERYWHERE,
    options: segment({ outline: '▭ Outline', filled: '▬ Filled', line: '＿ Line' }),
  },

  {
    key: 'anim',
    label: 'Appear animation',
    type: 'segment',
    group: 'motion',
    level: 7,
    scopes: EVERYWHERE,
    hint: 'How it shows up when visitors scroll to it.',
    options: segment({ none: 'None', fade: 'Fade', up: 'Slide up', zoom: 'Zoom' }),
  },

  {
    key: 'navStyle',
    label: 'Menu bar colour',
    type: 'segment',
    group: 'header',
    level: 2,
    scopes: SITE_AND_PAGE,
    options: segment({ light: 'Light', dark: 'Dark', accent: 'Main colour', clear: 'See-through' }),
  },
  { key: 'sticky', label: 'Menu stays on top when scrolling', type: 'toggle', group: 'header', level: 2, scopes: SITE_AND_PAGE },

  { key: 'hideMobile', label: 'Hide on phones', type: 'toggle', group: 'advanced', level: 8, scopes: ['part'] },
  {
    key: 'anchor',
    label: 'Link name (#anchor)',
    type: 'text',
    group: 'advanced',
    level: 8,
    scopes: ['part'],
    hint: 'Buttons can jump here with #name.',
  },
  {
    key: 'css',
    label: 'Custom CSS',
    type: 'code',
    group: 'advanced',
    level: 10,
    scopes: EVERYWHERE,
    hint: 'For experts. Example: letter-spacing: 2px;',
  },
];

export const controlFor = (key: StyleKey) => CONTROLS.find((c) => c.key === key);
export const groupOf = (key: StyleKey) => GROUPS.find((g) => g.id === controlFor(key)?.group);

/** Toggles that are on unless switched off. */
export const DEFAULT_ON_TOGGLES: StyleKey[] = ['sticky'];

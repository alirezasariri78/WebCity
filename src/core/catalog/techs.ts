import type { CityKind, TechId, WonderKind } from '../types';

export interface TechDef {
  id: TechId;
  name: string;
  emoji: string;
  /** Science needed. */
  cost: number;
  requires: TechId[];
  /** Column in the tree. */
  tier: number;
  /** One line about what it gives, shown in the tree. */
  desc: string;
}

export const TECHS: TechDef[] = [
  {
    id: 'agriculture',
    name: 'Agriculture',
    emoji: '🌾',
    cost: 10,
    requires: [],
    tier: 1,
    desc: 'Farms feed your people, so the city grows faster.',
  },
  { id: 'writing', name: 'Writing', emoji: '✍️', cost: 15, requires: [], tier: 1, desc: 'Schools, and the Great Library.' },
  { id: 'trade', name: 'Trade', emoji: '🐪', cost: 30, requires: ['agriculture'], tier: 2, desc: 'Shops earn more, and the Lighthouse.' },
  { id: 'medicine', name: 'Medicine', emoji: '⚕️', cost: 35, requires: ['writing'], tier: 2, desc: 'Hospitals keep your city growing.' },
  {
    id: 'philosophy',
    name: 'Philosophy',
    emoji: '📜',
    cost: 40,
    requires: ['writing'],
    tier: 2,
    desc: 'Theaters bring culture, and borders grow faster.',
  },
  { id: 'engineering', name: 'Engineering', emoji: '🏗️', cost: 60, requires: ['trade'], tier: 3, desc: 'Stadiums, and the Colosseum.' },
  {
    id: 'banking',
    name: 'Banking',
    emoji: '🏦',
    cost: 70,
    requires: ['trade', 'medicine'],
    tier: 3,
    desc: 'Offices that grow into glass towers.',
  },
  {
    id: 'printing',
    name: 'Printing Press',
    emoji: '📰',
    cost: 70,
    requires: ['philosophy'],
    tier: 3,
    desc: 'Universities, for a lot more science.',
  },
  {
    id: 'industry',
    name: 'Industry',
    emoji: '🏭',
    cost: 110,
    requires: ['engineering', 'banking'],
    tier: 4,
    desc: 'Factories make many coins.',
  },
  {
    id: 'electricity',
    name: 'Electricity',
    emoji: '⚡',
    cost: 130,
    requires: ['banking', 'printing'],
    tier: 4,
    desc: 'City lights, and the Observatory.',
  },
  {
    id: 'computers',
    name: 'Computers',
    emoji: '💻',
    cost: 180,
    requires: ['industry', 'electricity'],
    tier: 5,
    desc: 'The Sky Tower, and the Space Needle.',
  },
  {
    id: 'internet',
    name: 'The Internet',
    emoji: '🌐',
    cost: 240,
    requires: ['computers'],
    tier: 6,
    desc: 'Build the Grand Launch and win the game.',
  },
];

const techById = new Map(TECHS.map((t) => [t.id, t]));
export const techDef = (id: TechId) => techById.get(id)!;

/** City buildings that need a technology first. The rest are available from the start. */
export const CITY_TECH: Partial<Record<CityKind, TechId>> = {
  farm: 'agriculture',
  school: 'writing',
  hospital: 'medicine',
  theater: 'philosophy',
  stadium: 'engineering',
  office: 'banking',
  university: 'printing',
  factory: 'industry',
  landmark: 'computers',
};

export interface WonderDef {
  kind: WonderKind;
  name: string;
  emoji: string;
  tech: TechId;
  cost: number;
  /** Real minutes to build. */
  minutes: number;
  /** What the website gets. */
  gift: string;
  yields: { food?: number; gold?: number; science?: number; culture?: number };
  wall: string;
  roof: string;
  shape: 'pyramid' | 'flat' | 'spire' | 'dome' | 'castle';
  floors: number;
}

export const WONDERS: WonderDef[] = [
  {
    kind: 'gardens',
    name: 'Hanging Gardens',
    emoji: '🌺',
    tech: 'agriculture',
    cost: 150,
    minutes: 3,
    gift: 'A softly moving colour glow behind the first part of every page.',
    yields: { food: 4 },
    wall: '#e9d8a6',
    roof: '#43a047',
    shape: 'pyramid',
    floors: 4,
  },
  {
    kind: 'library',
    name: 'Great Library',
    emoji: '📚',
    tech: 'writing',
    cost: 200,
    minutes: 4,
    gift: 'A search box that finds anything on your website.',
    yields: { science: 5 },
    wall: '#f3e5c0',
    roof: '#5c6bc0',
    shape: 'dome',
    floors: 4,
  },
  {
    kind: 'lighthouse',
    name: 'Lighthouse',
    emoji: '🗼',
    tech: 'trade',
    cost: 260,
    minutes: 5,
    gift: 'A floating "Contact us" button on every page.',
    yields: { gold: 4 },
    wall: '#fafafa',
    roof: '#e53935',
    shape: 'spire',
    floors: 9,
  },
  {
    kind: 'colosseum',
    name: 'Colosseum',
    emoji: '🏟️',
    tech: 'engineering',
    cost: 400,
    minutes: 6,
    gift: 'Visitors can tap any picture to see it big.',
    yields: { culture: 6 },
    wall: '#d7b98e',
    roof: '#a1887f',
    shape: 'castle',
    floors: 3,
  },
  {
    kind: 'observatory',
    name: 'Observatory',
    emoji: '🔭',
    tech: 'electricity',
    cost: 600,
    minutes: 8,
    gift: 'A dark mode switch for your visitors.',
    yields: { science: 8 },
    wall: '#cfd8dc',
    roof: '#283593',
    shape: 'dome',
    floors: 6,
  },
  {
    kind: 'needle',
    name: 'Space Needle',
    emoji: '🛰️',
    tech: 'computers',
    cost: 900,
    minutes: 10,
    gift: 'Your website can be installed on phones like an app.',
    yields: { culture: 10 },
    wall: '#eceff1',
    roof: '#ff7043',
    shape: 'spire',
    floors: 22,
  },
  {
    kind: 'launch',
    name: 'Grand Launch',
    emoji: '🚀',
    tech: 'internet',
    cost: 1500,
    minutes: 12,
    gift: 'Google-ready extras (share previews and a robots file), and you win the game!',
    yields: { food: 5, gold: 5, science: 5, culture: 5 },
    wall: '#f5f5f5',
    roof: '#7c5cff',
    shape: 'spire',
    floors: 30,
  },
];

const wonderByKind = new Map(WONDERS.map((w) => [w.kind, w]));
export const wonderDef = (kind: WonderKind) => wonderByKind.get(kind)!;

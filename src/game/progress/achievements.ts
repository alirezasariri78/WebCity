import { allItems, countFormFields, countImages, hasHouse, isForm } from '../../core/rules';
import type { Stats } from '../../core/types';
import { state } from '../store';
import { level, rating } from './status';

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  coins: number;
  check: () => boolean;
}

const atLeast = (name: keyof Stats, n: number) => () => state.progress.stats[name] >= n;
const houses = (n: number) => () => state.town.houses.length >= n;
const reachLevel = (n: number) => () => level() >= n;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_house', name: 'First Brick', emoji: '🧱', desc: 'Build your first house', coins: 20, check: atLeast('housesBuilt', 1) },
  { id: 'architect', name: 'Architect', emoji: '📐', desc: 'Have 5 houses', coins: 60, check: houses(5) },
  { id: 'city', name: 'Metropolis', emoji: '🏙️', desc: 'Have 9 houses', coins: 150, check: houses(9) },
  { id: 'allpages', name: 'Webmaster', emoji: '🌐', desc: 'Have 12 pages', coins: 250, check: houses(12) },
  { id: 'gardener', name: 'Green Thumb', emoji: '🌱', desc: 'Place 10 nature items', coins: 30, check: atLeast('decorPlaced', 10) },
  { id: 'forest', name: 'Forest Keeper', emoji: '🌲', desc: 'Place 30 nature items', coins: 80, check: atLeast('decorPlaced', 30) },
  { id: 'decorator', name: 'Interior Designer', emoji: '🛋️', desc: 'Add 15 furniture', coins: 50, check: atLeast('furnitureAdded', 15) },
  { id: 'writer', name: 'Wordsmith', emoji: '✍️', desc: 'Write your own words in 10 furniture', coins: 50, check: atLeast('edits', 10) },
  {
    id: 'shutter',
    name: 'Shutterbug',
    emoji: '📸',
    desc: 'Have 6 pictures on your website',
    coins: 40,
    check: () => countImages(state.town) >= 6,
  },
  { id: 'rich', name: 'Tycoon', emoji: '💰', desc: 'Hold 500 coins at once', coins: 50, check: () => state.progress.coins >= 500 },
  { id: 'lvl5', name: 'Rising Star', emoji: '⭐', desc: 'Reach level 5', coins: 50, check: reachLevel(5) },
  { id: 'lvl10', name: 'Legend', emoji: '👑', desc: 'Reach level 10', coins: 200, check: reachLevel(10) },
  { id: 'lvl15', name: 'Grand Mayor', emoji: '🏆', desc: 'Reach level 15 (everything unlocked!)', coins: 500, check: reachLevel(15) },
  { id: 'castle', name: 'Royalty', emoji: '🏰', desc: 'Build a Castle', coins: 150, check: () => hasHouse(state.town, 'castle') },
  { id: 'perfect', name: 'Perfectionist', emoji: '💯', desc: 'Get a 100 website rating', coins: 100, check: () => rating().score >= 100 },
  { id: 'publish', name: 'Published!', emoji: '🚀', desc: 'Download your website', coins: 50, check: atLeast('exports', 1) },
  { id: 'stylist', name: 'Fashionista', emoji: '🎨', desc: 'Try 3 town styles', coins: 40, check: atLeast('themesTried', 3) },
  {
    id: 'designer',
    name: 'Designer',
    emoji: '🖌️',
    desc: 'Discover 6 design tools',
    coins: 80,
    check: () => (state.progress.toolsUsed ?? []).length >= 6,
  },
  { id: 'stylist2', name: 'Style Master', emoji: '💅', desc: 'Restyle things 50 times', coins: 120, check: atLeast('styled', 50) },
  {
    id: 'forms',
    name: 'Form Master',
    emoji: '📝',
    desc: 'Make a form with 8 inputs',
    coins: 80,
    check: () => allItems(state.town).some((f) => isForm(f) && countFormFields(f.props.fields) >= 8),
  },
  { id: 'treasure', name: 'Treasure Hunter', emoji: '🫧', desc: 'Pop 25 bubbles', coins: 60, check: atLeast('collected', 25) },
  { id: 'builder', name: 'Renovator', emoji: '🔨', desc: 'Upgrade houses 5 times', coins: 80, check: atLeast('upgrades', 5) },
  { id: 'loyal', name: 'Loyal Mayor', emoji: '📅', desc: 'Play 3 days in a row', coins: 60, check: () => state.progress.streak >= 3 },
  { id: 'devoted', name: 'Devoted Mayor', emoji: '🔥', desc: 'Play 7 days in a row', coins: 150, check: () => state.progress.streak >= 7 },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

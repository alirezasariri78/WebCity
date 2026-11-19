import { isStyled } from '../../core/design';
import { allItems, hasContactEmail, hasEditedTitle, hasHouse, homeOf, largestForm } from '../../core/rules';
import { DEFAULT_TOWN_NAME } from '../../core/rules/rating';
import type { Stats } from '../../core/types';
import { state } from '../store';
import { level, rating } from './status';

export interface Quest {
  title: string;
  desc: string;
  icon: string;
  goal: number;
  value: () => number;
  xp: number;
  coins: number;
}

const yes = (condition: boolean) => (condition ? 1 : 0);
const stat = (name: keyof Stats) => () => state.progress.stats[name];
const houses = () => state.town.houses.length;
const town = () => state.town;

const STORY: Quest[] = [
  {
    icon: '✏️',
    title: 'Name your town',
    desc: 'Click the town name at the top-left and give it a name. It becomes your website name.',
    goal: 1,
    value: () => yes(town().name !== DEFAULT_TOWN_NAME),
    xp: 30,
    coins: 20,
  },
  {
    icon: '🚪',
    title: 'Step inside the Town Hall',
    desc: 'Click the big blue Town Hall, then press "Go inside". This is your home page.',
    goal: 1,
    value: stat('visits'),
    xp: 20,
    coins: 10,
  },
  {
    icon: '🪧',
    title: 'Write your welcome',
    desc: 'Inside the Town Hall, click the Big Sign and type your own title.',
    goal: 1,
    value: () => yes(hasEditedTitle(homeOf(town()))),
    xp: 30,
    coins: 15,
  },
  {
    icon: '🔮',
    title: 'Look through the Magic Window',
    desc: 'Press the 🔮 button at the top to see your REAL website.',
    goal: 1,
    value: stat('previews'),
    xp: 25,
    coins: 15,
  },
  {
    icon: '🏠',
    title: 'Build a Cottage',
    desc: 'Open the Houses tab at the bottom, pick a Cottage and place it on your land.',
    goal: 2,
    value: houses,
    xp: 40,
    coins: 30,
  },
  {
    icon: '🌳',
    title: 'Make it green',
    desc: 'Place 3 trees or flowers from the Nature tab.',
    goal: 3,
    value: stat('decorPlaced'),
    xp: 30,
    coins: 20,
  },
  {
    icon: '🫧',
    title: 'Treasure hunter',
    desc: 'Bubbles with 🪙 💎 🎁 pop up above your houses. Click 2 of them!',
    goal: 2,
    value: stat('collected'),
    xp: 30,
    coins: 20,
  },
  {
    icon: '🖼️',
    title: 'Hang a Painting',
    desc: 'Go inside any house and add a Painting (a picture on your website).',
    goal: 1,
    value: () => yes(allItems(town()).some((f) => f.kind === 'painting')),
    xp: 30,
    coins: 25,
  },
  {
    icon: '🎨',
    title: 'Paint something',
    desc: 'Go inside a house, click any furniture, open the 🎨 Style tab and pick a colour.',
    goal: 1,
    value: stat('styled'),
    xp: 35,
    coins: 25,
  },
  {
    icon: '📮',
    title: 'Open a Post Office',
    desc: 'Build a Post Office. It becomes your contact page!',
    goal: 1,
    value: () => yes(hasHouse(town(), 'post')),
    xp: 50,
    coins: 40,
  },
  {
    icon: '✉️',
    title: 'Fill the Mailbox',
    desc: 'Inside the Post Office, click the Mailbox and write your real email.',
    goal: 1,
    value: () => yes(hasContactEmail(town())),
    xp: 40,
    coins: 30,
  },
  {
    icon: '📝',
    title: 'Your own form',
    desc: 'Make a form with at least 4 inputs (add some in the Mailbox, or use a Form Desk).',
    goal: 4,
    value: () => largestForm(town()),
    xp: 50,
    coins: 40,
  },
  {
    icon: '🎨',
    title: 'New look',
    desc: 'Open the Styles tab and choose a different town style.',
    goal: 1,
    value: stat('themesTried'),
    xp: 40,
    coins: 30,
  },
  {
    icon: '🖌️',
    title: 'Design Studio',
    desc: 'Press 🎨 Design at the top and change something for the whole website.',
    goal: 1,
    value: () => yes(isStyled(town().style) || !!town().site?.logoImage),
    xp: 50,
    coins: 40,
  },
  {
    icon: '⭐',
    title: 'Three-star website',
    desc: 'Get your website rating to 3 stars. Ask Rosa (bottom-right) for tips!',
    goal: 60,
    value: () => rating().score,
    xp: 60,
    coins: 50,
  },
  { icon: '🏘️', title: 'Growing town', desc: 'Have 4 houses in your town.', goal: 4, value: houses, xp: 60, coins: 50 },
  {
    icon: '⬆️',
    title: 'Bigger and better',
    desc: 'Click any house and press "Upgrade". Bigger houses hold more furniture.',
    goal: 1,
    value: stat('upgrades'),
    xp: 60,
    coins: 40,
  },
  {
    icon: '🛒',
    title: 'Open for business',
    desc: 'Build a Market Shop and show what you sell.',
    goal: 1,
    value: () => yes(hasHouse(town(), 'shop')),
    xp: 70,
    coins: 60,
  },
  {
    icon: '🚀',
    title: 'Go live!',
    desc: 'Open the Magic Window and press "Download website".',
    goal: 1,
    value: stat('exports'),
    xp: 80,
    coins: 80,
  },
  {
    icon: '🌟',
    title: 'Five-star town',
    desc: 'Get your website rating to 90 or more.',
    goal: 90,
    value: () => rating().score,
    xp: 100,
    coins: 100,
  },
  { icon: '🏙️', title: 'Big city', desc: 'Have 7 houses in your town.', goal: 7, value: houses, xp: 120, coins: 120 },
  {
    icon: '📰',
    title: 'Start a blog',
    desc: 'Reach level 8 and build a Newspaper Office.',
    goal: 1,
    value: () => yes(hasHouse(town(), 'news')),
    xp: 150,
    coins: 150,
  },
  {
    icon: '🌟',
    title: 'Fully loaded',
    desc: 'Upgrade any house to ★3.',
    goal: 1,
    value: () => yes(town().houses.some((h) => (h.level ?? 1) >= 3)),
    xp: 150,
    coins: 120,
  },
  {
    icon: '🏰',
    title: 'Royal town',
    desc: 'Reach level 13 and build a Castle.',
    goal: 1,
    value: () => yes(hasHouse(town(), 'castle')),
    xp: 300,
    coins: 300,
  },
];

interface RepeatingQuest {
  stat: keyof Stats;
  icon: string;
  title: (n: number) => string;
  desc: string;
  base: number;
}

const REPEATING: RepeatingQuest[] = [
  { stat: 'furnitureAdded', icon: '🛋️', title: (n) => `Add ${n} furniture`, desc: 'Add furniture inside any house.', base: 3 },
  { stat: 'decorPlaced', icon: '🌷', title: (n) => `Plant ${n} nature items`, desc: 'Use the Nature tab.', base: 4 },
  {
    stat: 'edits',
    icon: '✍️',
    title: (n) => `Improve ${n} furniture`,
    desc: 'Write your own words in furniture that still has example text.',
    base: 3,
  },
  { stat: 'housesBuilt', icon: '🏗️', title: (n) => `Build ${n} house${n > 1 ? 's' : ''}`, desc: 'Every house is a new page.', base: 1 },
  { stat: 'styled', icon: '🎨', title: (n) => `Restyle ${n} things`, desc: 'Use the 🎨 Style tab or the Design Studio.', base: 5 },
  { stat: 'collected', icon: '🫧', title: (n) => `Pop ${n} treasure bubbles`, desc: 'Click the bubbles above your houses.', base: 4 },
  { stat: 'previews', icon: '🔮', title: (n) => `Check your site ${n} times`, desc: 'Open the Magic Window.', base: 2 },
  {
    stat: 'upgrades',
    icon: '⬆️',
    title: (n) => `Upgrade ${n} house${n > 1 ? 's' : ''}`,
    desc: 'Click a house and press Upgrade.',
    base: 1,
  },
];

export const STORY_LENGTH = STORY.length;

const repeatingAt = (index: number) => {
  const round = index - STORY.length;
  return { quest: REPEATING[round % REPEATING.length], size: Math.floor(round / REPEATING.length) };
};

export function currentQuest(): Quest {
  const index = state.progress.questIndex;
  if (index < STORY.length) return STORY[index];

  const { quest, size } = repeatingAt(index);
  const goal = quest.base + size;
  const start = state.progress.questBase;
  return {
    icon: quest.icon,
    title: quest.title(goal),
    desc: quest.desc,
    goal,
    value: () => state.progress.stats[quest.stat] - start,
    xp: 30 + level() * 8,
    coins: 25 + level() * 6,
  };
}

export const questValue = (quest: Quest) => Math.min(quest.goal, Math.max(0, quest.value()));
export const isQuestDone = (quest: Quest) => questValue(quest) >= quest.goal;
export const questNumber = () => state.progress.questIndex + 1;
export const isStoryQuest = () => state.progress.questIndex < STORY.length;

/** Moves to the next quest. Repeating quests count progress from this moment. */
export function advanceQuest() {
  const p = state.progress;
  p.questIndex++;
  if (p.questIndex >= STORY.length) p.questBase = p.stats[repeatingAt(p.questIndex).quest.stat];
}

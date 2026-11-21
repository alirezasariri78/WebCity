import { WONDERS, techDef, wonderDef } from '../../core/catalog';
import {
  GOLDEN_AGE_MS,
  addScience,
  bestTileToClaim,
  canClaim,
  canResearch,
  challengeProgress,
  cultureNeeded,
  dayKey,
  finishWonders,
  hash,
  isRuin,
  newChallengeDay,
  ruinsLeft,
  tileCost,
  tileIndex,
  townYields,
  type Yields,
} from '../../core/rules';
import type { TechId, Wonder, WonderKind } from '../../core/types';
import { events } from '../events';
import { uid } from '../factory';
import { state } from '../store';
import { bump, earnPassive, reward, spend } from './rewards';

const GOLDEN_BONUS = 1.5;
/** At most this much time away is paid back in science and culture. */
const MAX_AWAY_MINUTES = 180;

export const isGoldenAge = (now = Date.now()) => (state.progress.goldenUntil ?? 0) > now;

/** Food, gold, science and culture per minute, including a Golden Age bonus. */
export function yields(): Yields {
  const y = townYields(state.town, state.progress.research);
  if (!isGoldenAge()) return y;
  return { food: y.food * GOLDEN_BONUS, gold: y.gold * GOLDEN_BONUS, science: y.science * GOLDEN_BONUS, culture: y.culture * GOLDEN_BONUS };
}

/** Floors the city may grow per growth tick: food speeds it up. */
export const growthSteps = () => Math.min(4, 1 + Math.floor(yields().food / 6));

function claim(index: number) {
  const world = state.town.world;
  if (world.owned.includes(index)) return;
  world.owned.push(index);
  bump('tiles');
}

/** Runs `minutes` of science, culture and wonder building. */
export function empireTick(minutes: number, now = Date.now()) {
  const y = yields();
  const world = state.town.world;

  const tech = addScience(state.progress.research, y.science * minutes);
  if (tech) {
    bump('techs');
    events.emit('tech', { id: tech });
  }

  world.culture += y.culture * minutes;
  const tiles: number[] = [];
  for (let need = cultureNeeded(world); world.culture >= need && tiles.length < 8; need = cultureNeeded(world)) {
    const best = bestTileToClaim(world);
    if (best === undefined) break;
    world.culture -= need;
    claim(best);
    tiles.push(best);
  }
  if (tiles.length) events.emit('border', { tiles });

  for (const wonder of finishWonders(state.town, now)) {
    bump('wonders');
    if (wonder.kind === 'launch') state.progress.won = true;
    events.emit('wonder', { id: wonder.id, kind: wonder.kind });
  }
}

/** Science, culture and wonders keep going while the game is closed (up to three hours). */
export function catchUpWhileAway(minutesAway: number) {
  if (minutesAway > 0) empireTick(Math.min(MAX_AWAY_MINUTES, minutesAway));
}

export function startResearch(id: TechId): boolean {
  const research = state.progress.research;
  if (!canResearch(research, id)) return false;
  research.current = id;
  return true;
}

export const currentTech = () => (state.progress.research.current ? techDef(state.progress.research.current) : null);

export function buyTile(x: number, y: number): boolean {
  const world = state.town.world;
  if (!canClaim(world, x, y) || !spend(tileCost(world))) return false;
  claim(tileIndex(world, x, y));
  events.emit('border', { tiles: [tileIndex(world, x, y)] });
  return true;
}

export function startWonder(kind: WonderKind, x: number, y: number): Wonder | null {
  const def = wonderDef(kind);
  if (state.town.wonders.some((w) => w.kind === kind) || !spend(def.cost)) return null;
  const wonder: Wonder = { id: uid(), kind, x, y, startedAt: Date.now(), done: false };
  state.town.wonders.push(wonder);
  return wonder;
}

export const wondersLeft = () => WONDERS.filter((w) => !state.town.wonders.some((x) => x.kind === w.kind));

export interface RuinFind {
  emoji: string;
  title: string;
  text: string;
  vars?: Record<string, string | number>;
}

/** Explores ruins inside the borders. Every ruin hides one surprise. */
export function exploreRuin(x: number, y: number): RuinFind | null {
  const world = state.town.world;
  const index = tileIndex(world, x, y);
  if (!isRuin(world, x, y) || !world.owned.includes(index)) return null;
  world.ruins.push(index);
  bump('ruins');
  reward(20, 0);
  const roll = Math.floor(hash(x, y, world.seed + 11) * 4);
  if (roll === 0) {
    const coins = 80 + Math.floor(hash(y, x, world.seed) * 120);
    earnPassive(coins);
    return { emoji: '💰', title: 'Hidden treasure!', text: 'You found an old chest with {coins} 🪙 inside.', vars: { coins } };
  }
  if (roll === 1) {
    const research = state.progress.research;
    const science = research.current ? Math.ceil(techDef(research.current).cost * 0.6) : 30;
    const done = addScience(research, science);
    if (done) {
      bump('techs');
      events.emit('tech', { id: done });
    }
    return { emoji: '📜', title: 'Ancient scrolls!', text: 'Old books full of ideas: +{science} 🔬 science.', vars: { science } };
  }
  if (roll === 2) {
    world.culture += cultureNeeded(world) * 3;
    return { emoji: '🗿', title: 'A forgotten statue!', text: 'People come from far away to see it. Your borders will grow soon.' };
  }
  startGoldenAge(5 * 60_000);
  return { emoji: '✨', title: 'A golden mask!', text: 'Your people are so proud that a Golden Age begins.' };
}

export const ruinsToFind = () => ruinsLeft(state.town.world).length;

export function startGoldenAge(ms = GOLDEN_AGE_MS) {
  const until = Math.max(Date.now(), state.progress.goldenUntil ?? 0) + ms;
  state.progress.goldenUntil = until;
  events.emit('golden', { until });
}

// Daily challenges

export function todaysChallenges(now = Date.now()) {
  const p = state.progress;
  const day = dayKey(now);
  if (p.challenges?.day !== day) p.challenges = newChallengeDay(day, p.stats);
  const claimed = p.challenges.claimed;
  return p.challenges.picks.map((pick) => ({ ...challengeProgress(pick, p.stats), id: pick.id, claimed: claimed.includes(pick.id) }));
}

export const challengesReady = () => todaysChallenges().filter((c) => c.complete && !c.claimed).length;

/** Claims a finished challenge. Finishing all three starts a Golden Age. */
export function claimChallenge(id: string, at?: { x: number; y: number }): boolean {
  const challenge = todaysChallenges().find((c) => c.id === id);
  if (!challenge?.def || !challenge.complete || challenge.claimed) return false;
  state.progress.challenges!.claimed.push(id);
  reward(challenge.def.xp, challenge.def.coins, at);
  if (todaysChallenges().every((c) => c.claimed)) startGoldenAge();
  return true;
}

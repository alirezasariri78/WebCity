import type { Stats } from '../../core/types';
import { sfx } from '../audio';
import { events } from '../events';
import { state, touch } from '../store';
import { ACHIEVEMENTS } from './achievements';
import { advanceQuest, currentQuest, isQuestDone } from './quests';
import { level } from './status';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Last announced "quest number + done" so each quest is announced once, even after loading another save. */
let announcedQuest = '';

/** Checks for level-ups, new badges and finished quests. Call after any change. */
export function checkProgress() {
  touch();
  const p = state.progress;

  const now = level();
  if (now > p.seenLevel) {
    p.seenLevel = now;
    events.emit('levelup', { level: now });
  }

  for (const achievement of ACHIEVEMENTS) {
    if (p.achievements.includes(achievement.id) || !achievement.check()) continue;
    p.achievements.push(achievement.id);
    p.coins += achievement.coins;
    events.emit('achievement', { id: achievement.id });
  }

  const done = isQuestDone(currentQuest());
  const key = `${p.questIndex}:${done}`;
  if (key !== announcedQuest) {
    announcedQuest = key;
    events.emit('quest', { done });
  }
}

export function reward(xp: number, coins: number, at?: ScreenPoint) {
  const p = state.progress;
  p.xp += xp;
  p.coins += coins;
  if (coins > 0) p.stats.coinsEarned += coins;
  if (xp) events.emit('float', { text: `+${xp} XP`, color: '#7c5cff', x: at?.x, y: at?.y });
  if (coins > 0) {
    setTimeout(() => events.emit('float', { text: `+${coins} 🪙`, color: '#f5a300', x: at?.x, y: at && at.y + 26 }), 120);
  }
  checkProgress();
}

export function earnPassive(coins: number) {
  state.progress.coins += coins;
  state.progress.stats.coinsEarned += coins;
}

export function spend(coins: number): boolean {
  const missing = coins - state.progress.coins;
  if (missing > 0) {
    sfx('error');
    events.emit('toast', { text: `You need ${missing} more 🪙. Finish quests or wait for visitors!`, kind: 'bad' });
    return false;
  }
  state.progress.coins -= coins;
  sfx('coin');
  return true;
}

export function bump(stat: keyof Stats, by = 1) {
  state.progress.stats[stat] += by;
  checkProgress();
}

export function claimQuest(at?: ScreenPoint) {
  const quest = currentQuest();
  if (!isQuestDone(quest)) return;
  advanceQuest();
  sfx('fanfare');
  events.emit('confetti', at ?? {});
  reward(quest.xp, quest.coins, at);
}

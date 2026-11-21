import { describe, expect, it } from 'vitest';
import { CITY_TECH, TECHS, WONDERS, techDef } from '../../src/core/catalog';
import {
  CHALLENGES,
  DAILY_COUNT,
  addScience,
  applyTextEdit,
  availableTechs,
  canResearch,
  challengeProgress,
  cityUnlocked,
  finishWonders,
  newChallengeDay,
  pageQuality,
  pickChallenges,
  townYields,
  wonderProgress,
  wonderState,
} from '../../src/core/rules';
import type { Research, Stats } from '../../src/core/types';
import { newGame } from '../../src/game/factory';
import { house, part, town } from '../helpers';

const research = (done: Research['done'] = [], current: Research['current'] = null): Research => ({ current, points: 0, done });

describe('technology tree', () => {
  it('only needs technologies that exist and come earlier', () => {
    for (const tech of TECHS) {
      for (const need of tech.requires) expect(techDef(need).tier).toBeLessThan(tech.tier);
    }
  });

  it('can reach every technology from the start', () => {
    const r = research();
    for (let guard = 0; guard < 50 && availableTechs(r).length; guard++) r.done.push(availableTechs(r)[0].id);
    expect(r.done).toHaveLength(TECHS.length);
  });

  it('needs the earlier technologies first', () => {
    expect(canResearch(research(), 'agriculture')).toBe(true);
    expect(canResearch(research(), 'trade')).toBe(false);
    expect(canResearch(research(['agriculture']), 'trade')).toBe(true);
    expect(canResearch(research(['agriculture']), 'agriculture')).toBe(false);
  });

  it('finishes a technology when enough science has come in', () => {
    const r = research([], 'writing');
    expect(addScience(r, techDef('writing').cost - 1)).toBeNull();
    expect(addScience(r, 5)).toBe('writing');
    expect(r.done).toEqual(['writing']);
    expect(r.current).toBeNull();
    expect(r.points).toBe(4);
  });

  it('keeps a little science saved when nothing is being researched', () => {
    const r = research();
    addScience(r, 1000);
    expect(r.points).toBeLessThan(100);
  });

  it('locks city buildings behind their technology', () => {
    for (const [kind, tech] of Object.entries(CITY_TECH)) {
      expect(cityUnlocked(research(), kind as never)).toBe(false);
      expect(cityUnlocked(research([tech]), kind as never)).toBe(true);
    }
    expect(cityUnlocked(research(), 'home')).toBe(true);
  });
});

describe('yields', () => {
  it('rewards pages that are filled in with your own words', () => {
    const empty = house('library', 1, 1, { items: [] });
    const written = house('library', 1, 1, { items: [1, 2, 3].map(() => part('board', {}, { edited: true })) });
    expect(pageQuality(written)).toBe(1);
    expect(pageQuality(empty)).toBeLessThan(1);
    const sciences = [empty, written].map((h) => townYields(town({ houses: [h] }), research()).science);
    expect(sciences[1]).toBeGreaterThan(sciences[0]);
  });

  it('counts science per floor of a school', () => {
    const base = townYields(town({ houses: [] }), research()).science;
    const t = town({ houses: [], city: [{ id: 's', kind: 'school', x: 1, y: 1, floors: 3, builtAt: 0 }] });
    expect(townYields(t, research()).science).toBe(base + 3);
  });

  it('adds finished wonders', () => {
    const t = town({ houses: [], wonders: [{ id: 'w', kind: 'library', x: 1, y: 1, startedAt: 0, done: false }] });
    const before = townYields(t, research()).science;
    t.wonders[0].done = true;
    expect(townYields(t, research()).science).toBe(before + 5);
  });

  it('starts a new game with some science, so research begins right away', () => {
    const game = newGame(5);
    expect(townYields(game.town, game.progress.research).science).toBeGreaterThan(0);
  });
});

describe('wonders', () => {
  it('each need a technology that exists', () => {
    for (const w of WONDERS) expect(techDef(w.tech)).toBeDefined();
  });

  it('take time to build, then finish', () => {
    const t = town({ wonders: [{ id: 'w', kind: 'gardens', x: 1, y: 1, startedAt: 0, done: false }] });
    const minutes = WONDERS.find((w) => w.kind === 'gardens')!.minutes;
    expect(wonderProgress(t.wonders[0], minutes * 30_000)).toBeCloseTo(0.5);
    expect(finishWonders(t, minutes * 30_000)).toEqual([]);
    expect(finishWonders(t, minutes * 60_000)).toHaveLength(1);
    expect(t.wonders[0].done).toBe(true);
  });

  it('go from locked to ready to building to done', () => {
    const def = WONDERS[0];
    const t = town();
    expect(wonderState(t, research(), def)).toBe('locked');
    expect(wonderState(t, research([def.tech]), def)).toBe('ready');
    t.wonders.push({ id: 'w', kind: def.kind, x: 1, y: 1, startedAt: 0, done: false });
    expect(wonderState(t, research([def.tech]), def)).toBe('building');
    t.wonders[0].done = true;
    expect(wonderState(t, research([def.tech]), def)).toBe('done');
  });
});

describe('daily challenges', () => {
  const stats = newGame().progress.stats as Stats;

  it('picks three different ones, the same for the whole day', () => {
    const a = pickChallenges('2026-11-21');
    expect(a).toHaveLength(DAILY_COUNT);
    expect(new Set(a.map((c) => c.id)).size).toBe(DAILY_COUNT);
    expect(pickChallenges('2026-11-21')).toEqual(a);
  });

  it('change from day to day', () => {
    const days = ['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'].map((d) =>
      pickChallenges(d)
        .map((c) => c.id)
        .join(),
    );
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('count progress from the start of the day', () => {
    const day = newChallengeDay('2026-11-21', { ...stats });
    const pick = day.picks[0];
    const def = CHALLENGES.find((c) => c.id === pick.id)!;
    const later = { ...stats, [def.stat]: stats[def.stat] + def.amount };
    expect(challengeProgress(pick, stats).complete).toBe(false);
    expect(challengeProgress(pick, later).complete).toBe(true);
  });
});

describe('typing on the page', () => {
  it('replaces a whole value', () => {
    const props = { title: 'About us', text: 'Hello' };
    expect(applyTextEdit(props, 'About us', 'Who we are')).toBe('title');
    expect(props.title).toBe('Who we are');
  });

  it('replaces one line or paragraph inside a longer value', () => {
    const props = { items: 'Coffee – $3\nCake – $4' };
    expect(applyTextEdit(props, 'Cake – $4', 'Pie – $5')).toBe('items');
    expect(props.items).toBe('Coffee – $3\nPie – $5');
  });

  it('ignores the quotes the page adds around a review', () => {
    const props = { text: 'Lovely place', author: 'Sam' };
    expect(applyTextEdit(props, '“Lovely place”', '“Best café in town”')).toBe('text');
    expect(props.text).toBe('Best café in town');
  });

  it('leaves pictures and lists of buttons alone', () => {
    const props = { src: 'pic:cake', items: '[{"label":"Go"}]' };
    expect(applyTextEdit(props, 'Go', 'Run')).toBeNull();
    expect(props.items).toBe('[{"label":"Go"}]');
  });
});

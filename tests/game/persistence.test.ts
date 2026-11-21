import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/game/factory';
import { isBuildable, isOwned, terrainAt } from '../../src/core/rules';
import { SAVE_KEY, isSaveData, loadSave, migrate, parseSave, writeSave } from '../../src/game/persistence';

describe('saving and loading', () => {
  it('round-trips a game through localStorage', () => {
    const game = newGame();
    game.town.name = 'Saved Town';
    expect(writeSave(game)).toBe(true);
    expect(loadSave().town.name).toBe('Saved Town');
  });

  it('starts a new game when nothing is saved', () => {
    expect(loadSave().town.houses[0].kind).toBe('townhall');
  });

  it('starts a new game when the save is broken', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadSave().town.name).toBe('My Town');
  });

  it.each([null, '', '[]', '{"version":2}', '{"version":1,"town":{"houses":[]}}'])('rejects %s', (json) => {
    expect(parseSave(json)).toBeNull();
  });

  it('upgrades old saves that miss newer fields', () => {
    const old = newGame();
    const stats = old.progress.stats as Partial<typeof old.progress.stats>;
    delete stats.styled;
    delete stats.upgrades;
    delete (old as Partial<typeof old>).settings;
    const migrated = migrate(old);
    expect(migrated.progress.stats.styled).toBe(0);
    expect(migrated.progress.stats.upgrades).toBe(0);
    expect(migrated.settings.muted).toBe(false);
    expect(migrated.town.houses).toBe(old.town.houses);
    expect(migrated.town.city).toEqual(old.town.city);
  });

  it('moves towns from before the big map onto flat, owned land in the middle', () => {
    const old = newGame();
    const town = old.town as Partial<typeof old.town>;
    delete town.world;
    delete town.wonders;
    old.town.houses[0].x = 3;
    old.town.houses[0].y = 3;
    old.town.city = [{ id: 'c', kind: 'home', x: 9, y: 0, floors: 4, builtAt: 0 }];
    old.town.decor = [];
    const migrated = migrate(old);
    const { world } = migrated.town;
    expect(migrated.town.wonders).toEqual([]);
    for (const o of [...migrated.town.houses, ...migrated.town.city]) {
      expect(isOwned(world, o.x, o.y)).toBe(true);
      expect(terrainAt(world, o.x, o.y)).toBe('grass');
    }
    const hall = migrated.town.houses[0];
    expect(hall.x).toBeGreaterThan(10);
    expect(migrated.town.city[0].x - hall.x).toBe(6);
    expect(isBuildable(world, hall.x + 1, hall.y)).toBe(true);
    expect(migrated.progress.research).toEqual({ current: null, points: 0, done: [] });
  });

  it('keeps existing values when migrating', () => {
    const game = newGame();
    game.progress.stats.edits = 7;
    game.progress.coins = 999;
    const migrated = migrate(game);
    expect(migrated.progress.stats.edits).toBe(7);
    expect(migrated.progress.coins).toBe(999);
  });

  it('recognises valid save data', () => {
    expect(isSaveData(newGame())).toBe(true);
    expect(isSaveData({})).toBe(false);
  });
});

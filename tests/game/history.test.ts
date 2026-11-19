import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/game/factory';
import { canRedo, canUndo, checkpoint, clearHistory, redo, undo } from '../../src/game/history';
import { replaceState, state } from '../../src/game/store';

describe('undo and redo', () => {
  beforeEach(() => {
    replaceState(newGame());
    clearHistory();
  });

  it('undoes and redoes a change', () => {
    checkpoint();
    state.town.name = 'Changed';
    expect(undo()).toBe(true);
    expect(state.town.name).toBe('My Town');
    expect(redo()).toBe(true);
    expect(state.town.name).toBe('Changed');
  });

  it('does nothing when there is nothing to undo', () => {
    expect(canUndo()).toBe(false);
    expect(undo()).toBe(false);
    expect(redo()).toBe(false);
  });

  it('merges quick changes (like typing) into one step', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    checkpoint(true);
    state.town.name = 'A';
    checkpoint(true);
    state.town.name = 'AB';
    checkpoint(true);
    state.town.name = 'ABC';
    undo();
    expect(state.town.name).toBe('My Town');
    expect(canUndo()).toBe(false);
  });

  it('starts a new step after a pause', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    checkpoint(true);
    state.town.name = 'First';
    now.mockReturnValue(5000);
    checkpoint(true);
    state.town.name = 'Second';
    undo();
    expect(state.town.name).toBe('First');
  });

  it('forgets the redo list after a new change', () => {
    checkpoint();
    state.town.name = 'A';
    undo();
    expect(canRedo()).toBe(true);
    checkpoint();
    state.town.name = 'B';
    expect(canRedo()).toBe(false);
  });

  it('does not touch coins or progress', () => {
    checkpoint();
    state.town.name = 'X';
    state.progress.coins = 5;
    undo();
    expect(state.progress.coins).toBe(5);
  });

  it('can be cleared', () => {
    checkpoint();
    state.town.name = 'X';
    clearHistory();
    expect(canUndo()).toBe(false);
  });
});

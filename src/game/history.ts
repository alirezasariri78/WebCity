import type { Town } from '../core/types';
import { commit, state } from './store';

const LIMIT = 60;
const MERGE_WINDOW_MS = 600;

const undoStack: string[] = [];
const redoStack: string[] = [];
let lastSnapshot = '';
let mergeUntil = 0;

/**
 * Remembers the town before a change. With `merge`, calls close together
 * (like typing a word) become a single undo step.
 */
export function checkpoint(merge = false) {
  const now = performance.now();
  const merging = merge && now < mergeUntil;
  mergeUntil = now + MERGE_WINDOW_MS;
  if (merging) return;

  const snapshot = JSON.stringify(state.town);
  if (snapshot === lastSnapshot) return;
  undoStack.push(snapshot);
  if (undoStack.length > LIMIT) undoStack.shift();
  redoStack.length = 0;
  lastSnapshot = snapshot;
}

export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  lastSnapshot = '';
  mergeUntil = 0;
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

function restore(snapshot: string) {
  state.town = JSON.parse(snapshot) as Town;
  lastSnapshot = '';
  mergeUntil = 0;
  commit();
}

function move(from: string[], to: string[]): boolean {
  const snapshot = from.pop();
  if (!snapshot) return false;
  to.push(JSON.stringify(state.town));
  restore(snapshot);
  return true;
}

export const undo = () => move(undoStack, redoStack);
export const redo = () => move(redoStack, undoStack);

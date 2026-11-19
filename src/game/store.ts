import type { SaveData } from '../core/types';
import { events } from './events';
import { loadSave, writeSave } from './persistence';

export let state: SaveData = loadSave();

/** Increases on every change, so views and caches can skip work when nothing changed. */
export let version = 0;

type Listener = () => void;
const listeners = new Set<Listener>();
let renderQueued = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const onChange = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const touch = () => void version++;

function notify() {
  renderQueued = false;
  listeners.forEach((listener) => listener());
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const idle = globalThis.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 0));
    idle(saveNow);
  }, 400);
}

/** Call after changing `state`. Redraws on the next frame and saves soon after. */
export function commit(options: { render?: boolean } = {}) {
  version++;
  scheduleSave();
  if (options.render === false || renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(notify);
}

export function saveNow() {
  clearTimeout(saveTimer);
  state.progress.lastSeen = Date.now();
  if (!writeSave(state)) {
    events.emit('toast', { text: '⚠️ Could not save. Your pictures may be too big.', kind: 'bad' });
  }
}

export function replaceState(data: SaveData) {
  state = data;
  version++;
  saveNow();
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') window.addEventListener('beforeunload', saveNow);

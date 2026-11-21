export interface GameEvents {
  toast: { text: string; kind?: 'good' | 'bad' | 'info' };
  float: { text: string; x?: number; y?: number; color?: string };
  confetti: { x?: number; y?: number; big?: boolean };
  levelup: { level: number };
  achievement: { id: string };
  quest: { done: boolean };
  era: { era: string };
  grew: { id: string };
  tech: { id: string };
  border: { tiles: number[] };
  wonder: { id: string; kind: string };
  golden: { until: number };
}

type Handler<T> = (payload: T) => void;
const handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

export const events = {
  on<K extends keyof GameEvents>(name: K, handler: Handler<GameEvents[K]>): () => void {
    const set = handlers.get(name) ?? new Set();
    set.add(handler as Handler<never>);
    handlers.set(name, set);
    return () => set.delete(handler as Handler<never>);
  },
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]) {
    handlers.get(name)?.forEach((handler) => (handler as Handler<GameEvents[K]>)(payload));
  },
};

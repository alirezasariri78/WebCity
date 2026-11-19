import { state } from './store';

export type Sound = 'click' | 'pop' | 'coin' | 'build' | 'error' | 'fanfare' | 'levelup' | 'whoosh' | 'badge' | 'delete';

interface Note {
  freq: number;
  at?: number;
  dur: number;
  wave?: OscillatorType;
  vol?: number;
  slideTo?: number;
}

const arpeggio = (freqs: number[], step: number, dur: number, wave: OscillatorType, vol: number): Note[] =>
  freqs.map((freq, i) => ({ freq, at: i * step, dur, wave, vol }));

const SOUNDS: Record<Sound, Note[]> = {
  click: [{ freq: 660, dur: 0.06, wave: 'triangle', vol: 0.08 }],
  pop: [{ freq: 420, dur: 0.12, vol: 0.18, slideTo: 880 }],
  coin: [
    { freq: 988, dur: 0.08, wave: 'square', vol: 0.06 },
    { freq: 1319, at: 0.07, dur: 0.18, wave: 'square', vol: 0.06 },
  ],
  build: arpeggio([196, 262, 392], 0.1, 0.18, 'triangle', 0.2),
  error: [{ freq: 180, dur: 0.22, wave: 'sawtooth', vol: 0.08, slideTo: 120 }],
  whoosh: [{ freq: 300, dur: 0.25, vol: 0.08, slideTo: 900 }],
  delete: [{ freq: 500, dur: 0.2, wave: 'triangle', vol: 0.12, slideTo: 150 }],
  badge: arpeggio([784, 988, 1175, 1568], 0.07, 0.25, 'triangle', 0.12),
  fanfare: arpeggio([523, 659, 784, 1047], 0.09, 0.3, 'square', 0.07),
  levelup: [...arpeggio([392, 523, 659, 784, 1047, 1319], 0.08, 0.35, 'triangle', 0.14), { freq: 1568, at: 0.55, dur: 0.6, vol: 0.12 }],
};

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (state.settings.muted || typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function play(ctx: AudioContext, note: Note) {
  const start = ctx.currentTime + (note.at ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = note.wave ?? 'sine';
  osc.frequency.setValueAtTime(note.freq, start);
  if (note.slideTo) osc.frequency.exponentialRampToValueAtTime(note.slideTo, start + note.dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(note.vol ?? 0.15, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + note.dur + 0.02);
}

export function sfx(sound: Sound) {
  const ctx = audio();
  if (ctx) SOUNDS[sound].forEach((note) => play(ctx, note));
}

import { events } from '../../game/events';

let canvas: HTMLCanvasElement;
let g: CanvasRenderingContext2D;
interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  rot: number;
  vr: number;
  life: number;
  shape: number;
}
const parts: P[] = [];
const COLORS = ['#ff5a5a', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7eb3', '#22e1c4'];
let running = false;

export function initEffects() {
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  document.body.appendChild(canvas);
  g = canvas.getContext('2d')!;
  const size = () => {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
  };
  size();
  addEventListener('resize', size);

  const toasts = document.createElement('div');
  toasts.className = 'toasts';
  document.body.appendChild(toasts);

  events.on('confetti', ({ x, y, big }) => confetti(x ?? innerWidth / 2, y ?? innerHeight / 3, big ? 160 : 70));
  events.on('float', ({ text, x, y, color }) => floatText(text, x ?? innerWidth / 2, y ?? 120, color));
  events.on('toast', ({ text, kind }) => {
    const t = document.createElement('div');
    t.className = `toast ${kind ?? 'info'}`;
    t.textContent = text;
    toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3600);
  });
}

export function confetti(x: number, y: number, n = 70) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 9;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 6,
      r: 4 + Math.random() * 5,
      c: COLORS[i % COLORS.length],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      life: 1,
      shape: i % 3,
    });
  }
  if (!running) {
    running = true;
    requestAnimationFrame(tick);
  }
}

let lastT = 0;
function tick(now: number) {
  const d = devicePixelRatio;
  // time-based, so confetti never hangs around on slow computers
  const k = lastT ? Math.min(4, (now - lastT) / 16.7) : 1;
  lastT = now;
  g.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vy += 0.32 * k;
    p.vx *= 0.985;
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.rot += p.vr * k;
    p.life -= 0.009 * k;
    if (p.life <= 0 || p.y > innerHeight + 40) {
      parts.splice(i, 1);
      continue;
    }
    g.save();
    g.globalAlpha = Math.min(1, p.life * 2);
    g.translate(p.x * d, p.y * d);
    g.rotate(p.rot);
    g.fillStyle = p.c;
    if (p.shape === 0) g.fillRect(-p.r * d, -p.r * 0.5 * d, p.r * 2 * d, p.r * d);
    else if (p.shape === 1) {
      g.beginPath();
      g.arc(0, 0, p.r * 0.7 * d, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(0, -p.r * d);
      g.lineTo(p.r * d, p.r * d);
      g.lineTo(-p.r * d, p.r * d);
      g.fill();
    }
    g.restore();
  }
  if (parts.length) requestAnimationFrame(tick);
  else {
    running = false;
    lastT = 0;
    g.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function floatText(text: string, x: number, y: number, color = '#ffb300') {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

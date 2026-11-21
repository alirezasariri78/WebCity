import type { Anim } from './art';
import { paintedSprite } from './sprites';

const TAU = Math.PI * 2;

function softGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rgb: string, alpha: number) {
  const glow = paintedSprite(`glow:${rgb}`, 64, 64, 32, 32, (g) => {
    const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    gradient.addColorStop(0, `rgba(${rgb},1)`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gradient;
    g.fillRect(-32, -32, 64, 64);
  });
  ctx.globalAlpha = alpha;
  ctx.drawImage(glow.image, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

type Effect = (ctx: CanvasRenderingContext2D, a: Anim, seconds: number, seed: number, night: boolean) => void;

const EFFECTS: Record<Anim['kind'], Effect> = {
  smoke(ctx, a, s, seed) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      const k = (s * 0.35 + i / 3 + seed * 0.1) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.6;
      circle(ctx, a.x + Math.sin(k * 5 + i) * 3 + k * 5, a.y + 6 - k * 26, 3 + k * 5);
    }
    ctx.globalAlpha = 1;
  },

  flag(ctx, a, s, seed) {
    const wave = Math.sin(s * 5 + seed) * 3;
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(a.x + 9, a.y + wave, a.x + 18, a.y + 5 + wave * 0.5);
    ctx.quadraticCurveTo(a.x + 9, a.y + 10 + wave, a.x, a.y + 10);
    ctx.fill();
  },

  orb(ctx, a, s) {
    softGlow(ctx, a.x, a.y, 16, '255,220,80', 0.8 * (0.6 + Math.sin(s * 3) * 0.4));
    ctx.fillStyle = '#ffd54a';
    circle(ctx, a.x, a.y, 4.5);
  },

  glow(ctx, a, s, seed, night) {
    if (!night) return;
    softGlow(ctx, a.x, a.y, 30, '255,224,130', 0.55 * (0.85 + Math.sin(s * 7 + seed) * 0.08));
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(a.x - 4.5, a.y - 4.5, 9, 8);
  },

  spray(ctx, a, s) {
    ctx.fillStyle = '#b3e5fc';
    for (let i = 0; i < 6; i++) {
      const k = (s * 1.2 + i / 6) % 1;
      const dir = i % 2 ? 1 : -1;
      ctx.globalAlpha = 1 - k;
      circle(ctx, a.x + dir * k * 14, a.y - 8 + k * k * 30 - k * 18, 2.2);
    }
    ctx.globalAlpha = 1;
  },

  duck(ctx, a, s, seed) {
    ctx.save();
    ctx.translate(a.x + Math.sin(s * 0.5 + seed) * 12, a.y);
    ctx.scale(Math.cos(s * 0.5 + seed) > 0 ? -1 : 1, 1);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3.5, 0, 0, TAU);
    ctx.arc(4, -4, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffa000';
    ctx.beginPath();
    ctx.moveTo(6.5, -4);
    ctx.lineTo(10, -3);
    ctx.lineTo(6.5, -2.5);
    ctx.fill();
    ctx.restore();
  },

  blades(ctx, a, s, seed) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(s * 1.2 + seed);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#fff8e1';
      ctx.fillRect(-2, 3, 4, 30);
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(2, 8, 8, 24);
    }
    ctx.fillStyle = '#5d4037';
    circle(ctx, 0, 0, 3.5);
    ctx.restore();
  },

  fire(ctx, a, s, seed) {
    softGlow(ctx, a.x, a.y - 6, 34, '255,170,60', 0.45 + Math.sin(s * 10 + seed) * 0.05);
    const colors = ['#ff7043', '#ffa726', '#ffee58'];
    colors.forEach((color, i) => {
      const height = 16 - i * 4 + Math.sin(s * 12 + i * 2 + seed) * 3;
      const width = 7 - i * 1.6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(a.x - width, a.y);
      ctx.quadraticCurveTo(a.x - width, a.y - height * 0.6, a.x + Math.sin(s * 9 + i) * 2, a.y - height);
      ctx.quadraticCurveTo(a.x + width, a.y - height * 0.6, a.x + width, a.y);
      ctx.fill();
    });
  },

  blink(ctx, a, s, seed) {
    const on = Math.sin(s * 3 + seed) > 0.2;
    if (on) softGlow(ctx, a.x, a.y, 10, '255,60,60', 0.8);
    ctx.fillStyle = on ? '#ff5252' : '#8e2a2a';
    circle(ctx, a.x, a.y, 2);
  },

  sway: () => {},
  bob: () => {},
};

export function drawEffect(ctx: CanvasRenderingContext2D, anim: Anim, timeMs: number, seed: number, night: boolean) {
  EFFECTS[anim.kind](ctx, anim, timeMs / 1000, seed, night);
}

export const swayAngle = (timeMs: number, seed: number) => Math.sin(timeMs / 650 + seed) * 0.035;
export const bobOffset = (timeMs: number, seed: number) => Math.sin(timeMs / 900 + seed) * 6 - 4;

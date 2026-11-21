import { describe, expect, it } from 'vitest';
import {
  DECOR,
  FURNITURE,
  HOUSES,
  MAX_CONTENT_LEVEL,
  MAX_HOUSE_LEVEL,
  PICTURES,
  THEMES,
  furnitureDef,
  houseFloors,
  MAX_LAND,
  landSize,
  resolveImage,
  roomSlots,
  themeDef,
  upgradeCost,
} from '../../src/core/catalog';
import type { ThemeId } from '../../src/core/types';

const unique = (values: string[]) => new Set(values).size === values.length;

describe('catalog', () => {
  it('has unique kinds and ids', () => {
    expect(unique(FURNITURE.map((f) => f.kind))).toBe(true);
    expect(unique(HOUSES.map((h) => h.kind))).toBe(true);
    expect(unique(DECOR.map((d) => d.kind))).toBe(true);
    expect(unique(THEMES.map((t) => t.id))).toBe(true);
  });

  it('gives every furniture field a default value', () => {
    for (const f of FURNITURE) {
      for (const field of f.fields) expect(f.defaults, `${f.kind}.${field.key}`).toHaveProperty(field.key);
    }
  });

  it('only uses real furniture in house templates, and templates fit in the room', () => {
    for (const h of HOUSES) {
      for (const t of h.template) expect(furnitureDef(t.kind), `${h.kind} → ${t.kind}`).toBeDefined();
      expect(h.template.length).toBeLessThanOrEqual(roomSlots(h.kind));
    }
  });

  it('gives select fields options that include their default', () => {
    for (const f of FURNITURE) {
      for (const field of f.fields.filter((x) => x.type === 'select')) {
        expect(
          field.options!.map((o) => o.value),
          `${f.kind}.${field.key}`,
        ).toContain(f.defaults[field.key]);
      }
    }
  });

  it('keeps JSON defaults valid', () => {
    for (const f of FURNITURE) {
      for (const field of f.fields.filter((x) => x.type === 'rows' || x.type === 'formfields')) {
        expect(() => JSON.parse(f.defaults[field.key]), `${f.kind}.${field.key}`).not.toThrow();
      }
    }
  });

  it('unlocks everything by the last content level', () => {
    const levels = [...FURNITURE, ...HOUSES.filter((h) => h.kind !== 'townhall'), ...DECOR, ...THEMES].map((x) => x.level);
    expect(Math.max(...levels)).toBeLessThanOrEqual(MAX_CONTENT_LEVEL);
    expect(Math.min(...levels)).toBe(1);
  });

  it('uses valid colours in every theme', () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const t of THEMES) {
      for (const color of [...t.ground, ...t.side, ...t.water, t.road, t.site.primary, t.site.bg]) expect(color, t.id).toMatch(hex);
      expect(t.site.fontUrl).toMatch(/^https:\/\/fonts\.googleapis\.com\//);
    }
  });

  it('falls back to the first theme for unknown ids', () => {
    expect(themeDef('nope' as ThemeId)).toBe(THEMES[0]);
  });
});

describe('town rules', () => {
  it('grows the land with the level but never past the maximum', () => {
    expect(landSize(1)).toBe(10);
    expect(landSize(100)).toBe(MAX_LAND);
  });

  it('makes upgrades bigger, roomier and pricier', () => {
    for (let level = 1; level < MAX_HOUSE_LEVEL; level++) {
      expect(houseFloors(level + 1)).toBeGreaterThanOrEqual(houseFloors(level));
      expect(roomSlots('cottage', level + 1)).toBeGreaterThan(roomSlots('cottage', level));
      expect(upgradeCost('cottage', level + 1)).toBeGreaterThan(upgradeCost('cottage', level));
    }
  });
});

describe('built-in pictures', () => {
  it('turns every picture into an SVG image', () => {
    for (const id of Object.keys(PICTURES)) expect(resolveImage(`pic:${id}`)).toMatch(/^data:image\/svg\+xml/);
  });

  it('leaves normal URLs alone', () => {
    expect(resolveImage('https://example.com/cat.png')).toBe('https://example.com/cat.png');
  });

  it('uses a fallback for unknown pictures', () => {
    expect(resolveImage('pic:unknown')).toMatch(/^data:image\/svg\+xml/);
  });
});

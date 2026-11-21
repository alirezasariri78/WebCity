import { CITY, DECOR, FURNITURE, HOUSES, PICTURES, TECHS, THEMES, WONDERS } from '../../src/core/catalog';
import { CONTROLS, FONTS, GROUPS } from '../../src/core/design';
import { CHALLENGES, ERAS, RESOURCES, SITE_FEATURES, TERRAIN_NAMES, rateTown, unlocksAt } from '../../src/core/rules';
import { newGame } from '../../src/game/factory';
import { ACHIEVEMENTS, REPEATING, STORY } from '../../src/game/progress';
import { DIRECTIONS } from '../../src/ui/designStudio';
import { TIPS } from '../../src/ui/hud/helper';
import { FIELD_TYPES } from '../../src/ui/house/formBuilder';
import { TOOLS, TOOL_HINTS } from '../../src/ui/house/houseEditor';
import { MOOD_GROUPS } from '../../src/ui/house/moods';
import { YIELD_HINTS, YIELD_NAMES } from '../../src/ui/hud/empire';
import { TOUR_STEPS } from '../../src/ui/tour';
import { SHAPES } from '../../src/ui/town/designer';

const SOURCES = import.meta.glob<string>(['../../src/**/*.ts', '!../../src/i18n/**'], { query: '?raw', import: 'default', eager: true });
const isJson = (value: string) => /^\s*[[{<]/.test(value);
/** Prices, picture ids, emails and web addresses stay as they are in every language. */
const isTechnical = (value: string) => !/[a-z]{2}/i.test(value) || /^(pic:|https?:)|@|\.com/.test(value);
const UNTRANSLATED_FIELD_TYPES = new Set(['select', 'image', 'images', 'link', 'code']);

/** Every literal passed straight to t('…') in the source code. */
function keysFromSource(): string[] {
  const keys: string[] = [];
  const pattern = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  for (const code of Object.values(SOURCES)) {
    for (const match of code.matchAll(pattern)) keys.push(match[2].replace(/\\(['"\\])/g, '$1'));
  }
  return keys;
}

/** Text that lives in data (catalog, quests, badges…) and is translated when shown. */
function keysFromData(): string[] {
  const keys: string[] = [];
  const add = (...values: (string | undefined)[]) => values.forEach((v) => v && !isJson(v) && keys.push(v));

  for (const h of HOUSES) {
    add(h.name, h.web, h.desc);
    h.template.forEach((t) => Object.values(t.props ?? {}).forEach((v) => !isTechnical(v) && add(v)));
  }
  for (const f of FURNITURE) {
    add(f.name, f.web);
    for (const field of f.fields) {
      const value = f.defaults[field.key];
      if (value && !UNTRANSLATED_FIELD_TYPES.has(field.type) && !isTechnical(value)) add(value);
    }
    for (const field of f.fields) {
      add(field.label, field.hint, field.addLabel);
      field.options?.forEach((o) => add(o.label));
      field.columns?.forEach((c) => {
        add(c.label);
        c.options?.forEach((o) => add(o.label));
      });
    }
  }
  CITY.forEach((c) => add(c.name, c.desc));
  DECOR.forEach((d) => add(d.name));
  THEMES.forEach((t) => add(t.name, t.desc));
  Object.values(PICTURES).forEach((p) => add(p.label));
  CONTROLS.forEach((c) => {
    add(c.label, c.hint);
    c.options?.forEach((o) => add(o.label));
  });
  GROUPS.forEach((g) => add(g.name, g.tool));
  FONTS.forEach((f) => add(f.feel));
  ERAS.forEach((e) => add(e.name));
  SITE_FEATURES.forEach((f) => add(f.name, f.desc));
  STORY.forEach((q) => add(q.title, q.desc));
  REPEATING.forEach((q) => add(q.title, q.desc));
  ACHIEVEMENTS.forEach((a) => add(a.name, a.desc));
  for (let level = 1; level <= 20; level++) unlocksAt(level).forEach((u) => add(u.name, u.detail));
  rateTown(newGame().town).hints.forEach((h) => add(h.text));
  add(
    '"{name}" has almost nothing inside. Add some furniture!',
    'Some furniture still has the example words. Click it and write your own!',
  );
  TIPS.forEach((tip) => add(tip));
  add('Your website is looking amazing! 🌟');
  TOUR_STEPS.forEach((s) => add(s.title, s.text));
  FIELD_TYPES.forEach((f) => add(f.label));
  DIRECTIONS.forEach(([, name]) => add(name));
  SHAPES.forEach((s) => add(s.label));
  TECHS.forEach((x) => add(x.name, x.desc));
  WONDERS.forEach((w) => add(w.name, w.gift));
  RESOURCES.forEach((r) => add(r.name));
  Object.values(TERRAIN_NAMES).forEach((x) => add(x.name));
  CHALLENGES.forEach((c) => add(c.title));
  Object.values(YIELD_NAMES).forEach((x) => add(x));
  Object.values(YIELD_HINTS).forEach((x) => add(x));
  MOOD_GROUPS.forEach((g) => add(g.title, g.hint, ...g.options.map((o) => o.name)));
  TOOLS.forEach((x) => add(x.label));
  Object.values(TOOL_HINTS).forEach((x) => add(x));
  add(
    'Hidden treasure!',
    'You found an old chest with {coins} 🪙 inside.',
    'Ancient scrolls!',
    'Old books full of ideas: +{science} 🔬 science.',
    'A forgotten statue!',
    'People come from far away to see it. Your borders will grow soon.',
    'A golden mask!',
    'Your people are so proud that a Golden Age begins.',
  );
  return keys;
}

export const allKeys = () => [...new Set([...keysFromSource(), ...keysFromData()])].sort();

export const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
